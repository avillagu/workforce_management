const { Server } = require('socket.io');

let io;

/**
 * Inicializa el servidor de Socket.IO
 * @param {Object} server - Instancia del servidor HTTP de Express
 */
const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:4200', 
        'http://127.0.0.1:4200', 
        'https://workforceman.vps.webdock.cloud',
        'http://workforceman.vps.webdock.cloud'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado a WebSockets: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Emite un evento de actualización de turnos a todos los clientes conectados
 * @param {string} accion - 'crear' | 'actualizar' | 'eliminar'
 * @param {Object} turno - Datos del turno afectado
 */
const emitActualizacion = (accion, turno) => {
  if (io) {
    io.emit('turnos:actualizado', { accion, turno });
    console.log(`📡 Evento emitido: turnos:actualizado [${accion}]`);
  }
};

/**
 * Emite una novedad de solicitud de cambio
 */
const emitSolicitud = (accion, solicitud) => {
  if (io) {
    io.emit('solicitudes:novedad', { accion, solicitud });
    console.log(`📡 Evento emitido: solicitudes:novedad [${accion}]`);
  }
};

/**
 * Emite actualización de estado de asistencia
 */
const emitAsistenciaActualizada = (payload) => {
  if (io) {
    io.emit('asistencias:estado_actualizado', payload);
    console.log('📡 Evento emitido: asistencias:estado_actualizado');
  }
};

module.exports = {
  init,
  emitActualizacion,
  emitSolicitud,
  emitAsistenciaActualizada
};
