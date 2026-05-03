/**
 * panel.service.js — Panel Analysis queries.
 *
 * Aggregates iq_qfd.panel by:
 *   • Date dimension  : begindos (DOS)  |  doe (DOE)  |  enddos (DOD)
 *   • Group dimension : financialclass (Payor) | panel | provider | referringprovider
 *
 * Metrics returned per group (aligned with Excel's Panel-wise Summary pivot):
 *   # of Visits, # of Panels, # of Paid Panels, Total Charges,
 *   Total Payment, Total Balance, GCR %, Avg Charge / Visit, Avg Payment / Visit
 *
 * Word-file notes applied:
 *   • "BeginDOS" label → "Begin DOS" (applied on frontend)
 *   • GCR omitted from DOE queries (see isDoePage flag in controllers)
 *   • DOD uses enddos column
 *   • Charges always included in response (tooltip / DOD chart requirement)
 *   • Oral Swab panels separable via filterPanelType param
 */

'use strict';

const pool   = require('../db/pool');
const logger = require('../utils/logger');

const SCHEMA = 'iq_qfd';
const TABLE  = 'panel';

// ── Group-by column map ───────────────────────────────────────────────────────
const GROUP_COLS = {
  payor:             'financialclass',
  panel:             'panel',
  provider:          'provider',
  referringprovider: 'referringprovider',
};

// ── Date column map ───────────────────────────────────────────────────────────
const DATE_COLS = {
  dos: 'begindos',
  doe: 'doe',
  dod: 'enddos',
};

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
      logger.warn(`[Panel] ${label} — schema unavailable: ${err.message}`);
      return fallback;
    }
    if (isConnectionError(err)) {
      logger.error(`[Panel] ${label} — DB connection error (will retry): ${err.message}`);
      throw err;
    }
    logger.error(`[Panel] ${label} failed: ${err.message}`);
    return fallback;
  }
}

// ── Date range helpers ────────────────────────────────────────────────────────
async function getTableDateRange(dateCol) {
  const { rows } = await pool.query(`
    SELECT
      DATE_TRUNC('month', MAX(${dateCol}))::date                              AS base_month,
      (DATE_TRUNC('month', MAX(${dateCol})) - INTERVAL '11 months')::date     AS l12_start,
      (DATE_TRUNC('month', MAX(${dateCol})) + INTERVAL  '1 month')::date      AS l12_end,
      (DATE_TRUNC('month', MAX(${dateCol})) - INTERVAL  '1 month')::date      AS lm_start,
       DATE_TRUNC('month', MAX(${dateCol}))::date                              AS lm_end
    FROM ${SCHEMA}.${TABLE}
    WHERE ${dateCol} IS NOT NULL
  `);
  return rows[0] || {};
}

