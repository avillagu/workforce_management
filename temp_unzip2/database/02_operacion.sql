-- =============================================================
-- Workforce Management (WFM) - Etapa 2: Módulo de Operación
-- Autor: Agente DBA (PostgreSQL)
-- Descripción: Migración segura y aditiva. Crea el catálogo de
-- Grupos e inyecta la foránea en Usuarios.
-- =============================================================

-- Nos aseguramos de actuar sobre nuestro esquema oficial
SET search_path TO wfm_auth, public;

-- 1) Crear tabla del catálogo de grupos
CREATE TABLE IF NOT EXISTS grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE grupos IS 'Catálogo de grupos organizacionales o logísticos (Etapa 2 - Operación)';

-- 2) Asegurar la función de auditoría (Blindaje contra esquemas perdidos)
CREATE OR REPLACE FUNCTION wfm_auth.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grupos_updated_at ON wfm_auth.grupos;
CREATE TRIGGER trg_grupos_updated_at
BEFORE UPDATE ON wfm_auth.grupos
FOR EACH ROW EXECUTE FUNCTION wfm_auth.set_updated_at();

-- 3) Inyectar llave foránea a Usuarios (Migración limpia, sin destruir info actual)
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL;

COMMENT ON COLUMN usuarios.grupo_id IS 'FK que define el grupo del usuario (Obligatorio operativamente en el Front)';

-- Fin del script de Etapa 2
