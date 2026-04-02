const { pool } = require('../config/database');

/**
 * Obtener notificaciones para un usuario
 */
const getNotificaciones = async (usuarioId) => {
  const { rows } = await pool.query(
    'SELECT * FROM wfm_auth.notificaciones WHERE usuario_id = $1 ORDER BY created_at DESC LIMIT 50',
    [usuarioId]
  );
  return rows;
};

/**
 * Marcar como leída
 */
const marcarLeida = async (id, usuarioId) => {
  await pool.query(
    'UPDATE wfm_auth.notificaciones SET leido = true WHERE id = $1 AND usuario_id = $2',
    [id, usuarioId]
  );
};

module.exports = {
  getNotificaciones,
  marcarLeida
};
