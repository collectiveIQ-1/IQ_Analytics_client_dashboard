'use strict';

const pool   = require('../db/pool');
const logger = require('../utils/logger');

const SCHEMA = 'iq_qfd';
const tbl    = (name) => `${SCHEMA}.${name}`;
const num    = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v));

function isSchemaError(err) {
  return (
    err.code === '42P01' || err.code === '3F000' || err.code === '42703' ||
    (err.message || '').toLowerCase().includes('does not exist')
  );
}

async function safeQuery(label, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    if (isSchemaError(err)) {
      logger.warn(`[AR] ${label}: schema/table/column missing — ${err.message}`);
      return fallback;
    }
    logger.error(`[AR] ${label} failed: ${err.message}`);
    throw err;
  }
}

// ── Shared ─────────────────────────────────────────────────────────────────────

const BUCKET_ORDER = ['Current', '30-60', '60-90', '90-120', '120-150', '150+'];

function bucketExpr(dateCol) {
  return `CASE
    WHEN (CURRENT_DATE - ${dateCol}::date) < 30               THEN 'Current'
    WHEN (CURRENT_DATE - ${dateCol}::date) BETWEEN 30 AND 60  THEN '30-60'
    WHEN (CURRENT_DATE - ${dateCol}::date) BETWEEN 61 AND 90  THEN '60-90'
    WHEN (CURRENT_DATE - ${dateCol}::date) BETWEEN 91 AND 120 THEN '90-120'
    WHEN (CURRENT_DATE - ${dateCol}::date) BETWEEN 121 AND 150 THEN '120-150'
    ELSE '150+'
  END`;
}

function bucketSortExpr(dateCol) {
  return `CASE ${bucketExpr(dateCol)}
    WHEN 'Current' THEN 1 WHEN '30-60' THEN 2 WHEN '60-90' THEN 3
    WHEN '90-120' THEN 4 WHEN '120-150' THEN 5 ELSE 6
  END`;
}

// ── Carrier name expression (reused) ─────────────────────────────────────────
const carrierNameExpr = `TRIM(SPLIT_PART(COALESCE(NULLIF(TRIM(carrier),''), 'Unknown'), '-', 1))`;
const financialNameExpr = `TRIM(COALESCE(NULLIF(TRIM(SPLIT_PART(financialclass, '-', 2)), ''), financialclass, 'Unknown'))`;

// ── Bucket data (bar chart + bucket pie) ──────────────────────────────────────
// Supports optional cross-filters: carrier and/or financialClass
// These are additive (AND) — backward compatible when both are null.

async function getArBuckets(dateMode = 'dos', carrier = null, financialClass = null) {
  const dateCol = dateMode === 'doe' ? 'doe' : 'begindos';
  return safeQuery('getArBuckets', async () => {
    const params  = [];
    let   cFilter = '';
    let   fFilter = '';

    if (carrier && carrier !== 'all') {
      params.push(carrier);
      cFilter = `AND ${carrierNameExpr} = $${params.length}`;
    }
    if (financialClass && financialClass !== 'all') {
      params.push(financialClass);
      fFilter = `AND ${financialNameExpr} = $${params.length}`;
    }

    const { rows } = await pool.query(`
      SELECT
        ${bucketExpr(dateCol)}           AS bucket,
        COALESCE(SUM(carrierbalance), 0) AS carrierbalance,
        COALESCE(SUM(patientbalance), 0) AS patientbalance,
        COALESCE(SUM(totalbalance),   0) AS totalbalance,
        COALESCE(SUM(totalcharge),    0) AS totalcharge
      FROM ${tbl('full_ar')}
      WHERE ${dateCol} IS NOT NULL
        ${cFilter}
        ${fFilter}
      GROUP BY 1
      ORDER BY ${bucketSortExpr(dateCol)}
    `, params);

    const map = {};
    rows.forEach(r => { map[r.bucket] = r; });
    return BUCKET_ORDER
      .map(b => ({
        bucket:         b,
        carrierbalance: num(map[b]?.carrierbalance),
        patientbalance: num(map[b]?.patientbalance),
        totalbalance:   num(map[b]?.totalbalance),
        totalcharge:    num(map[b]?.totalcharge),
      }))
      .filter(r => r.totalbalance > 0 || r.carrierbalance > 0 || r.patientbalance > 0);
  }, []);
}