async function getAvailableMonths(dateCol, dr) {
  if (!dr.l12_start || !dr.l12_end) return [];
  const { rows } = await pool.query(`
    SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', ${dateCol}), 'YYYY-MM') AS month
    FROM ${SCHEMA}.${TABLE}
    WHERE ${dateCol} IS NOT NULL
      AND ${dateCol} >= $1::date
      AND ${dateCol} <  $2::date
    ORDER BY month DESC
  `, [dr.l12_start, dr.l12_end]);
  return rows.map((r) => r.month);
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

// ── Core aggregation ──────────────────────────────────────────────────────────
// Returns one row per group with all 9 Excel metrics.
async function panelAgg(dateCol, dateStart, dateEnd, groupByKey, filterVal, panelTypeFilter) {
  if (!dateStart || !dateEnd) return [];

  const grpCol = GROUP_COLS[groupByKey] || 'financialclass';
  const params  = [dateStart, dateEnd];
  let extraWhere = '';

  // Optional value filter (e.g. specific payor or panel)
  if (filterVal && filterVal !== 'all') {
    params.push(filterVal);
    extraWhere += ` AND TRIM(${grpCol}::text) = $${params.length}`;
  }

  // Panel-type filter: 'urine' | 'oral' | 'other'
  if (panelTypeFilter && panelTypeFilter !== 'all') {
    if (panelTypeFilter === 'urine') {
      extraWhere += ` AND LOWER(panel) LIKE '%urine%'`;
    } else if (panelTypeFilter === 'oral') {
      extraWhere += ` AND LOWER(panel) LIKE '%oral%'`;
    } else if (panelTypeFilter === 'other') {
      extraWhere += ` AND LOWER(panel) NOT LIKE '%urine%' AND LOWER(panel) NOT LIKE '%oral%'`;
    }
  }

  const { rows } = await pool.query(`
    WITH raw AS (
      SELECT
        COALESCE(NULLIF(TRIM(${grpCol}::text), ''), 'Unknown') AS grp_name,
        visitnum,
        COALESCE(totalcharge,    0)::numeric AS tc,
        COALESCE(carrierpayment, 0)::numeric AS cp,
        COALESCE(patientpayment, 0)::numeric AS pp,
        COALESCE(totalbalance,   0)::numeric AS tb,
        CASE WHEN COALESCE(carrierpayment, 0) + COALESCE(patientpayment, 0) > 0 THEN 1 ELSE 0 END AS is_paid
      FROM ${SCHEMA}.${TABLE}
      WHERE ${dateCol} >= $1::date
        AND ${dateCol} <  $2::date
        ${extraWhere}
    ),
    agg AS (
      SELECT
        grp_name,
        COUNT(DISTINCT visitnum)         AS visit_count,
        COUNT(*)                          AS panel_count,
        SUM(is_paid)                      AS paid_panel_count,
        SUM(tc)                           AS total_charge,
        SUM(cp + pp)                      AS total_payment,
        SUM(tb)                           AS total_balance,
        CASE WHEN SUM(tc) > 0
             THEN ROUND(SUM(cp + pp) / SUM(tc) * 100, 1)
             ELSE 0 END                   AS gcr_pct,
        CASE WHEN COUNT(DISTINCT visitnum) > 0
             THEN ROUND(SUM(tc) / COUNT(DISTINCT visitnum)::numeric, 2)
             ELSE 0 END                   AS avg_charge_per_visit,
        CASE WHEN COUNT(DISTINCT visitnum) > 0
             THEN ROUND(SUM(cp + pp) / COUNT(DISTINCT visitnum)::numeric, 2)
             ELSE 0 END                   AS avg_payment_per_visit
      FROM raw
      GROUP BY grp_name
    ),
    totals AS (SELECT SUM(visit_count)::numeric AS tot_visits,
                      SUM(panel_count)::numeric AS tot_panels FROM agg)
    SELECT
      a.grp_name,
      a.visit_count::integer,
      a.panel_count::integer,
      a.paid_panel_count::integer,
      CASE WHEN t.tot_visits > 0
           THEN ROUND(a.visit_count::numeric / t.tot_visits * 100, 1)
           ELSE 0 END                             AS visit_pct,
      CASE WHEN t.tot_panels > 0
           THEN ROUND(a.panel_count::numeric / t.tot_panels * 100, 1)
           ELSE 0 END                             AS panel_pct,
      a.total_charge,
      a.total_payment,
      a.total_balance,
      a.gcr_pct,
      a.avg_charge_per_visit,
      a.avg_payment_per_visit
    FROM agg a CROSS JOIN totals t
    ORDER BY a.total_charge DESC NULLS LAST
  `, params);

  logger.info(`[Panel] ${groupByKey}/${dateCol} [${dateStart}→${dateEnd}]: ${rows.length} rows`);
  return rows;
}

// ── Monthly trend (for trend chart at page top) ───────────────────────────────
async function getMonthlyTrend(dateCol, dr) {
  if (!dr.l12_start || !dr.l12_end) return [];
  const { rows } = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', ${dateCol}), 'YYYY-MM')    AS month,
      COUNT(DISTINCT visitnum)::integer                        AS visit_count,
      COUNT(*)::integer                                        AS panel_count,
      SUM(CASE WHEN COALESCE(carrierpayment,0)+COALESCE(patientpayment,0) > 0
               THEN 1 ELSE 0 END)::integer                    AS paid_panel_count,
      ROUND(SUM(COALESCE(totalcharge,   0)::numeric), 2)       AS total_charge,
      ROUND(SUM((COALESCE(carrierpayment,0)+
                 COALESCE(patientpayment,0))::numeric), 2)     AS total_payment,
      ROUND(SUM(COALESCE(totalbalance,  0)::numeric), 2)       AS total_balance,
      CASE WHEN SUM(COALESCE(totalcharge,0)) > 0
           THEN ROUND(SUM(COALESCE(carrierpayment,0)+COALESCE(patientpayment,0))::numeric
                      / SUM(COALESCE(totalcharge,0))::numeric * 100, 1)
           ELSE 0 END                                          AS gcr_pct
    FROM ${SCHEMA}.${TABLE}
    WHERE ${dateCol} IS NOT NULL
      AND ${dateCol} >= $1::date
      AND ${dateCol} <  $2::date
    GROUP BY DATE_TRUNC('month', ${dateCol})
    ORDER BY DATE_TRUNC('month', ${dateCol})
  `, [dr.l12_start, dr.l12_end]);
  return rows;
}

// ── Overall summary KPIs ──────────────────────────────────────────────────────
async function getPanelSummary(dateMode) {
  return safeQuery('summary', async () => {
    const dateCol = DATE_COLS[dateMode] || DATE_COLS.dos;
    const dr      = await getTableDateRange(dateCol);
    if (!dr.l12_start) return {};

    const { rows } = await pool.query(`
      SELECT
        COUNT(DISTINCT visitnum)::integer                          AS total_visits,
        COUNT(*)::integer                                          AS total_panels,
        SUM(CASE WHEN COALESCE(carrierpayment,0)+COALESCE(patientpayment,0) > 0
                 THEN 1 ELSE 0 END)::integer                      AS total_paid_panels,
        ROUND(SUM(COALESCE(totalcharge,   0)::numeric), 2)         AS total_charge,
        ROUND(SUM((COALESCE(carrierpayment,0)+
                   COALESCE(patientpayment,0))::numeric), 2)       AS total_payment,
        ROUND(SUM(COALESCE(totalbalance,  0)::numeric), 2)         AS total_balance,
        CASE WHEN SUM(COALESCE(totalcharge,0)) > 0
             THEN ROUND(SUM(COALESCE(carrierpayment,0)+COALESCE(patientpayment,0))::numeric
                        / SUM(COALESCE(totalcharge,0))::numeric * 100, 1)
             ELSE 0 END                                            AS gcr_pct
      FROM ${SCHEMA}.${TABLE}
      WHERE ${dateCol} IS NOT NULL
        AND ${dateCol} >= $1::date
        AND ${dateCol} <  $2::date
    `, [dr.l12_start, dr.l12_end]);

    const trend = await getMonthlyTrend(dateCol, dr);
    const months = await getAvailableMonths(dateCol, dr);

    return { kpis: rows[0] || {}, trend, months };
  }, { kpis: {}, trend: [], months: [] });
}

// ── DOS ───────────────────────────────────────────────────────────────────────
async function getPanelDosLast12(groupBy = 'payor', filter = null, month = null, panelType = null) {
  return safeQuery('dosLast12', async () => {
    const dateCol = DATE_COLS.dos;
    const dr      = await getTableDateRange(dateCol);
    const months  = await getAvailableMonths(dateCol, dr);
    const sel     = month && month !== 'all' ? month : null;
    const range   = sel ? monthToRange(sel) : { start: dr.l12_start, end: dr.l12_end };
    const rows    = await panelAgg(dateCol, range.start, range.end, groupBy, filter, panelType);
    return { rows, months, selectedMonth: sel || 'all' };
  }, { rows: [], months: [], selectedMonth: 'all' });
}

async function getPanelDosLastMonth(groupBy = 'payor', filter = null, panelType = null) {
  return safeQuery('dosLastMonth', async () => {
    const dateCol = DATE_COLS.dos;
    const dr      = await getTableDateRange(dateCol);
    const rows    = await panelAgg(dateCol, dr.lm_start, dr.lm_end, groupBy, filter, panelType);
    return { rows };
  }, { rows: [] });
}

// ── DOE ───────────────────────────────────────────────────────────────────────
async function getPanelDoeLast12(groupBy = 'payor', filter = null, month = null, panelType = null) {
  return safeQuery('doeLast12', async () => {
    const dateCol = DATE_COLS.doe;
    const dr      = await getTableDateRange(dateCol);
    const months  = await getAvailableMonths(dateCol, dr);
    const sel     = month && month !== 'all' ? month : null;
    const range   = sel ? monthToRange(sel) : { start: dr.l12_start, end: dr.l12_end };
    const rows    = await panelAgg(dateCol, range.start, range.end, groupBy, filter, panelType);
    return { rows, months, selectedMonth: sel || 'all' };
  }, { rows: [], months: [], selectedMonth: 'all' });
}

async function getPanelDoeLastMonth(groupBy = 'payor', filter = null, panelType = null) {
  return safeQuery('doeLastMonth', async () => {
    const dateCol = DATE_COLS.doe;
    const dr      = await getTableDateRange(dateCol);
    const rows    = await panelAgg(dateCol, dr.lm_start, dr.lm_end, groupBy, filter, panelType);
    return { rows };
  }, { rows: [] });
}

// ── DOD (enddos) ──────────────────────────────────────────────────────────────
async function getPanelDodLast12(groupBy = 'payor', filter = null, month = null, panelType = null) {
  return safeQuery('dodLast12', async () => {
    const dateCol = DATE_COLS.dod;
    const dr      = await getTableDateRange(dateCol);
    const months  = await getAvailableMonths(dateCol, dr);
    const sel     = month && month !== 'all' ? month : null;
    const range   = sel ? monthToRange(sel) : { start: dr.l12_start, end: dr.l12_end };
    const rows    = await panelAgg(dateCol, range.start, range.end, groupBy, filter, panelType);
    return { rows, months, selectedMonth: sel || 'all' };
  }, { rows: [], months: [], selectedMonth: 'all' });
}

async function getPanelDodLastMonth(groupBy = 'payor', filter = null, panelType = null) {
  return safeQuery('dodLastMonth', async () => {
    const dateCol = DATE_COLS.dod;
    const dr      = await getTableDateRange(dateCol);
    const rows    = await panelAgg(dateCol, dr.lm_start, dr.lm_end, groupBy, filter, panelType);
    return { rows };
  }, { rows: [] });
}

// ── Filter values for dropdowns ───────────────────────────────────────────────
async function getPanelFilterValues(dateMode = 'dos', groupBy = 'payor') {
  return safeQuery(`filters/${dateMode}/${groupBy}`, async () => {
    const dateCol = DATE_COLS[dateMode] || DATE_COLS.dos;
    const grpCol  = GROUP_COLS[groupBy] || 'financialclass';
    const dr      = await getTableDateRange(dateCol);
    if (!dr.l12_start) return { values: [] };

    const { rows } = await pool.query(`
      SELECT DISTINCT TRIM(${grpCol}::text) AS val
      FROM ${SCHEMA}.${TABLE}
      WHERE ${dateCol} IS NOT NULL
        AND ${dateCol} >= $1::date
        AND ${dateCol} <  $2::date
        AND ${grpCol}  IS NOT NULL
        AND TRIM(${grpCol}::text) <> ''
      ORDER BY val
    `, [dr.l12_start, dr.l12_end]);
    return { values: rows.map((r) => r.val) };
  }, { values: [] });
}

// ── Debug ─────────────────────────────────────────────────────────────────────
async function getPanelDebugColumns() {
  try {
    const r = await pool.query(`SELECT * FROM ${SCHEMA}.${TABLE} LIMIT 0`);
    return { columns: r.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })) };
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = {
  getPanelSummary,
  getPanelDosLast12, getPanelDosLastMonth,
  getPanelDoeLast12, getPanelDoeLastMonth,
  getPanelDodLast12, getPanelDodLastMonth,
  getPanelFilterValues,
  getPanelDebugColumns,
};
