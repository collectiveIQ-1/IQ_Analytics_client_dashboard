/**
 * users.service.js — User management business logic
 *
 * Role-aware behaviour:
 *   getAll(requesterRole)
 *     • super_admin → all users (including other super_admins and admins)
 *     • admin       → all users EXCEPT super_admin accounts
 *                     (admins must not see or accidentally act on super_admin records)
 *
 *   remove(id, requester)
 *     • super_admin → may delete any user (including admins and clients)
 *     • others      → rejected with 403 (defence-in-depth; route already guards this)
 */

const bcrypt       = require('bcrypt');
const pool         = require('../db/pool');
const env          = require('../config/env');
const emailService = require('./email.service');
const logger       = require('../utils/logger');

/**
 * Retrieve users.
 * super_admin sees everyone; admin sees all non-super_admin users.
 */
async function getAll(requesterRole) {
  let query;
  let params = [];

  if (requesterRole === 'super_admin') {
    // Full visibility — all users across all roles
    query = `
      SELECT u.id, u.email, u.full_name, u.is_active, u.created_at, u.last_login_at,
             r.name AS role
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      ORDER BY
        CASE r.name
          WHEN 'super_admin' THEN 1
          WHEN 'admin'       THEN 2
          WHEN 'client'      THEN 3
          ELSE 4
        END,
        u.created_at DESC
    `;
  } else {
    // admin: exclude super_admin accounts from the list
    query = `
      SELECT u.id, u.email, u.full_name, u.is_active, u.created_at, u.last_login_at,
             r.name AS role
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE r.name != 'super_admin'
      ORDER BY
        CASE r.name
          WHEN 'admin'  THEN 1
          WHEN 'client' THEN 2
          ELSE 3
        END,
        u.created_at DESC
    `;
  }

  const result = await pool.query(query, params);
  return result.rows;
}

async function getById(id) {
  const result = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.is_active, u.created_at, u.last_login_at,
            r.name AS role
     FROM public.users u
     JOIN public.roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [id]
  );
  if (!result.rows[0]) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  return result.rows[0];
}

async function create({ email, password, full_name, role }) {
  // Normalise email — always lowercase + trimmed for consistent lookup
  const normalisedEmail = typeof email === 'string' ? email.toLowerCase().trim() : email;

  // Resolve role_id from roles table
  const roleResult = await pool.query(`SELECT id FROM public.roles WHERE name = $1`, [role]);
  if (!roleResult.rows[0]) {
    throw Object.assign(new Error(`Role "${role}" not found.`), { statusCode: 400 });
  }
  const roleId = roleResult.rows[0].id;

  // Hash password
  const rounds = Number.isInteger(env.BCRYPT_ROUNDS) && env.BCRYPT_ROUNDS > 0
    ? env.BCRYPT_ROUNDS
    : 12;
  const password_hash = await bcrypt.hash(password, rounds);

  const result = await pool.query(
    `INSERT INTO public.users (email, password_hash, full_name, role_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, is_active, created_at`,
    [normalisedEmail, password_hash, full_name, roleId]
  );
  const newUser = result.rows[0];

  // Send welcome email — non-blocking; never fails the create
  emailService.sendWelcomeEmail(normalisedEmail, full_name, password, role)
    .catch((err) => logger.error(`[USERS] Welcome email failed for ${normalisedEmail}: ${err.message}`));

  return newUser;
}

async function update(id, fields) {
  const allowed = ['full_name', 'is_active'];
  const updates = [];
  const values  = [];
  let i = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${i++}`);
      values.push(fields[key]);
    }
  }

  if (updates.length === 0) {
    throw Object.assign(new Error('No valid fields to update.'), { statusCode: 400 });
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE public.users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, email, full_name, is_active`,
    values
  );
  if (!result.rows[0]) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  return result.rows[0];
}

/**
 * Permanently delete a user.
 * Defence-in-depth: only super_admin is permitted even if route guard is bypassed.
 *
 * @param {number}  id        — user to delete
 * @param {object}  requester — decoded JWT payload from req.user
 */
async function remove(id, requester) {
  // Defence-in-depth guard (route-level requireSuperAdmin already runs first)
  if (!requester || requester.role !== 'super_admin') {
    throw Object.assign(
      new Error('Only a Super Admin can delete users.'),
      { statusCode: 403 }
    );
  }

  // Prevent accidental self-deletion
  if (requester.userId === id) {
    throw Object.assign(
      new Error('You cannot delete your own account.'),
      { statusCode: 400 }
    );
  }

  const result = await pool.query(
    `DELETE FROM public.users WHERE id = $1 RETURNING id`,
    [id]
  );
  if (!result.rows[0]) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  return { deleted: true };
}

async function getUserClients(userId) {
  const result = await pool.query(
    `SELECT c.id, c.display_name, c.slug, c.schema_name, c.has_schema, uca.granted_at
     FROM public.user_client_access uca
     JOIN public.clients c ON c.id = uca.client_id
     WHERE uca.user_id = $1
     ORDER BY c.sort_order, c.display_name`,
    [userId]
  );
  return result.rows;
}

async function assignClientAccess(userId, clientId, grantedBy) {
  await pool.query(
    `INSERT INTO public.user_client_access (user_id, client_id, granted_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, client_id) DO NOTHING`,
    [userId, clientId, grantedBy]
  );
  return { assigned: true };
}

async function removeClientAccess(userId, clientId) {
  await pool.query(
    `DELETE FROM public.user_client_access WHERE user_id = $1 AND client_id = $2`,
    [userId, clientId]
  );
  return { removed: true };
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getUserClients,
  assignClientAccess,
  removeClientAccess,
};
