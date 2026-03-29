-- =============================================================
-- Workforce Management (WFM) - Etapa 1: Autenticacion
-- Autor: Agente DBA (PostgreSQL)
-- Descripcion: Crea el esquema inicial para autenticacion/usuarios
--              y deja preparadas las relaciones base para futuras
--              tablas transaccionales (asistencias, novedades).
-- Compatibilidad: PostgreSQL 14+
-- =============================================================

-- 1) Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public; -- UUID y crypt()

-- 2) Esquema dedicado
CREATE SCHEMA IF NOT EXISTS wfm_auth;
SET search_path TO wfm_auth, public;

-- 3) Enum de roles (alineado al ERD)
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('admin', 'empleado', 'supervisor');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 4) Tabla principal: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- bcrypt (generado con crypt + gen_salt('bf'))
    full_name TEXT NOT NULL,
    role rol_usuario NOT NULL DEFAULT 'empleado',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT username_not_blank CHECK (length(btrim(username)) >= 3)
);
COMMENT ON TABLE usuarios IS 'Usuarios autenticables del WFM (admin, empleado, supervisor)';
COMMENT ON COLUMN usuarios.password_hash IS 'Hash bcrypt almacenado; nunca guardar texto plano';
COMMENT ON COLUMN usuarios.role IS 'Rol de negocio: admin | empleado | supervisor';

-- Index para logins case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_username_lower
    ON usuarios (lower(username));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5) Tablas transaccionales (esqueleto) con FK listo
--    Se crean con las columnas del ERD para evitar migraciones tempranas.
CREATE TABLE IF NOT EXISTS asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    entrada TIMESTAMPTZ NOT NULL,
    salida TIMESTAMPTZ,
    estado TEXT NOT NULL CHECK (estado IN ('Trabajando', 'Descansando', 'Finalizado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_asistencias_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
COMMENT ON TABLE asistencias IS 'Registro de entrada/salida por usuario';

CREATE TABLE IF NOT EXISTS novedades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    tipo TEXT NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ,
    estado TEXT NOT NULL CHECK (estado IN ('Pendiente', 'Aprobado', 'Rechazado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_novedades_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
COMMENT ON TABLE novedades IS 'Novedades reportadas por usuarios (incapacidad, permisos, etc.)';

CREATE TABLE IF NOT EXISTS turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    hora_inicio_programada TIMESTAMPTZ NOT NULL,
    hora_fin_programada TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_turnos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
COMMENT ON TABLE turnos IS 'Turnos programados asignados a los usuarios';

-- 6) Datos de arranque: usuario administrador
INSERT INTO usuarios (username, password_hash, full_name, role)
VALUES (
    'admin',
    crypt('MANDATORY_CHANGE_PASSWORD', gen_salt('bf', 12)), -- DEBE ser cambiada inmediatamente en el primer acceso
    'Administrador General',
    'admin'
)
ON CONFLICT (username) DO NOTHING;

-- 7) Recomendacion de search_path para conexiones de app
-- ALTER ROLE <app_user> IN DATABASE <wfm_db> SET search_path = wfm_auth, public;

-- Fin del script