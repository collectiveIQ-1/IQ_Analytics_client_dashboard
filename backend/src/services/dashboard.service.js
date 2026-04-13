/**
 * dashboard.service.js — Schema-scoped dashboard data queries.
 *
 * SECURITY: Schema names are resolved via schemaValidator — never from user input.
 * All queries use the validated schema_name returned by resolveClientSchema().
 */

const pool = require('../db/pool');
const { resolveClientSchema, verifyUserClientAccess } = require('../utils/schemaValidator');

/**
 * Returns a high-level summary for a client's dashboard.
 * Extend this as each client's schema is explored in later phases.
 */
async function getSummary(clientId, userId, role) {
  await verifyUserClientAccess(userId, role, clientId);
  const schemaName = await resolveClientSchema(clientId);

  // Placeholder: returns table list from the client schema as a connectivity check
  const result = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = $1
       AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [schemaName]
  );

  return {
    clientId,
    schemaName,
    tables: result.rows.map((r) => r.table_name),
    message: 'Schema connected. Dashboard data endpoints will be built per client in Phase 2+.',
  };
}

/**
 * Placeholder KPI endpoint — extend per client.
 */
async function getKpis(clientId, userId, role) {
  await verifyUserClientAccess(userId, role, clientId);
  const schemaName = await resolveClientSchema(clientId);

  // TODO: Replace with real KPI queries per client schema
  return {
    clientId,
    schemaName,
    kpis: [],
    message: 'KPI endpoint placeholder. Implement per-client queries in Phase 2+.',
  };
}

/**
 * Placeholder charts endpoint — extend per client.
 */
async function getCharts(clientId, userId, role) {
  await verifyUserClientAccess(userId, role, clientId);
  const schemaName = await resolveClientSchema(clientId);

  return {
    clientId,
    schemaName,
    charts: [],
    message: 'Charts endpoint placeholder. Implement per-client queries in Phase 2+.',
  };
}

/**
 * Placeholder reports endpoint — extend per client.
 */
async function getReports(clientId, userId, role) {
  await verifyUserClientAccess(userId, role, clientId);
  const schemaName = await resolveClientSchema(clientId);

  return {
    clientId,
    schemaName,
    reports: [],
    message: 'Reports endpoint placeholder. Implement per-client queries in Phase 2+.',
  };
}

module.exports = { getSummary, getKpis, getCharts, getReports };
