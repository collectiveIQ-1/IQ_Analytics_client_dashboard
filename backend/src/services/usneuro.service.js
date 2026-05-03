/**
 * usneuro.service.js — Data layer for US Neuro dashboard.
 *
 * Schema  : iq_usneuro
 * Tables  : usneuro_full_deposit, usneuro_full_billing, usneuro_ccr, usneuro_ccrhistory
 *
 * GLOBAL FILTERS applied to all queries:
 *   1. Biller Filter  — remove "Collective Group"
 *      Biller Category logic:
 *        IF biller = 'Collective Bill Only'           → 'Collective Bill Only' (keep)
 *        ELSE IF biller contains 'Collective'         → 'Collective Group'    (REMOVE)
 *        ELSE                                         → 'Other'               (keep)
 *      SQL: AND NOT (biller ILIKE '%Collective%' AND biller <> 'Collective Bill Only')
 *
 *   2. Insurance Filter — exclude insurance_type IN ('Aetna', 'aetna', 'Medicare')
 *      SQL: AND LOWER(COALESCE(insurance_type,'')) NOT IN ('aetna','medicare')
 *
 *   3. Remove last 2 months:
 *      DATETRUNC(month, date_collected) < DATETRUNC(month, DATEADD(month,-1,TODAY()))
 *      SQL: AND DATE_TRUNC('month',date_collected) < DATE_TRUNC('month',CURRENT_DATE) - INTERVAL '1 month'
 *
 *   4. After 2025-04-01 + last 12 months:
 *      date_collected >= DATEADD(month,-11,DATETRUNC(month,TODAY()))
 *      AND date_collected <= DATETRUNC(month,TODAY())
 *      AND date_collected >= '2025-04-01'
 *      SQL: AND date_collected >= GREATEST(DATE_TRUNC('month',CURRENT_DATE)-INTERVAL '11 months','2025-04-01')
 *
 * Column notes:
 *   usneuro_full_deposit  → payment column = payment_collected
 *   usneuro_full_billing  → payment column = collected
 *   Insurance column      → insurance_type  (both tables)
 *   Biller column         → biller          (both tables)
 */

'use strict';

const pool   = require('../db/pool');
const logger = require('../utils/logger');

const SCHEMA = 'iq_usneuro';
const tbl    = (name) => `${SCHEMA}.${name}`;

const num = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v);

function isSchemaError(err) {
  return (
    err.code === '42P01' ||
    err.code === '3F000' ||
    err.code === '42703' ||
    (err.message || '').toLowerCase().includes('does not exist')
  );
}

async function safeQuery(label, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    if (isSchemaError(err)) {
      logger.warn(`[USNeuro] ${label}: schema/table/column missing — ${err.message}`);
      return fallback;
    }
    logger.error(`[USNeuro] ${label} failed: ${err.message}`);
    throw err;
  }
}

function normalizePercent(v) {
  const value = num(v);
  if (value === 0) return 0;
  return Math.abs(value) <= 1.5 ? value * 100 : value;
}

function monthSeries(rows, valueMapper) {
  return rows.map((r) => ({ date: r.date, ...valueMapper(r) }));
}

// ── Global filter constants ────────────────────────────────────────────────────

/**
 * Biller filter: remove "Collective Group" only.
 * 'Collective Bill Only' (exact match) is KEPT.
 * Any other biller containing 'Collective' is removed (= Collective Group).
 */
const BILLER_FILTER = `AND NOT (biller ILIKE '%Collective%' AND biller <> 'Collective Bill Only')`;

/**
 * Insurance filter: exclude Aetna (case-insensitive) and Medicare.
 * Uses the insurance_type column.
 */
const INSURANCE_FILTER = `AND LOWER(COALESCE(insurance_type, '')) NOT IN ('aetna', 'medicare')`;

/**
 * Last-12-months date filter for usneuro_full_deposit (filters 3 + 4 combined):
 *   - date >= GREATEST(12 months ago floor, 2025-04-01)
 *   - date < first day of previous month  (removes last 2 months)
 *
 * @param {string} col — the date column to filter on (date_collected)
 */
const dateFilter12M = (col) => `
  AND ${col} >= GREATEST(
    DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
    '2025-04-01'::date
  )
  AND DATE_TRUNC('month', ${col}) < DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
`;

/**
 * Last-12-months filter for DOS (usneuro_full_billing, filters on `dos`).
 * No 2025-04-01 floor — billing tables use just the 12-month window.
 */
const dateFilter12M_dos = `
  AND dos IS NOT NULL
  AND dos >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
  AND DATE_TRUNC('month', dos) < DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
`;

/**
 * Last-12-months filter for DOE (usneuro_full_billing, filters on `billing_date`).
 */
const dateFilter12M_doe = `
  AND billing_date IS NOT NULL
  AND billing_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
  AND DATE_TRUNC('month', billing_date) < DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
`;

// ── KPIs ──────────────────────────────────────────────────────────────────────

/** Total Payments — usneuro_full_deposit, column: payment_collected */
async function getTotalPayments() {
  return safeQuery('getTotalPayments', async () => {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(payment_collected), 0) AS total_payments
      FROM ${tbl('usneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
        ${dateFilter12M('date_collected')}
    `);
    return { total_payments: num(rows[0]?.total_payments) };
  }, { total_payments: 0 });
}

/** Total Charges — usneuro_full_billing, column: charged */
async function getTotalChargesKpi() {
  return safeQuery('getTotalChargesKpi', async () => {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(charged), 0) AS total_charges
      FROM ${tbl('usneuro_full_billing')}
      WHERE date_collected IS NOT NULL
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
        ${dateFilter12M('date_collected')}
    `);
    return { total_charges: num(rows[0]?.total_charges) };
  }, { total_charges: 0 });
}

