/**
 * clinical.service.js — Clinical Analysis queries.
 *
 * Targets iq_qfd.pipeline table.
 *
 * Confirmed column names (from DB screenshot):
 *   weekendingdate  — week-ending date
 *   grouplocation   — clinic / location name
 *   accession       — unique accession ID
 *   toxpcr          — test type: 'TOX' or 'PCR'
 *   panelname       — panel name
 *   specimentype    — specimen type
 *   runby           — technician / run-by
 *   provider        — ordering provider
 *   curentmonth     — current month (typo in schema — one 'r')
 *   curentyear      — current year  (typo in schema — one 'r')
 *
 * Public API:
 *   getOverview()
 *   getWeeklyVolume()
 *   getWeeklyAccounts()
 *   getClinicSummary()
 *   getClinicWeekly(topN)
 *   getByProvider(limit)
 *   getByPanel(limit)
 *   getBySpecimen()
 *   getByRunBy(limit)
 *   getDebugColumns()
 */

'use strict';

const pool   = require('../db/pool');
const logger = require('../utils/logger');

const SCHEMA = 'iq_qfd';
const TABLE  = 'pipeline_report';

// ── Error helpers ─────────────────────────────────────────────────────────────
function isSchemaError(err) {
  return err.code === '42P01'   // undefined_table
      || err.code === '3F000'   // invalid_schema_name
      || err.code === '42703'   // undefined_column
      || err.code === '42P06';  // duplicate_schema
}

function isConnectionError(err) {
  if (!err) return false;
  const code = err.code || '';
  const msg  = (err.message || '').toLowerCase();
  const CONN_CODES = [
    'ECONNREFUSED','ENOTFOUND','ETIMEDOUT','ECONNRESET','EPIPE',
    '08000','08003','08006','08001','08004','08P01',
    '57P01','57P02','57P03','53300','53400',
  ];
  return CONN_CODES.includes(code)
    || msg.includes('econnrefused') || msg.includes('connection refused')
    || msg.includes('enotfound')    || msg.includes('econnreset')
    || msg.includes('epipe')        || msg.includes('timeout')
    || msg.includes('terminating connection')
    || msg.includes('server closed the connection')
    || msg.includes('connection terminated')
    || msg.includes('connection pool')
    || msg.includes('cannot connect');
}

async function safeQuery(label, fn, fallback) {
  try { return await fn(); }
  catch (err) {
    if (isSchemaError(err)) {
      logger.warn(`[Clinical] ${label} — schema unavailable: ${err.message}`);
      return fallback;
    }
    if (isConnectionError(err)) {
      logger.error(`[Clinical] ${label} — DB connection error (will retry): ${err.message}`);
      throw err;
    }
    logger.error(`[Clinical] ${label} — unexpected error: ${err.message}`);
    throw err;
  }
}

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// ── Helper: safe text trim ────────────────────────────────────────────────────
const safeName = `COALESCE(NULLIF(TRIM(grouplocation::text), ''), 'Unknown')`;
const safeProvider = `COALESCE(NULLIF(TRIM(provider::text), ''), 'Unknown')`;
const safePanel = `COALESCE(NULLIF(TRIM(panelname::text), ''), 'Unknown')`;
const safeSpecimen = `COALESCE(NULLIF(TRIM(specimentype::text), ''), 'Unknown')`;
const safeRunBy = `COALESCE(NULLIF(TRIM(runby::text), ''), 'Unknown')`;

// ── 1. Overview KPIs ──────────────────────────────────────────────────────────
async function getOverview() {
  return safeQuery('getOverview', async () => {
    const sql = `
      SELECT
        COUNT(DISTINCT accession)                                                          AS total_accessions,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'PCR' THEN accession END)          AS total_pcr,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'TOX' THEN accession END)          AS total_tox,
        COUNT(DISTINCT ${safeName})                                                        AS total_clinics,
        TO_CHAR(MIN(weekendingdate), 'YYYY-MM-DD')                                        AS date_from,
        TO_CHAR(MAX(weekendingdate), 'YYYY-MM-DD')                                        AS date_to,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) NOT IN ('PCR','TOX') THEN accession END) AS total_other
      FROM ${SCHEMA}.${TABLE}
    `;
    const rows = await query(sql);
    return rows[0] || {};
  }, {});
}

