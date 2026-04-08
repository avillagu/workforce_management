-- =============================================================
-- Workforce Management (WFM) - Ajuste: Compensatorios
-- Descripción: Agrega soporte para seguimiento de compensatorios
--              basado en domingos trabajados.
-- =============================================================

SET search_path TO wfm_auth, public;

-- 1) Agregar columna es_compensatorio a la tabla de turnos
ALTER TABLE turnos 
ADD COLUMN IF NOT EXISTS es_compensatorio BOOLEAN DEFAULT false;

COMMENT ON COLUMN turnos.es_compensatorio IS 'Indica si un descanso es de tipo compensatorio (descuenta acumulado de domingos)';

-- Fin del script de compensatorios
