const { randomUUID } = require('crypto');
const { DateTime } = require('luxon');
const { pool, getConnectionStatus } = require('../config/database');

// Controlador CRUD de grupos respetando el esquema wfm_auth.grupos
const gruposController = {
  /**
   * GET /api/grupos
   * Lista todos los grupos
   */
  getAll: async (_req, res) => {
    if (!getConnectionStatus()) {
      return res.status(503).json({
        success: false,
        error: 'Servicio no disponible. La base de datos no está conectada.'
      });
    }

    try {
      const result = await pool.query(
        'SELECT id, nombre, descripcion, activo, created_at, updated_at FROM wfm_auth.grupos ORDER BY nombre ASC'
      );

      return res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error al obtener grupos:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  },

  /**
   * POST /api/grupos
   * Crea un nuevo grupo
   */
  create: async (req, res) => {
    const { nombre, descripcion, activo = true } = req.body;

    if (!getConnectionStatus()) {
      return res.status(503).json({
        success: false,
        error: 'Servicio no disponible. La base de datos no está conectada.'
      });
    }

    try {
      const now = DateTime.utc().toISO();
      const id = randomUUID();

      const result = await pool.query(
        'INSERT INTO wfm_auth.grupos (id, nombre, descripcion, activo, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre, descripcion, activo, created_at, updated_at',
        [id, nombre, descripcion || null, activo, now, now]
      );

      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'El nombre del grupo ya está en uso' });
      }

      console.error('Error al crear grupo:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  },

  /**
   * PUT /api/grupos/:id
   * Actualiza un grupo existente
   */
  update: async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;

    if (!getConnectionStatus()) {
      return res.status(503).json({
        success: false,
        error: 'Servicio no disponible. La base de datos no está conectada.'
      });
    }

    try {
      const now = DateTime.utc().toISO();
      const result = await pool.query(
        'UPDATE wfm_auth.grupos SET nombre = $1, descripcion = $2, activo = $3, updated_at = $4 WHERE id = $5 RETURNING id, nombre, descripcion, activo, created_at, updated_at',
        [nombre, descripcion || null, activo, now, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Grupo no encontrado' });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: 'El nombre del grupo ya está en uso' });
      }

      console.error('Error al actualizar grupo:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  },

  /**
   * DELETE /api/grupos/:id
   * Elimina (o inactiva) un grupo. Al no existir flag de estado, se realiza eliminación física.
   */
  remove: async (req, res) => {
    const { id } = req.params;

    if (!getConnectionStatus()) {
      return res.status(503).json({
        success: false,
        error: 'Servicio no disponible. La base de datos no está conectada.'
      });
    }

    try {
      // Regla de Negocio (Mejora Senior): Impedir que grupos con empleados sean borrados
      const userCheck = await pool.query(
        'SELECT id FROM wfm_auth.usuarios WHERE grupo_id = $1 LIMIT 1',
        [id]
      );

      if (userCheck.rowCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'Operación denegada. No se puede eliminar este grupo porque tiene empleados enlazados. Reasigne a los empleados primero.'
        });
      }

      const result = await pool.query(
        'DELETE FROM wfm_auth.grupos WHERE id = $1 RETURNING id, nombre, descripcion, activo, created_at, updated_at',
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Grupo no encontrado' });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error al eliminar grupo:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
};

module.exports = gruposController;