/** AVG Days DOS to DOE — usneuro_full_billing */
async function getAvgDays() {
  return safeQuery('getAvgDays', async () => {
    const { rows } = await pool.query(`
      SELECT ROUND(AVG((billing_date::date - dos::date))::numeric, 1) AS avg_days
      FROM ${tbl('usneuro_full_billing')}
      WHERE billing_date IS NOT NULL
        AND dos IS NOT NULL
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
        ${dateFilter12M('date_collected')}
    `);
    return { avg_days: num(rows[0]?.avg_days) };
  }, { avg_days: 0 });
}

/** Clean Claim Rate — last row from usneuro_ccrhistory, fallback to usneuro_ccr */
async function getCleanClaimRate() {
  return safeQuery('getCleanClaimRate', async () => {
    const hist = await pool.query(`
      SELECT adjusted
      FROM ${tbl('usneuro_ccrhistory')}
      WHERE month IS NOT NULL
      ORDER BY month DESC
      LIMIT 1
    `);
    if (hist.rows.length > 0) {
      return { ccr: normalizePercent(hist.rows[0]?.adjusted) };
    }
    const { rows } = await pool.query(`
      SELECT
        CASE
          WHEN SUM(COALESCE(claim_count, 0)) > 0
            THEN SUM(COALESCE(ccr, 0) * COALESCE(claim_count, 0)) / NULLIF(SUM(COALESCE(claim_count, 0)), 0)
          ELSE AVG(ccr)
        END AS ccr
      FROM ${tbl('usneuro_ccr')}
      WHERE ccr IS NOT NULL
    `);
    return { ccr: normalizePercent(rows[0]?.ccr) };
  }, { ccr: 0 });
}

async function getAllKpis() {
  const [payments, charges, avgDays, ccr] = await Promise.all([
    getTotalPayments(),
    getTotalChargesKpi(),
    getAvgDays(),
    getCleanClaimRate(),
  ]);
  return {
    total_payments: payments.total_payments,
    total_charges:  charges.total_charges,
    avg_days:       avgDays.avg_days,
    ccr:            ccr.ccr,
  };
}

// ── Payment History (DOD) ──────────────────────────────────────────────────────
// Source: usneuro_full_deposit
// X-axis: date_collected  |  Y-axis: payment_collected

/** Last 12 months (filtered) */
async function getPaymentHistory() {
  return safeQuery('getPaymentHistory', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('usneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
        ${dateFilter12M('date_collected')}
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return monthSeries(rows, (r) => ({ payments: num(r.payments) }));
  }, []);
}

/** All-time (expanded view) — same table, same columns, no date window */
async function getPaymentHistoryFull() {
  return safeQuery('getPaymentHistoryFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('usneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return monthSeries(rows, (r) => ({ payments: num(r.payments) }));
  }, []);
}

// ── Charges vs Payments (DOE) ──────────────────────────────────────────────────
// Source: usneuro_full_billing
// X-axis: billing_date  |  Y-axis: charged (charges), collected (payments)

async function getChargesVsPayments() {
  return safeQuery('getChargesVsPayments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0)   AS total_charges,
        COALESCE(SUM(collected), 0) AS total_payments
      FROM ${tbl('usneuro_full_billing')}
      WHERE billing_date IS NOT NULL
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
        ${dateFilter12M_doe}
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return monthSeries(rows, (r) => ({
      total_charges:  num(r.total_charges),
      total_payments: num(r.total_payments),
    }));
  }, []);
}

async function getChargesVsPaymentsFull() {
  return safeQuery('getChargesVsPaymentsFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0)   AS total_charges,
        COALESCE(SUM(collected), 0) AS total_payments
      FROM ${tbl('usneuro_full_billing')}
      WHERE billing_date IS NOT NULL
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return monthSeries(rows, (r) => ({
      total_charges:  num(r.total_charges),
      total_payments: num(r.total_payments),
    }));
  }, []);
}

// ── CCR History ───────────────────────────────────────────────────────────────
// Source: usneuro_ccrhistory (pre-aggregated — no biller/insurance filters)

async function getCcrHistory() {
  return safeQuery('getCcrHistory', async () => {
    const { rows } = await pool.query(`
      SELECT month::text AS month_raw, adjusted
      FROM ${tbl('usneuro_ccrhistory')}
      WHERE month IS NOT NULL
    `);

    const toSortKey = (value) => {
      if (value == null) return Number.MAX_SAFE_INTEGER;
      const s = String(value).trim();
      const direct = Date.parse(s);
      if (!Number.isNaN(direct)) return direct;
      const normalized = s.replace(/^(\d{1,2})[/-](\d{2,4})$/, '01/$1/$2');
      const second = Date.parse(normalized);
      if (!Number.isNaN(second)) return second;
      return Number.MAX_SAFE_INTEGER;
    };

    return rows
      .map((r) => ({ month: r.month_raw, adjusted: normalizePercent(r.adjusted) }))
      .sort((a, b) => toSortKey(a.month) - toSortKey(b.month));
  }, []);
}

// ── AR Pie (DOE age buckets — billing_date) ───────────────────────────────────

