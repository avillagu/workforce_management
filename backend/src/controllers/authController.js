const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon'); // Implementación Anti-Cachos dictada en los requisitos
const { pool, getConnectionStatus } = require('../config/database');

const authController = {
  /**
   * POST /api/auth/login
   * Valida credenciales y devuelve token JWT
   */
  login: async (req, res) => {
    const { username, password } = req.body;

    // Validación básica
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña son requeridos'
      });
    }

    // Verificar conexión a la base de datos
    if (!getConnectionStatus()) {
      console.error('⚠️  Intento de login sin conexión a base de datos');
      return res.status(503).json({
        success: false,
        error: 'Servicio no disponible. La base de datos no está conectada.',
        tip: 'Contacta al administrador para verificar la configuración del servidor'
      });
    }

    try {
      const result = await pool.query(
        `SELECT 
          u.id, 
          u.username, 
          u.password_hash, 
          u.full_name, 
          u.role as rol,
          u.grupo_id,
          g.nombre as grupo_nombre
        FROM wfm_auth.usuarios u
        LEFT JOIN wfm_auth.grupos g ON u.grupo_id = g.id
        WHERE u.username = $1`,
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }

      const user = result.rows[0];

      // Validar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }

      // Actualizar timestamp de acceso usando Luxon (Anti-Cachos UTC)
      const nowUtc = DateTime.utc().toISO();
      await pool.query(
        'UPDATE wfm_auth.usuarios SET updated_at = $1 WHERE id = $2',
        [nowUtc, user.id]
      );

      // Generar token JWT
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.rol // corregido de 'user.role' que era undefined
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      // Devolver respuesta exitosa (Exponiendo UTC puro)
      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            nombre_completo: user.full_name,
            rol: user.rol,
            grupo_id: user.grupo_id,
            grupo_nombre: user.grupo_nombre
          }
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  /**
   * GET /api/auth/me
   * Obtiene información del usuario autenticado
   */
  getMe: async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
          u.id, 
          u.username, 
          u.full_name as nombre_completo, 
          u.role,
          u.grupo_id,
          g.nombre as grupo_nombre
        FROM wfm_auth.usuarios u
        LEFT JOIN wfm_auth.grupos g ON u.grupo_id = g.id
        WHERE u.id = $1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  /**
   * GET /api/auth/menu
   * Devuelve el menú disponible según el rol del usuario
   */
  getMenu: async (req, res) => {
    try {
      const menuConfig = {
        admin: [
          { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
          { path: '/operacion', label: 'Operación', icon: 'operations' },
          { path: '/programacion', label: 'Programación', icon: 'calendar' },
          { path: '/asistencias', label: 'Asistencias', icon: 'attendance' },
          { path: '/novedades', label: 'Novedades', icon: 'notifications' }
        ],
        supervisor: [
          { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
          { path: '/operacion', label: 'Operación', icon: 'operations' },
          { path: '/programacion', label: 'Programación', icon: 'calendar' },
          { path: '/asistencias', label: 'Asistencias', icon: 'attendance' },
          { path: '/novedades', label: 'Novedades', icon: 'notifications' }
        ],
        empleado: [
          { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
          { path: '/programacion', label: 'Programación', icon: 'calendar' },
          { path: '/asistencias', label: 'Asistencias', icon: 'attendance' },
          { path: '/novedades', label: 'Novedades', icon: 'notifications' }
        ]
      };

      const userRole = req.user.role || 'empleado';
      const menu = menuConfig[userRole] || menuConfig.empleado;

      res.json({
        success: true,
        data: {
          role: userRole,
          menu
        }
      });
    } catch (error) {
      console.error('Error al obtener menú:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  },

  /**
   * PUT /api/auth/change-password
   * Cambia la contraseña del usuario autenticado
   */
  changePassword: async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Ambas contraseñas son requeridas'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    try {
      // Obtener el hash actual
      const result = await pool.query(
        'SELECT password_hash FROM wfm_auth.usuarios WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const user = result.rows[0];

      // Comparar actual
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'La contraseña actual es incorrecta'
        });
      }

      // Hashear la nueva
      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      // Actualizar
      await pool.query(
        'UPDATE wfm_auth.usuarios SET password_hash = $1 WHERE id = $2',
        [newPasswordHash, userId]
      );

      res.json({
        success: true,
        message: 'Contraseña actualizada correctamente'
      });

    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
};

module.exports = authController;
