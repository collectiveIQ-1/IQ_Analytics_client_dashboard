/**
 * facility.service.js — Facility Analysis queries.
 *
 * Uses MAX(date_col) from the actual table as the date reference so the
 * dashboard works regardless of how old the data is (no dependency on NOW()).
 *
 * Column discovery is resilient:
 *   • Exact-name match first (safest).
 *   • Substring-match fallback is constrained to avoid false positives
 *     (e.g. "carrierpayment" must not match the "carrier" alias).
 *   • Financial columns fall back to 0 when missing (SQL expression "0").
 *   • Grouping column (facility) falls back to a single "All Facilities" row
 *     so the UI still shows totals instead of an empty state.
 */

'use strict';

const pool   = require('../db/pool');
const logger = require('../utils/logger');

const SCHEMA   = 'iq_qfd';
const colCache = {};

// ── Helpers ──────────────────────────────────────────────────────────────────
function norm(s) { return String(s || '').toLowerCase().replace(/[_\s\-]/g, ''); }

// Aliases — these must match EXACTLY (after normalisation). No substring fallback
// is used for canonical names that collide with other columns (carrier, provider, etc.).
const ALIASES = {
  facility:       ['facility','facilityname','labname','lab','clientname','locationname','practicename'],
  totalcharge:    ['totalcharge','totalcharges','charges','charge','totchrg','chrg','chrgamt'],
  carrierpayment: ['carrierpayment','carrierpmt','inspayment','insurancepayment','inspmts','inspmt'],
  patientpayment: ['patientpayment','patientpmt','ptpayment','ptpmt'],
  carrierwo:      ['carrierwo','carrierwriteoff','carrierwroff','insadjustment','insadj','insurancewo','inswo'],
  patientwo:      ['patientwo','patientwriteoff','patientwroff','ptadjustment','patientadj','ptwo'],
  begindos:       ['begindos','dos','dateofservice','servicedate','begdos','startdos','dosbegin','dosdate'],
  doe:            ['doe','dateofentry','entrydate','postdate','entrydos','doeentry'],
};

async function discoverCols(table) {
  if (colCache[table]) return colCache[table];
  try {
    const result = await pool.query(`SELECT * FROM ${SCHEMA}.${table} LIMIT 0`);
    const actual = result.fields.map((f) => f.name);
    logger.info(`[Facility] ${table} columns (${actual.length}): ${actual.join(', ')}`);
    const map = {};
    for (const [canonical, aliases] of Object.entries(ALIASES)) {
      // Strict match only — aliases array must literally contain the normalised column name.
      const hit = actual.find((a) => aliases.includes(norm(a)));
      if (hit) map[canonical] = hit;
    }
    logger.info(`[Facility] ${table} resolved map: ${JSON.stringify(map)}`);
    colCache[table] = map;
    return map;
  } catch (err) {
    logger.error(`[Facility] discoverCols(${table}) failed: ${err.message}`);
    // Connection errors must propagate — don't cache an empty map or swallow.
    if (isConnectionError(err)) throw err;
    return {};
  }
}

function isSchemaError(err) {
  // Match only on specific PostgreSQL error codes — never on the error message
  // string "does not exist", which also matches function-signature errors like
  // "function round(double precision, integer) does not exist".
  return err.code === '42P01'  // undefined_table
      || err.code === '3F000'  // invalid_schema_name
      || err.code === '42703'  // undefined_column
      || err.code === '42P06'; // duplicate_schema
}

// Connection/timeout errors should be re-thrown so the HTTP layer returns 5xx
// and React Query retries instead of caching a "successful" empty response.
function isConnectionError(err) {
  if (!err) return false;
  const code = err.code || '';
  const msg  = (err.message || '').toLowerCase();
  const CONNECTION_CODES = [
    'ECONNREFUSED','ENOTFOUND','ETIMEDOUT','ECONNRESET','EPIPE',
    '08000','08003','08006','08001','08004','08P01',
    '57P01','57P02','57P03','53300','53400',
  ];
  return CONNECTION_CODES.includes(code)
    || msg.includes('econnrefused')
    || msg.includes('connection refused')
    || msg.includes('enotfound')
    || msg.includes('econnreset')
    || msg.includes('epipe')
    || msg.includes('timeout')
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
      // Schema/table doesn't exist in this DB — return graceful empty, not an error.
      logger.warn(`[Facility] ${label} — schema unavailable: ${err.message}`);
      return fallback;
    }
    if (isConnectionError(err)) {
      // DB is temporarily unreachable — re-throw so the HTTP layer sends 5xx.
      // React Query will retry with exponential back-off instead of caching empty.
      logger.error(`[Facility] ${label} — DB connection error (will retry): ${err.message}`);
      throw err;
    }
    logger.error(`[Facility] ${label} failed: ${err.message}`);
    return fallback;
  }
}

