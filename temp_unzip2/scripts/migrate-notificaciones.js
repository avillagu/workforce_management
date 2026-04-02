const { pool } = require('../src/config/database');

async function migrate() {
  try {
    console.log('--- MIGRACIÓN DE NOTIFICACIONES ---');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wfm_auth.notificaciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tipo VARCHAR(50) NOT NULL,
        referencia_id UUID,
        usuario_id UUID REFERENCES wfm_auth.usuarios(id),
        mensaje TEXT NOT NULL,
        detalles JSONB,
        leido BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla wfm_auth.notificaciones creada/verificada.');
  } catch (err) {
    console.error('❌ Error en migración:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