// ── Carrier treemap ────────────────────────────────────────────────────────────
// Supports optional cross-filter: bucket and/or financialClass

async function getArCarrier(dateMode = 'dos', bucket = null, financialClass = null) {
  const dateCol = dateMode === 'doe' ? 'doe' : 'begindos';
  return safeQuery('getArCarrier', async () => {
    const params  = [];
    let   bFilter = '';
    let   fFilter = '';

    if (bucket && bucket !== 'all') {
      params.push(bucket);
      bFilter = `AND (${bucketExpr(dateCol)}) = $${params.length}`;
    }
    if (financialClass && financialClass !== 'all') {
      params.push(financialClass);
      fFilter = `AND ${financialNameExpr} = $${params.length}`;
    }

    const { rows } = await pool.query(`
      SELECT
        ${carrierNameExpr}              AS carrier_name,
        COALESCE(SUM(totalbalance), 0)  AS totalbalance,
        COALESCE(SUM(totalcharge),  0)  AS totalcharge
      FROM ${tbl('full_ar')}
      WHERE ${dateCol} IS NOT NULL
        AND COALESCE(carrier, '') <> ''
        ${bFilter}
        ${fFilter}
      GROUP BY 1
      ORDER BY totalbalance DESC
      LIMIT 20
    `, params);

    return rows.map(r => ({
      carrier:      r.carrier_name,
      totalbalance: num(r.totalbalance),
      totalcharge:  num(r.totalcharge),
      ar_pct:       num(r.totalcharge) > 0
                      ? Math.round(num(r.totalbalance) / num(r.totalcharge) * 1000) / 10
                      : 0,
    }));
  }, []);
}

// ── Financial category pie ────────────────────────────────────────────────────
// Supports optional cross-filter: bucket and/or carrier

async function getArFinancial(dateMode = 'dos', bucket = null, carrier = null) {
  const dateCol = dateMode === 'doe' ? 'doe' : 'begindos';
  return safeQuery('getArFinancial', async () => {
    const params  = [];
    let   bFilter = '';
    let   cFilter = '';

    if (bucket && bucket !== 'all') {
      params.push(bucket);
      bFilter = `AND (${bucketExpr(dateCol)}) = $${params.length}`;
    }
    if (carrier && carrier !== 'all') {
      params.push(carrier);
      cFilter = `AND ${carrierNameExpr} = $${params.length}`;
    }

    const { rows } = await pool.query(`
      SELECT
        ${financialNameExpr}            AS financial_class,
        COALESCE(SUM(totalbalance), 0)  AS totalbalance,
        COALESCE(SUM(totalcharge),  0)  AS totalcharge
      FROM ${tbl('full_ar')}
      WHERE ${dateCol} IS NOT NULL
        AND COALESCE(financialclass, '') <> ''
        ${bFilter}
        ${cFilter}
      GROUP BY 1
      ORDER BY totalbalance DESC
      LIMIT 12
    `, params);

    const totalBal = rows.reduce((s, r) => s + num(r.totalbalance), 0);
    return rows.map(r => ({
      financial_class: r.financial_class,
      totalbalance:    num(r.totalbalance),
      totalcharge:     num(r.totalcharge),
      ar_pct:          num(r.totalcharge) > 0
                         ? Math.round(num(r.totalbalance) / num(r.totalcharge) * 1000) / 10
                         : 0,
      pct_of_total:    totalBal > 0
                         ? Math.round(num(r.totalbalance) / totalBal * 1000) / 10
                         : 0,
    }));
  }, []);
}

module.exports = { getArBuckets, getArCarrier, getArFinancial };