// ── Date range based on actual MAX date in table (not NOW()) ─────────────────
async function getTableDateRange(table, dateCol) {
  const { rows } = await pool.query(`
    SELECT
      DATE_TRUNC('month', MAX(${dateCol}))::date                              AS base_month,
      (DATE_TRUNC('month', MAX(${dateCol})) - INTERVAL '11 months')::date     AS l12_start,
      (DATE_TRUNC('month', MAX(${dateCol})) + INTERVAL  '1 month')::date      AS l12_end,
      (DATE_TRUNC('month', MAX(${dateCol})) - INTERVAL  '1 month')::date      AS lm_start,
       DATE_TRUNC('month', MAX(${dateCol}))::date                              AS lm_end
    FROM ${SCHEMA}.${table}
    WHERE ${dateCol} IS NOT NULL
  `);
  return rows[0] || {};
}

function monthToRange(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number);
  const endY = m === 12 ? y + 1 : y;
  const endM = m === 12 ? 1     : m + 1;
  return {
    start: `${yyyyMM}-01`,
    end:   `${endY}-${String(endM).padStart(2, '0')}-01`,
  };
}

// ── Available months (from actual data range) ────────────────────────────────
async function getAvailableMonths(table, dateColActual, dr) {
  if (!dr.l12_start || !dr.l12_end) return [];
  const { rows } = await pool.query(`
    SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', ${dateColActual}), 'YYYY-MM') AS month
    FROM ${SCHEMA}.${table}
    WHERE ${dateColActual} IS NOT NULL
      AND ${dateColActual} >= $1::date
      AND ${dateColActual} <  $2::date
    ORDER BY month DESC
  `, [dr.l12_start, dr.l12_end]);
  return rows.map((r) => r.month);
}

// ── Core aggregation ─────────────────────────────────────────────────────────
async function facilityAgg(table, dateColActual, dateStart, dateEnd) {
  if (!dateStart || !dateEnd) return [];

  const cols   = await discoverCols(table);
  const facCol = cols.facility;

  // Any missing financial column becomes literal "0" in SQL.
  // Cast to ::numeric so that SUM/ROUND operate on numeric, not double precision
  // (PostgreSQL has no ROUND(double precision, integer) overload).
  const c = (key) => cols[key] ? `COALESCE(${cols[key]}, 0)::numeric` : '0';

  // Group expression falls back to a single row bucket when no facility column exists
  const facExpr = facCol
    ? `COALESCE(NULLIF(TRIM(${facCol}), ''), 'Unknown')`
    : `'All Facilities'`;

  if (!facCol) {
    logger.warn(`[Facility] ${table}: no facility column discovered — falling back to single-row aggregation`);
  }

  const { rows } = await pool.query(`
    WITH raw AS (
      SELECT
        ${facExpr}             AS facility,
        ${c('totalcharge')}    AS tc,
        ${c('carrierpayment')} AS cp,
        ${c('patientpayment')} AS pp,
        ${c('carrierwo')}      AS cw,
        ${c('patientwo')}      AS pw
      FROM ${SCHEMA}.${table}
      WHERE ${dateColActual} >= $1::date
        AND ${dateColActual} <  $2::date
    ),
    agg AS (
      SELECT
        facility,
        COUNT(*)     AS procedure_count,
        SUM(tc)      AS total_charge,
        SUM(cp + pp) AS total_payments,
        SUM(cw + pw) AS total_adjustments,
        CASE WHEN SUM(tc) > 0
             THEN ROUND(SUM(cp+pp)::numeric/SUM(tc)::numeric*100,1) ELSE 0 END AS gcr_pct,
        CASE WHEN NULLIF(
                 SUM(CASE WHEN (cp+cw)>0 THEN tc ELSE 0 END)-
                 SUM(CASE WHEN (cp+cw)>0 THEN cw ELSE 0 END),0) IS NOT NULL
             THEN ROUND(
               SUM(CASE WHEN (cp+cw)>0 THEN cp+pp ELSE 0 END)::numeric/
               NULLIF(SUM(CASE WHEN (cp+cw)>0 THEN tc ELSE 0 END)-
                      SUM(CASE WHEN (cp+cw)>0 THEN cw ELSE 0 END),0)::numeric*100,1)
             ELSE 0 END AS ncr_pct
      FROM raw GROUP BY facility
    ),
    totals AS (SELECT SUM(procedure_count)::numeric AS tot FROM agg)
    SELECT
      a.facility,
      a.procedure_count::integer,
      ROUND(a.procedure_count::numeric/NULLIF(t.tot,0)*100,0)::integer AS procedure_pct,
      a.total_charge, a.total_payments,
      ROUND(a.total_payments::numeric/NULLIF(a.total_charge,0)*100,0)::integer AS payment_pct,
      a.total_adjustments, a.gcr_pct, a.ncr_pct
    FROM agg a CROSS JOIN totals t
    ORDER BY a.total_charge DESC NULLS LAST
  `, [dateStart, dateEnd]);

  logger.info(`[Facility] ${table} [${dateStart}→${dateEnd}]: ${rows.length} rows`);
  return rows;
}

