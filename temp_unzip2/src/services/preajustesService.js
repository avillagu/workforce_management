const { pool } = require('../config/database');

/**
 * Obtiene todos los preajustes ordenados
 */
const getPreajustes = async () => {
  const query = 'SELECT * FROM wfm_auth.preajustes_turnos ORDER BY created_at ASC;';
  const { rows } = await pool.query(query);
  return rows;
};

/**
 * Crea un preajuste
 */
const crearPreajuste = async (data) => {
  const { nombre, hora_inicio, hora_fin, icono = 'schedule' } = data;
  const query = `
    INSERT INTO wfm_auth.preajustes_turnos (nombre, hora_inicio, hora_fin, icono)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [nombre, hora_inicio, hora_fin, icono]);
  return rows[0];
};

/**
 * Actualiza un preajuste
 */
const actualizarPreajuste = async (id, data) => {
  const { nombre, hora_inicio, hora_fin, icono } = data;
  const query = `
    UPDATE wfm_auth.preajustes_turnos
    SET nombre = COALESCE($2, nombre),
        hora_inicio = COALESCE($3, hora_inicio),
        hora_fin = COALESCE($4, hora_fin),
        icono = COALESCE($5, icono)
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [id, nombre, hora_inicio, hora_fin, icono]);
  return rows[0];
};

/**
 * Elimina un preajuste
 */
const eliminarPreajuste = async (id) => {
  const query = 'DELETE FROM wfm_auth.preajustes_turnos WHERE id = $1 RETURNING *;';
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

module.exports = {
  getPreajustes,
  crearPreajuste,
  actualizarPreajuste,
  eliminarPreajuste
};
