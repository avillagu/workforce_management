const { pool } = require('../config/database');
const { DateTime } = require('luxon');
const crypto = require('crypto');
const turnosSocket = require('../websocket/turnosSocket');

/**
 * Valida si un nuevo turno se superpone con los existentes para un empleado
 * @param {string} usuario_id
 * @param {string} hora_inicio - ISO string UTC
 * @param {string} hora_fin - ISO string UTC
 * @param {string|null} turno_id_excluir - Para actualizaciones
 * @returns {Promise<boolean>} True si hay superposición
 */
const validarSuperposicion = async (usuario_id, hora_inicio, hora_fin, turno_id_excluir = null) => {
  const query = `
    SELECT id FROM wfm_auth.turnos
    WHERE usuario_id = $1
    AND ($4::UUID IS NULL OR id != $4)
    AND (
      (hora_inicio_programada < $3 AND hora_fin_programada > $2)
    )
    LIMIT 1;
  `;
  
  const values = [usuario_id, hora_inicio, hora_fin, turno_id_excluir];
  const { rows } = await pool.query(query, values);
  return rows.length > 0;
};

/**
 * Obtiene turnos según rango y opcionalmente rol/usuario
 */
const getTurnos = async (fecha_inicio, fecha_fin) => {
  const query = `
    SELECT t.id, t.usuario_id, t.tipo, t.publicado,
           t.hora_inicio_programada as hora_inicio, 
           t.hora_fin_programada as hora_fin, 
           t.created_at, u.full_name, u.username
    FROM wfm_auth.turnos t
    JOIN wfm_auth.usuarios u ON t.usuario_id = u.id
    WHERE t.hora_inicio_programada >= $1 AND t.hora_fin_programada <= $2
    ORDER BY t.hora_inicio_programada ASC;
  `;
  const { rows } = await pool.query(query, [fecha_inicio, fecha_fin]);
  return rows;
};

/**
 * Obtiene turnos de un empleado específico
 */
const getTurnosEmpleado = async (usuario_id, fecha_inicio, fecha_fin) => {
  const query = `
    SELECT t.id, t.usuario_id, t.tipo, t.publicado,
           t.hora_inicio_programada as hora_inicio, 
           t.hora_fin_programada as hora_fin, 
           t.created_at, u.full_name, u.username
    FROM wfm_auth.turnos t
    JOIN wfm_auth.usuarios u ON t.usuario_id = u.id
    WHERE t.usuario_id = $1
    AND t.hora_inicio_programada >= $2 AND t.hora_fin_programada <= $3
    ORDER BY t.hora_inicio_programada ASC;
  `;
  const { rows } = await pool.query(query, [usuario_id, fecha_inicio, fecha_fin]);
  return rows;
};

/**
 * Crea un turno individual
 */
const crearTurno = async (data) => {
  const { usuario_id, hora_inicio, hora_fin, tipo = 'turno' } = data;
  
  const tieneConflicto = await validarSuperposicion(usuario_id, hora_inicio, hora_fin);
  if (tieneConflicto) {
    const error = new Error('Conflicto de turno: El empleado ya tiene un turno programado en este horario');
    error.status = 409;
    throw error;
  }

  const id = crypto.randomUUID();
  const query = `
    INSERT INTO wfm_auth.turnos (id, usuario_id, hora_inicio_programada, hora_fin_programada, tipo, publicado)
    VALUES ($1, $2, $3, $4, $5, false)
    RETURNING id, usuario_id, tipo, publicado,
              hora_inicio_programada as hora_inicio, 
              hora_fin_programada as hora_fin, 
              created_at;
  `;
  
  const { rows } = await pool.query(query, [id, usuario_id, hora_inicio, hora_fin, tipo]);
  const nuevoTurno = rows[0];
  
  turnosSocket.emitActualizacion('crear', nuevoTurno);
  return nuevoTurno;
};

/**
 * Actualiza un turno
 */
