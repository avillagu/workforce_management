-- =====================================================
-- Workforce Management (WFM) - Etapa 1: Autenticacion
-- =====================================================
-- Descripción: Script de creación del esquema inicial para el WFM.
-- Incluye tabla de usuarios con soporte para autenticación y roles.
-- =====================================================

-- Habilitar extensiones requeridas en el esquema public (para que sean globales)
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

-- Crear esquema dedicado
CREATE SCHEMA IF NOT EXISTS wfm_auth;
-- Asegurar que public esté en el search_path para encontrar pgcrypto
SET search_path TO wfm_auth, public;

-- Enumeración de roles
DO $$ BEGIN
    CREATE TYPE wfm_auth.rol_usuario AS ENUM ('admin', 'empleado', 'supervisor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabla principal de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    email TEXT UNIQUE,
    rol rol_usuario NOT NULL DEFAULT 'empleado',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT username_not_blank CHECK (length(btrim(username)) >= 3),
    CONSTRAINT nombre_completo_not_blank CHECK (length(btrim(nombre_completo)) >= 2)
);

-- Índice para optimizar búsquedas por username (usado en login)
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE usuarios IS 'Credenciales, roles y estado de acceso para el WFM.';
COMMENT ON COLUMN usuarios.activo IS 'Indica si el usuario tiene acceso permitido al sistema.';
COMMENT ON COLUMN usuarios.updated_at IS 'Fecha de la última modificación del registro.';
COMMENT ON COLUMN usuarios.ultimo_acceso IS 'Fecha y hora del último acceso exitoso.';
COMMENT ON COLUMN usuarios.nombre_completo IS 'Nombre completo del empleado para mostrar en UI.';
COMMENT ON COLUMN usuarios.rol IS 'Rol del usuario: admin, supervisor, empleado.';

-- Usuario administrador inicial (password: Matt5593)
INSERT INTO usuarios (username, password_hash, nombre_completo, rol)
VALUES (
    'admin',
    crypt('Matt5593', gen_salt('bf', 12)),
    'Administrador Senior MAPO',
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Usuarios adicionales para pruebas
INSERT INTO usuarios (username, password_hash, nombre_completo, rol)
VALUES 
    (
        'supervisor',
        crypt('Matt5593', gen_salt('bf', 12)),
        'Supervisor General',
        'supervisor'
    ),
    (
        'empleado1',
        crypt('Matt5593', gen_salt('bf', 12)),
        'Juan Pérez',
        'empleado'
    )
ON CONFLICT (username) DO NOTHING;

-- Fin del script