// ── DOS ──────────────────────────────────────────────────────────────────────
async function getFacilityDosLast12(month) {
  return safeQuery('getDosLast12', async () => {
    const cols    = await discoverCols('dos');
    const dateCol = cols.begindos || cols.doe;
    if (!dateCol) {
      logger.warn(`[Facility] dos: no date column discovered`);
      return { rows: [], months: [], selectedMonth: null };
    }

    const dr     = await getTableDateRange('dos', dateCol);
    const months = await getAvailableMonths('dos', dateCol, dr);
    const sel    = month && month !== 'all' ? month : (months[0] || null);
    const range  = sel ? monthToRange(sel) : { start: dr.l12_start, end: dr.l12_end };
    const rows   = await facilityAgg('dos', dateCol, range.start, range.end);
    return { rows, months, selectedMonth: sel || 'all' };
  }, { rows: [], months: [], selectedMonth: null });
}

async function getFacilityDosLastMonth() {
  return safeQuery('getDosLastMonth', async () => {
    const cols    = await discoverCols('dos');
    const dateCol = cols.begindos || cols.doe;
    if (!dateCol) return { rows: [] };
    const dr   = await getTableDateRange('dos', dateCol);
    const rows = await facilityAgg('dos', dateCol, dr.lm_start, dr.lm_end);
    return { rows };
  }, { rows: [] });
}

// ── DOE ──────────────────────────────────────────────────────────────────────
async function getFacilityDoeLast12(month) {
  return safeQuery('getDoeLast12', async () => {
    const cols    = await discoverCols('doe');
    const dateCol = cols.doe || cols.begindos;
    if (!dateCol) {
      logger.warn(`[Facility] doe: no date column discovered`);
      return { rows: [], months: [], selectedMonth: 'all' };
    }

    const dr     = await getTableDateRange('doe', dateCol);
    const months = await getAvailableMonths('doe', dateCol, dr);
    const sel    = month && month !== 'all' ? month : null;
    const range  = sel ? monthToRange(sel) : { start: dr.l12_start, end: dr.l12_end };
    const rows   = await facilityAgg('doe', dateCol, range.start, range.end);
    return { rows, months, selectedMonth: sel || 'all' };
  }, { rows: [], months: [], selectedMonth: 'all' });
}

async function getFacilityDoeLastMonth() {
  return safeQuery('getDoeLastMonth', async () => {
    const cols    = await discoverCols('doe');
    const dateCol = cols.doe || cols.begindos;
    if (!dateCol) return { rows: [] };
    const dr   = await getTableDateRange('doe', dateCol);
    const rows = await facilityAgg('doe', dateCol, dr.lm_start, dr.lm_end);
    return { rows };
  }, { rows: [] });
}

// ── Debug ────────────────────────────────────────────────────────────────────
async function getFacilityDebugColumns() {
  try {
    const dosResult = await pool.query(`SELECT * FROM ${SCHEMA}.dos LIMIT 0`);
    const doeResult = await pool.query(`SELECT * FROM ${SCHEMA}.doe LIMIT 0`);
    return {
      dos: dosResult.fields.map((f) => f.name),
      doe: doeResult.fields.map((f) => f.name),
      dosResolved: await discoverCols('dos'),
      doeResolved: await discoverCols('doe'),
    };
  } catch (err) {
    return { error: err.message };
  }
}


// ── DOD (Date of Deposit) ─────────────────────────────────────────────────────
// Uses doe table (filtered by doe date) for procedure/charge data,
// deposit_report for payments, adj_report for adjustments.
// Payments & adjustments are proportionally allocated by facility's charge share.

