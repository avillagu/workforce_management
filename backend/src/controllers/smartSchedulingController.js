const smartSchedulingService = require('../services/smartSchedulingService');

const getConfiguraciones = async (req, res) => {
  try {
    const configs = await smartSchedulingService.getConfiguraciones();
    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('Error en getConfiguraciones:', error);
    res.status(500).json({ success: false, error: 'Error al obtener configuraciones' });
  }
};

const crearConfiguracion = async (req, res) => {
  try {
    const data = {
      ...req.body,
      creado_por: req.user.id
    };
    const nueva = await smartSchedulingService.crearConfiguracion(data);
    res.status(201).json({ success: true, data: nueva });
  } catch (error) {
    console.error('Error en crearConfiguracion:', error);
    res.status(500).json({ success: false, error: 'Error al crear configuración' });
  }
};

const actualizarConfiguracion = async (req, res) => {
  try {
    const { id } = req.params;
    const actualizada = await smartSchedulingService.actualizarConfiguracion(id, req.body);
    res.json({ success: true, data: actualizada });
  } catch (error) {
    console.error('Error en actualizarConfiguracion:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar configuración' });
  }
};

const eliminarConfiguracion = async (req, res) => {
  try {
    const { id } = req.params;
    await smartSchedulingService.eliminarConfiguracion(id);
    res.json({ success: true, message: 'Configuración eliminada' });
  } catch (error) {
    console.error('Error en eliminarConfiguracion:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar configuración' });
  }
};

const generarProgramacion = async (req, res) => {
  try {
    const { config, fecha_inicio } = req.body;
    const resultado = await smartSchedulingService.generarProgramacion(config, fecha_inicio);
    res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Error en generarProgramacion:', error);
    res.status(500).json({ success: false, error: 'Error al generar programación' });
  }
};

module.exports = {
  getConfiguraciones,
  crearConfiguracion,
  actualizarConfiguracion,
  eliminarConfiguracion,
  generarProgramacion
};
