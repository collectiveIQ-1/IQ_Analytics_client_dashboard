-- ============================================================
-- 02_seed_roles.sql
-- Seeds the two system roles.
-- ============================================================

INSERT INTO public.roles (name, description) VALUES
  ('super_admin',  'highest privilege level. Can create/delete admins, delete clients, manage all role assignments, and perform all admin actions.'),
  ('admin',  'Full platform access — can manage all users, clients, and dashboards'),
  ('client', 'Restricted access — can only view their own assigned dashboards')
ON CONFLICT (name) DO NOTHING;
