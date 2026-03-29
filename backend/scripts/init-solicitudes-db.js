const { pool } = require('../src/config/database');
require('dotenv').config();

const initSolicitudes = async () => {
    try {
        console.log('🚀 Creando tabla wfm_auth.solicitudes_cambio...');
        
        const sql = `
            CREATE TABLE IF NOT EXISTS wfm_auth.solicitudes_cambio (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                solicitante_id UUID NOT NULL REFERENCES wfm_auth.usuarios(id) ON DELETE CASCADE,
                objetivo_id UUID NOT NULL REFERENCES wfm_auth.usuarios(id) ON DELETE CASCADE,
                fecha DATE NOT NULL,
                turno_solicitante_id UUID REFERENCES wfm_auth.turnos(id) ON DELETE SET NULL,
                turno_objetivo_id UUID REFERENCES wfm_auth.turnos(id) ON DELETE SET NULL,
                estado_objetivo VARCHAR(20) DEFAULT 'pendiente', -- pendiente, aprobado, rechazado
                estado_admin VARCHAR(20) DEFAULT 'pendiente',    -- pendiente, aprobado, rechazado
                estado_final VARCHAR(20) DEFAULT 'abierta',      -- abierta, aprobada, rechazada
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            -- Index para búsqueda rápida
            CREATE INDEX IF NOT EXISTS idx_solicitudes_usuarios ON wfm_auth.solicitudes_cambio (solicitante_id, objetivo_id);
            CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha ON wfm_auth.solicitudes_cambio (fecha);
        `;

        await pool.query(sql);
        console.log('✅ Tabla solicitudes_cambio creda correctamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

initSolicitudes();
