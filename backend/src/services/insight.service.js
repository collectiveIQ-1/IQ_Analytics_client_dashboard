/**
 * insight.service.js — Insight Analysis queries.
 *
 * Generic aggregation grouped by: provider | carrier | procedure | referringprovider
 * Works for both DOS and DOE tables.
 *
 * Uses MAX(date_col) from the actual table as the date reference so the
 * dashboard works regardless of how old the data is (no dependency on NOW()).
 *
 * Column discovery is resilient:
 *   • Exact-name match only (no substring fallback) — avoids false positives
 *     like `carrier` matching `carrierpayment` or `provider` matching
 *     `billingprovider` through substring overlap.
 *   • Financial columns fall back to literal 0 when missing.
 *   • Grouping column falls back to a single 'All' bucket so the UI still
 *     renders totals instead of an empty state.
 *   • Date column falls back from the canonical one to the other if the
 *     table happens to only carry one of them.
 */

'use strict';

const pool   = require('../db/pool');
const logger = require('../utils/logger');

const SCHEMA   = 'iq_qfd';
const colCache = {};

// ── Helpers ──────────────────────────────────────────────────────────────────
function norm(s) { return String(s || '').toLowerCase().replace(/[_\s\-]/g, ''); }

// Aliases — exact match after normalisation. DO NOT add entries that are
// substrings of other canonical keys (e.g. don't add 'carrier' here if it
// could conflict with carrierpayment/carrierwo — exact match prevents that,
// but aliases list must still only contain fully-qualified column names.)
const ALIASES = {
  // Financial
  totalcharge:       ['totalcharge','totalcharges','charges','charge','totchrg','chrg','chrgamt'],
  carrierpayment:    ['carrierpayment','carrierpmt','inspayment','insurancepayment','inspmts','inspmt'],
  patientpayment:    ['patientpayment','patientpmt','ptpayment','ptpmt'],
  carrierwo:         ['carrierwo','carrierwriteoff','carrierwroff','insadjustment','insadj','insurancewo','inswo'],
  patientwo:         ['patientwo','patientwriteoff','patientwroff','ptadjustment','patientadj','ptwo'],
  // Date
  begindos:          ['begindos','dos','dateofservice','servicedate','begdos','startdos','dosbegin','dosdate'],
  doe:               ['doe','dateofentry','entrydate','postdate','entrydos','doeentry'],
  // Group-by columns
  provider:          ['provider','providername','providerlabel','physician','physicianname','doctor','doctorname','billingprovider','renderingprovider','providingprovider'],
  carrier:           ['carrier','carriername','payer','payername','insurance','insurancename','insname','primaryinsurance','primarycarrier'],
  procedure:         ['procedure','procedurecode','proccode','cpt','cptcode','hcpcs','hcpcscode','servicecode','proc'],
  referringprovider: ['referringprovider','referringprovidername','referringphysician','referringdoctor','referringdr','refprovider','refphysician','referralprovider','referral'],
};

