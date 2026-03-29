-- =============================================================
-- Workforce Management (WFM) - Fix: Agregar columna activo a grupos
-- =============================================================

SET search_path TO wfm_auth, public;

-- Agregar columna activo a grupos (por defecto true para grupos existentes)
ALTER TABLE grupos
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN grupos.activo IS 'Indica si el grupo está activo o inactivo';

-- Fin del script
