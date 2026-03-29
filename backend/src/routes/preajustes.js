const express = require('express');
const router = express.Router();
const preajustesController = require('../controllers/preajustesController');
const { verifyToken, isAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Preajustes
 *   description: Gestión de preajustes rápidos de turnos
 */

/**
 * @swagger
 * /api/preajustes:
 *   get:
 *     summary: Obtener todos los preajustes
 *     tags: [Preajustes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de preajustes
 */
router.get('/', verifyToken, preajustesController.getPreajustes);

/**
 * @swagger
 * /api/preajustes:
 *   post:
 *     summary: Crear un nuevo preajuste
 *     tags: [Preajustes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preajuste creado
 */
router.post('/', verifyToken, isAdmin, preajustesController.crearPreajuste);

/**
 * @swagger
 * /api/preajustes/{id}:
 *   put:
 *     summary: Actualizar un preajuste
 *     tags: [Preajustes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preajuste actualizado
 */
router.put('/:id', verifyToken, isAdmin, preajustesController.actualizarPreajuste);

/**
 * @swagger
 * /api/preajustes/{id}:
 *   delete:
 *     summary: Eliminar un preajuste
 *     tags: [Preajustes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preajuste eliminado
 */
router.delete('/:id', verifyToken, isAdmin, preajustesController.eliminarPreajuste);

module.exports = router;
