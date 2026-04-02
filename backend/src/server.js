const express = require('express');
const http = require('http');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const turnosSocket = require('./websocket/turnosSocket');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// ... existing routes ...
const authRoutes = require('./routes/auth');
const grupoRoutes = require('./routes/grupos');
const usuarioRoutes = require('./routes/usuarios');
const turnosRoutes = require('./routes/turnos');
const preajustesRoutes = require('./routes/preajustes');
const solicitudesRoutes = require('./routes/solicitudes');
const notificacionesRoutes = require('./routes/notificaciones');
const asistenciasRoutes = require('./routes/asistencias');
const smartSchedulingRoutes = require('./routes/smartScheduling');
const dashboardRoutes = require('./routes/dashboard');
const { initializeConnection, getConnectionStatus, closePool } = require('./config/database');
const cleanerJob = require('./jobs/cleaner');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());

// Inicializar WebSockets
turnosSocket.init(server);

// Rate limiting for login (5 attempts / 15 min)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Demasiados intentos de acceso. Intente en 15 minutos.' }
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:4200', 
    'http://127.0.0.1:4200', 
    'https://workforceman.vps.webdock.cloud',
    'http://workforceman.vps.webdock.cloud'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limit specifically to login (Skip in testing)
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/auth/login', loginLimiter);
}

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Swagger UI endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'WFM API Docs'
}));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/grupos', grupoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/preajustes', preajustesRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/asistencias', asistenciasRoutes);
app.use('/api/smart-scheduling', smartSchedulingRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint mejorado
app.get('/api/health', (req, res) => {
  const dbStatus = getConnectionStatus() ? 'connected' : 'disconnected';
  res.json({
    success: true,
    message: 'WFM API is running',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/db/status', async (req, res) => {
  try {
    const { testConnection } = require('./config/database');
    await testConnection();
    res.json({
      success: true,
      status: 'connected',
      message: 'Conexión a base de datos exitosa'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'disconnected',
      message: 'No se pudo conectar a la base de datos',
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado'
  });
});

// Global error handler mejorado
app.use((err, req, res, next) => {
  console.error('╔══════════════════════════════════════════════════════════╗');
  console.error('║  ERROR DEL SERVIDOR                                      ║');
  console.error('╠══════════════════════════════════════════════════════════╣');
  console.error(`║  Ruta: ${req.path}`.padEnd(53) + '║');
  console.error(`║  Método: ${req.method}`.padEnd(53) + '║');
  console.error('╠══════════════════════════════════════════════════════════╣');
  console.error(`║  Error: ${err.message}`.padEnd(53) + '║');
  
  if (err.code === 'ECONNREFUSED') {
    console.error('║  Tipo: Conexión a base de datos rechazada'.padEnd(53) + '║');
  } else if (err.code === '28P01') {
    console.error('║  Tipo: Autenticación fallida'.padEnd(53) + '║');
  } else if (err.code === '3D000') {
    console.error('║  Tipo: Base de datos no existe'.padEnd(53) + '║');
  }
  
  console.error('╚══════════════════════════════════════════════════════════╝');
  
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: err.message // Expuesto temporalmente para diagnosticar errores de despliegue
  });
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Recibida señal SIGINT, cerrando conexiones...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recibida señal SIGTERM, cerrando conexiones...');
  await closePool();
  process.exit(0);
});

// Iniciar servidor
async function startServer() {
  const dbConnected = await initializeConnection();
  
  // Iniciar jobs de limpieza
  if (dbConnected) {
    cleanerJob.initCleaner();
  }

  server.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║           WFM Backend - API Server                       ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  ✓ Servidor (+WS) corriendo en puerto ${PORT}`.padEnd(53) + '║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
  });
  
  return server;
}

// Iniciar servidor solo si el archivo se ejecuta directamente
if (require.main === module) {
  startServer().catch(err => {
    console.error('Error fatal al iniciar:', err);
    process.exit(1);
  });
}

module.exports = app;
