const notificacionesService = require('../services/notificacionesService');

/**
 * Controller for Notificaciones
 */
const notificacionesController = {
  /**
   * GET /api/notificaciones
   */
  getNotificaciones: async (req, res) => {
    try {
      const { id: usuarioId } = req.user;
      const data = await notificacionesService.getNotificaciones(usuarioId);
      return res.json({ success: true, data });
    } catch (error) {
       console.error('Error fetching notifications:', error);
       return res.status(500).json({ success: false, error: 'Internal error' });
    }
  },

  /**
   * POST /api/notificaciones/:id/leida
   */
  marcarLeida: async (req, res) => {
    try {
      const { id } = req.params;
      const { id: usuarioId } = req.user;
      await notificacionesService.marcarLeida(id, usuarioId);
      return res.json({ success: true });
    } catch (error) {
       return res.status(500).json({ success: false, error: 'Internal error' });
    }
  }
};

module.exports = notificacionesController;
