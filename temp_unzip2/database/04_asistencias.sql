-- =============================================================
-- Workforce Management (WFM) - Etapa 4: Módulo de Asistencias
-- Autor: Agente Backend (PostgreSQL)
-- Descripción: Crea la tabla de asistencias para control de
-- estados de empleados en tiempo real.
-- =============================================================

SET search_path TO wfm_auth, public;

-- 1) Crear tabla de asistencias
CREATE TABLE IF NOT EXISTS asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    estado TEXT NOT NULL CHECK (estado IN ('disponible', 'descanso', 'en_bano', 'fuera_de_turno')),
    hora_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hora_fin TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_asistencias_usuario ON asistencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON asistencias(hora_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_asistencias_estado ON asistencias(estado) WHERE hora_fin IS NULL;
CREATE INDEX IF NOT EXISTS idx_asistencias_usuario_fecha ON asistencias(usuario_id, hora_inicio DESC);

-- 3) Trigger para actualizar updated_at (si se agrega en el futuro)
-- Por ahora no es necesario ya que la tabla no tiene updated_at

-- 4) Comentarios de documentación
COMMENT ON TABLE asistencias IS 'Registro de estados de asistencia de empleados (Etapa 4)';
COMMENT ON COLUMN asistencias.usuario_id IS 'FK al usuario que registró el estado';
COMMENT ON COLUMN asistencias.estado IS 'Estado del empleado: disponible, descanso, en_bano, fuera_de_turno';
COMMENT ON COLUMN asistencias.hora_inicio IS 'Hora de inicio del estado (UTC)';
COMMENT ON COLUMN asistencias.hora_fin IS 'Hora de fin del estado (UTC), NULL si es el estado actual';
COMMENT ON COLUMN asistencias.created_at IS 'Fecha de creación del registro';

-- 5) Datos de prueba (OPCIONAL, para testing)
-- Descomentar solo si se desea poblar con datos iniciales
/*
INSERT INTO asistencias (usuario_id, estado, hora_inicio, hora_fin, created_at)
SELECT 
    u.id,
    'disponible',
    NOW() - INTERVAL '2 hours',
    NULL,
    NOW()
FROM usuarios u
WHERE u.username = 'empleado1'
ON CONFLICT DO NOTHING;
*/

-- Fin del script de Etapa 4
