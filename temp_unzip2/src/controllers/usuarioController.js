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
   * Crea un usuario con el rol especificado (por defecto "empleado")
   */
  crearEmpleado: async (req, res) => {
    const { nombre_completo, username, password, grupo_id, rol } = req.body;

    console.log('[Crear Usuario] Datos recibidos:', { nombre_completo, username, grupo_id, rol, tienePassword: !!password });

    if (!getConnectionStatus()) {
      return res.status(503).json({
        success: false,
        error: 'Servicio no disponible. La base de datos no está conectada.'
      });
    }

    try {
      // Validar existencia del grupo (si se proporciona)
      if (grupo_id) {
        console.log('[Crear Usuario] Verificando grupo:', grupo_id);
        const grupoResult = await pool.query(
          'SELECT id FROM wfm_auth.grupos WHERE id = $1',
          [grupo_id]
        );

        if (grupoResult.rowCount === 0) {
          console.warn('[Crear Usuario] Grupo no encontrado:', grupo_id);
          return res.status(404).json({
            success: false,
            error: 'El grupo especificado no existe'
          });
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const now = DateTime.utc().toISO();
      const id = randomUUID();
      const finalRole = rol || 'empleado';

      console.log('[Crear Usuario] Insertando usuario con rol:', finalRole);
      const result = await pool.query(
        'INSERT INTO wfm_auth.usuarios (id, username, password_hash, full_name, role, grupo_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, full_name, role as rol, grupo_id',
        [id, username, passwordHash, nombre_completo, finalRole, grupo_id, now, now]
      );

      console.log('[Crear Usuario] Usuario creado exitosamente:', result.rows[0]);
      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('[Crear Usuario] Error detallado:', error);

      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'El nombre de usuario ya está en uso'
        });
      }

      return res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor'
      });
    }
  },

  /**
   * PUT /api/usuarios/empleados/:id
   * Actualiza los datos del usuario, incluyendo rol y password opcional
   */
  actualizarEmpleado: async (req, res) => {
    const { id } = req.params;
    const { nombre_completo, username, password, grupo_id, rol } = req.body;

    if (!getConnectionStatus()) return res.status(503).json({ success: false, error: 'DB Offline' });

    try {
      const now = DateTime.utc().toISO();
      let query, params;

      // Primero, obtenemos el usuario actual para no sobreescribir con valores nulos
      const currentRes = await pool.query('SELECT role FROM wfm_auth.usuarios WHERE id = $1', [id]);
      if (currentRes.rowCount === 0) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      
      const finalRole = rol || currentRes.rows[0].role;

      if (password && password.trim() !== '') {
        const passwordHash = await bcrypt.hash(password, 10);
        query = 'UPDATE wfm_auth.usuarios SET username = $1, password_hash = $2, full_name = $3, grupo_id = $4, role = $5, updated_at = $6 WHERE id = $7 RETURNING id, username, full_name, role as rol, grupo_id';
        params = [username, passwordHash, nombre_completo, grupo_id, finalRole, now, id];
      } else {
        query = 'UPDATE wfm_auth.usuarios SET username = $1, full_name = $2, grupo_id = $3, role = $4, updated_at = $5 WHERE id = $6 RETURNING id, username, full_name, role as rol, grupo_id';
        params = [username, nombre_completo, grupo_id, finalRole, now, id];
      }

      const result = await pool.query(query, params);
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
