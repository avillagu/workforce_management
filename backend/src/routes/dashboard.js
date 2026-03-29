const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Obtiene estadísticas generales para el dashboard (solo admin/supervisor)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', authMiddleware, dashboardController.getDashboardStats);

module.exports = router;