// ── 2. Weekly Volume (PCR + TOX per week) ────────────────────────────────────
async function getWeeklyVolume() {
  return safeQuery('getWeeklyVolume', async () => {
    const sql = `
      SELECT
        TO_CHAR(weekendingdate, 'YYYY-MM-DD')                                               AS week,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'PCR' THEN accession END)           AS pcr_count,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'TOX' THEN accession END)           AS tox_count,
        COUNT(DISTINCT accession)                                                           AS total_count,
        COUNT(DISTINCT ${safeName})                                                         AS active_clinics
      FROM ${SCHEMA}.${TABLE}
      GROUP BY weekendingdate
      ORDER BY weekendingdate
    `;
    return query(sql);
  }, []);
}

// ── 3. Weekly Accounts (active clinic count + new/returning/churned) ──────────
// Computes per-week:
//   active_clinics  — distinct clinics with ≥1 accession this week
//   new_clinics     — clinics appearing for the first time ever this week
//   returning       — clinics that were active previously but missed ≥1 week
//   churned         — clinics active last week but absent this week
async function getWeeklyAccounts() {
  return safeQuery('getWeeklyAccounts', async () => {
    const sql = `
      WITH clinic_weeks AS (
        SELECT
          weekendingdate,
          ${safeName} AS clinic
        FROM ${SCHEMA}.${TABLE}
        GROUP BY weekendingdate, grouplocation
      ),
      weeks_ordered AS (
        SELECT DISTINCT weekendingdate FROM ${SCHEMA}.${TABLE} ORDER BY weekendingdate
      ),
      first_seen AS (
        SELECT clinic, MIN(weekendingdate) AS first_week
        FROM clinic_weeks
        GROUP BY clinic
      ),
      enriched AS (
        SELECT
          cw.weekendingdate,
          cw.clinic,
          fs.first_week,
          LAG(cw.weekendingdate) OVER (PARTITION BY cw.clinic ORDER BY cw.weekendingdate) AS prev_active_week
        FROM clinic_weeks cw
        JOIN first_seen fs ON fs.clinic = cw.clinic
      ),
      weekly_stats AS (
        SELECT
          TO_CHAR(weekendingdate, 'YYYY-MM-DD')               AS week,
          COUNT(DISTINCT clinic)                               AS active_clinics,
          COUNT(DISTINCT CASE WHEN weekendingdate = first_week THEN clinic END) AS new_clinics
        FROM enriched
        GROUP BY weekendingdate
      )
      SELECT
        ws.week,
        ws.active_clinics,
        ws.new_clinics
      FROM weekly_stats ws
      ORDER BY ws.week
    `;
    return query(sql);
  }, []);
}

// ── 4. Clinic Summary (ranked bar + donut) ────────────────────────────────────
async function getClinicSummary() {
  return safeQuery('getClinicSummary', async () => {
    const sql = `
      SELECT
        ${safeName}                                                                         AS clinic,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'PCR' THEN accession END)          AS pcr_count,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'TOX' THEN accession END)          AS tox_count,
        COUNT(DISTINCT accession)                                                          AS total_count
      FROM ${SCHEMA}.${TABLE}
      GROUP BY grouplocation
      ORDER BY total_count DESC
    `;
    return query(sql);
  }, []);
}

