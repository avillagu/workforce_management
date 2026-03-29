const express = require('express');
const router = express.Router();
const smartSchedulingController = require('../controllers/smartSchedulingController');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.get('/', verifyToken, smartSchedulingController.getConfiguraciones);
router.post('/', verifyToken, isAdmin, smartSchedulingController.crearConfiguracion);
router.put('/:id', verifyToken, isAdmin, smartSchedulingController.actualizarConfiguracion); // Nueva ruta para actualizar
router.post('/generate', verifyToken, isAdmin, smartSchedulingController.generarProgramacion);
router.delete('/:id', verifyToken, isAdmin, smartSchedulingController.eliminarConfiguracion);

module.exports = router;
