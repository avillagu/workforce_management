const { Pool } = require('pg');
require('dotenv').config();

// Configuración de conexión
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wfm_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Validar configuración antes de crear el pool
function validateConfig() {
  const errors = [];
  
  if (!dbConfig.password) {
    errors.push('DB_PASSWORD no está configurada. Por favor establece tu contraseña de PostgreSQL en el archivo .env');
  }
  
  if (!dbConfig.database) {
    errors.push('DB_NAME no está configurada');
  }
  
  if (!dbConfig.user) {
    errors.push('DB_USER no está configurada');
  }
  
  return errors;
}

// Crear pool de conexiones
let pool;
let isConnected = false;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000; // 2 segundos

function createPool() {
  pool = new Pool(dbConfig);
  
  pool.on('connect', () => {
    isConnected = true;
    connectionAttempts = 0;
    console.log('✅ Database connected successfully');
    console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
  });
  
  pool.on('error', (err) => {
    isConnected = false;
    console.error('❌ Database connection error:', err.message);
    
    // Intentar reconectar automáticamente
    if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
      connectionAttempts++;
      console.log(`🔄 Reintentando conexión (intento ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      setTimeout(() => {
        console.log('Intentando reconectar...');
        pool.connect((err, client, release) => {
          if (err) {
            console.error('❌ Error al reconectar:', err.message);
          }
          if (client) release();
        });
      }, RECONNECT_DELAY);
    } else {
      console.error('❌ Máximo de reintentos alcanzado. El servidor continuará pero las consultas fallarán.');
      console.error('   Por favor verifica tu configuración de base de datos en el archivo .env');
    }
  });
  
  return pool;
}

/**
 * Verifica la conexión con la base de datos
 * @returns {Promise<boolean>} True si la conexión es exitosa
 */
async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    return true;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Inicializa la conexión con reintentos
 * @returns {Promise<boolean>} True si la conexión es exitosa
 */
async function initializeConnection() {
  // Validar configuración
  const configErrors = validateConfig();
  if (configErrors.length > 0) {
    console.error('\n╔══════════════════════════════════════════════════════════╗');
    console.error('║  ⚠️  ERROR DE CONFIGURACIÓN DE BASE DE DATOS            ║');
    console.error('╠══════════════════════════════════════════════════════════╣');
    configErrors.forEach(err => {
      console.error(`║  • ${err}`);
    });
    console.error('╠══════════════════════════════════════════════════════════╣');
    console.error('║  Pasos para solucionar:                                  ║');
    console.error('║  1. Copia backend/.env.example a backend/.env           ║');
    console.error('║  2. Edita .env y configura tu contraseña de PostgreSQL  ║');
    console.error('║  3. Asegúrate de que la base de datos wfm_db existe     ║');
    console.error('║  4. Reinicia el servidor                                 ║');
    console.error('╚══════════════════════════════════════════════════════════╝\n');
    return false;
  }
  
  // Intentar conectar con reintentos
  for (let i = 1; i <= MAX_RECONNECT_ATTEMPTS; i++) {
    try {
      console.log(`🔌 Intentando conectar a PostgreSQL (intento ${i}/${MAX_RECONNECT_ATTEMPTS})...`);
      await testConnection();
      console.log('✅ Conexión a base de datos establecida correctamente\n');
      isConnected = true;
      return true;
    } catch (error) {
      console.error(`❌ Error de conexión (intento ${i}/${MAX_RECONNECT_ATTEMPTS}):`, error.message);
      
      // Mensajes de error específicos según el tipo de error
      if (error.message.includes('ECONNREFUSED')) {
        console.error('   → PostgreSQL no está corriendo o el puerto es incorrecto');
        console.error('   → Verifica que PostgreSQL esté iniciado en el puerto ' + dbConfig.port);
      } else if (error.message.includes('password authentication failed')) {
        console.error('   → Contraseña incorrecta para el usuario ' + dbConfig.user);
        console.error('   → Verifica DB_PASSWORD en tu archivo .env');
      } else if (error.message.includes('database "' + dbConfig.database + '" does not exist')) {
        console.error('   → La base de datos "' + dbConfig.database + '" no existe');
        console.error('   → Crea la base de datos con: CREATE DATABASE ' + dbConfig.database + ';');
      } else if (error.message.includes('role "' + dbConfig.user + '" does not exist')) {
        console.error('   → El usuario "' + dbConfig.user + '" no existe en PostgreSQL');
        console.error('   → Verifica DB_USER en tu archivo .env');
      }
      
      if (i < MAX_RECONNECT_ATTEMPTS) {
        console.log(`   Esperando ${RECONNECT_DELAY / 1000} segundos antes del próximo intento...\n`);
        await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
      }
    }
  }
  
  console.error('\n╔══════════════════════════════════════════════════════════╗');
  console.error('║  ❌ NO SE PUDO ESTABLECER CONEXIÓN A LA BASE DE DATOS  ║');
  console.error('╠══════════════════════════════════════════════════════════╣');
  console.error('║  El servidor continuará pero las consultas fallarán.    ║');
  console.error('║  Verifica:                                               ║');
  console.error('║  • PostgreSQL está corriendo                             ║');
  console.error('║  • Las credenciales en .env son correctas               ║');
  console.error('║  • La base de datos ' + dbConfig.database + ' existe'.padEnd(53) + '║');
  console.error('╚══════════════════════════════════════════════════════════╝\n');
  
  isConnected = false;
  return false;
}

/**
 * Obtiene el estado de la conexión
 * @returns {boolean} True si está conectado
 */
function getConnectionStatus() {
  return isConnected;
}

/**
 * Cierra todas las conexiones del pool
 */
async function closePool() {
  if (pool) {
    await pool.end();
    console.log('🔌 Conexiones a base de datos cerradas');
  }
}

// Inicializar pool
createPool();

module.exports = {
  pool,
  testConnection,
  initializeConnection,
  getConnectionStatus,
  closePool,
  dbConfig
};
