-- ============================================================
-- 03_seed_clients.sql
-- Seeds all 14 clients with schema mappings.
-- ============================================================

INSERT INTO public.clients (display_name, schema_name, slug, has_schema, sort_order, description) VALUES
  ('QFD',                    'iq_qfd',       'qfd',              TRUE,  1,  'QFD client dashboard'),
  ('TSH',                    'iq_tsh',       'tsh',              TRUE,  2,  'TSH client dashboard'),
  ('USNeuro',                'iq_usneuro',   'usneuro',          TRUE,  3,  'USNeuro client dashboard'),
  ('IOM Help',               'iq_ionm',      'iom-help',         TRUE,  4,  'IOM Help client dashboard'),
  ('Soleil Surgery',         'iq_soleil',    'soleil-surgery',   TRUE,  5,  'Soleil Surgery client dashboard'),
  ('TPC',                    'iq_txph',      'tpc',              TRUE,  6,  'TPC client dashboard'),
  ('Confidas',               'iq_confidas',  'confidas',         TRUE,  7,  'Confidas client dashboard'),
  ('NTOS',                   'iq_neurosurge','ntos',             TRUE,  8,  'NTOS client dashboard'),
  ('Mind Sync',              NULL,           'mind-sync',        FALSE, 9,  'Mind Sync — dashboard coming soon'),
  ('Synapses',               NULL,           'synapses',         FALSE, 10, 'Synapses — dashboard coming soon'),
  ('Global Neurodiagnostic', NULL,           'global-neuro',     FALSE, 11, 'Global Neurodiagnostic — coming soon'),
  ('Complete Neuro',         NULL,           'complete-neuro',   FALSE, 12, 'Complete Neuro — dashboard coming soon'),
  ('Neuro Watch',            NULL,           'neuro-watch',      FALSE, 13, 'Neuro Watch — dashboard coming soon'),
  ('Innervate',              NULL,           'innervate',        FALSE, 14, 'Innervate — dashboard coming soon')
ON CONFLICT (slug) DO NOTHING;