const actualizarTurno = async (id, data) => {
  const { usuario_id, hora_inicio, hora_fin, tipo } = data;

  // Verificar existencia
  const checkQuery = 'SELECT id, usuario_id FROM wfm_auth.turnos WHERE id = $1';
  const { rows: existing } = await pool.query(checkQuery, [id]);
  if (existing.length === 0) {
    const error = new Error('Turno no encontrado');
    error.status = 404;
    throw error;
  }

  const uid = usuario_id || existing[0].usuario_id;
  
  const tieneConflicto = await validarSuperposicion(uid, hora_inicio, hora_fin, id);
  if (tieneConflicto) {
    const error = new Error('Conflicto de turno: Superposición detectada');
    error.status = 409;
    throw error;
  }

  const query = `
    UPDATE wfm_auth.turnos
    SET usuario_id = COALESCE($2, usuario_id),
        hora_inicio_programada = $3,
        hora_fin_programada = $4,
        tipo = COALESCE($5, tipo),
        publicado = false
    WHERE id = $1
    RETURNING id, usuario_id, tipo, publicado,
              hora_inicio_programada as hora_inicio, 
              hora_fin_programada as hora_fin, 
              created_at;
  `;
  
  const { rows } = await pool.query(query, [id, uid, hora_inicio, hora_fin, tipo]);
  const actualizado = rows[0];
  
  turnosSocket.emitActualizacion('actualizar', actualizado);
  return actualizado;
};

/**
 * Elimina un turno
 */
const eliminarTurno = async (id) => {
  const query = 'DELETE FROM wfm_auth.turnos WHERE id = $1 RETURNING *;';
  const { rows } = await pool.query(query, [id]);
  
  if (rows.length === 0) {
    const error = new Error('Turno no encontrado');
    error.status = 404;
    throw error;
  }
  
  turnosSocket.emitActualizacion('eliminar', rows[0]);
  return rows[0];
};

/**
 * Programación masiva con transacciones
 */
