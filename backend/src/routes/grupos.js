const express = require('express');
const { body, param, validationResult } = require('express-validator');
const gruposController = require('../controllers/gruposController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      details: errors.array().map(e => ({ field: e.param, message: e.msg }))
    });
  }
  return next();
};

/**
 * @swagger
 * /grupos:
 *   get:
 *     summary: Listar todos los grupos
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de grupos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Grupo'
 *       401:
 *         description: Token no proporcionado o inválido
 */
router.get('/', authMiddleware, gruposController.getAll);

/**
 * @swagger
 * /grupos:
 *   post:
 *     summary: Crear un nuevo grupo
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GrupoCreate'
 *     responses:
 *       201:
 *         description: Grupo creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Grupo'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token no proporcionado o inválido
 *       409:
 *         description: Conflicto por nombre duplicado
 */
router.post(
  '/',
  authMiddleware,
  [
    body('nombre')
      .trim()
      .notEmpty().withMessage('El nombre es obligatorio')
      .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    body('descripcion')
      .optional({ nullable: true })
      .isString().withMessage('La descripción debe ser texto')
  ],
  handleValidation,
  gruposController.create
);

/**
 * @swagger
 * /grupos/{id}:
 *   put:
 *     summary: Actualizar un grupo existente
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GrupoUpdate'
 *     responses:
 *       200:
 *         description: Grupo actualizado
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Grupo no encontrado
 *       409:
 *         description: Nombre duplicado
 */
router.put(
  '/:id',
  authMiddleware,
  [
    param('id').isUUID().withMessage('El id debe ser un UUID válido'),
    body('nombre')
      .trim()
      .notEmpty().withMessage('El nombre es obligatorio')
      .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    body('descripcion')
      .optional({ nullable: true })
      .isString().withMessage('La descripción debe ser texto')
  ],
  handleValidation,
  gruposController.update
);

/**
 * @swagger
 * /grupos/{id}:
 *   delete:
 *     summary: Eliminar un grupo
 *     description: Elimina físicamente el registro al no existir campo de estado en el esquema.
 *     tags: [Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Grupo eliminado
 *       401:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Grupo no encontrado
 */
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isUUID().withMessage('El id debe ser un UUID válido')],
  handleValidation,
  gruposController.remove
);

module.exports = router;
