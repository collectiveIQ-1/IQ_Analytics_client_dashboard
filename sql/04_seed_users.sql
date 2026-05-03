-- ============================================================
-- 04_seed_users.sql
-- Seeds one admin user and one sample client user.
--
-- PASSWORDS:
--   admin@collectivercm.com → Admin@IQ2026!
--   client@qfd.com          → Client@QFD2026!
-- ============================================================

-- Admin user
INSERT INTO public.users (email, password_hash, full_name, role_id)
SELECT
  'admin@collectivercm.com',
  '$2b$12$P8fNNJNI3tQZla9cfyyy5OgpXtYNMhHgqgM11G2DgOK4.qH139OTK',
  'IQ Admin',
  r.id
FROM public.roles r WHERE r.name = 'admin'
ON CONFLICT (email) DO NOTHING;

-- Sample client user (QFD)
INSERT INTO public.users (email, password_hash, full_name, role_id)
SELECT
  'client@qfd.com',
  '$2b$12$UhwmyTwSoxCVhHckjdAFsuB/bqGmWkVBZBF4lt5P/GyImGzNf9ATi',
  'QFD Client User',
  r.id
FROM public.roles r WHERE r.name = 'client'
ON CONFLICT (email) DO NOTHING;