const programacionMasiva = async (data) => {
  const { 
    empleado_ids, 
    fecha_inicio, 
    fecha_fin, 
    hora_inicio, 
    hora_fin, 
    tipo = 'turno',
    dias_semana,
    sobrescribir = false
  } = data;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    let creados = 0;
    
    let current = DateTime.fromISO(fecha_inicio, { zone: 'utc' });
    const end = DateTime.fromISO(fecha_fin, { zone: 'utc' });
    const allowedDays = Array.isArray(dias_semana) ? dias_semana : null;
    
    while (current <= end) {
      if (allowedDays && !allowedDays.includes(current.weekday)) {
        current = current.plus({ days: 1 });
        continue;
      }

      const fechaStr = current.toISODate();
      const inicioUTC = DateTime.fromISO(`${fechaStr}T${hora_inicio}`, { zone: 'utc' });
      
      const [hS, mS] = hora_inicio.split(':').map(Number);
      const [hE, mE] = hora_fin.split(':').map(Number);
      let finUTC = DateTime.fromISO(`${fechaStr}T${hora_fin}`, { zone: 'utc' });
      if (hE < hS || (hE === hS && mE < mS)) {
        finUTC = finUTC.plus({ days: 1 });
      }

      for (const uid of empleado_ids) {
        if (sobrescribir) {
          await client.query(`
            DELETE FROM wfm_auth.turnos 
            WHERE usuario_id = $1 
            AND (hora_inicio_programada < $3 AND hora_fin_programada > $2)
          `, [uid, inicioUTC.toISO(), finUTC.toISO()]);
        } else {
          const { rows: conflict } = await client.query(`
            SELECT id FROM wfm_auth.turnos
            WHERE usuario_id = $1
            AND (hora_inicio_programada < $3 AND hora_fin_programada > $2)
            LIMIT 1
          `, [uid, inicioUTC.toISO(), finUTC.toISO()]);
          
          if (conflict.length > 0) {
            throw new Error(`Conflicto de turno para un empleado el día ${fechaStr}`);
          }
        }
        
        const id = crypto.randomUUID();
        await client.query(
          'INSERT INTO wfm_auth.turnos (id, usuario_id, hora_inicio_programada, hora_fin_programada, tipo, publicado) VALUES ($1, $2, $3, $4, $5, false)',
          [id, uid, inicioUTC.toISO(), finUTC.toISO(), tipo]
        );
        creados++;
      }
      current = current.plus({ days: 1 });
    }
    
    await client.query('COMMIT');
    turnosSocket.emitActualizacion('masivo', { count: creados });
    return { turnos_creados: creados, detalle: `${empleado_ids.length} empleados procesados` };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Elimina turnos de forma masiva
 */
const eliminarTurnosMasivo = async (data) => {
  const { empleado_ids, fecha_inicio, fecha_fin, dias_semana } = data;
  const query = `
    DELETE FROM wfm_auth.turnos
    WHERE usuario_id = ANY($1)
    AND (hora_inicio_programada::DATE >= $2 AND hora_inicio_programada::DATE <= $3)
    AND EXTRACT(ISODOW FROM hora_inicio_programada) = ANY($4)
    RETURNING id, usuario_id, hora_inicio_programada, hora_fin_programada, tipo;
  `;
  const { rows } = await pool.query(query, [empleado_ids, fecha_inicio, fecha_fin, dias_semana]);
  if (rows.length > 0) {
    turnosSocket.emitActualizacion('masivo_eliminar', { count: rows.length, eliminados: rows });
  }
  return { eliminados_count: rows.length };
};

/**
 * Mueve un turno e invalida publicación (vuelve a borrador)
 */
const moverTurno = async (id, destino_usuario_id, destino_fecha) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: originRows } = await client.query('SELECT * FROM wfm_auth.turnos WHERE id = $1', [id]);
    if (originRows.length === 0) throw new Error('Turno origen no encontrado');
    const tOrigen = originRows[0];

    const parseDBDate = (val) => {
      if (!val) return DateTime.invalid('null value');
      return (val instanceof Date) ? DateTime.fromJSDate(val) : DateTime.fromISO(val.toISOString ? val.toISOString() : val);
    };

    const sO = parseDBDate(tOrigen.hora_inicio_programada).setZone('utc');
    const eO = parseDBDate(tOrigen.hora_fin_programada).setZone('utc');
    
    if (!sO.isValid || !eO.isValid) {
      throw new Error('Formato de fecha de turno origen inválido');
    }
    const durationO = eO.diff(sO);
    
    // Parsear destino_fecha (viniendo de la solicitud como YYYY-MM-DD)
    const baseNew = DateTime.fromISO(destino_fecha, { zone: 'utc' }).startOf('day');
    if (!baseNew.isValid) {
      throw new Error('Fecha destino inválida: ' + destino_fecha);
    }

    const startONew = baseNew.set({ hour: sO.hour, minute: sO.minute, second: 0, millisecond: 0 });
    const endONew = startONew.plus(durationO);

    const { rows: targetRows } = await client.query(`
      SELECT * FROM wfm_auth.turnos 
      WHERE usuario_id = $1 
      AND (hora_inicio_programada < $3 AND hora_fin_programada > $2)
    `, [destino_usuario_id, startONew.toISO(), endONew.toISO()]);

    if (targetRows.length > 0) {
      const tDestino = targetRows[0];
      const sD = parseDBDate(tDestino.hora_inicio_programada).setZone('utc');
      const eD = parseDBDate(tDestino.hora_fin_programada).setZone('utc');
      
      if (sD.isValid && eD.isValid) {
        const durationD = eD.diff(sD);
        const baseOld = sO.startOf('day');
        const startDNew = baseOld.set({ hour: sD.hour, minute: sD.minute, second: 0, millisecond: 0 });
        const endDNew = startDNew.plus(durationD);

        await client.query(`
          UPDATE wfm_auth.turnos 
          SET usuario_id = $2, hora_inicio_programada = $3, hora_fin_programada = $4, publicado = false
          WHERE id = $1
        `, [tDestino.id, tOrigen.usuario_id, startDNew.toISO(), endDNew.toISO()]);
      }
    }

    const { rows: finals } = await client.query(`
      UPDATE wfm_auth.turnos 
      SET usuario_id = $2, hora_inicio_programada = $3, hora_fin_programada = $4, publicado = false
      WHERE id = $1
      RETURNING id, usuario_id, tipo, publicado,
                hora_inicio_programada as hora_inicio, 
                hora_fin_programada as hora_fin, 
                created_at;
    `, [id, destino_usuario_id, startONew.toISO(), endONew.toISO()]);

    await client.query('COMMIT');
    turnosSocket.emitActualizacion('masivo', { message: 'Intercambio realizado (Borrador)' });
    return finals[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Publica todos los turnos borradores del sistema (Global)
 */
const publicarTurnos = async () => {
  const query = `
    UPDATE wfm_auth.turnos
    SET publicado = true
    WHERE publicado = false
    RETURNING id, usuario_id, publicado, hora_inicio_programada AT TIME ZONE 'UTC' as fecha;
  `;
  const { rows } = await pool.query(query);
  
  if (rows.length > 0) {
    // Agrupar por usuario para no spammear
    const usuariosAfectados = [...new Set(rows.map(r => r.usuario_id))];
    
    for (const uid of usuariosAfectados) {
      await pool.query(`
        INSERT INTO wfm_auth.notificaciones (tipo, usuario_id, mensaje, detalles)
        VALUES ($1, $2, $3, $4)
      `, [
        'publicacion_turnos', 
        uid, 
        'Se han publicado nuevos turnos en tu calendario.',
        JSON.stringify({ count: rows.filter(r => r.usuario_id === uid).length })
      ]);
    }

    turnosSocket.emitActualizacion('masivo', { count: rows.length, message: 'Todos los turnos publicados' });
    // También enviamos un aviso de novedad para que los badges se actualicen
    turnosSocket.emitSolicitud('publicacion', { usuarios: usuariosAfectados });
  }
  return { publicados: rows.length };
};

/**
 * Intercambio directo de usuarios para dos turnos (solicitud de cambio)
 */
const ejecutarIntercambio = async (turnoSolId, turnoObjId, usuarioSolId, usuarioObjId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Caso 1: Ambos tienen turno
    if (turnoSolId && turnoObjId) {
      await client.query('UPDATE wfm_auth.turnos SET usuario_id = $2, publicado = true WHERE id = $1', [turnoSolId, usuarioObjId]);
      await client.query('UPDATE wfm_auth.turnos SET usuario_id = $2, publicado = true WHERE id = $1', [turnoObjId, usuarioSolId]);
    }
    // Caso 2: Solo el solicitante tiene turno
    else if (turnoSolId) {
      await client.query('UPDATE wfm_auth.turnos SET usuario_id = $2, publicado = true WHERE id = $1', [turnoSolId, usuarioObjId]);
    }
    // Caso 3: Solo el objetivo tiene turno
    else if (turnoObjId) {
      await client.query('UPDATE wfm_auth.turnos SET usuario_id = $2, publicado = true WHERE id = $1', [turnoObjId, usuarioSolId]);
    }

    await client.query('COMMIT');
    turnosSocket.emitActualizacion('masivo', { message: '¡Cambio de turno confirmado!' });
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getTurnos,
  getTurnosEmpleado,
  crearTurno,
  actualizarTurno,
  eliminarTurno,
  programacionMasiva,
  eliminarTurnosMasivo,
  moverTurno,
  publicarTurnos,
  ejecutarIntercambio
};
