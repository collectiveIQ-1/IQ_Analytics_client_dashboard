-- ============================================================
-- 09_add_password_reset.sql
-- Adds password-reset infrastructure to the system schema.
--
-- Run on PRIMARY database:
--   psql -U iquser -h 10.0.1.37 -p 5433 -d iqdb -f sql/09_add_password_reset.sql
--
-- Run on LOCAL database:
--   "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U iqlocal -d iq_local -f sql/09_add_password_reset.sql
--
-- Safe to run multiple times (all statements are idempotent).
-- ============================================================

-- ── 1. Add password_changed_at to users ──────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- ── 2. Password reset tokens table ───────────────────────────────────────────
-- Tokens are stored as SHA-256 hashes.
-- The raw token (64-char hex) is emailed to the user and NEVER stored.
-- On reset, the frontend sends the raw token; the backend hashes and compares.
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256(raw_token)
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON public.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_user_id    ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expires_at ON public.password_reset_tokens(expires_at);

-- ── 3. Optional cleanup view (informational) ─────────────────────────────────
-- Run this to remove expired/used tokens (safe to run periodically):
-- DELETE FROM public.password_reset_tokens WHERE used = TRUE OR expires_at < NOW();