async function getArPie() {
  return safeQuery('getArPie', async () => {
    const { rows } = await pool.query(`
      WITH raw AS (
        SELECT
          CASE
            WHEN (CURRENT_DATE - billing_date::date) < 30            THEN 'Current'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 30 AND 59   THEN '30-60'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 60 AND 89   THEN '60-90'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 90 AND 119  THEN '90-120'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 120 AND 149 THEN '120-150'
            ELSE '150+'
          END AS bucket,
          ABS(COALESCE(total_balance, 0)) AS total_balance
        FROM ${tbl('usneuro_full_billing')}
        WHERE billing_date IS NOT NULL
          ${BILLER_FILTER}
          ${INSURANCE_FILTER}
      ),
      agg AS (
        SELECT bucket, COALESCE(SUM(total_balance), 0) AS total_balance
        FROM raw GROUP BY bucket
      ),
      buckets AS (
        SELECT * FROM (VALUES
          ('Current',1),('30-60',2),('60-90',3),
          ('90-120',4),('120-150',5),('150+',6)
        ) AS v(bucket, sort_order)
      )
      SELECT b.bucket, COALESCE(a.total_balance, 0) AS total_balance
      FROM buckets b LEFT JOIN agg a ON a.bucket = b.bucket
      ORDER BY b.sort_order
    `);
    return rows.map((r) => ({ bucket: r.bucket, total_balance: num(r.total_balance) }));
  }, []);
}

// ── Total Charges chart (DOE — billing_date) ──────────────────────────────────

async function getTotalChargesChart() {
  return safeQuery('getTotalChargesChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0) AS total_charges
      FROM ${tbl('usneuro_full_billing')}
      WHERE billing_date IS NOT NULL
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
        ${dateFilter12M('date_collected')}
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return monthSeries(rows, (r) => ({ total_charges: num(r.total_charges) }));
  }, []);
}

async function getTotalChargesChartFull() {
  return safeQuery('getTotalChargesChartFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0) AS total_charges
      FROM ${tbl('usneuro_full_billing')}
      WHERE billing_date IS NOT NULL
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return monthSeries(rows, (r) => ({ total_charges: num(r.total_charges) }));
  }, []);
}

// ── Total Adjustments (write_off by date_collected) ───────────────────────────

async function getAdjustments() {
  return safeQuery('getAdjustments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(write_off), 0) AS adjustments
      FROM ${tbl('usneuro_full_billing')}
      WHERE date_collected IS NOT NULL
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
        ${dateFilter12M('date_collected')}
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return monthSeries(rows, (r) => ({ adjustments: num(r.adjustments) }));
  }, []);
}

async function getAdjustmentsFull() {
  return safeQuery('getAdjustmentsFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(write_off), 0) AS adjustments
      FROM ${tbl('usneuro_full_billing')}
      WHERE date_collected IS NOT NULL
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return monthSeries(rows, (r) => ({ adjustments: num(r.adjustments) }));
  }, []);
}

// ── AR Donut (DOS age buckets, grouped > 60 days) ─────────────────────────────

async function getArDonut() {
  return safeQuery('getArDonut', async () => {
    const { rows } = await pool.query(`
      WITH bucketed AS (
        SELECT
          CASE
            WHEN (CURRENT_DATE - dos::date) < 30            THEN 'Current'
            WHEN (CURRENT_DATE - dos::date) BETWEEN 30 AND 59   THEN '30-60'
            WHEN (CURRENT_DATE - dos::date) BETWEEN 60 AND 89   THEN '60-90'
            WHEN (CURRENT_DATE - dos::date) BETWEEN 90 AND 119  THEN '90-120'
            WHEN (CURRENT_DATE - dos::date) BETWEEN 120 AND 149 THEN '120-150'
            ELSE '150+'
          END AS raw_bucket,
          COALESCE(total_balance, 0) AS bal
        FROM ${tbl('usneuro_full_billing')}
        WHERE dos IS NOT NULL
          ${BILLER_FILTER}
          ${INSURANCE_FILTER}
      )
      SELECT
        CASE
          WHEN raw_bucket IN ('Current', '30-60') THEN '≤ 60 Days'
          ELSE '> 60 Days'
        END AS bucket,
        COALESCE(SUM(bal), 0) AS total_balance
      FROM bucketed
      GROUP BY 1
      ORDER BY 1 DESC
    `);
    return rows.map((r) => ({ bucket: r.bucket, total_balance: num(r.total_balance) }));
  }, []);
}

// ── Denial Reasons (CCR page table) ───────────────────────────────────────────

async function getDenialReasons() {
  return safeQuery('getDenialReasons', async () => {
    const { rows } = await pool.query(`
      SELECT
        denial_reason,
        COALESCE(SUM(claim_count), 0) AS claimcount,
        COALESCE(SUM(value), 0)       AS value,
        COALESCE(SUM(
          CASE
            WHEN percentage IS NULL OR TRIM(percentage::text) = '' THEN 0
            ELSE REPLACE(TRIM(percentage::text), '%', '')::numeric
          END
        ), 0) AS percentage
      FROM ${tbl('usneuro_ccr')}
      WHERE denial_reason IS NOT NULL
        AND TRIM(denial_reason) <> ''
      GROUP BY denial_reason
      ORDER BY SUM(claim_count) DESC NULLS LAST
      LIMIT 10
    `);
    return rows.map((r) => ({
      denial_reason: r.denial_reason,
      claimcount:    num(r.claimcount),
      value:         num(r.value),
      percentage:    normalizePercent(r.percentage),
    }));
  }, []);
}

