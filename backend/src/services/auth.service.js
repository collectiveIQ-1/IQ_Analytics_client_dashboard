/**
 * auth.service.js — Authentication business logic
 */

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const pool   = require('../db/pool');
const env    = require('../config/env');
const logger = require('../utils/logger');

// PostgreSQL error codes
const PG_UNDEFINED_TABLE = '42P01'; // relation does not exist

/**
 * Authenticate a user with email + password.
 * Returns a signed JWT and user info on success.
 */
async function login(email, password) {
  // 1. Normalise email — always lowercase + trimmed before lookup.
  //    Guarantees a match regardless of how the address was originally stored.
  const normalised = typeof email === 'string' ? email.toLowerCase().trim() : email;

  // 2. Find user by email — case-insensitive comparison via LOWER()
  const result = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.full_name, u.is_active,
            r.name AS role
     FROM public.users u
     JOIN public.roles r ON r.id = u.role_id
     WHERE LOWER(u.email) = $1`,
    [normalised]
  );

  const user = result.rows[0];

  if (!user) {
    throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });
  }

  if (!user.is_active) {
    throw Object.assign(new Error('Your account has been deactivated.'), { statusCode: 403 });
  }

  // 3. Compare password.
  //    Wrapped in try/catch: bcrypt throws (not just returns false) when the stored
  //    hash is malformed (plain-text, wrong algorithm, etc.).
  let match = false;
  try {
    match = await bcrypt.compare(password, user.password_hash);
  } catch (bcryptErr) {
    logger.error(`bcrypt comparison failed for ${user.email}: ${bcryptErr.message}`);
    throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });
  }

  if (!match) {
    throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });
  }

  // 4. Load client-access rows for client-role users.
  //    Wrapped in try/catch to handle two real-world cases gracefully:
  //      a) user_client_access table does not exist yet (42P01) — treat as empty
  //      b) any other transient DB error — log and continue with empty list
  //    In both cases login still succeeds; the user just sees no assigned clients.
  //    Run sql/08_ensure_tables_exist.sql if you see the 42P01 warning below.
  let clientIds = [];
  if (user.role === 'client') {
    try {
      const access = await pool.query(
        `SELECT client_id FROM public.user_client_access WHERE user_id = $1`,
        [user.id]
      );
      clientIds = access.rows.map((r) => r.client_id);
    } catch (accessErr) {
      if (accessErr.code === PG_UNDEFINED_TABLE) {
        logger.warn(
          'Table public.user_client_access does not exist. ' +
          'Run sql/08_ensure_tables_exist.sql to create it. ' +
          'Logging client in with empty access list for now.'
        );
      } else {
        logger.error(`Failed to load client access for user ${user.id}: ${accessErr.message}`);
      }
      // Do not block login — fall through with clientIds = []
    }
  }

  // 5. Sign JWT
  const payload = {
    userId:    user.id,
    email:     user.email,
    role:      user.role,
    clientIds,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

  // 6. Update last_login_at (best-effort — don't fail login if this errors)
  pool.query(
    `UPDATE public.users SET last_login_at = NOW() WHERE id = $1`,
    [user.id]
  ).catch((e) => logger.error(`last_login_at update failed for user ${user.id}: ${e.message}`));

  return {
    token,
    user: {
      id:       user.id,
      email:    user.email,
      fullName: user.full_name,
      role:     user.role,
      clientIds,
    },
  };
}

/**
 * Return basic profile for the currently authenticated user.
 */
async function getMe(userId) {
  const result = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.is_active, u.last_login_at,
            r.name AS role
     FROM public.users u
     JOIN public.roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );

  if (!result.rows[0]) {
    throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  }

  const u = result.rows[0];
  return { id: u.id, email: u.email, fullName: u.full_name, role: u.role, lastLoginAt: u.last_login_at };
}

module.exports = { login, getMe };
