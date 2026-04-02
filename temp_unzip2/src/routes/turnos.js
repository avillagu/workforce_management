const express = require('express');
const router = express.Router();
const turnosController = require('../controllers/turnosController');
const { verifyToken, isAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Turnos
 *   description: Gestión de programación de turnos
 */

/**
 * @swagger
 * /api/turnos:
 *   get:
 *     summary: Obtener todos los turnos en un rango de fechas
 *     tags: [Turnos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fecha_inicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-03-24"
 *       - in: query
 *         name: fecha_fin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-03-31"
 *     responses:
 *       200:
 *         description: Lista de turnos
 *       401:
 *         description: No autorizado
 */
router.get('/', verifyToken, turnosController.getTurnos);

/**
 * @swagger
 * /api/turnos/empleado/{usuario_id}:
 *   get:
 *     summary: Obtener turnos de un empleado específico
 *     tags: [Turnos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: usuario_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: fecha_inicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fecha_fin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Turnos del empleado
 */
router.get('/empleado/:usuario_id', verifyToken, turnosController.getTurnosEmpleado);

/**
 * @swagger
 * /api/turnos:
 *   post:
 *     summary: Crear un turno individual
 *     tags: [Turnos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usuario_id, hora_inicio, hora_fin]
 *             properties:
 *               usuario_id: { type: string, format: uuid }
 *               hora_inicio: { type: string, format: date-time, example: "2026-03-24T08:00:00Z" }
 *               hora_fin: { type: string, format: date-time, example: "2026-03-24T17:00:00Z" }
 *     responses:
 *       201:
 *         description: Turno creado
 *       409:
 *         description: Conflicto de superposición
 */
router.post('/', verifyToken, isAdmin, turnosController.crearTurno);

/**
 * @swagger
 * /api/turnos/masivo:
 *   post:
 *     summary: Programación masiva de turnos
 *     tags: [Turnos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [empleado_ids, fecha_inicio, fecha_fin, hora_inicio, hora_fin]
 *             properties:
 *               empleado_ids: { type: array, items: { type: string, format: uuid } }
 *               fecha_inicio: { type: string, format: date, example: "2026-03-24" }
 *               fecha_fin: { type: string, format: date, example: "2026-03-28" }
 *               hora_inicio: { type: string, example: "08:00" }
 *               hora_fin: { type: string, example: "17:00" }
 *     responses:
 *       201:
 *         description: Turnos creados masivamente
 */
router.post('/masivo', verifyToken, isAdmin, turnosController.programacionMasiva);
router.post('/masivo-eliminar', verifyToken, isAdmin, turnosController.eliminarTurnosMasivo);

/**
 * @swagger
 * /api/turnos/mover:
 *   post:
 *     summary: Mover o intercambiar un turno entre empleados/fechas
 *     tags: [Turnos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, destino_usuario_id, destino_fecha]
 *             properties:
 *               id: { type: string, format: uuid }
 *               destino_usuario_id: { type: string, format: uuid }
 *               destino_fecha: { type: string, format: date, example: "2026-03-24" }
 *     responses:
 *       200:
 *         description: Turno movido exitosamente
 */
router.post('/mover', verifyToken, isAdmin, turnosController.moverTurno);

/**
 * @swagger
 * /api/turnos/publicar:
 *   post:
 *     summary: Publicar todos los borradores en un rango de fechas
 *     tags: [Turnos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fecha_inicio, fecha_fin]
 *             properties:
 *               fecha_inicio: { type: string, format: date }
 *               fecha_fin: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Turnos publicados correctamente
 */
router.post('/publicar', verifyToken, isAdmin, turnosController.publicarTurnos);

/**
 * @swagger
 * /api/turnos/{id}:
 *   put:
 *     summary: Actualizar un turno existente
 *     tags: [Turnos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usuario_id: { type: string, format: uuid }
 *               hora_inicio: { type: string, format: date-time }
 *               hora_fin: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Turno actualizado
 */
router.put('/:id', verifyToken, isAdmin, turnosController.actualizarTurno);

/**
 * @swagger
 * /api/turnos/{id}:
 *   delete:
 *     summary: Eliminar un turno
 *     tags: [Turnos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Turno eliminado
 */
router.delete('/:id', verifyToken, isAdmin, turnosController.eliminarTurno);

module.exports = router;
