-- ============================================================
-- 10_add_super_admin_role.sql
-- Introduces the super_admin role above admin.
--
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING).
-- Does NOT touch existing users or their role assignments.
-- ============================================================

-- 1. Insert the new super_admin role (no-op if it already exists)
INSERT INTO public.roles (name, description)
VALUES (
  'super_admin',
  'Super Administrator — highest privilege level. Can create/delete admins, delete clients, manage all role assignments, and perform all admin actions.'
)
ON CONFLICT (name) DO NOTHING;

-- 2. (Optional) Verify the three roles now exist
-- SELECT id, name, description FROM public.roles ORDER BY id;

-- ============================================================
-- HOW TO CREATE YOUR FIRST SUPER ADMIN
-- ============================================================
-- After running this migration, promote an existing admin user
-- to super_admin by running the block below (replace the email).
--
-- DO $$
-- DECLARE
--   v_role_id   INTEGER;
--   v_user_id   INTEGER;
-- BEGIN
--   SELECT id INTO v_role_id FROM public.roles WHERE name = 'super_admin';
--   SELECT id INTO v_user_id FROM public.users  WHERE LOWER(email) = 'admin@collectiverc.com';
--
--   IF v_role_id IS NULL THEN
--     RAISE EXCEPTION 'super_admin role not found. Run 10_add_super_admin_role.sql first.';
--   END IF;
--   IF v_user_id IS NULL THEN
--     RAISE EXCEPTION 'User not found. Check the email address.';
--   END IF;
--
--   UPDATE public.users SET role_id = v_role_id WHERE id = v_user_id;
--   RAISE NOTICE 'User % promoted to super_admin (role_id = %)', v_user_id, v_role_id;
-- END $$;
-- ============================================================
