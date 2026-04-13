/**
 * auth.service.js — Authentication business logic
 */

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const pool   = require('../db/pool');
const env    = require('../config/env');

/**
 * Authenticate a user with email + password.
 * Returns a signed JWT and user info on success.
 */
async function login(email, password) {
  // 1. Find user by email (include role name via join)
  const result = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.full_name, u.is_active,
            r.name AS role
     FROM public.users u
     JOIN public.roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [email]
  );

  const user = result.rows[0];

  if (!user) {
    throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });
  }

  if (!user.is_active) {
    throw Object.assign(new Error('Your account has been deactivated.'), { statusCode: 403 });
  }

  // 2. Compare password
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });
  }

  // 3. Load client access for client-role users
  let clientIds = [];
  if (user.role === 'client') {
    const access = await pool.query(
      `SELECT client_id FROM public.user_client_access WHERE user_id = $1`,
      [user.id]
    );
    clientIds = access.rows.map((r) => r.client_id);
  }

  // 4. Sign JWT
  const payload = {
    userId:    user.id,
    email:     user.email,
    role:      user.role,
    clientIds,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

  // 5. Update last_login_at
  await pool.query(
    `UPDATE public.users SET last_login_at = NOW() WHERE id = $1`,
    [user.id]
  );

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
