-- ============================================================
-- 05_seed_user_access.sql
-- Assigns the sample QFD client user access to the QFD client.
-- Admins do NOT need rows here — their role grants full access.
-- ============================================================

INSERT INTO public.user_client_access (user_id, client_id)
SELECT u.id, c.id
FROM   public.users   u
JOIN   public.clients c ON c.slug = 'qfd'
WHERE  u.email = 'client@qfd.com'
ON CONFLICT (user_id, client_id) DO NOTHING;
