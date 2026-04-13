/**
 * users.service.js — User management business logic (admin only)
 */

const bcrypt = require('bcrypt');
const pool   = require('../db/pool');
const env    = require('../config/env');

async function getAll() {
  const result = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.is_active, u.created_at, u.last_login_at,
            r.name AS role
     FROM public.users u
     JOIN public.roles r ON r.id = u.role_id
     ORDER BY u.created_at DESC`
  );
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
  // Resolve role_id
  const roleResult = await pool.query(`SELECT id FROM public.roles WHERE name = $1`, [role]);
  if (!roleResult.rows[0]) throw Object.assign(new Error(`Role "${role}" not found.`), { statusCode: 400 });
  const roleId = roleResult.rows[0].id;

  // Hash password
  const password_hash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO public.users (email, password_hash, full_name, role_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, is_active, created_at`,
    [email, password_hash, full_name, roleId]
  );
  return result.rows[0];
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

  if (updates.length === 0) throw Object.assign(new Error('No valid fields to update.'), { statusCode: 400 });

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE public.users SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, email, full_name, is_active`,
    values
  );
  if (!result.rows[0]) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  return result.rows[0];
}

async function remove(id) {
  const result = await pool.query(`DELETE FROM public.users WHERE id = $1 RETURNING id`, [id]);
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

module.exports = { getAll, getById, create, update, remove, getUserClients, assignClientAccess, removeClientAccess };