async function facilityDodAgg(dateStart, dateEnd) {
  if (!dateStart || !dateEnd) return [];
  const cols   = await discoverCols('doe');
  const docCol = cols.doe || cols.begindos;
  if (!docCol) { logger.warn('[Facility DOD] no doe date col'); return []; }

  const tcCol  = cols.totalcharge;
  const facCol = cols.facility;
  const facExpr = facCol
    ? `COALESCE(NULLIF(TRIM(${facCol}), ''), 'Unknown')`
    : `'All Facilities'`;
  const tcExpr  = tcCol ? `COALESCE(${tcCol}, 0)::numeric` : '0';

  // Discover procedure col from actual table (not in existing ALIASES)
  let procExpr = '0';
  try {
    const res = await pool.query(`SELECT * FROM ${SCHEMA}.doe LIMIT 0`);
    const actual = res.fields.map((f) => f.name);
    const procCol = actual.find((c) => ['procedure','proc','procedurecode','proccode','cpt'].includes(c.toLowerCase().replace(/[_\s]/g, '')));
    if (procCol) procExpr = `COUNT(DISTINCT ${procCol})::integer`;
  } catch (_) {}

  const { rows } = await pool.query(`
    WITH doe_agg AS (
      SELECT
        ${facExpr}     AS facility,
        ${procExpr}    AS procedure_count,
        SUM(${tcExpr}) AS total_charge
      FROM ${SCHEMA}.doe
      WHERE ${docCol} >= $1::date AND ${docCol} < $2::date
      GROUP BY 1
    ),
    tc_sum AS (SELECT NULLIF(SUM(total_charge), 0)::numeric AS tot FROM doe_agg),
    dep AS (
      SELECT COALESCE(SUM(payments),     0)::numeric AS total_payments
      FROM ${SCHEMA}.deposit_report
      WHERE deposit_date IS NOT NULL AND deposit_date >= $1::date AND deposit_date < $2::date
    ),
    adj AS (
      SELECT COALESCE(SUM(adjustments),  0)::numeric AS total_adjustments
      FROM ${SCHEMA}.adj_report
      WHERE entry_date IS NOT NULL AND entry_date >= $1::date AND entry_date < $2::date
    ),
    combined AS (
      SELECT
        d.facility,
        d.procedure_count,
        d.total_charge,
        ROUND(COALESCE(d.total_charge / tc.tot, 0) * dep.total_payments,     0) AS total_payments,
        ROUND(COALESCE(d.total_charge / tc.tot, 0) * adj.total_adjustments,  0) AS total_adjustments
      FROM doe_agg d CROSS JOIN tc_sum tc CROSS JOIN dep CROSS JOIN adj
    ),
    totals AS (SELECT SUM(procedure_count)::numeric AS tot_proc FROM combined)
    SELECT
      c.facility,
      c.procedure_count,
      ROUND(c.procedure_count::numeric / NULLIF(t.tot_proc,0) * 100, 0)::integer AS procedure_pct,
      c.total_charge,
      c.total_payments,
      ROUND(c.total_payments / NULLIF(c.total_charge,0) * 100, 0)::integer        AS payment_pct,
      c.total_adjustments,
      0 AS gcr_pct, 0 AS ncr_pct
    FROM combined c CROSS JOIN totals t
    ORDER BY c.total_charge DESC NULLS LAST
  `, [dateStart, dateEnd]);
  logger.info(`[Facility DOD] [${dateStart}→${dateEnd}]: ${rows.length} rows`);
  return rows;
}

async function getDodDateRange() {
  const { rows } = await pool.query(`
    SELECT
      (DATE_TRUNC('month', MAX(doe)) - INTERVAL '11 months')::date AS l12_start,
      (DATE_TRUNC('month', MAX(doe)) + INTERVAL  '1 month')::date  AS l12_end,
      (DATE_TRUNC('month', MAX(doe)) - INTERVAL  '1 month')::date  AS lm_start,
       DATE_TRUNC('month', MAX(doe))::date                          AS lm_end
    FROM ${SCHEMA}.doe WHERE doe IS NOT NULL
  `);
  return rows[0] || {};
}

async function getFacilityDodLast12(month) {
  return safeQuery('getDodLast12', async () => {
    const dr = await getDodDateRange();
    const months = [];
    if (dr.l12_start && dr.l12_end) {
      const { rows: mRows } = await pool.query(`
        SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', doe), 'YYYY-MM') AS month
        FROM ${SCHEMA}.doe WHERE doe IS NOT NULL AND doe >= $1::date AND doe < $2::date
        ORDER BY month DESC
      `, [dr.l12_start, dr.l12_end]);
      mRows.forEach((r) => months.push(r.month));
    }
    const sel   = month && month !== 'all' ? month : null;
    const range = sel ? monthToRange(sel) : { start: dr.l12_start, end: dr.l12_end };
    const rows  = await facilityDodAgg(range.start, range.end);
    return { rows, months, selectedMonth: sel || 'all' };
  }, { rows: [], months: [], selectedMonth: 'all' });
}

async function getFacilityDodLastMonth() {
  return safeQuery('getDodLastMonth', async () => {
    const dr   = await getDodDateRange();
    const rows = await facilityDodAgg(dr.lm_start, dr.lm_end);
    return { rows };
  }, { rows: [] });
}

module.exports = {
  getFacilityDodLast12, getFacilityDodLastMonth,
  getFacilityDosLast12, getFacilityDosLastMonth,
  getFacilityDoeLast12, getFacilityDoeLastMonth,
  getFacilityDebugColumns,
};