// ── 5. Clinic Weekly (top-N clinics over time, for multi-line chart) ──────────
async function getClinicWeekly(topN = 10) {
  return safeQuery('getClinicWeekly', async () => {
    const sql = `
      WITH top_clinics AS (
        SELECT ${safeName} AS clinic
        FROM ${SCHEMA}.${TABLE}
        GROUP BY grouplocation
        ORDER BY COUNT(DISTINCT accession) DESC
        LIMIT $1
      ),
      base AS (
        SELECT
          TO_CHAR(weekendingdate, 'YYYY-MM-DD')                                            AS week,
          ${safeName}                                                                      AS clinic,
          COUNT(DISTINCT accession)                                                        AS total_count,
          COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'PCR' THEN accession END)        AS pcr_count,
          COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'TOX' THEN accession END)        AS tox_count
        FROM ${SCHEMA}.${TABLE}
        WHERE ${safeName} IN (SELECT clinic FROM top_clinics)
        GROUP BY weekendingdate, grouplocation
      )
      SELECT * FROM base ORDER BY week, total_count DESC
    `;
    return query(sql, [topN]);
  }, []);
}

// ── 6. By Provider ────────────────────────────────────────────────────────────
async function getByProvider(limit = 20) {
  return safeQuery('getByProvider', async () => {
    const sql = `
      SELECT
        ${safeProvider}                                                                     AS provider,
        COUNT(DISTINCT accession)                                                          AS total_count,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'PCR' THEN accession END)          AS pcr_count,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'TOX' THEN accession END)          AS tox_count,
        COUNT(DISTINCT ${safeName})                                                        AS clinic_count
      FROM ${SCHEMA}.${TABLE}
      WHERE TRIM(provider::text) != '' AND provider IS NOT NULL
      GROUP BY provider
      ORDER BY total_count DESC
      LIMIT $1
    `;
    return query(sql, [limit]);
  }, []);
}

// ── 7. By Panel ───────────────────────────────────────────────────────────────
async function getByPanel(limit = 20) {
  return safeQuery('getByPanel', async () => {
    const sql = `
      SELECT
        ${safePanel}                                                                        AS panel_name,
        COUNT(DISTINCT accession)                                                          AS total_count,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'PCR' THEN accession END)          AS pcr_count,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'TOX' THEN accession END)          AS tox_count
      FROM ${SCHEMA}.${TABLE}
      WHERE TRIM(panelname::text) != '' AND panelname IS NOT NULL
      GROUP BY panelname
      ORDER BY total_count DESC
      LIMIT $1
    `;
    return query(sql, [limit]);
  }, []);
}

// ── 8. By Specimen Type ───────────────────────────────────────────────────────
async function getBySpecimen() {
  return safeQuery('getBySpecimen', async () => {
    const sql = `
      SELECT
        ${safeSpecimen}                                                                     AS specimen_type,
        COUNT(DISTINCT accession)                                                          AS total_count,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'PCR' THEN accession END)          AS pcr_count,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'TOX' THEN accession END)          AS tox_count
      FROM ${SCHEMA}.${TABLE}
      GROUP BY specimentype
      ORDER BY total_count DESC
    `;
    return query(sql);
  }, []);
}

// ── 9. By Run By (technician) ─────────────────────────────────────────────────
async function getByRunBy(limit = 20) {
  return safeQuery('getByRunBy', async () => {
    const sql = `
      SELECT
        ${safeRunBy}                                                                        AS run_by,
        COUNT(DISTINCT accession)                                                          AS total_count,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'PCR' THEN accession END)          AS pcr_count,
        COUNT(DISTINCT CASE WHEN UPPER(toxpcr::text) = 'TOX' THEN accession END)          AS tox_count,
        COUNT(DISTINCT ${safeName})                                                        AS clinic_count
      FROM ${SCHEMA}.${TABLE}
      WHERE TRIM(runby::text) != '' AND runby IS NOT NULL
      GROUP BY runby
      ORDER BY total_count DESC
      LIMIT $1
    `;
    return query(sql, [limit]);
  }, []);
}

// ── 10. Debug: list actual columns ────────────────────────────────────────────
async function getDebugColumns() {
  return safeQuery('getDebugColumns', async () => {
    const sql = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;
    return query(sql, [SCHEMA, TABLE]);
  }, []);
}

module.exports = {
  getOverview,
  getWeeklyVolume,
  getWeeklyAccounts,
  getClinicSummary,
  getClinicWeekly,
  getByProvider,
  getByPanel,
  getBySpecimen,
  getByRunBy,
  getDebugColumns,
};
