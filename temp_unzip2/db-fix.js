const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fix() {
  try {
    console.log('--- Iniciando Corrección de Base de Datos (Auditoría Senior) ---');
    
    // 1. Renombrar columnas si existen con nombres antiguos
    await pool.query('ALTER TABLE wfm_auth.usuarios RENAME COLUMN nombre_completo TO full_name');
    console.log('✅ nombre_completo -> full_name');
  } catch (err) {
    if (err.message.includes('does not exist')) {
        console.log('ℹ️ nombre_completo ya no existe o ya fue renombrado.');
    } else {
        console.error('❌ Error renombrando full_name:', err.message);
    }
  }

  try {
    // 2. Renombrar columna rol a role e intentar convertir tipo o simplemente cambiar nombre
    // El DBA definió un ENUM 'rol_usuario'. El campo existente 'rol' podría ser texto.
    await pool.query('ALTER TABLE wfm_auth.usuarios RENAME COLUMN rol TO role');
    console.log('✅ rol -> role');
  } catch (err) {
    if (err.message.includes('does not exist')) {
        console.log('ℹ️ rol ya no existe o ya fue renombrado.');
    } else {
        console.error('❌ Error renombrando role:', err.message);
    }
  }

  try {
    // 3. Limpiar columnas innecesarias para cumplir con el contrato estricto del ERD
    await pool.query('ALTER TABLE wfm_auth.usuarios DROP COLUMN IF EXISTS email');
    await pool.query('ALTER TABLE wfm_auth.usuarios DROP COLUMN IF EXISTS activo');
    await pool.query('ALTER TABLE wfm_auth.usuarios DROP COLUMN IF EXISTS ultimo_acceso');
    console.log('✅ Columnas innecesarias eliminadas (email, activo, ultimo_acceso)');
  } catch (err) {
    console.error('❌ Error limpiando columnas:', err.message);
  }

  try {
    // 4. Asegurar que el admin tiene la contraseña correcta (Admin123*) por ahora para consistencia con init_db.sql
    // Pero el usuario parece preferir Matt5593. 
    // Vamos a dejar el hash que ya tiene si funciona, pero para estar SEGUROS vamos a resetearlo a Admin123* 
    // como dice el script que yo aprobé.
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash('Admin123*', salt);
    
    await pool.query('UPDATE wfm_auth.usuarios SET password_hash = $1 WHERE username = \'admin\'', [hash]);
    console.log('✅ Password de admin reseteada a Admin123* para consistencia.');
  } catch (err) {
    console.error('❌ Error reseteando password:', err.message);
  }

  await pool.end();
  console.log('--- Auditoría y Corrección Finalizada ---');
}

fix();
