const express = require('express');
const router = express.Router();
const solicitudesController = require('../controllers/solicitudesController');
const { verifyToken } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Solicitudes
 *   description: Gestión de solicitudes de cambio de turno
 */

/**
 * @swagger
 * /api/solicitudes:
 *   get:
 *     summary: Obtener solicitudes visibles para el usuario logueado
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', verifyToken, solicitudesController.getSolicitudes);

/**
 * @swagger
 * /api/solicitudes:
 *   post:
 *     summary: Crear una nueva solicitud de cambio de turno
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', verifyToken, solicitudesController.crearSolicitud);

/**
 * @swagger
 * /api/solicitudes/{id}/procesar:
 *   post:
 *     summary: Aprobar o rechazar una solicitud
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/procesar', verifyToken, solicitudesController.procesarSolicitud);

module.exports = router;
