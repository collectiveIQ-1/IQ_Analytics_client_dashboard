-- ============================================================
-- 04_seed_users.sql
-- Seeds one admin user and one sample client user.
--
-- PASSWORDS (bcrypt, 12 rounds):
--   admin@collectivercm.com → Admin@IQ2026!
--   client@qfd.com          → Client@QFD2026!
--
-- To generate a new bcrypt hash in Node.js:
--   node -e "const b=require('bcrypt'); b.hash('yourpassword',12).then(console.log)"
-- ============================================================

-- Admin user
INSERT INTO public.users (email, password_hash, full_name, role_id)
SELECT
  'admin@collectivercm.com',
  '$2b$12$Y9k4Q7vX3pL1mN0sR6tW8OeQdJfGhKwZvBcMnPxUaLyIsHTVXgEr2', -- Admin@IQ2026!
  'IQ Admin',
  r.id
FROM public.roles r WHERE r.name = 'admin'
ON CONFLICT (email) DO NOTHING;

-- Sample client user (QFD)
INSERT INTO public.users (email, password_hash, full_name, role_id)
SELECT
  'client@qfd.com',
  '$2b$12$A3k8P2wX1nM0sL9qR5tV7OeQdJfGhKwZvBcMnPxUaLyIsHTVXgEr2', -- Client@QFD2026!
  'QFD Client User',
  r.id
FROM public.roles r WHERE r.name = 'client'
ON CONFLICT (email) DO NOTHING;

-- NOTE: Replace the password_hash values above with real bcrypt hashes.
-- The hashes above are illustrative placeholders.
-- Run this in Node.js to generate real hashes:
--   node -e "require('bcrypt').hash('Admin@IQ2026!', 12).then(h => console.log(h))"
