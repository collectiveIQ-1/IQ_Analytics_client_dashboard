-- ============================================================
-- 06_fix_tpc_ntos_schemas.sql
-- Correct schema mappings for TPC and NTOS.
--
-- TPC  (slug: tpc)  → schema_name = NULL, has_schema = FALSE
-- NTOS (slug: ntos) → schema_name = NULL, has_schema = FALSE
--
-- These clients do NOT have an active data schema yet and must
-- remain unmapped.  Run this once after 03_seed_clients.sql.
-- ============================================================

UPDATE public.clients
SET
    schema_name = NULL,
    has_schema  = FALSE,
    updated_at  = NOW()
WHERE slug IN ('tpc', 'ntos');

-- Verify the result
SELECT id, display_name, slug, schema_name, has_schema, is_active, sort_order
FROM   public.clients
WHERE  slug IN ('tpc', 'ntos')
ORDER  BY sort_order;
