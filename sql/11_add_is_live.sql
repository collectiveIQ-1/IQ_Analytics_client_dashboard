-- ============================================================
-- 11_add_is_live.sql
-- Adds is_live column to clients table.
-- QFD and USNeuro are the two clients currently live.
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark the two currently-live clients
UPDATE public.clients SET is_live = TRUE WHERE slug IN ('qfd', 'usneuro');
