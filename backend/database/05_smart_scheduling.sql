-- =============================================================
-- Workforce Management (WFM) - Etapa 5: Programación Inteligente
-- Autor: Agente Backend
-- Descripción: Módulo para guardar plantillas de configuración
-- y generación automatizada de turnos.
-- =============================================================

SET search_path TO wfm_auth, public;

-- 1) Crear tabla de configuraciones inteligentes
CREATE TABLE IF NOT EXISTS configuraciones_inteligentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    grupo_id UUID REFERENCES wfm_auth.grupos(id) ON DELETE CASCADE,
    configuracion JSONB NOT NULL,
    creado_por UUID REFERENCES wfm_auth.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Índices para optimización
CREATE INDEX IF NOT EXISTS idx_config_inteligente_grupo ON configuraciones_inteligentes(grupo_id);
CREATE INDEX IF NOT EXISTS idx_config_inteligente_creado_por ON configuraciones_inteligentes(creado_por);

-- 3) Trigger de updated_at
DROP TRIGGER IF EXISTS trg_config_inteligente_updated_at ON configuraciones_inteligentes;
CREATE TRIGGER trg_config_inteligente_updated_at
BEFORE UPDATE ON configuraciones_inteligentes
FOR EACH ROW EXECUTE FUNCTION wfm_auth.set_updated_at();

-- 4) Documentación
COMMENT ON TABLE configuraciones_inteligentes IS 'Plantillas de configuración para el motor de programación inteligente';
COMMENT ON COLUMN configuraciones_inteligentes.configuracion IS 'Objeto JSON con parámetros de turnos, horas, coberturas y reglas';

-- Fin del script de Etapa 5