// ── PAYMENTS PAGE — Biller mode helpers ──────────────────────────────────────

/**
 * billerModeFilter(mode)
 *   'both'      → all Collective billers (Bill Only + Group)
 *   'bill_only' → only 'Collective Bill Only'
 *   'rcm'       → Collective Group (contains 'Collective' but ≠ 'Collective Bill Only')
 */
function billerModeFilter(mode) {
  if (mode === 'bill_only') return `AND biller = 'Collective Bill Only'`;
  if (mode === 'rcm')       return `AND (biller ILIKE '%Collective%' AND biller <> 'Collective Bill Only')`;
  // 'both' — all Collective billers
  return `AND biller ILIKE '%Collective%'`;
}

/** All-time payment line chart filtered by biller mode */
async function getPaymentLineChart(mode = 'rcm') {
  return safeQuery('getPaymentLineChart', async () => {
    const bf = billerModeFilter(mode);
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('usneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${bf}
        ${INSURANCE_FILTER}
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return monthSeries(rows, (r) => ({ payments: num(r.payments) }));
  }, []);
}

/** Deposits by surgeon — last 12 months, filtered by biller mode */
async function getDepositsBySurgeon(mode = 'rcm') {
  return safeQuery('getDepositsBySurgeon', async () => {
    const bf = billerModeFilter(mode);
    const { rows } = await pool.query(`
      SELECT
        COALESCE(surgeon, 'Unknown') AS surgeon,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('usneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${bf}
        ${INSURANCE_FILTER}
        ${dateFilter12M('date_collected')}
      GROUP BY surgeon
      ORDER BY payments DESC
      LIMIT 30
    `);
    return rows.map((r) => ({ surgeon: r.surgeon, payments: num(r.payments) }));
  }, []);
}

/** Deposits by hospital — last 12 months, filtered by biller mode */
async function getDepositsByHospital(mode = 'rcm') {
  return safeQuery('getDepositsByHospital', async () => {
    const bf = billerModeFilter(mode);
    const { rows } = await pool.query(`
      SELECT
        COALESCE(hospital, 'Unknown') AS hospital,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('usneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${bf}
        ${INSURANCE_FILTER}
        ${dateFilter12M('date_collected')}
      GROUP BY hospital
      ORDER BY payments DESC
      LIMIT 30
    `);
    return rows.map((r) => ({ hospital: r.hospital, payments: num(r.payments) }));
  }, []);
}

/** Deposits by billing type — last 12 months, filtered by biller mode */
async function getDepositsByBillingType(mode = 'rcm') {
  return safeQuery('getDepositsByBillingType', async () => {
    const bf = billerModeFilter(mode);
    const { rows } = await pool.query(`
      SELECT
        COALESCE(billing_type, 'Null') AS billing_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('usneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${bf}
        ${INSURANCE_FILTER}
        ${dateFilter12M('date_collected')}
      GROUP BY billing_type
      ORDER BY payments DESC
    `);
    return rows.map((r) => ({ billing_type: r.billing_type, payments: num(r.payments) }));
  }, []);
}

/** Deposits by insurance type — last 12 months, filtered by biller mode */
async function getDepositsByInsurance(mode = 'rcm') {
  return safeQuery('getDepositsByInsurance', async () => {
    const bf = billerModeFilter(mode);
    const { rows } = await pool.query(`
      SELECT
        COALESCE(insurance_type, 'Unknown') AS insurance_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('usneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${bf}
        ${INSURANCE_FILTER}
        ${dateFilter12M('date_collected')}
      GROUP BY insurance_type
      ORDER BY payments DESC
      LIMIT 20
    `);
    return rows.map((r) => ({ insurance_type: r.insurance_type, payments: num(r.payments) }));
  }, []);
}

// ── PRODUCTION PAGE ───────────────────────────────────────────────────────────

/** DOS chart: charges vs payments grouped by date-of-service month (last 12 months) */
async function getProductionDosChart() {
  return safeQuery('getProductionDosChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', dos)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0)   AS total_charges,
        COALESCE(SUM(collected), 0) AS total_payments,
        CASE
          WHEN SUM(charged) > 0
          THEN ROUND(((SUM(collected) / SUM(charged)) * 100)::numeric, 2)
          ELSE 0
        END AS gcr_pct
      FROM ${tbl('usneuro_full_billing')}
      WHERE 1=1
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
        ${dateFilter12M_dos}
      GROUP BY DATE_TRUNC('month', dos)
      ORDER BY DATE_TRUNC('month', dos) ASC
    `);
    return rows.map((r) => ({
      date:           r.date,
      total_charges:  num(r.total_charges),
      total_payments: num(r.total_payments),
      gcr_pct:        num(r.gcr_pct),
    }));
  }, []);
}

/** DOE chart: total charges grouped by billing_date month (last 12 months) */
async function getProductionDoeChart() {
  return safeQuery('getProductionDoeChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0) AS total_charges
      FROM ${tbl('usneuro_full_billing')}
      WHERE 1=1
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
        ${dateFilter12M_doe}
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return rows.map((r) => ({
      date:          r.date,
      total_charges: num(r.total_charges),
    }));
  }, []);
}

/** Reimbursement analysis table grouped by DOS month (last 12 months) */
async function getProductionDosReimbursement() {
  return safeQuery('getProductionDosReimbursement', async () => {
    const { rows } = await pool.query(`
      SELECT
        DATE_TRUNC('month', dos) AS month,
        COUNT(DISTINCT claim_seq)                                          AS visit_count,
        COALESCE(SUM(charged),       0)                                   AS total_charge,
        COALESCE(SUM(collected),     0)                                   AS total_payments,
        -- insurance payment: collected where NOT Self Pay
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay' THEN collected ELSE 0 END), 0) AS insurance_payments,
        -- patient payment: collected where Self Pay
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN collected ELSE 0 END), 0) AS patient_payment,
        COALESCE(SUM(write_off),     0)                                   AS total_adjustments,
        -- insurance adjustment: write_off where NOT Self Pay
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay' THEN write_off ELSE 0 END), 0) AS insurance_adjustments,
        -- patient adjustment: write_off where Self Pay
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN write_off ELSE 0 END), 0) AS patient_adjustments,
        COALESCE(SUM(total_balance), 0)                                   AS total_balance,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay' THEN total_balance ELSE 0 END), 0) AS insurance_balance,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN total_balance ELSE 0 END), 0) AS patient_balance,
        CASE WHEN COUNT(DISTINCT claim_seq) > 0
          THEN ROUND(SUM(charged)::numeric   / COUNT(DISTINCT claim_seq), 0) ELSE 0 END AS avg_chrg_per_visit,
        CASE WHEN COUNT(DISTINCT claim_seq) > 0
          THEN ROUND(SUM(collected)::numeric / COUNT(DISTINCT claim_seq), 0) ELSE 0 END AS avg_pmt_per_visit,
        -- GCR% = collected / charged
        CASE WHEN SUM(charged) > 0
          THEN ROUND(((SUM(collected) / SUM(charged)) * 100)::numeric, 2) ELSE 0 END AS gcr_pct,
        -- GCR without pt balance (same formula)
        CASE WHEN SUM(charged) > 0
          THEN ROUND(((SUM(collected) / SUM(charged)) * 100)::numeric, 1) ELSE 0 END AS gcr_without_pt_balance,
        -- GCR fully paid: collected / charged for claims where charged != write_off AND total_balance = 0
        CASE WHEN SUM(CASE WHEN charged <> write_off AND total_balance = 0 THEN charged ELSE 0 END) > 0
          THEN ROUND(
            (SUM(CASE WHEN charged <> write_off AND total_balance = 0 THEN collected ELSE 0 END)::numeric
            / SUM(CASE WHEN charged <> write_off AND total_balance = 0 THEN charged  ELSE 0 END)::numeric * 100), 1)
          ELSE 0 END AS gcr_fully_paid,
        -- NCR%: collected / (charged - write_off) for claims where collected + write_off > 0
        CASE WHEN SUM(CASE WHEN collected + write_off > 0 THEN charged - write_off ELSE 0 END) > 0
          THEN ROUND(
            (SUM(CASE WHEN collected + write_off > 0 THEN collected ELSE 0 END)::numeric
            / NULLIF(SUM(CASE WHEN collected + write_off > 0 THEN charged - write_off ELSE 0 END), 0)::numeric * 100), 1)
          ELSE 0 END AS ncr_pct
      FROM ${tbl('usneuro_full_billing')}
      WHERE 1=1
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
        ${dateFilter12M_dos}
      GROUP BY DATE_TRUNC('month', dos)
      ORDER BY DATE_TRUNC('month', dos) ASC
    `);
    return rows.map((r) => ({
      month:                  r.month,
      visit_count:            num(r.visit_count),
      total_charge:           num(r.total_charge),
      total_payments:         num(r.total_payments),
      insurance_payments:     num(r.insurance_payments),
      patient_payment:        num(r.patient_payment),
      total_adjustments:      num(r.total_adjustments),
      insurance_adjustments:  num(r.insurance_adjustments),
      patient_adjustments:    num(r.patient_adjustments),
      total_balance:          num(r.total_balance),
      insurance_balance:      num(r.insurance_balance),
      patient_balance:        num(r.patient_balance),
      avg_chrg_per_visit:     num(r.avg_chrg_per_visit),
      avg_pmt_per_visit:      num(r.avg_pmt_per_visit),
      gcr_pct:                num(r.gcr_pct),
      gcr_without_pt_balance: num(r.gcr_without_pt_balance),
      gcr_fully_paid:         num(r.gcr_fully_paid),
      ncr_pct:                num(r.ncr_pct),
    }));
  }, []);
}

/** Reimbursement analysis table grouped by DOE (billing_date) month (last 12 months) */
async function getProductionDoeReimbursement() {
  return safeQuery('getProductionDoeReimbursement', async () => {
    const { rows } = await pool.query(`
      SELECT
        DATE_TRUNC('month', billing_date) AS month,
        COUNT(DISTINCT claim_seq)                                          AS visit_count,
        COALESCE(SUM(charged),       0)                                   AS total_charge,
        COALESCE(SUM(collected),     0)                                   AS total_payments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay' THEN collected ELSE 0 END), 0) AS insurance_payments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN collected ELSE 0 END), 0) AS patient_payment,
        COALESCE(SUM(write_off),     0)                                   AS total_adjustments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay' THEN write_off ELSE 0 END), 0) AS insurance_adjustments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN write_off ELSE 0 END), 0) AS patient_adjustments,
        COALESCE(SUM(total_balance), 0)                                   AS total_balance,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay' THEN total_balance ELSE 0 END), 0) AS insurance_balance,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN total_balance ELSE 0 END), 0) AS patient_balance,
        CASE WHEN COUNT(DISTINCT claim_seq) > 0
          THEN ROUND(SUM(charged)::numeric   / COUNT(DISTINCT claim_seq), 0) ELSE 0 END AS avg_chrg_per_visit,
        CASE WHEN COUNT(DISTINCT claim_seq) > 0
          THEN ROUND(SUM(collected)::numeric / COUNT(DISTINCT claim_seq), 0) ELSE 0 END AS avg_pmt_per_visit,
        CASE WHEN SUM(charged) > 0
          THEN ROUND(((SUM(collected) / SUM(charged)) * 100)::numeric, 2) ELSE 0 END AS gcr_pct,
        CASE WHEN SUM(charged) > 0
          THEN ROUND(((SUM(collected) / SUM(charged)) * 100)::numeric, 1) ELSE 0 END AS gcr_without_pt_balance,
        CASE WHEN SUM(CASE WHEN charged <> write_off AND total_balance = 0 THEN charged ELSE 0 END) > 0
          THEN ROUND(
            (SUM(CASE WHEN charged <> write_off AND total_balance = 0 THEN collected ELSE 0 END)::numeric
            / SUM(CASE WHEN charged <> write_off AND total_balance = 0 THEN charged  ELSE 0 END)::numeric * 100), 1)
          ELSE 0 END AS gcr_fully_paid,
        CASE WHEN SUM(CASE WHEN collected + write_off > 0 THEN charged - write_off ELSE 0 END) > 0
          THEN ROUND(
            (SUM(CASE WHEN collected + write_off > 0 THEN collected ELSE 0 END)::numeric
            / NULLIF(SUM(CASE WHEN collected + write_off > 0 THEN charged - write_off ELSE 0 END), 0)::numeric * 100), 1)
          ELSE 0 END AS ncr_pct
      FROM ${tbl('usneuro_full_billing')}
      WHERE 1=1
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
        ${dateFilter12M_doe}
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return rows.map((r) => ({
      month:                  r.month,
      visit_count:            num(r.visit_count),
      total_charge:           num(r.total_charge),
      total_payments:         num(r.total_payments),
      insurance_payments:     num(r.insurance_payments),
      patient_payment:        num(r.patient_payment),
      total_adjustments:      num(r.total_adjustments),
      insurance_adjustments:  num(r.insurance_adjustments),
      patient_adjustments:    num(r.patient_adjustments),
      total_balance:          num(r.total_balance),
      insurance_balance:      num(r.insurance_balance),
      patient_balance:        num(r.patient_balance),
      avg_chrg_per_visit:     num(r.avg_chrg_per_visit),
      avg_pmt_per_visit:      num(r.avg_pmt_per_visit),
      gcr_pct:                num(r.gcr_pct),
      gcr_without_pt_balance: num(r.gcr_without_pt_balance),
      gcr_fully_paid:         num(r.gcr_fully_paid),
      ncr_pct:                num(r.ncr_pct),
    }));
  }, []);
}

