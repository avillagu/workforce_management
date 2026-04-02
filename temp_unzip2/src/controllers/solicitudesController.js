const solicitudesService = require('../services/solicitudesService');

/**
 * Listar solicitudes según permisos
 */
const getSolicitudes = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const rol = req.user.role; // corregido de 'rol'
    const solicitudes = await solicitudesService.getSolicitudes(usuarioId, rol);
    res.json({ success: true, data: solicitudes });
  } catch (error) {
    console.error('Error en getSolicitudes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Crear solicitud
 */
const crearSolicitud = async (req, res) => {
  try {
    const { objetivo_id, fecha } = req.body;
    const solicitante_id = req.user.id;

    if (!objetivo_id || !fecha) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros: objetivo_id, fecha' });
    }

    const nueva = await solicitudesService.crearSolicitud({
      solicitante_id,
      objetivo_id,
      fecha
    });

    res.status(201).json({ success: true, data: nueva });
  } catch (error) {
    console.error('Error en crearSolicitud:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

/**
 * Procesar aprobación/rechazo
 */
const procesarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body; // aprobado, rechazado
    const usuarioId = req.user.id;
    const rol = req.user.role; // corregido de 'rol'

    if (!decision) {
      return res.status(400).json({ success: false, error: 'Falta parámetro: decision' });
    }

    const actualizada = await solicitudesService.procesarSolicitud(id, usuarioId, rol, decision);
    res.json({ success: true, data: actualizada });
  } catch (error) {
    console.error('Error en procesarSolicitud:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  getSolicitudes,
  crearSolicitud,
  procesarSolicitud
};
