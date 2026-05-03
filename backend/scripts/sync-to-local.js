#!/usr/bin/env node
/**
 * scripts/sync-to-local.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Synchronises users, roles, clients, and access mappings from the PRIMARY
 * (remote) PostgreSQL database into the LOCAL fallback database.
 *
 * This is the recommended way to keep your local fallback DB up to date.
 * bcrypt password hashes are safe to copy — no plain-text passwords are
 * transmitted or stored.
 *
 * USAGE (from the backend/ directory):
 *   node scripts/sync-to-local.js
 *
 * The script reads connection details from your .env file.
 * Both PRIMARY and LOCAL DB variables must be set.
 *
 * Run this:
 *   • Before switching to forced-local mode for the first time.
 *   • Periodically to keep local credentials in sync with the primary.
 *   • After adding new clients or users on the primary.
 *
 * The script is fully idempotent (safe to run multiple times).
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Pool } = require('pg');

// ── Helpers ──────────────────────────────────────────────────────────────────
const ts  = () => new Date().toISOString();
const log = (...a) => console.log(`[${ts()}] INFO: `, ...a);
const err = (...a) => console.error(`[${ts()}] ERROR:`, ...a);

// ── Connection config ─────────────────────────────────────────────────────────
const primaryConfig = {
  host:                    process.env.DB_HOST,
  port:                    parseInt(process.env.DB_PORT, 10) || 5432,
  database:                process.env.DB_NAME,
  user:                    process.env.DB_USER,
  password:                process.env.DB_PASSWORD,
  connectionTimeoutMillis: 8000,
};

const localConfig = {
  host:                    process.env.LOCAL_DB_HOST     || 'localhost',
  port:                    parseInt(process.env.LOCAL_DB_PORT, 10) || 5432,
  database:                process.env.LOCAL_DB_NAME     || 'iq_local',
  user:                    process.env.LOCAL_DB_USER     || 'iqlocal',
  password:                process.env.LOCAL_DB_PASSWORD || 'iqlocal_password',
  connectionTimeoutMillis: 8000,
};

// ── Validation ────────────────────────────────────────────────────────────────
function validateConfig() {
  const needed = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = needed.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    err(`Primary DB not fully configured. Missing: ${missing.join(', ')}`);
    err('Set these in backend/.env before running this sync script.');
    process.exit(1);
  }
}

// ── Main sync ─────────────────────────────────────────────────────────────────
async function sync() {
  validateConfig();

  log('Connecting to primary database...');
  const primary = new Pool(primaryConfig);

  log('Connecting to local database...');
  const local = new Pool(localConfig);

  // Test both connections
  try {
    await primary.query('SELECT 1');
    log(`✅  Primary DB connected: ${primaryConfig.host}:${primaryConfig.port}/${primaryConfig.database}`);
  } catch (e) {
    err(`Cannot connect to primary DB: ${e.message}`);
    await primary.end();
    await local.end();
    process.exit(1);
  }

  try {
    await local.query('SELECT 1');
    log(`✅  Local DB connected: ${localConfig.host}:${localConfig.port}/${localConfig.database}`);
  } catch (e) {
    err(`Cannot connect to local DB: ${e.message}`);
    err('Have you run sql/local/00_create_local_db.sql and 01_local_schema.sql?');
    await primary.end();
    await local.end();
    process.exit(1);
  }

  const localClient = await local.connect();

  try {
    await localClient.query('BEGIN');

    // ── 1. Sync roles ─────────────────────────────────────────────────────────
    log('Syncing roles...');
    const roles = await primary.query('SELECT name, description FROM public.roles ORDER BY id');
    let roleCount = 0;
    for (const row of roles.rows) {
      await localClient.query(
        `INSERT INTO public.roles (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`,
        [row.name, row.description]
      );
      roleCount++;
    }
    log(`  → ${roleCount} role(s) synced`);

    // ── 2. Sync clients ───────────────────────────────────────────────────────
    log('Syncing clients...');
    const clients = await primary.query(
      `SELECT display_name, schema_name, slug, has_schema, is_active,
              sort_order, description, logo_url
       FROM public.clients ORDER BY sort_order`
    );
    let clientCount = 0;
    for (const row of clients.rows) {
      await localClient.query(
        `INSERT INTO public.clients
           (display_name, schema_name, slug, has_schema, is_active, sort_order, description, logo_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (slug) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           schema_name  = EXCLUDED.schema_name,
           has_schema   = EXCLUDED.has_schema,
           is_active    = EXCLUDED.is_active,
           sort_order   = EXCLUDED.sort_order,
           description  = EXCLUDED.description,
           logo_url     = EXCLUDED.logo_url,
           updated_at   = NOW()`,
        [row.display_name, row.schema_name, row.slug, row.has_schema,
         row.is_active, row.sort_order, row.description, row.logo_url]
      );
      clientCount++;
    }
    log(`  → ${clientCount} client(s) synced`);

    // ── 3. Sync users (with bcrypt hashes) ───────────────────────────────────
    log('Syncing users (including bcrypt password hashes)...');
    const users = await primary.query(
      `SELECT u.email, u.password_hash, u.full_name, u.is_active, r.name AS role
       FROM public.users u
       JOIN public.roles r ON r.id = u.role_id
       ORDER BY u.id`
    );
    let userCount = 0;
    for (const row of users.rows) {
      await localClient.query(
        `INSERT INTO public.users (email, password_hash, full_name, role_id, is_active)
         SELECT $1, $2, $3, r.id, $4
         FROM public.roles r WHERE r.name = $5
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           full_name     = EXCLUDED.full_name,
           is_active     = EXCLUDED.is_active,
           updated_at    = NOW()`,
        [row.email.toLowerCase(), row.password_hash, row.full_name, row.is_active, row.role]
      );
      userCount++;
    }
    log(`  → ${userCount} user(s) synced`);

    // ── 4. Sync user_client_access ────────────────────────────────────────────
    log('Syncing user-client access mappings...');
    const access = await primary.query(
      `SELECT u.email, c.slug
       FROM public.user_client_access uca
       JOIN public.users   u ON u.id = uca.user_id
       JOIN public.clients c ON c.id = uca.client_id
       ORDER BY uca.user_id, uca.client_id`
    );
    let accessCount = 0;
    for (const row of access.rows) {
      await localClient.query(
        `INSERT INTO public.user_client_access (user_id, client_id)
         SELECT u.id, c.id
         FROM public.users   u
         JOIN public.clients c ON c.slug = $2
         WHERE LOWER(u.email) = LOWER($1)
         ON CONFLICT (user_id, client_id) DO NOTHING`,
        [row.email, row.slug]
      );
      accessCount++;
    }
    log(`  → ${accessCount} access mapping(s) synced`);

    await localClient.query('COMMIT');
    log('');
    log('✅  Sync complete! Local DB is up to date.');
    log(`    Roles: ${roleCount}  |  Clients: ${clientCount}  |  Users: ${userCount}  |  Access: ${accessCount}`);
    log('');
    log('You can now use the local DB for fallback mode or set FORCE_LOCAL_DB=true');
    log('in backend/.env to run in local-only mode.');

  } catch (syncErr) {
    await localClient.query('ROLLBACK');
    err(`Sync failed — rolled back: ${syncErr.message}`);
    throw syncErr;
  } finally {
    localClient.release();
    await primary.end();
    await local.end();
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────
sync().catch((e) => {
  err(e.message);
  process.exit(1);
});
