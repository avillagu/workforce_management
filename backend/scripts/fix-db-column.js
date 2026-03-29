const { pool } = require('../src/config/database');
require('dotenv').config();

const addPublicadoColumn = async () => {
    try {
        console.log('🚀 Agregando columna publicado a wfm_auth.turnos...');
        await pool.query('ALTER TABLE wfm_auth.turnos ADD COLUMN IF NOT EXISTS publicado BOOLEAN DEFAULT false;');
        
        // Actualizar registros existentes a false por si acaso (aunque el DEFAULT ya lo hace)
        await pool.query('UPDATE wfm_auth.turnos SET publicado = false WHERE publicado IS NULL;');
        
        console.log('✅ Columna agregada y registros actualizados.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

addPublicadoColumn();