/** DOD view — payments by payer (insurance_type) */
async function getProductionDodByPayer() {
  return safeQuery('getProductionDodByPayer', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(insurance_type, 'Unknown') AS payer,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('usneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${BILLER_FILTER}
        ${INSURANCE_FILTER}
        ${dateFilter12M('date_collected')}
      GROUP BY insurance_type
      ORDER BY payments DESC
      LIMIT 15
    `);
    return rows.map((r) => ({ payer: r.payer, payments: num(r.payments) }));
  }, []);
}

/** DOD view — payments by biller entity */
async function getProductionDodByBillerEntity() {
  return safeQuery('getProductionDodByBillerEntity', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(biller, 'Unknown') AS biller_entity,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('usneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${INSURANCE_FILTER}
        ${dateFilter12M('date_collected')}
      GROUP BY biller
      ORDER BY payments DESC
      LIMIT 15
    `);
    return rows.map((r) => ({ biller_entity: r.biller_entity, payments: num(r.payments) }));
  }, []);
}

// ── AR Page ───────────────────────────────────────────────────────────────────

/**
 * AR-page biller filter: include ONLY Collective Group + Collective Bill Only
 * (i.e. keep anything with 'Collective' in the biller name)
 */
const AR_BILLER_FILTER = `AND biller ILIKE '%Collective%'`;

