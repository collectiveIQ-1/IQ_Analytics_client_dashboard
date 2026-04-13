/**
 * clients.service.js — Client registry business logic
 */

const pool = require('../db/pool');

async function getAll() {
  const result = await pool.query(
    `SELECT id, display_name, slug, schema_name, has_schema, is_active, sort_order, description, logo_url
     FROM public.clients
     ORDER BY sort_order, display_name`
  );
  return result.rows;
}

async function getAssignedForUser(userId) {
  const result = await pool.query(
    `SELECT c.id, c.display_name, c.slug, c.schema_name, c.has_schema, c.is_active, c.sort_order, c.description, c.logo_url
     FROM public.clients c
     JOIN public.user_client_access uca ON uca.client_id = c.id
     WHERE uca.user_id = $1 AND c.is_active = true
     ORDER BY c.sort_order, c.display_name`,
    [userId]
  );
  return result.rows;
}

async function getById(id) {
  const result = await pool.query(
    `SELECT id, display_name, slug, schema_name, has_schema, is_active, sort_order, description, logo_url
     FROM public.clients WHERE id = $1`,
    [id]
  );
  if (!result.rows[0]) throw Object.assign(new Error('Client not found.'), { statusCode: 404 });
  return result.rows[0];
}

async function create({ display_name, slug, schema_name, has_schema, description, sort_order }) {
  const result = await pool.query(
    `INSERT INTO public.clients (display_name, slug, schema_name, has_schema, description, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, display_name, slug, schema_name, has_schema, is_active`,
    [display_name, slug, schema_name || null, has_schema || false, description || null, sort_order || 0]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const allowed = ['display_name', 'slug', 'schema_name', 'has_schema', 'is_active', 'sort_order', 'description', 'logo_url'];
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
