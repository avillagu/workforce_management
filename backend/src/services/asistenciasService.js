const { pool } = require('../config/database');
const { DateTime } = require('luxon');
const crypto = require('crypto');
const turnosSocket = require('../websocket/turnosSocket');

const ESTADOS_VALIDOS = ['disponible', 'descanso', 'en_bano', 'fuera_de_turno', 'desconectado'];

/**
 * Parsea un valor (ISO, fecha o JS Date) a DateTime de Luxon de forma robusta.
 */
const parseDateTime = (val) => {
  if (!val) return null;
  if (val instanceof Date) return DateTime.fromJSDate(val);
  const dt = DateTime.fromISO(val);
  if (dt.isValid) return dt;
  const sqlDt = DateTime.fromSQL(val);
  if (sqlDt.isValid) return sqlDt;
  return DateTime.invalid('No se pudo parsear el valor');
};

/**
 * Calcula la duración entre dos fechas y devuelve componentes y label amigable.
 */
const calcularDuracion = (hora_inicio, hora_fin) => {
  const inicio = parseDateTime(hora_inicio);
  const fin = hora_fin ? parseDateTime(hora_fin) : DateTime.now();

  if (!inicio || !inicio.isValid || !fin || !fin.isValid) {
    return { horas: 0, minutos: 0, segundos: 0, total_segundos: 0, texto: '0s' };
  }

  const diff = fin.diff(inicio, ['hours', 'minutes', 'seconds']).toObject();
  const horas = Math.max(0, Math.trunc(diff.hours || 0));
  const minutos = Math.max(0, Math.trunc(diff.minutes || 0));
  const segundos = Math.max(0, Math.trunc(diff.seconds || 0));
  const total_segundos = Math.max(0, Math.trunc(fin.diff(inicio, 'seconds').seconds || 0));

  const textoParts = [];
  if (horas) textoParts.push(`${horas}h`);
  if (minutos) textoParts.push(`${minutos}m`);
  if (!horas && !minutos) textoParts.push(`${segundos}s`);

  return { horas, minutos, segundos, total_segundos, texto: textoParts.join(' ') };
};

/**
 * Cierra el estado anterior (hora_fin NULL) si existe.
 */
const cerrarEstadoAnterior = async (usuario_id, client = null) => {
  const executor = client || pool;
  const ahora = DateTime.now().toISO();
  const { rows } = await executor.query(
    `UPDATE wfm_auth.asistencias
     SET hora_fin = $2
     WHERE usuario_id = $1 AND hora_fin IS NULL
     RETURNING *;`,
    [usuario_id, ahora]
  );
  return rows[0] || null;
};

/**
 * Marca un nuevo estado para el usuario autenticado.
 */
