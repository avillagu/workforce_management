const { pool } = require('../backend/src/config/database');
require('dotenv').config({ path: '../backend/.env' });

const addPublicadoColumn = async () => {
    try {
        console.log('🚀 Agregando columna publicado a wfm_auth.turnos...');
        await pool.query('ALTER TABLE wfm_auth.turnos ADD COLUMN IF NOT EXISTS publicado BOOLEAN DEFAULT false;');
        console.log('✅ Columna agregada correctamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

addPublicadoColumn();
