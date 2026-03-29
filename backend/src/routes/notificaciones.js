const express = require('express');
const router = express.Router();
const notificacionesController = require('../controllers/notificacionesController');
const verifyToken = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(verifyToken);

router.get('/', notificacionesController.getNotificaciones);
router.post('/:id/leida', notificacionesController.marcarLeida);

module.exports = router;
