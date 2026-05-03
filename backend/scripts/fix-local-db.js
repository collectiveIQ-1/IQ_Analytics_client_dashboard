/**
 * fix-local-db.js
 * ───────────────────────────────────────────────────────────────
 * One-shot script that fixes the local fallback database:
 *   1. Creates the password_reset_tokens table (migration)
 *   2. Adds tharushadilmi@gmail.com as an admin user
 *
 * Run from inside the backend/ folder:
 *   node scripts/fix-local-db.js
 * ───────────────────────────────────────────────────────────────
 */

'use strict';

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.LOCAL_DB_HOST     || 'localhost',
  port:     parseInt(process.env.LOCAL_DB_PORT, 10) || 5432,
  database: process.env.LOCAL_DB_NAME     || 'iq_local',
  user:     process.env.LOCAL_DB_USER     || 'iqlocal',
  password: process.env.LOCAL_DB_PASSWORD || 'iqlocal_password',
  connectionTimeoutMillis: 5000,
});

async function run() {
  const client = await pool.connect();
  console.log('\n✅ Connected to local DB:', process.env.LOCAL_DB_NAME || 'iq_local');

  try {
    await client.query('BEGIN');

    // ── 1. Add password_changed_at column ────────────────────────────────────
    await client.query(`
      ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ
    `);
    console.log('✅ password_changed_at column — OK');

    // ── 2. Create password_reset_tokens table ────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used       BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON public.password_reset_tokens(token_hash)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prt_user_id    ON public.password_reset_tokens(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prt_expires_at ON public.password_reset_tokens(expires_at)`);
    console.log('✅ password_reset_tokens table — OK');

    // ── 3. Add tharushadilmi@gmail.com as admin ───────────────────────────────
    // Temporary password: Admin@IQ2026!
    // bcrypt hash (12 rounds) of Admin@IQ2026!
    const TEMP_HASH = '$2b$12$P8fNNJNI3tQZla9cfyyy5OgpXtYNMhHgqgM11G2DgOK4.qH139OTK';

    const roleRes = await client.query(`SELECT id FROM public.roles WHERE name = 'admin' LIMIT 1`);
    if (roleRes.rows.length === 0) {
      throw new Error('Admin role not found in local DB. Run sql/local/01_local_schema.sql and 02_local_seed.sql first.');
    }
    const adminRoleId = roleRes.rows[0].id;

    await client.query(`
      INSERT INTO public.users (email, password_hash, full_name, role_id, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            full_name     = EXCLUDED.full_name,
            role_id       = EXCLUDED.role_id,
            is_active     = TRUE,
            updated_at    = NOW()
    `, ['tharushadilmi@gmail.com', TEMP_HASH, 'Tharush Dilmi', adminRoleId]);
    console.log('✅ tharushadilmi@gmail.com added as admin — OK');

    await client.query('COMMIT');

    // ── 4. Show all users ────────────────────────────────────────────────────
    const users = await client.query(`
      SELECT u.id, u.email, u.full_name, u.is_active, r.name AS role
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      ORDER BY u.id
    `);

    console.log('\n─── Users now in local DB ───────────────────────────────────');
    users.rows.forEach(u => {
      console.log(`  [${u.id}] ${u.email}  |  ${u.role}  |  active: ${u.is_active}`);
    });
    console.log('─────────────────────────────────────────────────────────────');
    console.log('\n🔑 Login with:');
    console.log('   Email:    tharushadilmi@gmail.com');
    console.log('   Password: Admin@IQ2026!   ← temp, change it after login\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
