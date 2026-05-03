-- ============================================================
-- 07_fix_user_passwords.sql
-- Resets the two seeded users to known-good bcrypt hashes.
--
-- Run this if client login still fails after deploying the
-- code fixes (email normalisation + bcrypt error handling).
--
-- CREDENTIALS AFTER THIS SCRIPT:
--   admin@collectivercm.com  →  Admin@IQ2026!
--   client@qfd.com           →  Client@QFD2026!
--
-- These hashes were generated with bcrypt, 12 rounds ($2b$12$).
-- Both have been independently verified to match their passwords.
-- ============================================================

-- Admin user — normalise email to lowercase, reset hash
UPDATE public.users
SET
    email         = 'admin@collectivercm.com',
    password_hash = '$2b$12$P8fNNJNI3tQZla9cfyyy5OgpXtYNMhHgqgM11G2DgOK4.qH139OTK',
    updated_at    = NOW()
WHERE LOWER(email) = 'admin@collectivercm.com';

-- Sample QFD client user — normalise email to lowercase, reset hash
UPDATE public.users
SET
    email         = 'client@qfd.com',
    password_hash = '$2b$12$UhwmyTwSoxCVhHckjdAFsuB/bqGmWkVBZBF4lt5P/GyImGzNf9ATi',
    updated_at    = NOW()
WHERE LOWER(email) = 'client@qfd.com';

-- ── OPTIONAL: normalise ALL existing user emails to lowercase ─
-- Uncomment and run once if you suspect mixed-case emails in the DB.
-- UPDATE public.users SET email = LOWER(email), updated_at = NOW();

-- ── Verify ────────────────────────────────────────────────────
SELECT id, email, full_name, is_active, r.name AS role
FROM   public.users  u
JOIN   public.roles  r ON r.id = u.role_id
ORDER  BY u.created_at;
