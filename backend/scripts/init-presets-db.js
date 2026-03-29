const { pool } = require('../src/config/database');
require('dotenv').config();

const initPresets = async () => {
    try {
        console.log('🚀 Creando tabla wfm_auth.preajustes_turnos...');
        
        const sql = `
            CREATE TABLE IF NOT EXISTS wfm_auth.preajustes_turnos (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                nombre VARCHAR(100) NOT NULL,
                hora_inicio VARCHAR(5) NOT NULL,
                hora_fin VARCHAR(5) NOT NULL,
                icono VARCHAR(50) DEFAULT 'schedule',
                color VARCHAR(20),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            -- Insertar valores por defecto si la tabla está vacía
            INSERT INTO wfm_auth.preajustes_turnos (nombre, hora_inicio, hora_fin, icono)
            SELECT '06:00am - 01:20pm', '06:00', '13:20', 'wb_sunny'
            WHERE NOT EXISTS (SELECT 1 FROM wfm_auth.preajustes_turnos LIMIT 1);
            
            INSERT INTO wfm_auth.preajustes_turnos (nombre, hora_inicio, hora_fin, icono)
            SELECT '08:00am - 03:20pm', '08:00', '15:20', 'wb_sunny'
            WHERE NOT EXISTS (SELECT 1 FROM wfm_auth.preajustes_turnos WHERE hora_inicio = '08:00');

            INSERT INTO wfm_auth.preajustes_turnos (nombre, hora_inicio, hora_fin, icono)
            SELECT '09:20am - 04:40pm', '09:20', '16:40', 'wb_twilight'
            WHERE NOT EXISTS (SELECT 1 FROM wfm_auth.preajustes_turnos WHERE hora_inicio = '09:20');
        `;

        await pool.query(sql);
        console.log('✅ Tabla y valores iniciales creados.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

initPresets();
