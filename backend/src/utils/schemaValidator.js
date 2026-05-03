/**
 * schemaValidator.js — Safe schema resolution and validation.
 *
 * SECURITY: Schema names are NEVER accepted directly from client requests.
 * They are always resolved from the database via clientId, then
 * cross-checked against this server-side whitelist.
 */

const pool   = require('../db/pool');
const logger = require('./logger');

// Server-side whitelist — the only schemas this app will ever query
const ALLOWED_SCHEMAS = [
  'iq_qfd',
  'iq_tsh',
  'iq_usneuro',
  'iq_confidas',
  'iq_soleil',
  'iq_ionm',
  'iq_neurosurge',
  'iq_txph',
  'iq_amneuro',
  'iq_completeneuro',
  'iq_synapses',
  'iq_innervate',
  'iq_neurowatch',
];

/**
 * Resolves a safe, validated schema name for a given clientId.
 */
async function resolveClientSchema(clientId) {
  const result = await pool.query(
    `SELECT schema_name, has_schema, is_active
     FROM public.clients
     WHERE id = $1`,
    [clientId]
  );

  if (result.rows.length === 0) {
    throw Object.assign(new Error('Client not found.'), { statusCode: 404 });
  }

  const client = result.rows[0];

  if (!client.is_active) {
    throw Object.assign(new Error('Client is inactive.'), { statusCode: 403 });
  }

  if (!client.has_schema || !client.schema_name) {
    throw Object.assign(new Error('This client does not have an active data schema yet.'), { statusCode: 404 });
  }

  if (!ALLOWED_SCHEMAS.includes(client.schema_name)) {
    logger.warn(`Schema "${client.schema_name}" not in whitelist for clientId ${clientId}`);
    throw Object.assign(new Error('Schema access denied.'), { statusCode: 403 });
  }

  return client.schema_name;
}

/**
 * Verifies a user has access to a given clientId.
 */
async function verifyUserClientAccess(userId, role, clientId) {
  if (role === 'super_admin' || role === 'admin') return true;

  const result = await pool.query(
    `SELECT id FROM public.user_client_access
     WHERE user_id = $1 AND client_id = $2`,
    [userId, clientId]
  );

  if (result.rows.length === 0) {
    throw Object.assign(new Error('Access denied to this client.'), { statusCode: 403 });
  }

  return true;
}

module.exports = { resolveClientSchema, verifyUserClientAccess, ALLOWED_SCHEMAS };