async function discoverCols(table) {
  if (colCache[table]) return colCache[table];
  try {
    const result = await pool.query(`SELECT * FROM ${SCHEMA}.${table} LIMIT 0`);
    const actual = result.fields.map((f) => f.name);
    logger.info(`[Insight] ${table} columns (${actual.length}): ${actual.join(', ')}`);
    const map = {};
    for (const [canonical, aliases] of Object.entries(ALIASES)) {
      // Strict exact match only.
      const hit = actual.find((a) => aliases.includes(norm(a)));
      if (hit) map[canonical] = hit;
    }
    logger.info(`[Insight] ${table} resolved map: ${JSON.stringify(map)}`);
    colCache[table] = map;
    return map;
  } catch (err) {
    logger.error(`[Insight] discoverCols(${table}) failed: ${err.message}`);
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
      logger.warn(`[Insight] ${label} — schema unavailable: ${err.message}`);
      return fallback;
    }
    if (isConnectionError(err)) {
      logger.error(`[Insight] ${label} — DB connection error (will retry): ${err.message}`);
      throw err;
    }
    logger.error(`[Insight] ${label} failed: ${err.message}`);
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

// ── Core aggregation ─────────────────────────────────────────────────────────
async function insightAgg(table, dateColCanon, groupByCanon, dateStart, dateEnd, filterVal) {
  if (!dateStart || !dateEnd) return [];

  const cols = await discoverCols(table);

  // Date column with fallback (dos may only carry begindos, doe may only carry doe).
  const dateCol = cols[dateColCanon] || cols.begindos || cols.doe;
  if (!dateCol) {
    logger.warn(`[Insight] ${table}: no date column discovered`);
    return [];
  }

  const grpCol = cols[groupByCanon];

  // Financial cols become literal "0" in SQL when missing.
  // Cast to ::numeric so that SUM/ROUND operate on numeric, not double precision
  // (PostgreSQL has no ROUND(double precision, integer) overload).
  const c = (key) => cols[key] ? `COALESCE(${cols[key]}, 0)::numeric` : '0';

  // Grouping expression falls back to a single 'All' bucket.
  const grpExpr = grpCol
    ? `COALESCE(NULLIF(TRIM(${grpCol}::text), ''), 'Unknown')`
    : `'All'`;

  if (!grpCol) {
    logger.warn(`[Insight] ${table}: group col '${groupByCanon}' not found — falling back to single-row aggregation`);
  }

  const params = [dateStart, dateEnd];
  let filterClause = '';
  // Filter only applies when we actually have the grouping column to filter on.
  if (grpCol && filterVal && filterVal !== 'all') {
    params.push(filterVal);
    filterClause = `AND TRIM(${grpCol}::text) = $${params.length}`;
  }

  const { rows } = await pool.query(`
    WITH raw AS (
      SELECT
        ${grpExpr}             AS grp_name,
        ${c('totalcharge')}    AS tc,
        ${c('carrierpayment')} AS cp,
        ${c('patientpayment')} AS pp,
        ${c('carrierwo')}      AS cw,
        ${c('patientwo')}      AS pw
      FROM ${SCHEMA}.${table}
      WHERE ${dateCol} >= $1::date
        AND ${dateCol} <  $2::date
        ${filterClause}
    ),
    agg AS (
      SELECT
        grp_name,
        COUNT(*)         AS procedure_count,
        SUM(tc)          AS total_charge,
        SUM(cp + pp)     AS total_payments,
        SUM(cw + pw)     AS total_adjustments,
        CASE WHEN SUM(tc) > 0
             THEN ROUND(SUM(cp+pp)::numeric / SUM(tc)::numeric * 100, 1)
             ELSE 0 END  AS gcr_pct,
        CASE WHEN NULLIF(
                 SUM(CASE WHEN (cp+cw)>0 THEN tc ELSE 0 END) -
                 SUM(CASE WHEN (cp+cw)>0 THEN cw ELSE 0 END), 0) IS NOT NULL
             THEN ROUND(
               SUM(CASE WHEN (cp+cw)>0 THEN cp+pp ELSE 0 END)::numeric /
               NULLIF(SUM(CASE WHEN (cp+cw)>0 THEN tc ELSE 0 END) -
                      SUM(CASE WHEN (cp+cw)>0 THEN cw ELSE 0 END), 0)::numeric * 100, 1)
             ELSE 0 END  AS ncr_pct
      FROM raw
      GROUP BY grp_name
    ),
    totals AS (SELECT SUM(procedure_count)::numeric AS tot FROM agg)
    SELECT
      a.grp_name,
      a.procedure_count::integer,
      ROUND(a.procedure_count::numeric / NULLIF(t.tot, 0) * 100, 0)::integer AS procedure_pct,
      a.total_charge,
      a.total_payments,
      ROUND(a.total_payments::numeric / NULLIF(a.total_charge, 0) * 100, 0)::integer AS payment_pct,
      a.total_adjustments,
      a.gcr_pct,
      a.ncr_pct
    FROM agg a CROSS JOIN totals t
    ORDER BY a.total_charge DESC NULLS LAST
  `, params);

  logger.info(`[Insight] ${table}/${groupByCanon} [${dateStart}→${dateEnd}] filter=${filterVal||'all'}: ${rows.length} rows`);
  return rows;
}

// ── Distinct filter values for dropdown ──────────────────────────────────────
async function getFilterValues(table, dateColCanon, groupByCanon) {
  return safeQuery(`filters:${table}/${groupByCanon}`, async () => {
    const cols    = await discoverCols(table);
    const dateCol = cols[dateColCanon] || cols.begindos || cols.doe;
    const grpCol  = cols[groupByCanon];
    if (!dateCol || !grpCol) return [];

    const dr = await getTableDateRange(table, dateCol);
    if (!dr.l12_start || !dr.l12_end) return [];

    const { rows } = await pool.query(`
      SELECT DISTINCT TRIM(${grpCol}::text) AS val
      FROM ${SCHEMA}.${table}
      WHERE ${dateCol} IS NOT NULL
        AND ${dateCol} >= $1::date
        AND ${dateCol} <  $2::date
        AND ${grpCol}  IS NOT NULL
        AND TRIM(${grpCol}::text) <> ''
      ORDER BY val
    `, [dr.l12_start, dr.l12_end]);
    return rows.map((r) => r.val);
  }, []);
}

// ── Public API ───────────────────────────────────────────────────────────────

async function getInsightDosLast12(groupBy, filter) {
  return safeQuery('dosLast12', async () => {
    const cols    = await discoverCols('dos');
    const dateCol = cols.begindos || cols.doe;
    if (!dateCol) return { rows: [] };
    const dr   = await getTableDateRange('dos', dateCol);
    const rows = await insightAgg('dos', 'begindos', groupBy, dr.l12_start, dr.l12_end, filter);
    return { rows };
  }, { rows: [] });
}

async function getInsightDosLastMonth(groupBy, filter) {
  return safeQuery('dosLastMonth', async () => {
    const cols    = await discoverCols('dos');
    const dateCol = cols.begindos || cols.doe;
    if (!dateCol) return { rows: [] };
    const dr   = await getTableDateRange('dos', dateCol);
    const rows = await insightAgg('dos', 'begindos', groupBy, dr.lm_start, dr.lm_end, filter);
    return { rows };
  }, { rows: [] });
}

async function getInsightDoeLast12(groupBy, filter) {
  return safeQuery('doeLast12', async () => {
    const cols    = await discoverCols('doe');
    const dateCol = cols.doe || cols.begindos;
    if (!dateCol) return { rows: [] };
    const dr   = await getTableDateRange('doe', dateCol);
    const rows = await insightAgg('doe', 'doe', groupBy, dr.l12_start, dr.l12_end, filter);
    return { rows };
  }, { rows: [] });
}

async function getInsightDoeLastMonth(groupBy, filter) {
  return safeQuery('doeLastMonth', async () => {
    const cols    = await discoverCols('doe');
    const dateCol = cols.doe || cols.begindos;
    if (!dateCol) return { rows: [] };
    const dr   = await getTableDateRange('doe', dateCol);
    const rows = await insightAgg('doe', 'doe', groupBy, dr.lm_start, dr.lm_end, filter);
    return { rows };
  }, { rows: [] });
}

async function getInsightDosFilters(groupBy) {
  return safeQuery(`dosFilters/${groupBy}`, async () => {
    const vals = await getFilterValues('dos', 'begindos', groupBy);
    return { values: vals };
  }, { values: [] });
}

async function getInsightDoeFilters(groupBy) {
  return safeQuery(`doeFilters/${groupBy}`, async () => {
    const vals = await getFilterValues('doe', 'doe', groupBy);
    return { values: vals };
  }, { values: [] });
}

// ── Debug ────────────────────────────────────────────────────────────────────
async function getInsightDebugColumns() {
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


// ── DOD (Date of Deposit / doe date) ─────────────────────────────────────────
// Uses doe table filtered by doe date for procedure/charge/dimension data.
// Payments proportionally allocated from deposit_report, adjustments from adj_report.

async function insightDodAgg(groupByCanon, dateStart, dateEnd, filterVal) {
  if (!dateStart || !dateEnd) return [];
  const cols   = await discoverCols('doe');
  const docCol = cols.doe || cols.begindos;
  if (!docCol) { logger.warn('[Insight DOD] no doe date col'); return []; }

  const tcCol  = cols.totalcharge;
  const grpCol = cols[groupByCanon];
  const grpExpr = grpCol
    ? `COALESCE(NULLIF(TRIM(${grpCol}::text), ''), 'Unknown')`
    : `'All'`;
  const tcExpr = tcCol ? `COALESCE(${tcCol}, 0)::numeric` : '0';

  // Discover procedure column dynamically
  let procExpr = '0';
  try {
    const res = await pool.query(`SELECT * FROM ${SCHEMA}.doe LIMIT 0`);
    const actual = res.fields.map((f) => f.name);
    const procCol = actual.find((c) => ['procedure','proc','procedurecode','proccode','cpt'].includes(c.toLowerCase().replace(/[_\s]/g, '')));
    if (procCol) procExpr = `COUNT(DISTINCT ${procCol})::integer`;
  } catch (_) {}

  const params = [dateStart, dateEnd];
  let filterClause = '';
  if (grpCol && filterVal && filterVal !== 'all') {
    params.push(filterVal);
    filterClause = `AND TRIM(${grpCol}::text) = $${params.length}`;
  }

  const { rows } = await pool.query(`
    WITH doe_agg AS (
      SELECT
        ${grpExpr}     AS grp_name,
        ${procExpr}    AS procedure_count,
        SUM(${tcExpr}) AS total_charge
      FROM ${SCHEMA}.doe
      WHERE ${docCol} >= $1::date AND ${docCol} < $2::date ${filterClause}
      GROUP BY 1
    ),
    tc_sum AS (SELECT NULLIF(SUM(total_charge), 0)::numeric AS tot FROM doe_agg),
    dep AS (
      SELECT COALESCE(SUM(payments),    0)::numeric AS total_payments
      FROM ${SCHEMA}.deposit_report
      WHERE deposit_date IS NOT NULL AND deposit_date >= $1::date AND deposit_date < $2::date
    ),
    adj AS (
      SELECT COALESCE(SUM(adjustments), 0)::numeric AS total_adjustments
      FROM ${SCHEMA}.adj_report
      WHERE entry_date IS NOT NULL AND entry_date >= $1::date AND entry_date < $2::date
    ),
    combined AS (
      SELECT
        d.grp_name,
        d.procedure_count,
        d.total_charge,
        ROUND(COALESCE(d.total_charge / tc.tot, 0) * dep.total_payments,    0) AS total_payments,
        ROUND(COALESCE(d.total_charge / tc.tot, 0) * adj.total_adjustments, 0) AS total_adjustments
      FROM doe_agg d CROSS JOIN tc_sum tc CROSS JOIN dep CROSS JOIN adj
    ),
    totals AS (SELECT SUM(procedure_count)::numeric AS tot_proc FROM combined)
    SELECT
      c.grp_name,
      c.procedure_count,
      ROUND(c.procedure_count::numeric / NULLIF(t.tot_proc,0) * 100, 0)::integer AS procedure_pct,
      c.total_charge,
      c.total_payments,
      ROUND(c.total_payments / NULLIF(c.total_charge,0) * 100, 0)::integer        AS payment_pct,
      c.total_adjustments,
      0 AS gcr_pct, 0 AS ncr_pct
    FROM combined c CROSS JOIN totals t
    ORDER BY c.total_charge DESC NULLS LAST
  `, params);
  logger.info(`[Insight DOD] ${groupByCanon} [${dateStart}→${dateEnd}]: ${rows.length} rows`);
  return rows;
}

async function getInsightDodDateRange() {
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

async function getInsightDodLast12(groupBy, filter) {
  return safeQuery('dodLast12', async () => {
    const dr   = await getInsightDodDateRange();
    const rows = await insightDodAgg(groupBy, dr.l12_start, dr.l12_end, filter);
    return { rows };
  }, { rows: [] });
}

async function getInsightDodLastMonth(groupBy, filter) {
  return safeQuery('dodLastMonth', async () => {
    const dr   = await getInsightDodDateRange();
    const rows = await insightDodAgg(groupBy, dr.lm_start, dr.lm_end, filter);
    return { rows };
  }, { rows: [] });
}

async function getInsightDodFilters(groupBy) {
  return safeQuery(`dodFilters/${groupBy}`, async () => {
    const cols   = await discoverCols('doe');
    const docCol = cols.doe || cols.begindos;
    const grpCol = cols[groupBy];
    if (!docCol || !grpCol) return { values: [] };
    const dr = await getInsightDodDateRange();
    if (!dr.l12_start || !dr.l12_end) return { values: [] };
    const { rows } = await pool.query(`
      SELECT DISTINCT TRIM(${grpCol}::text) AS val
      FROM ${SCHEMA}.doe
      WHERE ${docCol} IS NOT NULL
        AND ${docCol} >= $1::date AND ${docCol} < $2::date
        AND ${grpCol} IS NOT NULL AND TRIM(${grpCol}::text) <> ''
      ORDER BY val
    `, [dr.l12_start, dr.l12_end]);
    return { values: rows.map((r) => r.val) };
  }, { values: [] });
}

module.exports = {
  getInsightDodLast12, getInsightDodLastMonth, getInsightDodFilters,
  getInsightDosLast12,
  getInsightDosLastMonth,
  getInsightDoeLast12,
  getInsightDoeLastMonth,
  getInsightDosFilters,
  getInsightDoeFilters,
  getInsightDebugColumns,
};