const marcarEstado = async (usuario_id, estado) => {
  if (!ESTADOS_VALIDOS.includes(estado)) {
    const error = new Error('Estado inválido');
    error.status = 400;
    throw error;
  }

  const client = await pool.connect();
  let transaccionIniciada = false;

  try {
    // Verificar existencia de usuario
    const { rows: userRows } = await client.query(
      `SELECT u.id, u.full_name, u.grupo_id, g.nombre AS grupo_nombre
       FROM wfm_auth.usuarios u
       LEFT JOIN wfm_auth.grupos g ON u.grupo_id = g.id
       WHERE u.id = $1`,
      [usuario_id]
    );
    if (userRows.length === 0) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    const user = userRows[0];

    await client.query('BEGIN');
    transaccionIniciada = true;

    // Verificar si ya tiene un estado activo
    const { rows: activos } = await client.query(
      `SELECT id, estado, hora_inicio
       FROM wfm_auth.asistencias
       WHERE usuario_id = $1 AND hora_fin IS NULL
       LIMIT 1;`,
      [usuario_id]
    );

    if (activos.length > 0 && activos[0].estado === estado) {
      const error = new Error('Estado duplicado: ya está activo');
      error.status = 409;
      throw error;
    }

    // Cerrar estado anterior si existía
    if (activos.length > 0) {
      await cerrarEstadoAnterior(usuario_id, client);
    }

    // Crear nuevo registro
    const id = crypto.randomUUID();
    const ahora = DateTime.now().toISO();
    const insertQuery = `
      INSERT INTO wfm_auth.asistencias (id, usuario_id, estado, hora_inicio, hora_fin, created_at)
      VALUES ($1, $2, $3, $4, NULL, $5)
      RETURNING id, usuario_id, estado, hora_inicio, hora_fin, created_at;
    `;
    const { rows: insertRows } = await client.query(insertQuery, [id, usuario_id, estado, ahora, ahora]);

    await client.query('COMMIT');

    const nuevo = insertRows[0];
    const payload = {
      ...nuevo,
      usuario_nombre: user.full_name,
      grupo_id: user.grupo_id,
      grupo_nombre: user.grupo_nombre || null
    };

    // Emitir evento de WebSocket
    turnosSocket.emitAsistenciaActualizada({
      usuario_id,
      usuario_nombre: user.full_name,
      estado,
      hora_inicio: nuevo.hora_inicio,
      grupo_id: user.grupo_id
    });

    return payload;
  } catch (error) {
    if (transaccionIniciada) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtiene historial de asistencias con filtros opcionales.
 */
const obtenerHistorial = async ({ desde, hasta, grupo_id, usuario_id, limit = 50 }) => {
  const condiciones = [];
  const valores = [];
  let idx = 1;

  if (desde) {
    const inicio = DateTime.fromISO(desde).startOf('day').toISO();
    condiciones.push(`a.hora_inicio >= $${idx++}`);
    valores.push(inicio);
  }
  if (hasta) {
    const fin = DateTime.fromISO(hasta).endOf('day').toISO();
    condiciones.push(`a.hora_inicio <= $${idx++}`);
    valores.push(fin);
  }
  if (usuario_id) {
    condiciones.push(`a.usuario_id = $${idx++}`);
    valores.push(usuario_id);
  }
  if (grupo_id) {
    condiciones.push(`u.grupo_id = $${idx++}`);
    valores.push(grupo_id);
  }

  const whereClause = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const query = `
    SELECT 
      a.id, a.usuario_id, u.full_name AS usuario_nombre,
      u.grupo_id, g.nombre AS grupo_nombre,
      a.estado, a.hora_inicio, a.hora_fin, a.created_at
    FROM wfm_auth.asistencias a
    JOIN wfm_auth.usuarios u ON a.usuario_id = u.id
    LEFT JOIN wfm_auth.grupos g ON u.grupo_id = g.id
    ${whereClause}
    ORDER BY a.hora_inicio DESC
    LIMIT $${idx++};
  `;

  valores.push(limit);
  const { rows } = await pool.query(query, valores);
  return rows.map((row) => {
    const duracion = calcularDuracion(row.hora_inicio, row.hora_fin);
    return { ...row, duracion };
  });
};

/**
 * Obtiene estados actuales (hora_fin IS NULL). Permite filtrar por grupo o usuario.
 */
const obtenerEstadosActuales = async (grupo_id = null, usuario_id = null) => {
  const condiciones = ['a.hora_fin IS NULL'];
  const valores = [];
  let idx = 1;

  if (grupo_id) {
    condiciones.push(`u.grupo_id = $${idx++}`);
    valores.push(grupo_id);
  }
  if (usuario_id) {
    condiciones.push(`a.usuario_id = $${idx++}`);
    valores.push(usuario_id);
  }

  const query = `
    SELECT 
      a.usuario_id, u.full_name AS usuario_nombre,
      u.grupo_id, g.nombre AS grupo_nombre,
      a.estado, a.hora_inicio,
      t.hora_inicio_programada AS turno_inicio, t.hora_fin_programada AS turno_fin, t.tipo AS turno_tipo
    FROM (
      SELECT DISTINCT ON (usuario_id) *
      FROM wfm_auth.asistencias
      WHERE hora_fin IS NULL
      ORDER BY usuario_id, hora_inicio DESC
    ) a
    JOIN wfm_auth.usuarios u ON a.usuario_id = u.id
    LEFT JOIN wfm_auth.grupos g ON u.grupo_id = g.id
    LEFT JOIN (
      SELECT DISTINCT ON (usuario_id) 
        usuario_id, hora_inicio_programada, hora_fin_programada, tipo
      FROM wfm_auth.turnos
      WHERE hora_inicio_programada::date = CURRENT_DATE
        AND publicado = true
      ORDER BY usuario_id, CASE WHEN tipo = 'turno' THEN 0 ELSE 1 END, hora_inicio_programada ASC
    ) t ON u.id = t.usuario_id
    WHERE ${condiciones.join(' AND ')}
      AND (
        a.estado != 'fuera_de_turno' 
        OR a.hora_inicio > (NOW() - INTERVAL '8 hours')
      )
      AND a.hora_inicio > (NOW() - INTERVAL '24 hours')
    ORDER BY a.hora_inicio DESC;
  `;

  const { rows } = await pool.query(query, valores);
  return rows.map((row) => {
    const duracion = calcularDuracion(row.hora_inicio, null);
    
    let turno_label = 'No prog.';
    if (row.turno_inicio && row.turno_fin) {
      // Usamos UTC aquí para que coincida con la visualización del módulo de Programación
      const inicio = DateTime.fromJSDate(row.turno_inicio).setZone('utc').toFormat('HH:mm');
      const fin = DateTime.fromJSDate(row.turno_fin).setZone('utc').toFormat('HH:mm');
      turno_label = `${inicio} - ${fin}`;
      if (row.turno_tipo && row.turno_tipo !== 'turno') {
        turno_label = `${row.turno_tipo.toUpperCase()}`;
      }
    }

    return { 
      ...row, 
      tiempo_en_estado: duracion,
      turno_hoy: turno_label
    };
  });
};

/**
 * Retorna historial del día actual para un usuario.
 */
const obtenerHistorialDelDia = async (usuario_id) => {
  const hoy = DateTime.now().toISODate();
  return obtenerHistorial({ desde: hoy, hasta: hoy, usuario_id });
};

/**
 * Calcula tiempo total entre primer 'disponible' y último 'fuera_de_turno' del día.
 */
const calcularTiempoTotal = async (usuario_id, fechaISO) => {
  const base = parseDateTime(fechaISO) || DateTime.now();
  
  // Rango amplio para capturar turnos nocturnos (24 horas atrás)
  const inicioBusqueda = base.minus({ hours: 24 }).toISO();
  const finBusqueda = base.endOf('day').toISO();

  // Obtenemos historial reciente ordenado cronológicamente
  const { rows } = await pool.query(
    `SELECT estado, hora_inicio, hora_fin 
     FROM wfm_auth.asistencias 
     WHERE usuario_id = $1 AND hora_inicio BETWEEN $2 AND $3
     ORDER BY hora_inicio ASC`,
    [usuario_id, inicioBusqueda, finBusqueda]
  );

  if (rows.length === 0) {
    return { usuario_id, fecha: fechaISO, horas: 0, minutos: 0, segundos: 0, total_segundos: 0, texto: '0h 0m' };
  }

  // Lógica de "Nueva Jornada":
  // Buscamos el punto de corte. Un corte de jornada ocurre si:
  // Hay un 'fuera_de_turno' que duró más de 4 horas o si es el inicio de los registros disponibles.
  // Lógica de "Nueva Jornada" y detección de olvidos:
  let indiceInicioJornada = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const inicio = parseDateTime(r.hora_inicio);
    const fin = r.hora_fin ? parseDateTime(r.hora_fin) : DateTime.now();
    const duracionHoras = fin.diff(inicio, 'hours').hours;

    // A. Si un registro individual dura más de 14 horas, es altamente probable que sea un olvido
    // En este caso, lo que venga antes no debe sumarse a la jornada actual
    if (duracionHoras > 14) {
      indiceInicioJornada = i + 1;
      continue;
    }

    // B. Si hay un gap de más de 7 horas entre registros (o por estar Fuera de Turno)
    if (r.estado === 'fuera_de_turno' && r.hora_fin) {
      const finCierre = parseDateTime(r.hora_fin);
      const siguienteInicio = (i + 1 < rows.length) ? parseDateTime(rows[i+1].hora_inicio) : null;
      
      if (siguienteInicio) {
        const gapHoras = siguienteInicio.diff(finCierre, 'hours').hours;
        if (gapHoras >= 7) { // Basado en solicitud del usuario (reset tras 7 horas)
          indiceInicioJornada = i + 1;
        }
      }
    }
  }

  const registrosJornadaActual = rows.slice(indiceInicioJornada).filter(r => r.estado !== 'fuera_de_turno');

  let totalSegundos = 0;
  registrosJornadaActual.forEach(row => {
    const dur = calcularDuracion(row.hora_inicio, row.hora_fin);
    // Solo sumamos duraciones razonables (< 14h) por si acaso se filtró algo
    if (dur.total_segundos < 14 * 3600) {
      totalSegundos += dur.total_segundos;
    }
  });

  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  
  const texto = horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;

  return {
    usuario_id,
    fecha: fechaISO,
    horas,
    minutos,
    total_segundos: totalSegundos,
    texto
  };
};

module.exports = {
  marcarEstado,
  cerrarEstadoAnterior,
  calcularDuracion,
  calcularTiempoTotal,
  obtenerHistorial,
  obtenerEstadosActuales,
  obtenerHistorialDelDia,
  ESTADOS_VALIDOS
};
