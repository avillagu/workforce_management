const preajustesService = require('../services/preajustesService');

/**
 * Listar preajustes
 */
const getPreajustes = async (req, res) => {
  try {
    const listado = await preajustesService.getPreajustes();
    res.json({ success: true, data: listado });
  } catch (error) {
    console.error('Error en getPreajustes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Crear preajuste
 */
const crearPreajuste = async (req, res) => {
  try {
    const nuevo = await preajustesService.crearPreajuste(req.body);
    res.json({ success: true, data: nuevo });
  } catch (error) {
    console.error('Error en crearPreajuste:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Actualizar preajuste
 */
const actualizarPreajuste = async (req, res) => {
  try {
    const { id } = req.params;
    const actualizado = await preajustesService.actualizarPreajuste(id, req.body);
    if (!actualizado) return res.status(404).json({ success: false, error: 'No encontrado' });
    res.json({ success: true, data: actualizado });
  } catch (error) {
    console.error('Error en actualizarPreajuste:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Eliminar preajuste
 */
const eliminarPreajuste = async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await preajustesService.eliminarPreajuste(id);
    if (!eliminado) return res.status(404).json({ success: false, error: 'No encontrado' });
    res.json({ success: true, data: eliminado });
  } catch (error) {
    console.error('Error en eliminarPreajuste:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getPreajustes,
  crearPreajuste,
  actualizarPreajuste,
  eliminarPreajuste
};
