const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const asistenciasController = require('../controllers/asistenciasController');
const { verifyToken } = require('../middleware/auth');

/**
 * Middleware para validar inputs
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

/**
 * @swagger
 * tags:
 *   name: Asistencias
 *   description: Gestión de estados de asistencia y control de jornada
 */

/**
 * @swagger
 * /api/asistencias/marcar:
 *   post:
 *     summary: Marcar un nuevo estado de asistencia
 *     tags: [Asistencias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [disponible, descanso, en_bano, fuera_de_turno]
 *     responses:
 *       201:
 *         description: Estado marcado correctamente
 *       400:
 *         description: Estado inválido
 *       409:
 *         description: Estado duplicado (ya activo)
 */
router.post(
  '/marcar', 
  verifyToken, 
  [
    body('estado')
      .trim()
      .notEmpty()
      .withMessage('El estado es obligatorio')
      .isIn(['disponible', 'descanso', 'en_bano', 'fuera_de_turno', 'alerta'])
      .withMessage('Estado de asistencia no válido')
  ],
  validate,
  asistenciasController.marcarEstado
);

/**
 * @swagger
 * /api/asistencias/historial:
 *   get:
 *     summary: Obtener historial de asistencias con filtros
 *     tags: [Asistencias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: desde
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicio (YYYY-MM-DD)
 *       - in: query
 *         name: hasta
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha fin (YYYY-MM-DD)
 *       - in: query
 *         name: grupo_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por grupo
 *       - in: query
 *         name: usuario_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por usuario (empleado solo puede ver su propio historial)
 *     responses:
 *       200:
 *         description: Lista de asistencias
 */
router.get('/historial', verifyToken, asistenciasController.obtenerHistorial);

/**
 * @swagger
 * /api/asistencias/estado-actual:
 *   get:
 *     summary: Obtener el estado actual de todos los empleados
 *     tags: [Asistencias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: grupo_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por grupo
 *     responses:
 *       200:
 *         description: Estados actuales
 */
router.get('/estado-actual', verifyToken, asistenciasController.obtenerEstadoActual);

/**
 * @swagger
 * /api/asistencias/mis-estados:
 *   get:
 *     summary: Obtener el historial del día del usuario autenticado
 *     tags: [Asistencias]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial del día
 */
router.get('/mis-estados', verifyToken, asistenciasController.obtenerMisEstados);

/**
 * @swagger
 * /api/asistencias/tiempo-total:
 *   get:
 *     summary: Calcular tiempo total de la jornada (primer disponible → último fuera_de_turno)
 *     tags: [Asistencias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: usuario_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Usuario a consultar (opcional, se usa el autenticado)
 *       - in: query
 *         name: fecha
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha en formato YYYY-MM-DD (opcional, default hoy UTC)
 *     responses:
 *       200:
 *         description: Tiempo total calculado
 */
router.get('/tiempo-total', verifyToken, asistenciasController.obtenerTiempoTotal);

/**
 * @swagger
 * /api/asistencias/estados-validos:
 *   get:
 *     summary: Obtener lista de estados permitidos
 *     tags: [Asistencias]
 *     responses:
 *       200:
 *         description: Lista de estados
 */
router.get('/estados-validos', verifyToken, asistenciasController.estadosValidos);

module.exports = router;
