-- ============================================================
-- 02_seed_roles.sql
-- Seeds the two system roles.
-- ============================================================

INSERT INTO public.roles (name, description) VALUES
  ('admin',  'Full platform access — can manage all users, clients, and dashboards'),
  ('client', 'Restricted access — can only view their own assigned dashboards')
ON CONFLICT (name) DO NOTHING;
