const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const { DateTime } = require('luxon');
const { pool, getConnectionStatus } = require('../config/database');

// Controlador para operaciones específicas de usuarios (empleados)
const usuarioController = {
  /**
   * GET /api/usuarios/empleados
   * Obtiene la lista de todos los empleados
   */
  listarEmpleados: async (req, res) => {
    if (!getConnectionStatus()) {
      return res.status(503).json({
        success: false,
        error: 'Servicio no disponible. La base de datos no está conectada.'
      });
    }

    try {
      const result = await pool.query(
        `SELECT 
          u.id, 
          u.username, 
          u.full_name as nombre_completo, 
          u.role as rol, 
          u.grupo_id,
          g.nombre as grupo_nombre
        FROM wfm_auth.usuarios u
        LEFT JOIN wfm_auth.grupos g ON u.grupo_id = g.id
        WHERE u.role = 'empleado'
        ORDER BY u.full_name ASC`
      );

      return res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Error al listar empleados:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  },

  /**
   * POST /api/usuarios/empleados
   * Crea un empleado con rol fijo "empleado"
   */
  crearEmpleado: async (req, res) => {
    const { nombre_completo, username, password, grupo_id } = req.body;

    console.log('[Crear Empleado] Datos recibidos:', { nombre_completo, username, grupo_id, tienePassword: !!password });

    if (!getConnectionStatus()) {
      return res.status(503).json({
        success: false,
        error: 'Servicio no disponible. La base de datos no está conectada.'
      });
    }

    try {
      // Validar existencia del grupo
      console.log('[Crear Empleado] Verificando grupo:', grupo_id);
      const grupoResult = await pool.query(
        'SELECT id FROM wfm_auth.grupos WHERE id = $1',
        [grupo_id]
      );

      if (grupoResult.rowCount === 0) {
        console.warn('[Crear Empleado] Grupo no encontrado:', grupo_id);
        return res.status(404).json({
          success: false,
          error: 'El grupo especificado no existe'
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const now = DateTime.utc().toISO();
      const id = randomUUID();

      console.log('[Crear Empleado] Insertando usuario...');
      // NOTA: La tabla usa 'full_name' y 'role'. NO tiene columna 'email'
      const result = await pool.query(
        'INSERT INTO wfm_auth.usuarios (id, username, password_hash, full_name, role, grupo_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, full_name, role, grupo_id',
        [id, username, passwordHash, nombre_completo, 'empleado', grupo_id, now, now]
      );

      console.log('[Crear Empleado] Usuario creado exitosamente:', result.rows[0]);
      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('[Crear Empleado] Error detallado:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      });

      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'El nombre de usuario ya está en uso'
        });
      }

      if (error.code === '23503') {
        return res.status(400).json({
          success: false,
          error: 'El grupo especificado no es válido'
        });
      }

      return res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * PUT /api/usuarios/empleados/:id
   * Actualiza los datos base del empleado, con password opcional
   */
  actualizarEmpleado: async (req, res) => {
    const { id } = req.params;
    const { nombre_completo, username, password, grupo_id } = req.body;

    if (!getConnectionStatus()) return res.status(503).json({ success: false, error: 'DB Offline' });

    try {
      const now = DateTime.utc().toISO();
      let query, params;

      if (password && password.trim() !== '') {
        const passwordHash = await bcrypt.hash(password, 10);
        query = 'UPDATE wfm_auth.usuarios SET username = $1, password_hash = $2, full_name = $3, grupo_id = $4, updated_at = $5 WHERE id = $6 RETURNING id, username, full_name, role, grupo_id';
        params = [username, passwordHash, nombre_completo, grupo_id, now, id];
      } else {
        query = 'UPDATE wfm_auth.usuarios SET username = $1, full_name = $2, grupo_id = $3, updated_at = $4 WHERE id = $5 RETURNING id, username, full_name, role, grupo_id';
        params = [username, nombre_completo, grupo_id, now, id];
      }

      const result = await pool.query(query, params);
      
      if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ success: false, error: 'Username ya ocupado' });
      console.error('Error actualizarEmpleado:', error);
      return res.status(500).json({ success: false, error: 'Error del servidor' });
    }
  },

  /**
   * DELETE /api/usuarios/empleados/:id
   */
  eliminarEmpleado: async (req, res) => {
    const { id } = req.params;
    
    if (!getConnectionStatus()) return res.status(503).json({ success: false, error: 'DB Offline' });

    try {
      const result = await pool.query('DELETE FROM wfm_auth.usuarios WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error eliminarEmpleado:', error);
      return res.status(500).json({ success: false, error: 'Error del servidor' });
    }
  }
};

module.exports = usuarioController;
