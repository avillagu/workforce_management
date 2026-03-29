/**
 * Script de Verificación de Configuración
 * 
 * Este script verifica que todos los componentes estén configurados correctamente
 * antes de iniciar el servidor.
 * 
 * Uso: node scripts/verify-config.js
 */

require('dotenv').config();
const { Pool } = require('pg');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}\n`)
};

// Configuración
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wfm_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  schema: process.env.DB_SCHEMA || 'wfm_auth'
};

async function verifyConfiguration() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  WFM - Verificación de Configuración                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  let hasErrors = false;
  let hasWarnings = false;

  // 1. Verificar variables de entorno
  log.section('1. Verificando Variables de Entorno');

  const requiredVars = {
    'DB_HOST': config.host,
    'DB_PORT': config.port,
    'DB_NAME': config.database,
    'DB_USER': config.user,
    'DB_PASSWORD': config.password ? '***' : '',
    'DB_SCHEMA': config.schema
  };

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value) {
      log.error(`${key} no está configurada`);
      hasErrors = true;
    } else if (value === '***' || value) {
      log.success(`${key} configurada`);
    }
  }

  if (!process.env.DB_PASSWORD) {
    log.warning('DB_PASSWORD está vacía. ¿Es intencional?');
    hasWarnings = true;
  }

  // 2. Verificar conexión a PostgreSQL
  log.section('2. Verificando Conexión a PostgreSQL');

  const pool = new Pool(config);

  try {
    log.info(`Intentando conectar a ${config.host}:${config.port}...`);
    const client = await pool.connect();
    log.success('Conexión establecida correctamente');

    // 3. Verificar versión de PostgreSQL
    log.section('3. Información del Servidor');
    
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version;
    log.info(`PostgreSQL: ${version.substring(0, 50)}...`);

    // 4. Verificar existencia de la base de datos
    log.section('4. Verificando Base de Datos');
    
    const dbExists = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [config.database]
    );

    if (dbExists.rows.length > 0) {
      log.success(`Base de datos '${config.database}' existe`);

      // 5. Verificar esquema
      log.section('5. Verificando Esquema');

      const schemaExists = await client.query(
        'SELECT 1 FROM information_schema.schemata WHERE schema_name = $1',
        [config.schema]
      );

      if (schemaExists.rows.length > 0) {
        log.success(`Esquema '${config.schema}' existe`);

        // 6. Verificar tabla usuarios
        log.section('6. Verificando Tabla de Usuarios');

        // Cambiar al esquema para verificar la tabla
        await client.query(`SET search_path TO ${config.schema}`);
        
        const tableExists = await client.query(
          `SELECT 1 FROM information_schema.tables 
           WHERE table_schema = $1 AND table_name = 'usuarios'`,
          [config.schema]
        );

        if (tableExists.rows.length > 0) {
          log.success(`Tabla 'usuarios' existe en el esquema '${config.schema}'`);

          // 7. Verificar datos de prueba
          log.section('7. Verificando Datos de Prueba');

          const usersResult = await client.query('SELECT username, rol FROM usuarios LIMIT 5');
          
          if (usersResult.rows.length > 0) {
            log.success(`Hay ${usersResult.rows.length} usuarios en la base de datos:`);
            usersResult.rows.forEach(user => {
              console.log(`   - ${user.username} (${user.rol})`);
            });
          } else {
            log.warning('No hay usuarios en la base de datos');
            log.info('Ejecuta el script database/init_db.sql para crear usuarios de prueba');
            hasWarnings = true;
          }
        } else {
          log.error(`Tabla 'usuarios' no existe en el esquema '${config.schema}'`);
          log.info('Ejecuta el script database/init_db.sql para crear las tablas');
          hasErrors = true;
        }
      } else {
        log.error(`Esquema '${config.schema}' no existe`);
        log.info('Ejecuta el script database/init_db.sql para crear el esquema');
        hasErrors = true;
      }
    } else {
      log.error(`Base de datos '${config.database}' no existe`);
      log.info(`Crea la base de datos con: CREATE DATABASE ${config.database};`);
      hasErrors = true;
    }

    client.release();
    log.section('Verificación Completada');

  } catch (error) {
    log.error(`Error de conexión: ${error.message}`);
    
    // Diagnóstico específico
    if (error.message.includes('ECONNREFUSED')) {
      log.error('PostgreSQL no está corriendo o el puerto es incorrecto');
      log.info('Verifica que PostgreSQL esté iniciado');
    } else if (error.message.includes('password authentication')) {
      log.error('Contraseña incorrecta');
      log.info('Verifica DB_PASSWORD en el archivo .env');
    } else if (error.message.includes('database')) {
      log.error('Problema con la base de datos');
      log.info('Verifica que la base de datos exista');
    }
    
    hasErrors = true;
  } finally {
    await pool.end();
  }

  // Resumen final
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Resumen                                                 ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  
  if (hasErrors) {
    console.log('║  ${colors.red}❌ Hay errores que deben corregirse${colors.reset}                ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  Revisa los mensajes anteriores y corrige:              ║');
    console.log('║  • Variables de entorno faltantes                       ║');
    console.log('║  • Conexión a PostgreSQL                                ║');
    console.log('║  • Base de datos y esquema                              ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('║  ${colors.yellow}⚠️  Hay advertencias (funcionará pero revisar)${colors.reset}    ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    process.exit(0);
  } else {
    console.log('║  ${colors.green}✅ Todo está configurado correctamente${colors.reset}              ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  Puedes iniciar el servidor con: npm start              ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    process.exit(0);
  }
}

// Ejecutar verificación
verifyConfiguration().catch(err => {
  log.error(`Error fatal: ${err.message}`);
  process.exit(1);
});
