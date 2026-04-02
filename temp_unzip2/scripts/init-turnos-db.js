const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wfm_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const init = async () => {
    try {
        console.log('🚀 Iniciando creación de tabla turnos...');
        const sql = `
            CREATE SCHEMA IF NOT EXISTS wfm_auth;
            
            CREATE TABLE IF NOT EXISTS wfm_auth.turnos (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                usuario_id UUID NOT NULL,
                hora_inicio_programada TIMESTAMPTZ NOT NULL,
                hora_fin_programada TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT fk_turnos_usuario 
                    FOREIGN KEY (usuario_id) REFERENCES wfm_auth.usuarios(id) 
                    ON DELETE CASCADE
            );
            
            COMMENT ON TABLE wfm_auth.turnos IS 'Turnos programados asignados a los usuarios';
        `;
        
        await pool.query(sql);
        console.log('✅ Tabla wfm_auth.turnos creada o ya existente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al crear tabla:', error.message);
        process.exit(1);
    }
};

init();
