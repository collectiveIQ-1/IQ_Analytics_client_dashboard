-- ============================================================
-- 01_create_system_tables.sql
-- Creates all system tables in the public schema.
-- Run this ONCE on your PostgreSQL database.
-- ============================================================

-- Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS public.users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    role_id       INTEGER NOT NULL REFERENCES public.roles(id),
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email   ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);

-- Clients registry
CREATE TABLE IF NOT EXISTS public.clients (
    id           SERIAL PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    schema_name  VARCHAR(100),
    slug         VARCHAR(100) NOT NULL UNIQUE,
    description  TEXT,
    logo_url     VARCHAR(500),
    is_active    BOOLEAN DEFAULT TRUE,
    has_schema   BOOLEAN DEFAULT FALSE,
    sort_order   INTEGER DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_slug        ON public.clients(slug);
CREATE INDEX IF NOT EXISTS idx_clients_schema_name ON public.clients(schema_name);

-- User <-> Client access mapping
CREATE TABLE IF NOT EXISTS public.user_client_access (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
    client_id  INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by INTEGER REFERENCES public.users(id),
    UNIQUE(user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_uca_user_id   ON public.user_client_access(user_id);
CREATE INDEX IF NOT EXISTS idx_uca_client_id ON public.user_client_access(client_id);