/**
 * AR-page insurance filter: exclude Aetna (both cases) and Medicare
 */
const AR_INSURANCE_FILTER = `AND LOWER(COALESCE(insurance_type, '')) NOT IN ('aetna', 'medicare')`;

/** Age-bucket CASE expression for a given date column */
function arBucketCase(col) {
  return `
    CASE
      WHEN (CURRENT_DATE - ${col}::date) < 30 THEN 'Current'
      WHEN (CURRENT_DATE - ${col}::date) BETWEEN 30 AND 60 THEN '30-60'
      WHEN (CURRENT_DATE - ${col}::date) BETWEEN 61 AND 90 THEN '60-90'
      WHEN (CURRENT_DATE - ${col}::date) BETWEEN 91 AND 120 THEN '90-120'
      WHEN (CURRENT_DATE - ${col}::date) BETWEEN 121 AND 150 THEN '120-150'
      ELSE '150+'
    END`;
}

const AR_BUCKET_ORDER = ['Current', '30-60', '60-90', '90-120', '120-150', '150+'];

const AR_BUCKET_SORT = `CASE bucket
  WHEN 'Current'  THEN 1 WHEN '30-60'   THEN 2 WHEN '60-90'   THEN 3
  WHEN '90-120'   THEN 4 WHEN '120-150' THEN 5 ELSE 6 END`;

