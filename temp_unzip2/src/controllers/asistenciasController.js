const asistenciasService = require('../services/asistenciasService');
const { ESTADOS_VALIDOS } = require('../services/asistenciasService');
const { DateTime } = require('luxon');

/**
 * POST /api/asistencias/marcar
 */
const marcarEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!estado) {
      return res.status(400).json({ success: false, error: 'El campo estado es obligatorio' });
    }

    const usuario_id = req.user.id;
    const nuevo = await asistenciasService.marcarEstado(usuario_id, estado);
    res.status(201).json({ success: true, data: nuevo });
  } catch (error) {
    console.error('Error en marcarEstado:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/asistencias/historial
 */
const obtenerHistorial = async (req, res) => {
  try {
    const { desde, hasta, grupo_id, usuario_id, limit } = req.query;
    const rol = req.user.role;

    let filtros = { desde, hasta, grupo_id, usuario_id, limit: limit ? parseInt(limit) : undefined };

    // Empleados solo pueden ver su propio historial
    if (rol === 'empleado') {
      filtros = { ...filtros, usuario_id: req.user.id };
    }

    const historial = await asistenciasService.obtenerHistorial(filtros);
    res.json({ success: true, data: historial });
  } catch (error) {
    console.error('Error en obtenerHistorial:', error);
    res.status(500).json({ success: false, error: 'Error al obtener historial' });
  }
};

/**
 * GET /api/asistencias/estado-actual
 */
const obtenerEstadoActual = async (req, res) => {
  try {
    const { grupo_id } = req.query;
    const rol = req.user.role;

    const usuarioFiltro = rol === 'empleado' ? req.user.id : null;
    const estados = await asistenciasService.obtenerEstadosActuales(grupo_id, usuarioFiltro);
    res.json({ success: true, data: estados });
  } catch (error) {
    console.error('Error en obtenerEstadoActual:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estados actuales' });
  }
};

/**
 * GET /api/asistencias/mis-estados
 */
const obtenerMisEstados = async (req, res) => {
  try {
    const historial = await asistenciasService.obtenerHistorialDelDia(req.user.id);
    res.json({ success: true, data: historial });
  } catch (error) {
    console.error('Error en obtenerMisEstados:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estados del día' });
  }
};

/**
 * GET /api/asistencias/tiempo-total
 */
const obtenerTiempoTotal = async (req, res) => {
  try {
    const fecha = req.query.fecha || DateTime.now().toISODate();
    const requestedUserId = req.query.usuario_id || req.user.id;

    if (req.user.role === 'empleado' && requestedUserId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'No puedes consultar otros usuarios' });
    }

    const resultado = await asistenciasService.calcularTiempoTotal(requestedUserId, fecha);
    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Error en obtenerTiempoTotal:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/asistencias/estados-validos
 */
const estadosValidos = (_req, res) => {
  res.json({ success: true, data: ESTADOS_VALIDOS });
};

module.exports = {
  marcarEstado,
  obtenerHistorial,
  obtenerEstadoActual,
  obtenerMisEstados,
  obtenerTiempoTotal,
  estadosValidos
};
