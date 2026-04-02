const { pool } = require('../config/database');
const turnosService = require('./turnosService');
const turnosSocket = require('../websocket/turnosSocket');

/**
 * Listar solicitudes según visibilidad
 */
const getSolicitudes = async (usuarioId, rol) => {
  let query = `
    SELECT s.*, 
           u1.full_name as solicitante_nombre, 
           u2.full_name as objetivo_nombre,
           t1.hora_inicio_programada as hora_inicio_solicitante,
           t1.hora_fin_programada as hora_fin_solicitante,
           t2.hora_inicio_programada as hora_inicio_objetivo,
           t2.hora_fin_programada as hora_fin_objetivo
    FROM wfm_auth.solicitudes_cambio s
    JOIN wfm_auth.usuarios u1 ON s.solicitante_id = u1.id
    JOIN wfm_auth.usuarios u2 ON s.objetivo_id = u2.id
    LEFT JOIN wfm_auth.turnos t1 ON s.turno_solicitante_id = t1.id
    LEFT JOIN wfm_auth.turnos t2 ON s.turno_objetivo_id = t2.id
  `;

  const params = [];
  if (rol !== 'admin') {
    query += ' WHERE s.solicitante_id = $1 OR s.objetivo_id = $1 ';
    params.push(usuarioId);
  }
  
  query += ' ORDER BY s.created_at DESC;';
  const { rows } = await pool.query(query, params);
  return rows;
};

/**
 * Crear nueva solicitud
 */
const crearSolicitud = async (data) => {
  const { solicitante_id, objetivo_id, fecha } = data;

  // 1. Buscar turnos para esa fecha (usando AT TIME ZONE 'UTC' para precisión)
  const { rows: t1 } = await pool.query(
    "SELECT id FROM wfm_auth.turnos WHERE usuario_id = $1 AND CAST(hora_inicio_programada AT TIME ZONE 'UTC' AS DATE) = $2",
    [solicitante_id, fecha]
  );
  const { rows: t2 } = await pool.query(
    "SELECT id FROM wfm_auth.turnos WHERE usuario_id = $1 AND CAST(hora_inicio_programada AT TIME ZONE 'UTC' AS DATE) = $2",
    [objetivo_id, fecha]
  );

  if (t1.length === 0 && t2.length === 0) {
    const err = new Error('Ninguno de los empleados tiene turno ese día');
    err.status = 400;
    throw err;
  }

  const query = `
    INSERT INTO wfm_auth.solicitudes_cambio 
    (solicitante_id, objetivo_id, fecha, turno_solicitante_id, turno_objetivo_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    solicitante_id, 
    objetivo_id, 
    fecha, 
    t1[0]?.id || null, 
    t2[0]?.id || null
  ]);

  const result = rows[0];
  turnosSocket.emitSolicitud('creada', result);
  return result;
};

/**
 * Aprobar/Rechazar por parte del Objetivo o Admin
 */
const procesarSolicitud = async (solicitudId, usuarioId, rol, decision) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Bloquear fila para evitar race conditions
    const { rows: [solicitud] } = await client.query(
      'SELECT * FROM wfm_auth.solicitudes_cambio WHERE id = $1 FOR UPDATE',
      [solicitudId]
    );

    if (!solicitud) throw new Error('Solicitud no encontrada');
    if (solicitud.estado_final !== 'abierta') throw new Error('Esta solicitud ya está cerrada');

    let updateQuery = '';
    const params = [solicitudId, decision];

    if (rol === 'admin') {
      updateQuery = "UPDATE wfm_auth.solicitudes_cambio SET estado_admin = $2, updated_at = NOW() WHERE id = $1 RETURNING *";
    } else if (usuarioId === solicitud.objetivo_id) {
      updateQuery = "UPDATE wfm_auth.solicitudes_cambio SET estado_objetivo = $2, updated_at = NOW() WHERE id = $1 RETURNING *";
    } else {
      throw new Error('No tienes permiso para aprobar esta solicitud');
    }

    const { rows: [updated] } = await client.query(updateQuery, params);

    // Evaluar cierre por rechazo
    if (updated.estado_admin === 'rechazado' || updated.estado_objetivo === 'rechazado') {
      const { rows: [finalized] } = await client.query(
        "UPDATE wfm_auth.solicitudes_cambio SET estado_final = 'rechazada' WHERE id = $1 RETURNING *", 
        [solicitudId]
      );
      await client.query('COMMIT');
      return finalized;
    }

    // Evaluar cierre por aprobación mutua
    if (updated.estado_admin === 'aprobado' && updated.estado_objetivo === 'aprobado') {
      try {
        // Usar la nueva función de intercambio directo que es más robusta para swaps
        await turnosService.ejecutarIntercambio(
          updated.turno_solicitante_id,
          updated.turno_objetivo_id,
          updated.solicitante_id,
          updated.objetivo_id
        );

        const { rows: [finalized] } = await client.query(
          "UPDATE wfm_auth.solicitudes_cambio SET estado_final = 'aprobada' WHERE id = $1 RETURNING *", 
          [solicitudId]
        );
        
        await client.query('COMMIT');
        turnosSocket.emitSolicitud('procesada', finalized);
        return finalized;
      } catch (swapError) {
        console.error('Error ejecutando swap automático:', swapError);
        throw swapError;
      }
    }

    await client.query('COMMIT');
    turnosSocket.emitSolicitud('actualizada', updated);
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getSolicitudes,
  crearSolicitud,
  procesarSolicitud
};