/** Bar/pie chart buckets (all-time) */
async function getArBuckets(dateCol) {
  return safeQuery(`getArBuckets_${dateCol}`, async () => {
    const { rows } = await pool.query(`
      SELECT bucket,
        SUM(ins_balance)     AS ins_balance,
        SUM(patient_balance) AS patient_balance,
        SUM(total_balance)   AS total_balance
      FROM (
        SELECT
          ${arBucketCase(dateCol)} AS bucket,
          CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay'
               THEN 0 ELSE total_balance END AS ins_balance,
          CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay'
               THEN total_balance ELSE 0 END AS patient_balance,
          total_balance
        FROM ${tbl('usneuro_full_billing')}
        WHERE ${dateCol} IS NOT NULL
          ${AR_BILLER_FILTER}
          ${AR_INSURANCE_FILTER}
      ) sub
      GROUP BY bucket
      ORDER BY ${AR_BUCKET_SORT}
    `);
    return rows.map(r => ({
      bucket:          r.bucket,
      ins_balance:     num(r.ins_balance),
      patient_balance: num(r.patient_balance),
      total_balance:   num(r.total_balance),
    }));
  }, []);
}

async function getArDosBuckets() { return getArBuckets('dos'); }
async function getArDoeBuckets() { return getArBuckets('billing_date'); }

/** Treemap data: total_balance per insurance_type (all-time) */
async function getArTreemap(dateCol) {
  return safeQuery(`getArTreemap_${dateCol}`, async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(insurance_type, 'Unknown') AS insurance_type,
        SUM(total_balance) AS total_balance
      FROM ${tbl('usneuro_full_billing')}
      WHERE ${dateCol} IS NOT NULL
        ${AR_BILLER_FILTER}
        ${AR_INSURANCE_FILTER}
      GROUP BY 1
      ORDER BY total_balance DESC
    `);
    return rows.map(r => ({
      insurance_type: r.insurance_type,
      total_balance:  num(r.total_balance),
    }));
  }, []);
}

/** AR by insurance pivot: insurance_type × bucket (all-time) */
async function getArByInsurance(dateCol) {
  return safeQuery(`getArByInsurance_${dateCol}`, async () => {
    const { rows } = await pool.query(`
      SELECT insurance_type, bucket, total_balance
      FROM (
        SELECT
          COALESCE(insurance_type, 'Unknown') AS insurance_type,
          ${arBucketCase(dateCol)} AS bucket,
          SUM(total_balance) AS total_balance
        FROM ${tbl('usneuro_full_billing')}
        WHERE ${dateCol} IS NOT NULL
          ${AR_BILLER_FILTER}
          ${AR_INSURANCE_FILTER}
        GROUP BY 1, 2
      ) sub
      ORDER BY insurance_type, ${AR_BUCKET_SORT}
    `);
    const map = {};
    rows.forEach(r => {
      if (!map[r.insurance_type]) {
        map[r.insurance_type] = { insurance_type: r.insurance_type, grand_total: 0 };
        AR_BUCKET_ORDER.forEach(b => { map[r.insurance_type][b] = 0; });
      }
      map[r.insurance_type][r.bucket] = (map[r.insurance_type][r.bucket] || 0) + num(r.total_balance);
      map[r.insurance_type].grand_total += num(r.total_balance);
    });
    return Object.values(map).sort((a, b) => a.insurance_type.localeCompare(b.insurance_type));
  }, []);
}

/** AR by surgeon pivot: surgeon × bucket (all-time, optional surgeon filter) */
async function getArBySurgeon(dateCol, surgeon) {
  return safeQuery(`getArBySurgeon_${dateCol}`, async () => {
    const params = [];
    let sf = '';
    if (surgeon && surgeon !== 'All') { params.push(surgeon); sf = `AND surgeon = $1`; }
    const { rows } = await pool.query(`
      SELECT surgeon, bucket, total_balance
      FROM (
        SELECT
          COALESCE(surgeon, 'Unknown') AS surgeon,
          ${arBucketCase(dateCol)} AS bucket,
          SUM(total_balance) AS total_balance
        FROM ${tbl('usneuro_full_billing')}
        WHERE ${dateCol} IS NOT NULL
          ${AR_BILLER_FILTER}
          ${AR_INSURANCE_FILTER}
          ${sf}
        GROUP BY 1, 2
      ) sub
      ORDER BY surgeon, ${AR_BUCKET_SORT}
    `, params);
    const map = {};
    rows.forEach(r => {
      if (!map[r.surgeon]) {
        map[r.surgeon] = { surgeon: r.surgeon, grand_total: 0 };
        AR_BUCKET_ORDER.forEach(b => { map[r.surgeon][b] = 0; });
      }
      map[r.surgeon][r.bucket] = (map[r.surgeon][r.bucket] || 0) + num(r.total_balance);
      map[r.surgeon].grand_total += num(r.total_balance);
    });
    return Object.values(map).sort((a, b) => (a.surgeon || '').localeCompare(b.surgeon || ''));
  }, []);
}

/** List of distinct surgeons for dropdown (AR page) */
async function getArSurgeons() {
  return safeQuery('getArSurgeons', async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT COALESCE(surgeon, 'Unknown') AS surgeon
      FROM ${tbl('usneuro_full_billing')}
      WHERE surgeon IS NOT NULL
        ${AR_BILLER_FILTER}
        ${AR_INSURANCE_FILTER}
      ORDER BY 1
    `);
    return rows.map(r => r.surgeon);
  }, []);
}

