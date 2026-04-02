const express = require('express');
const { body, validationResult } = require('express-validator');
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('[Validation Error]:', JSON.stringify(errors.array(), null, 2));
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
 * /usuarios/empleados:
 *   get:
 *     summary: Obtener lista de empleados
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de empleados obtenida correctamente
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
 *                     $ref: '#/components/schemas/Empleado'
 *       401:
 *         description: Token no proporcionado o inválido
 */
router.get('/empleados', authMiddleware, usuarioController.listarEmpleados);

/**
 * @swagger
 * /usuarios/empleados:
 *   post:
 *     summary: Crear un empleado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmpleadoCreate'
 *     responses:
 *       201:
 *         description: Empleado creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Empleado'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Grupo no encontrado
 *       409:
 *         description: Nombre de usuario duplicado
 */
router.post(
  '/empleados',
  authMiddleware,
  [
    body('nombre_completo')
      .trim()
      .notEmpty().withMessage('El nombre completo es obligatorio')
      .isLength({ min: 3, max: 150 }).withMessage('El nombre completo debe tener entre 3 y 150 caracteres'),
    body('username')
      .trim()
      .notEmpty().withMessage('El username es obligatorio')
      .isLength({ min: 3, max: 50 }).withMessage('El username debe tener entre 3 y 50 caracteres'),
    body('password')
      .notEmpty().withMessage('La contraseña es obligatoria')
      .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('grupo_id')
      .notEmpty().withMessage('El grupo es obligatorio')
  ],
  handleValidation,
  usuarioController.crearEmpleado
);

/**
 * @swagger
 * /usuarios/empleados/{id}:
 *   put:
 *     summary: Actualizar un empleado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/empleados/:id',
  authMiddleware,
  [
    body('nombre_completo').trim().notEmpty().withMessage('El nombre completo es obligatorio').isLength({ min: 3, max: 150 }),
    body('username').trim().notEmpty().withMessage('El username es obligatorio').isLength({ min: 3, max: 50 }),
    body('grupo_id').notEmpty().withMessage('El grupo es obligatorio')
  ],
  handleValidation,
  usuarioController.actualizarEmpleado
);

/**
 * @swagger
 * /usuarios/empleados/{id}:
 *   delete:
 *     summary: Eliminar un empleado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/empleados/:id', authMiddleware, usuarioController.eliminarEmpleado);

module.exports = router;
