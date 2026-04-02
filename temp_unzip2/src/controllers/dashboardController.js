const dashboardService = require('../services/dashboardService');

/**
 * GET /api/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const stats = await dashboardService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error en getDashboardStats:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas del dashboard'
    });
  }
};

module.exports = {
  getDashboardStats
};
