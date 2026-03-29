const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../src/config/database');

async function migrate() {
  try {
    console.log('--- MIGRACIÓN: PROGRAMACIÓN INTELIGENTE ---');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wfm_auth.configuraciones_inteligentes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(255) NOT NULL,
        grupo_id UUID REFERENCES wfm_auth.grupos(id),
        configuracion JSONB NOT NULL,
        creado_por UUID REFERENCES wfm_auth.usuarios(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('✅ Tabla wfm_auth.configuraciones_inteligentes creada/verificada.');
  } catch (err) {
    console.error('❌ Error en migración:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
