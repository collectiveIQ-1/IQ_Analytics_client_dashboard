-- ============================================================
-- 08_ensure_tables_exist.sql
-- Safe idempotent script — run this if client login fails
-- with an "Internal server error" or if the backend logs
-- "Table public.user_client_access does not exist."
--
-- It creates any system tables that are missing and re-seeds
-- the sample client user's dashboard access.
-- ============================================================

-- ── 1. Ensure user_client_access table exists ─────────────
--    (this is the most common cause of client login 500 errors)
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

-- ── 2. Normalise all user emails to lowercase ─────────────
--    Fixes any mixed-case emails stored before the code fix.
UPDATE public.users
SET    email      = LOWER(email),
       updated_at = NOW()
WHERE  email <> LOWER(email);

-- ── 3. Re-assign QFD access to the sample client user ─────
INSERT INTO public.user_client_access (user_id, client_id)
SELECT u.id, c.id
FROM   public.users   u
JOIN   public.clients c ON c.slug = 'qfd'
WHERE  LOWER(u.email) = 'client@qfd.com'
ON CONFLICT (user_id, client_id) DO NOTHING;

-- ── 4. Verify results ──────────────────────────────────────
SELECT
    u.email,
    u.is_active,
    r.name  AS role,
    c.display_name AS assigned_client,
    c.slug
FROM       public.users              u
JOIN       public.roles              r   ON r.id  = u.role_id
LEFT JOIN  public.user_client_access uca ON uca.user_id   = u.id
LEFT JOIN  public.clients            c   ON c.id  = uca.client_id
ORDER BY   u.id, c.sort_order;
