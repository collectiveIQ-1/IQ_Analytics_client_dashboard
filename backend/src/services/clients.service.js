/**
 * clients.service.js — Client registry business logic
 */

const pool = require('../db/pool');
const logger = require('../utils/logger');

// PostgreSQL error codes we handle explicitly
const PG_UNIQUE_VIOLATION = '23505';

// ── Lazy migration: insert missing client rows ────────────────────────────────
// INSERT ... ON CONFLICT DO NOTHING — safe to run every restart.
let _clientRowsMigrationDone = false;

async function ensureClientRows() {
  if (_clientRowsMigrationDone) return;
  const clients = [
    { display_name: 'Synapses',       slug: 'synapses',       schema_name: 'iq_synapses',      sort_order: 20 },
    { display_name: 'Complete Neuro', slug: 'complete-neuro', schema_name: 'iq_completeneuro', sort_order: 21 },
  ];
  for (const { display_name, slug, schema_name, sort_order } of clients) {
    await pool.query(
      `INSERT INTO public.clients (display_name, slug, schema_name, has_schema, is_active, is_live, sort_order)
       VALUES ($1, $2, $3, TRUE, TRUE, TRUE, $4)
       ON CONFLICT (slug) DO NOTHING`,
      [display_name, slug, schema_name, sort_order]
    );
  }
  _clientRowsMigrationDone = true;
  logger.info('[clients] Missing client rows ensured.');
}

// ── Lazy migration: add is_live column on first DB request ───────────────────
let _isLiveMigrationDone = false;

async function ensureIsLiveColumn() {
  if (_isLiveMigrationDone) return;
  await pool.query(`
    ALTER TABLE public.clients
      ADD COLUMN IF NOT EXISTS is_live BOOLEAN NOT NULL DEFAULT FALSE
  `);
  // Seed all live clients (safe to run multiple times — only updates those still FALSE)
  await pool.query(`
    UPDATE public.clients SET is_live = TRUE
    WHERE slug IN ('qfd', 'usneuro', 'iom-help', 'confidas', 'complete-neuro', 'synapses')
      AND is_live = FALSE
  `);
  _isLiveMigrationDone = true;
  logger.info('[clients] is_live column ready.');
}

// ── Lazy migration: set schema_name + has_schema for new clients ──────────────
// Safe to run on every restart — only updates rows where schema_name is still NULL/empty.
let _schemaMigrationDone = false;

async function ensureClientSchemas() {
  if (_schemaMigrationDone) return;
  const schemaMap = [
    { slug: 'complete-neuro', schema_name: 'iq_completeneuro' },
    { slug: 'synapses',       schema_name: 'iq_synapses'      },
    { slug: 'innervate',      schema_name: 'iq_innervate'     },
    { slug: 'neuro-watch',    schema_name: 'iq_neurowatch'    },
  ];
  for (const { slug, schema_name } of schemaMap) {
    await pool.query(
      `UPDATE public.clients
          SET schema_name = $1, has_schema = TRUE
        WHERE slug = $2
          AND (schema_name IS NULL OR schema_name = '')`,
      [schema_name, slug]
    );
  }
  _schemaMigrationDone = true;
  logger.info('[clients] New client schemas ensured.');
}

async function getAll() {
  await ensureClientRows();
  await ensureIsLiveColumn();
  await ensureClientSchemas();
  const result = await pool.query(
    `SELECT id, display_name, slug, schema_name, has_schema, is_active, is_live, sort_order, description, logo_url
     FROM public.clients
     ORDER BY sort_order, display_name`
  );
  return result.rows;
}

async function getAssignedForUser(userId) {
  await ensureClientRows();
  await ensureIsLiveColumn();
  await ensureClientSchemas();
  const result = await pool.query(
    `SELECT c.id, c.display_name, c.slug, c.schema_name, c.has_schema, c.is_active, c.is_live, c.sort_order, c.description, c.logo_url
     FROM public.clients c
     JOIN public.user_client_access uca ON uca.client_id = c.id
     WHERE uca.user_id = $1 AND c.is_active = true
     ORDER BY c.sort_order, c.display_name`,
    [userId]
  );
  return result.rows;
}

async function getById(id) {
  await ensureClientRows();
  await ensureIsLiveColumn();
  await ensureClientSchemas();
  const result = await pool.query(
    `SELECT id, display_name, slug, schema_name, has_schema, is_active, is_live, sort_order, description, logo_url
     FROM public.clients WHERE id = $1`,
    [id]
  );
  if (!result.rows[0]) throw Object.assign(new Error('Client not found.'), { statusCode: 404 });
  return result.rows[0];
}

async function create({ display_name, slug, schema_name, has_schema, description, sort_order }) {
  try {
    const result = await pool.query(
      `INSERT INTO public.clients (display_name, slug, schema_name, has_schema, description, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, display_name, slug, schema_name, has_schema, is_active`,
      [display_name, slug, schema_name || null, Boolean(has_schema), description || null, parseInt(sort_order, 10) || 0]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === PG_UNIQUE_VIOLATION) {
      throw Object.assign(
        new Error(`A client with slug "${slug}" already exists. Choose a different name or slug.`),
        { statusCode: 409 }
      );
    }
    throw err;
  }
}

async function update(id, fields) {
  const allowed = ['display_name', 'slug', 'schema_name', 'has_schema', 'is_active', 'is_live', 'sort_order', 'description', 'logo_url'];
  const updates = [];
  const values  = [];
  let i = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${i++}`);
      values.push(fields[key]);
    }
  }

  if (updates.length === 0) throw Object.assign(new Error('No valid fields to update.'), { statusCode: 400 });
  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE public.clients SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, display_name, slug`,
    values
  );
  if (!result.rows[0]) throw Object.assign(new Error('Client not found.'), { statusCode: 404 });
  return result.rows[0];
}

async function remove(id) {
  const result = await pool.query(`DELETE FROM public.clients WHERE id = $1 RETURNING id`, [id]);
  if (!result.rows[0]) throw Object.assign(new Error('Client not found.'), { statusCode: 404 });
  return { deleted: true };
}

module.exports = { getAll, getAssignedForUser, getById, create, update, remove };