// ── Insights Page ─────────────────────────────────────────────────────────────

/**
 * Insights date filter:
 *   - Remove last 2 months: date_collected < first day of previous month
 *   - Last 12 months of billing_date
 */
const INSIGHTS_DATE_FILTER = `
  AND date_collected IS NOT NULL
  AND DATE_TRUNC('month', date_collected) < DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  AND billing_date IS NOT NULL
  AND billing_date >= GREATEST(
    DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
    '2025-04-01'::date
  )
`;

async function _insightsQuery(groupCol, surgeonFilter, params) {
  const { rows } = await pool.query(`
    WITH monthly AS (
      SELECT
        ${groupCol} AS entity,
        DATE_TRUNC('month', billing_date) AS month,
        COUNT(DISTINCT claim_seq)  AS visit_count,
        SUM(charged)               AS total_charge,
        SUM(collected)             AS total_payments,
        SUM(refund)                AS refund,
        SUM(write_off)             AS total_adjustments
      FROM ${tbl('usneuro_full_billing')}
      WHERE 1=1
        ${AR_BILLER_FILTER}
        ${AR_INSURANCE_FILTER}
        ${INSIGHTS_DATE_FILTER}
        ${surgeonFilter}
      GROUP BY 1, 2
    ),
    month_totals AS (
      SELECT month, SUM(total_payments) AS month_total
      FROM monthly GROUP BY month
    )
    SELECT
      m.entity,
      m.month,
      m.visit_count,
      m.total_charge,
      m.total_payments,
      CASE WHEN mt.month_total > 0
           THEN m.total_payments / mt.month_total * 100
           ELSE 0 END AS pct_total_payments,
      m.refund,
      m.total_adjustments
    FROM monthly m
    JOIN month_totals mt ON m.month = mt.month
    ORDER BY m.entity, m.month
  `, params);
  return rows.map(r => ({
    entity:             r.entity,
    month:              r.month,
    visit_count:        num(r.visit_count),
    total_charge:       num(r.total_charge),
    total_payments:     num(r.total_payments),
    pct_total_payments: num(r.pct_total_payments),
    refund:             num(r.refund),
    total_adjustments:  num(r.total_adjustments),
  }));
}

async function getInsightsByInsurance() {
  return safeQuery('getInsightsByInsurance', () =>
    _insightsQuery('COALESCE(insurance_type,\'Unknown\')', '', []), []);
}

async function getInsightsBySurgeon(surgeon) {
  return safeQuery('getInsightsBySurgeon', async () => {
    const params = [];
    let sf = '';
    if (surgeon && surgeon !== 'All') { params.push(surgeon); sf = `AND surgeon = $1`; }
    return _insightsQuery('COALESCE(surgeon,\'Unknown\')', sf, params);
  }, []);
}

async function getInsightsSurgeons() {
  return safeQuery('getInsightsSurgeons', async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT COALESCE(surgeon, 'Unknown') AS surgeon
      FROM ${tbl('usneuro_full_billing')}
      WHERE surgeon IS NOT NULL
        ${AR_BILLER_FILTER}
        ${AR_INSURANCE_FILTER}
        ${INSIGHTS_DATE_FILTER}
      ORDER BY 1
    `);
    return rows.map(r => r.surgeon);
  }, []);
}

// ── Schema debug ──────────────────────────────────────────────────────────────

async function getSchemaColumns() {
  return safeQuery('getSchemaColumns', async () => {
    const { rows } = await pool.query(`
      SELECT table_name, column_name, data_type, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'iq_usneuro'
      ORDER BY table_name, ordinal_position
    `);
    return rows;
  }, []);
}

async function getFullSourceTable(tableName) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    logger.error(`[USNeuro] getFullSourceTable: unsafe table name rejected — "${tableName}"`);
    return [];
  }
  try {
    logger.info(`[USNeuro] getFullSourceTable: querying iq_usneuro."${tableName}" …`);
    const result = await pool.exportQuery(`SELECT * FROM iq_usneuro."${tableName}" LIMIT 500000`);
    logger.info(`[USNeuro] getFullSourceTable("${tableName}"): ${result.rows.length} rows`);
    return result.rows;
  } catch (err) {
    logger.error(`[USNeuro] getFullSourceTable("${tableName}") FAILED: ${err.message}`);
    return [];
  }
}

module.exports = {
  getAllKpis,
  getPaymentHistory,
  getPaymentHistoryFull,
  getChargesVsPayments,
  getChargesVsPaymentsFull,
  getCcrHistory,
  getArPie,
  getTotalChargesChart,
  getTotalChargesChartFull,
  getAdjustments,
  getAdjustmentsFull,
  getArDonut,
  getDenialReasons,
  getSchemaColumns,
  getFullSourceTable,
  // Payments page
  getPaymentLineChart,
  getDepositsBySurgeon,
  getDepositsByHospital,
  getDepositsByBillingType,
  getDepositsByInsurance,
  // Production page
  getProductionDosChart,
  getProductionDoeChart,
  getProductionDosReimbursement,
  getProductionDoeReimbursement,
  getProductionDodByPayer,
  getProductionDodByBillerEntity,
  // AR page
  getArDosBuckets,
  getArDoeBuckets,
  getArTreemap,
  getArByInsurance,
  getArBySurgeon,
  getArSurgeons,
  // Insights page
  getInsightsByInsurance,
  getInsightsBySurgeon,
  getInsightsSurgeons,
};
