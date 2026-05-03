/**
 * completeneuro.service.js — Data layer for Complete Neuro dashboard.
 *
 * Schema  : iq_completeneuro
 * Tables  : completeneuro_full_deposit, completeneuro_full_billing, ccr_history
 *
 * Date filter strategy:
 *   - Deposit queries  → filter by date_collected  (completeneuro_full_deposit)
 *   - DOS queries      → filter by dos             (completeneuro_full_billing)
 *   - DOE queries      → filter by billing_date    (completeneuro_full_billing)
 *
 * Column notes:
 *   completeneuro_full_deposit  → payment column = payment_collected
 *   completeneuro_full_billing  → charge column  = charged
 *   completeneuro_full_billing  → payment column = collected
 *   completeneuro_full_billing  → write-off col  = write_off
 *   completeneuro_full_billing  → balance col    = total_balance
 */

'use strict';

const pool   = require('../db/pool');
const logger = require('../utils/logger');

const SCHEMA = 'iq_completeneuro';
const tbl    = (name) => `${SCHEMA}.${name}`;

// Whitelist of tables allowed for full-source datasource export
const ALLOWED_DS_TABLES = new Set([
  'completeneuro_full_billing',
  'completeneuro_full_deposit',
  'ccr_history',
]);

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
      logger.warn(`[CN] ${label}: schema/table/column missing — ${err.message}`);
      return fallback;
    }
    logger.error(`[CN] ${label} failed: ${err.message}`);
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

// ── Date filter constants ──────────────────────────────────────────────────────

const dateFilter12M = (col) => `
  AND ${col} >= GREATEST(
    DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
    '2025-04-01'::date
  )
  AND DATE_TRUNC('month', ${col}) < DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
`;

const dateFilter12M_dos = `
  AND dos IS NOT NULL
  AND dos >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
  AND DATE_TRUNC('month', dos) < DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
`;

const dateFilter12M_doe = `
  AND billing_date IS NOT NULL
  AND billing_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
  AND DATE_TRUNC('month', billing_date) < DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
`;

// ── KPIs ──────────────────────────────────────────────────────────────────────

async function getTotalPayments() {
  return safeQuery('getTotalPayments', async () => {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(payment_collected), 0) AS total_payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
    `);
    return { total_payments: num(rows[0]?.total_payments) };
  }, { total_payments: 0 });
}

async function getTotalChargesKpi() {
  return safeQuery('getTotalChargesKpi', async () => {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(charged), 0) AS total_charges
      FROM ${tbl('completeneuro_full_billing')}
      WHERE 1=1
        ${dateFilter12M_dos}
    `);
    return { total_charges: num(rows[0]?.total_charges) };
  }, { total_charges: 0 });
}

async function getAvgDays() {
  return safeQuery('getAvgDays', async () => {
    const { rows } = await pool.query(`
      SELECT ROUND(AVG((billing_date::date - dos::date))::numeric, 1) AS avg_days
      FROM ${tbl('completeneuro_full_billing')}
      WHERE billing_date IS NOT NULL
        AND dos IS NOT NULL
        ${dateFilter12M_dos}
    `);
    return { avg_days: num(rows[0]?.avg_days) };
  }, { avg_days: 0 });
}

async function getCleanClaimRate() {
  return safeQuery('getCleanClaimRate', async () => {
    const { rows } = await pool.query(`
      SELECT adjusted
      FROM ${tbl('ccr_history')}
      WHERE month IS NOT NULL
      ORDER BY month DESC
      LIMIT 1
    `);
    return { ccr: normalizePercent(rows[0]?.adjusted) };
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

// ── Payment History (DOD) ─────────────────────────────────────────────────────

async function getPaymentHistory() {
  return safeQuery('getPaymentHistory', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return monthSeries(rows, (r) => ({ payments: num(r.payments) }));
  }, []);
}

async function getPaymentHistoryFull() {
  return safeQuery('getPaymentHistoryFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return monthSeries(rows, (r) => ({ payments: num(r.payments) }));
  }, []);
}

// ── Charges vs Payments (DOE) ─────────────────────────────────────────────────

async function getChargesVsPayments() {
  return safeQuery('getChargesVsPayments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0)   AS total_charges,
        COALESCE(SUM(collected), 0) AS total_payments
      FROM ${tbl('completeneuro_full_billing')}
      WHERE billing_date IS NOT NULL
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
      FROM ${tbl('completeneuro_full_billing')}
      WHERE billing_date IS NOT NULL
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

async function getCcrHistory() {
  return safeQuery('getCcrHistory', async () => {
    const { rows } = await pool.query(`
      SELECT month::text AS month_raw, adjusted
      FROM ${tbl('ccr_history')}
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
            WHEN (CURRENT_DATE - billing_date::date) < 30             THEN 'Current'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 30 AND 59   THEN '30-60'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 60 AND 89   THEN '60-90'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 90 AND 119  THEN '90-120'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 120 AND 149 THEN '120-150'
            ELSE '150+'
          END AS bucket,
          ABS(COALESCE(total_balance, 0)) AS total_balance
        FROM ${tbl('completeneuro_full_billing')}
        WHERE billing_date IS NOT NULL
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
      FROM ${tbl('completeneuro_full_billing')}
      WHERE billing_date IS NOT NULL
        ${dateFilter12M_doe}
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
      FROM ${tbl('completeneuro_full_billing')}
      WHERE billing_date IS NOT NULL
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
      FROM ${tbl('completeneuro_full_billing')}
      WHERE date_collected IS NOT NULL
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
      FROM ${tbl('completeneuro_full_billing')}
      WHERE date_collected IS NOT NULL
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return monthSeries(rows, (r) => ({ adjustments: num(r.adjustments) }));
  }, []);
}

// ── AR Donut (grouped ≤60 vs >60 days by billing_date) ───────────────────────

async function getArDonut() {
  return safeQuery('getArDonut', async () => {
    const { rows } = await pool.query(`
      WITH bucketed AS (
        SELECT
          CASE
            WHEN (CURRENT_DATE - billing_date::date) < 30             THEN 'Current'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 30 AND 59   THEN '30-60'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 60 AND 89   THEN '60-90'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 90 AND 119  THEN '90-120'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 120 AND 149 THEN '120-150'
            ELSE '150+'
          END AS bucket,
          ABS(COALESCE(total_balance, 0)) AS total_balance
        FROM ${tbl('completeneuro_full_billing')}
        WHERE billing_date IS NOT NULL
      ),
      grouped AS (
        SELECT
          CASE WHEN bucket IN ('Current','30-60') THEN '≤60 Days' ELSE '>60 Days' END AS bucket,
          SUM(total_balance) AS total_balance
        FROM bucketed
        GROUP BY 1
      )
      SELECT bucket, COALESCE(total_balance, 0) AS total_balance
      FROM grouped
      ORDER BY CASE WHEN bucket = '≤60 Days' THEN 1 ELSE 2 END
    `);
    return rows.map((r) => ({ bucket: r.bucket, total_balance: num(r.total_balance) }));
  }, []);
}

// ── Payments page: All Time line chart ───────────────────────────────────────

async function getPaymentLineChart() {
  return safeQuery('getPaymentLineChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return monthSeries(rows, (r) => ({ payments: num(r.payments) }));
  }, []);
}

// ── Payments page: deposit bar charts (optional month filter: YYYY-MM) ────────

function monthClause(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return '';
  return `AND DATE_TRUNC('month', date_collected) = DATE_TRUNC('month', '${month}-01'::date)`;
}

/** Deposits by surgeon */
async function getDepositsBySurgeon(month) {
  return safeQuery('getDepositsBySurgeon', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(surgeon, 'Unknown') AS surgeon,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${monthClause(month)}
      GROUP BY surgeon
      ORDER BY payments DESC
      LIMIT 30
    `);
    return rows.map((r) => ({ surgeon: r.surgeon, payments: num(r.payments) }));
  }, []);
}

/** Deposits by hospital */
async function getDepositsByHospital(month) {
  return safeQuery('getDepositsByHospital', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(hospital, 'Unknown') AS hospital,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${monthClause(month)}
      GROUP BY hospital
      ORDER BY payments DESC
      LIMIT 30
    `);
    return rows.map((r) => ({ hospital: r.hospital, payments: num(r.payments) }));
  }, []);
}

/** Deposits by billing type */
async function getDepositsByBillingType(month) {
  return safeQuery('getDepositsByBillingType', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(billing_type, 'Null') AS billing_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${monthClause(month)}
      GROUP BY billing_type
      ORDER BY payments DESC
    `);
    return rows.map((r) => ({ billing_type: r.billing_type, payments: num(r.payments) }));
  }, []);
}

/** Deposits by insurance type */
async function getDepositsByInsuranceType(month) {
  return safeQuery('getDepositsByInsuranceType', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(insurance_type, 'Unknown') AS insurance_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${monthClause(month)}
      GROUP BY insurance_type
      ORDER BY payments DESC
      LIMIT 20
    `);
    return rows.map((r) => ({ insurance_type: r.insurance_type, payments: num(r.payments) }));
  }, []);
}



// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION PAGE — DOS / DOE / DOD  (last 12 months)
// ═══════════════════════════════════════════════════════════════════════════

// ── Production: DOS Chart (charged vs collected + GCR%, last 12 months) ──

async function getProductionDosChart() {
  return safeQuery('getProductionDosChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', dos)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged),   0) AS total_charges,
        COALESCE(SUM(collected), 0) AS total_payments,
        CASE
          WHEN SUM(charged) > 0
          THEN ROUND((SUM(collected) / NULLIF(SUM(charged), 0) * 100)::numeric, 1)
          ELSE 0
        END AS gcr_pct
      FROM ${tbl('completeneuro_full_billing')}
      WHERE dos IS NOT NULL
        AND dos >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        AND DATE_TRUNC('month', dos) <= DATE_TRUNC('month', CURRENT_DATE)
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

// ── Production: DOE Chart (charged by billing_date, last 12 months) ───────

async function getProductionDoeChart() {
  return safeQuery('getProductionDoeChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0) AS total_charges
      FROM ${tbl('completeneuro_full_billing')}
      WHERE billing_date IS NOT NULL
        AND billing_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        AND DATE_TRUNC('month', billing_date) <= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return rows.map((r) => ({ date: r.date, total_charges: num(r.total_charges) }));
  }, []);
}

// ── Production: Reimbursement pivot — shared CTE builder (last 12 months) ─

function cnReimbursementQuery(dateCol) {
  const l12Filter = dateCol === 'dos'
    ? `AND dos >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
       AND DATE_TRUNC('month', dos) <= DATE_TRUNC('month', CURRENT_DATE)`
    : `AND billing_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
       AND DATE_TRUNC('month', billing_date) <= DATE_TRUNC('month', CURRENT_DATE)`;
  return `
    WITH monthly AS (
      SELECT
        DATE_TRUNC('month', ${dateCol}) AS month_trunc,
        COUNT(DISTINCT claim_seq)       AS claim_count,
        COALESCE(SUM(charged),       0) AS total_charged,
        COALESCE(SUM(collected),     0) AS total_collected,
        COALESCE(SUM(write_off),     0) AS total_writeoff,
        COALESCE(SUM(total_balance), 0) AS total_balance
      FROM ${tbl('completeneuro_full_billing')}
      WHERE ${dateCol} IS NOT NULL
        ${l12Filter}
      GROUP BY 1
    )
    SELECT
      month_trunc                                        AS month,
      claim_count,
      total_charged,
      total_collected,
      total_writeoff,
      total_balance,
      CASE WHEN claim_count > 0
        THEN ROUND((total_charged   / NULLIF(claim_count,0))::numeric, 2) ELSE 0
      END AS avg_chrg_per_visit,
      CASE WHEN claim_count > 0
        THEN ROUND((total_collected / NULLIF(claim_count,0))::numeric, 2) ELSE 0
      END AS avg_pmt_per_visit,
      CASE WHEN total_charged > 0
        THEN ROUND((total_collected / NULLIF(total_charged, 0) * 100)::numeric, 1) ELSE 0
      END AS gcr_pct,
      CASE WHEN (total_charged - total_writeoff) > 0
        THEN ROUND((total_collected / NULLIF(total_charged - total_writeoff, 0) * 100)::numeric, 1)
        ELSE 0
      END AS ncr_pct
    FROM monthly
    ORDER BY month_trunc ASC
  `;
}

function mapCnReimbRow(r) {
  return {
    month:              r.month,
    claim_count:        num(r.claim_count),
    total_charged:      num(r.total_charged),
    total_collected:    num(r.total_collected),
    total_writeoff:     num(r.total_writeoff),
    total_balance:      num(r.total_balance),
    avg_chrg_per_visit: num(r.avg_chrg_per_visit),
    avg_pmt_per_visit:  num(r.avg_pmt_per_visit),
    gcr_pct:            num(r.gcr_pct),
    ncr_pct:            num(r.ncr_pct),
  };
}

async function getProductionDosReimbursement() {
  return safeQuery('getProductionDosReimbursement', async () => {
    const { rows } = await pool.query(cnReimbursementQuery('dos'));
    return rows.map(mapCnReimbRow);
  }, []);
}

async function getProductionDoeReimbursement() {
  return safeQuery('getProductionDoeReimbursement', async () => {
    const { rows } = await pool.query(cnReimbursementQuery('billing_date'));
    return rows.map(mapCnReimbRow);
  }, []);
}

// ── Production: DOD — Adjustments (write_off by date_collected, L12M) ────

async function getProductionDodAdjustments() {
  return safeQuery('getProductionDodAdjustments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(write_off), 0) AS adjustments
      FROM ${tbl('completeneuro_full_billing')}
      WHERE date_collected IS NOT NULL
        AND date_collected >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        AND DATE_TRUNC('month', date_collected) <= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return rows.map((r) => ({ date: r.date, adjustments: num(r.adjustments) }));
  }, []);
}

// ── Production: DOD — Payments (payment_collected by date_collected, L12M) 

async function getProductionDodPayments() {
  return safeQuery('getProductionDodPayments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        AND date_collected >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        AND DATE_TRUNC('month', date_collected) <= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return rows.map((r) => ({ date: r.date, payments: num(r.payments) }));
  }, []);
}

// ── Production: DOD — Payments by Payer (L12M) ────────────────────────────

async function getProductionDodByPayer() {
  return safeQuery('getProductionDodByPayer', async () => {
    const { rows } = await pool.query(`
      SELECT
        TRIM(COALESCE(NULLIF(insurance_type, ''), 'Unknown')) AS payer,
        COALESCE(SUM(collected), 0) AS payments
      FROM ${tbl('completeneuro_full_billing')}
      WHERE date_collected IS NOT NULL
        AND date_collected >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        AND DATE_TRUNC('month', date_collected) <= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY 1
      ORDER BY payments DESC
    `);
    return rows.map((r) => ({ payment_method: r.payer, payments: num(r.payments) }));
  }, []);
}

// ── Production: DOD — Payments by Biller Entity (L12M) ───────────────────

async function getProductionDodByBiller() {
  return safeQuery('getProductionDodByBiller', async () => {
    const { rows } = await pool.query(`
      SELECT
        TRIM(COALESCE(NULLIF(biller, ''), 'Unknown')) AS biller,
        COALESCE(SUM(collected), 0) AS payments
      FROM ${tbl('completeneuro_full_billing')}
      WHERE date_collected IS NOT NULL
        AND date_collected >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
        AND DATE_TRUNC('month', date_collected) <= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY 1
      ORDER BY payments DESC
    `);
    return rows.map((r) => ({ payment_method: r.biller, payments: num(r.payments) }));
  }, []);
}

// ── Production: DOD — Reimbursement pivot (by date_collected, L12M) ───────

async function getProductionDodReimbursement() {
  return safeQuery('getProductionDodReimbursement', async () => {
    const { rows } = await pool.query(`
      WITH l12 AS (
        SELECT
          DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months' AS start_dt,
          DATE_TRUNC('month', CURRENT_DATE)                         AS end_dt
      ),
      dep_months AS (
        SELECT
          DATE_TRUNC('month', date_collected) AS month_trunc,
          COALESCE(SUM(payment_collected), 0) AS total_payments
        FROM ${tbl('completeneuro_full_deposit')}
        WHERE date_collected IS NOT NULL
          AND date_collected >= (SELECT start_dt FROM l12)
          AND DATE_TRUNC('month', date_collected) <= (SELECT end_dt FROM l12)
        GROUP BY 1
      ),
      bill_months AS (
        SELECT
          DATE_TRUNC('month', date_collected) AS month_trunc,
          COUNT(DISTINCT claim_seq)           AS claim_count,
          COALESCE(SUM(charged),   0)         AS total_charged,
          COALESCE(SUM(write_off), 0)         AS total_writeoff
        FROM ${tbl('completeneuro_full_billing')}
        WHERE date_collected IS NOT NULL
          AND date_collected >= (SELECT start_dt FROM l12)
          AND DATE_TRUNC('month', date_collected) <= (SELECT end_dt FROM l12)
        GROUP BY 1
      ),
      combined AS (
        SELECT
          COALESCE(d.month_trunc, b.month_trunc) AS month_trunc,
          COALESCE(b.claim_count,   0) AS claim_count,
          COALESCE(b.total_charged, 0) AS total_charged,
          COALESCE(d.total_payments,0) AS total_payments,
          COALESCE(b.total_writeoff,0) AS total_writeoff
        FROM dep_months d
        FULL OUTER JOIN bill_months b ON d.month_trunc = b.month_trunc
      )
      SELECT month_trunc AS month, claim_count, total_charged, total_payments, total_writeoff
      FROM combined
      ORDER BY month_trunc ASC
    `);
    return rows.map((r) => ({
      month:          r.month,
      claim_count:    num(r.claim_count),
      total_charged:  num(r.total_charged),
      total_payments: num(r.total_payments),
      total_writeoff: num(r.total_writeoff),
    }));
  }, []);
}


// ══════════════════════════════════════════════════════════════════════════════
// ACCOUNTS RECEIVABLE PAGE
// ══════════════════════════════════════════════════════════════════════════════

// ── Bucket expression: CURRENT_DATE - col::date gives integer days ─────────

function arBucketExpr(dateCol) {
  return `CASE
    WHEN (CURRENT_DATE - ${dateCol}::date) <  30                          THEN 'Current'
    WHEN (CURRENT_DATE - ${dateCol}::date) BETWEEN  30 AND  60            THEN '30-60'
    WHEN (CURRENT_DATE - ${dateCol}::date) BETWEEN  61 AND  90            THEN '60-90'
    WHEN (CURRENT_DATE - ${dateCol}::date) BETWEEN  91 AND 120            THEN '90-120'
    WHEN (CURRENT_DATE - ${dateCol}::date) BETWEEN 121 AND 150            THEN '120-150'
    ELSE '150+'
  END`;
}

// ── AR bucket totals (bar chart + donut) ──────────────────────────────────────

async function getArDos() {
  return safeQuery('getArDos', async () => {
    const { rows } = await pool.query(`
      WITH bucketed AS (
        SELECT
          ${arBucketExpr('dos')} AS bucket,
          CASE WHEN insurance_type != 'Self Pay' THEN total_balance ELSE 0 END AS ins_bal,
          CASE WHEN insurance_type  = 'Self Pay' THEN total_balance ELSE 0 END AS pat_bal
        FROM ${SCHEMA}."completeneuro_full_billing"
        WHERE dos IS NOT NULL
      )
      SELECT bucket, SUM(ins_bal) AS insurance_balance, SUM(pat_bal) AS patient_balance
      FROM bucketed
      GROUP BY bucket
      ORDER BY CASE bucket
        WHEN 'Current' THEN 1 WHEN '30-60' THEN 2 WHEN '60-90' THEN 3
        WHEN '90-120'  THEN 4 WHEN '120-150' THEN 5 ELSE 6 END
    `);
    return rows.map((r) => ({
      bucket:            r.bucket,
      insurance_balance: num(r.insurance_balance),
      patient_balance:   num(r.patient_balance),
    }));
  }, []);
}

async function getArDoe() {
  return safeQuery('getArDoe', async () => {
    const { rows } = await pool.query(`
      WITH bucketed AS (
        SELECT
          ${arBucketExpr('billing_date')} AS bucket,
          CASE WHEN insurance_type != 'Self Pay' THEN total_balance ELSE 0 END AS ins_bal,
          CASE WHEN insurance_type  = 'Self Pay' THEN total_balance ELSE 0 END AS pat_bal
        FROM ${SCHEMA}."completeneuro_full_billing"
        WHERE billing_date IS NOT NULL
      )
      SELECT bucket, SUM(ins_bal) AS insurance_balance, SUM(pat_bal) AS patient_balance
      FROM bucketed
      GROUP BY bucket
      ORDER BY CASE bucket
        WHEN 'Current' THEN 1 WHEN '30-60' THEN 2 WHEN '60-90' THEN 3
        WHEN '90-120'  THEN 4 WHEN '120-150' THEN 5 ELSE 6 END
    `);
    return rows.map((r) => ({
      bucket:            r.bucket,
      insurance_balance: num(r.insurance_balance),
      patient_balance:   num(r.patient_balance),
    }));
  }, []);
}

// ── AR pivot by insurance type (columns = buckets + grand total) ──────────────

async function getArByInsurance(view = 'dos') {
  const dateCol = view === 'doe' ? 'billing_date' : 'dos';
  return safeQuery('getArByInsurance:' + view, async () => {
    const { rows } = await pool.query(`
      WITH bucketed AS (
        SELECT
          COALESCE(insurance_type, 'Unknown') AS name,
          total_balance,
          ${arBucketExpr(dateCol)} AS bucket
        FROM ${SCHEMA}."completeneuro_full_billing"
        WHERE ${dateCol} IS NOT NULL
      )
      SELECT
        name,
        SUM(CASE WHEN bucket = 'Current'  THEN total_balance ELSE 0 END) AS b_current,
        SUM(CASE WHEN bucket = '30-60'    THEN total_balance ELSE 0 END) AS b_30_60,
        SUM(CASE WHEN bucket = '60-90'    THEN total_balance ELSE 0 END) AS b_60_90,
        SUM(CASE WHEN bucket = '90-120'   THEN total_balance ELSE 0 END) AS b_90_120,
        SUM(CASE WHEN bucket = '120-150'  THEN total_balance ELSE 0 END) AS b_120_150,
        SUM(CASE WHEN bucket = '150+'     THEN total_balance ELSE 0 END) AS b_150plus,
        SUM(total_balance) AS grand_total
      FROM bucketed
      GROUP BY name
      ORDER BY SUM(total_balance) DESC NULLS LAST
    `);
    return rows.map((r) => ({
      name:        r.name,
      'Current':   num(r.b_current),
      '30-60':     num(r.b_30_60),
      '60-90':     num(r.b_60_90),
      '90-120':    num(r.b_90_120),
      '120-150':   num(r.b_120_150),
      '150+':      num(r.b_150plus),
      grand_total: num(r.grand_total),
    }));
  }, []);
}

// ── AR pivot by surgeon (columns = buckets + grand total) ─────────────────────

async function getArBySurgeon(view = 'dos') {
  const dateCol = view === 'doe' ? 'billing_date' : 'dos';
  return safeQuery('getArBySurgeon:' + view, async () => {
    const { rows } = await pool.query(`
      WITH bucketed AS (
        SELECT
          COALESCE(surgeon, 'Unknown') AS name,
          total_balance,
          ${arBucketExpr(dateCol)} AS bucket
        FROM ${SCHEMA}."completeneuro_full_billing"
        WHERE ${dateCol} IS NOT NULL
          AND surgeon IS NOT NULL AND surgeon <> ''
      )
      SELECT
        name,
        SUM(CASE WHEN bucket = 'Current'  THEN total_balance ELSE 0 END) AS b_current,
        SUM(CASE WHEN bucket = '30-60'    THEN total_balance ELSE 0 END) AS b_30_60,
        SUM(CASE WHEN bucket = '60-90'    THEN total_balance ELSE 0 END) AS b_60_90,
        SUM(CASE WHEN bucket = '90-120'   THEN total_balance ELSE 0 END) AS b_90_120,
        SUM(CASE WHEN bucket = '120-150'  THEN total_balance ELSE 0 END) AS b_120_150,
        SUM(CASE WHEN bucket = '150+'     THEN total_balance ELSE 0 END) AS b_150plus,
        SUM(total_balance) AS grand_total
      FROM bucketed
      GROUP BY name
      ORDER BY SUM(total_balance) DESC NULLS LAST
    `);
    return rows.map((r) => ({
      name:        r.name,
      'Current':   num(r.b_current),
      '30-60':     num(r.b_30_60),
      '60-90':     num(r.b_60_90),
      '90-120':    num(r.b_90_120),
      '120-150':   num(r.b_120_150),
      '150+':      num(r.b_150plus),
      grand_total: num(r.grand_total),
    }));
  }, []);
}

// ══════════════════════════════════════════════════════════════════════════════
// INSIGHTS PAGE — Insurance / Surgeon / Reader / Technician wise analysis
// ══════════════════════════════════════════════════════════════════════════════

// ── Shared pivot query (last 12 months, % payments = share of monthly total) ─

async function insightsQuery(entityCol) {
  return safeQuery('insights:' + entityCol, async () => {
    const { rows } = await pool.query(`
      WITH base AS (
        SELECT
          COALESCE(${entityCol}::text, 'Unknown') AS entity,
          DATE_TRUNC('month', billing_date)        AS month,
          COUNT(DISTINCT claim_seq)                AS visit_count,
          SUM(charged)                             AS total_charge,
          SUM(collected)                           AS total_payments,
          SUM(refund)                              AS refund,
          SUM(write_off)                           AS total_adjustments
        FROM ${SCHEMA}."completeneuro_full_billing"
        WHERE billing_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
          AND billing_date <  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
          AND ${entityCol} IS NOT NULL
          AND ${entityCol}::text <> ''
        GROUP BY 1, 2
      )
      SELECT
        entity,
        TO_CHAR(month, 'YYYY-MM')       AS month,
        visit_count::int                AS visit_count,
        total_charge,
        total_payments,
        CASE
          WHEN SUM(total_payments) OVER (PARTITION BY month) = 0 THEN 0
          ELSE ROUND(
            (total_payments * 100.0
              / NULLIF(SUM(total_payments) OVER (PARTITION BY month), 0))::numeric,
            2
          )
        END                             AS pct_total_payments,
        refund,
        total_adjustments
      FROM base
      ORDER BY entity, month
    `);
    return rows.map((r) => ({
      entity:             r.entity,
      month:              r.month,
      visit_count:        parseInt(r.visit_count  || 0, 10),
      total_charge:       num(r.total_charge),
      total_payments:     num(r.total_payments),
      pct_total_payments: parseFloat(r.pct_total_payments || 0),
      refund:             num(r.refund),
      total_adjustments:  num(r.total_adjustments),
    }));
  }, []);
}

async function getInsightsInsurance()  { return insightsQuery('insurance_type'); }
async function getInsightsSurgeon()    { return insightsQuery('surgeon'); }
async function getInsightsReader()     { return insightsQuery('reader'); }
async function getInsightsTechnician() { return insightsQuery('tech_name'); }

// ── Procedure page ────────────────────────────────────────────────────────────

/**
 * Deposits by Procedure Type chart — billing_type × month (date_collected)
 */
async function getProcedureDepositsChart() {
  return safeQuery('getProcedureDepositsChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', date_collected), 'YYYY-MM-DD') AS month,
        COALESCE(NULLIF(TRIM(billing_type), ''), 'Unknown')         AS billing_type,
        COALESCE(SUM(payment_collected), 0)                         AS payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY DATE_TRUNC('month', date_collected), 2
      ORDER BY DATE_TRUNC('month', date_collected), payments DESC
    `);
    return rows.map((r) => ({
      month:        r.month,
      billing_type: r.billing_type,
      payments:     num(r.payments),
    }));
  }, []);
}

/**
 * Charges by Procedure Type chart — procedure_type × month
 * mode = 'dos' | 'doe'
 */
async function getProcedureChargesChart(mode) {
  const col    = mode === 'doe' ? 'billing_date' : 'dos';
  const filter = mode === 'doe' ? dateFilter12M_doe : dateFilter12M_dos;
  return safeQuery(`getProcedureChargesChart_${mode}`, async () => {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', ${col}), 'YYYY-MM-DD')        AS month,
        COALESCE(NULLIF(TRIM(procedure_type), ''), 'Unknown')      AS procedure_type,
        COALESCE(SUM(charged), 0)                                  AS charges
      FROM ${tbl('completeneuro_full_billing')}
      WHERE ${col} IS NOT NULL
        ${filter}
      GROUP BY DATE_TRUNC('month', ${col}), 2
      ORDER BY DATE_TRUNC('month', ${col}), charges DESC
    `);
    return rows.map((r) => ({
      month:          r.month,
      procedure_type: r.procedure_type,
      charges:        num(r.charges),
    }));
  }, []);
}

/**
 * DOS/DOE More table — detailed metrics per procedure_type × month
 */

/**
 * DOS/DOE More table — detailed metrics per procedure_type x month
 */
async function getProcedureMore(mode) {
  const col    = mode === 'doe' ? 'billing_date' : 'dos';
  const filter = mode === 'doe' ? dateFilter12M_doe : dateFilter12M_dos;
  return safeQuery(`getProcedureMore_${mode}`, async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(procedure_type), ''), 'Unknown')      AS procedure_type,
        TO_CHAR(DATE_TRUNC('month', ${col}), 'YYYY-MM-DD')         AS month,
        COALESCE(SUM(charged),    0)                               AS total_charge,
        COALESCE(SUM(collected),  0)                               AS total_payments,
        COALESCE(SUM(collected),  0)                               AS insurance_payment,
        0                                                          AS patient_payment,
        COALESCE(SUM(write_off),  0)                               AS total_adjustments,
        COALESCE(SUM(write_off),  0)                               AS insurance_adjustments,
        0                                                          AS patient_adjustments,
        CASE WHEN SUM(charged) > 0
          THEN ROUND((SUM(collected) / NULLIF(SUM(charged), 0) * 100)::numeric, 2)
          ELSE 0 END                                               AS gcr_pct,
        CASE WHEN SUM(charged) - SUM(write_off) > 0
          THEN ROUND((SUM(collected) / NULLIF(SUM(charged) - SUM(write_off), 0) * 100)::numeric, 2)
          ELSE 0 END                                               AS ncr_pct,
        CASE WHEN SUM(charged) > 0
          THEN ROUND((SUM(collected) / NULLIF(SUM(charged), 0) * 100)::numeric, 2)
          ELSE 0 END                                               AS gcr_fully_paid
      FROM ${tbl('completeneuro_full_billing')}
      WHERE ${col} IS NOT NULL
        ${filter}
      GROUP BY 1, DATE_TRUNC('month', ${col})
      ORDER BY 1, DATE_TRUNC('month', ${col})
    `);
    return rows.map((r) => ({
      procedure_type:        r.procedure_type,
      month:                 r.month,
      total_charge:          num(r.total_charge),
      total_payments:        num(r.total_payments),
      insurance_payment:     num(r.insurance_payment),
      patient_payment:       0,
      total_adjustments:     num(r.total_adjustments),
      insurance_adjustments: num(r.insurance_adjustments),
      patient_adjustments:   0,
      gcr_pct:               num(r.gcr_pct),
      ncr_pct:               num(r.ncr_pct),
      gcr_fully_paid:        num(r.gcr_fully_paid),
    }));
  }, []);
}

/**
 * DOD More table — billing_type x month with claim_seq, charges, payments
 */
async function getProcedureDodMore() {
  return safeQuery('getProcedureDodMore', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(billing_type), ''), 'Unknown')         AS billing_type,
        TO_CHAR(DATE_TRUNC('month', date_collected), 'YYYY-MM-DD')  AS month,
        COUNT(DISTINCT claim_seq)                                    AS claim_seq_count,
        COALESCE(SUM(charge),            0)                         AS charges,
        COALESCE(SUM(payment_collected), 0)                         AS payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY 1, DATE_TRUNC('month', date_collected)
      ORDER BY 1, DATE_TRUNC('month', date_collected)
    `);
    return rows.map((r) => ({
      billing_type:    r.billing_type,
      month:           r.month,
      claim_seq_count: num(r.claim_seq_count),
      charges:         num(r.charges),
      payments:        num(r.payments),
    }));
  }, []);
}

/**
 * DOD — All Time Adjustment History (area chart)
 */
async function getProcedureDodAdjustments() {
  return safeQuery('getProcedureDodAdjustments', async () => {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', date_collected), 'YYYY-MM-DD') AS date,
        COALESCE(SUM(write_off), 0)                                AS adjustments
      FROM ${tbl('completeneuro_full_billing')}
      WHERE date_collected IS NOT NULL
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return rows.map((r) => ({ date: r.date, adjustments: num(r.adjustments) }));
  }, []);
}

/**
 * DOD — Last 12 Months Payments History (line chart)
 */
async function getProcedureDodPaymentsHistory() {
  return safeQuery('getProcedureDodPaymentsHistory', async () => {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', date_collected), 'YYYY-MM-DD') AS date,
        COALESCE(SUM(payment_collected), 0)                         AS payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return rows.map((r) => ({ date: r.date, payments: num(r.payments) }));
  }, []);
}

/**
 * DOD — Deposit by Billing Entity (pie chart)
 */
async function getProcedureDodByBillingEntity() {
  return safeQuery('getProcedureDodByBillingEntity', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(billing_entity), ''), 'Unknown') AS billing_entity,
        COALESCE(SUM(payment_collected), 0)                   AS payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY 1
      ORDER BY payments DESC
    `);
    return rows.map((r) => ({ billing_entity: r.billing_entity, payments: num(r.payments) }));
  }, []);
}

/**
 * DOD — Deposit by Payer (horizontal bar)
 */
async function getProcedureDodByPayer() {
  return safeQuery('getProcedureDodByPayer', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(payer), ''), 'Unknown') AS payer,
        COALESCE(SUM(payment_collected), 0)          AS payments
      FROM ${tbl('completeneuro_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY 1
      ORDER BY payments DESC
    `);
    return rows.map((r) => ({ payer: r.payer, payments: num(r.payments) }));
  }, []);
}


// ── Full source table export (used by DataSource export menu) ─────────────────

async function getFullSourceTable(tableName) {
  if (!ALLOWED_DS_TABLES.has(tableName)) {
    console.error('[CN] getFullSourceTable: table not in whitelist:', tableName);
    return [];
  }
  try {
    const result = await pool.exportQuery(
      'SELECT * FROM ' + SCHEMA + '."' + tableName + '" LIMIT 500000'
    );
    return result.rows;
  } catch (err) {
    console.error('[CN] getFullSourceTable FAILED:', err.message);
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
  getPaymentLineChart,
  getDepositsBySurgeon,
  getDepositsByHospital,
  getDepositsByBillingType,
  getDepositsByInsuranceType,
  getFullSourceTable,
  // Production
  getProductionDosChart,
  getProductionDoeChart,
  getProductionDosReimbursement,
  getProductionDoeReimbursement,
  getProductionDodAdjustments,
  getProductionDodPayments,
  getProductionDodByPayer,
  getProductionDodByBiller,
  getProductionDodReimbursement,
  // Accounts Receivable
  getArDos,
  getArDoe,
  getArByInsurance,
  getArBySurgeon,
  // Insights
  getInsightsInsurance,
  getInsightsSurgeon,
  getInsightsReader,
  getInsightsTechnician,
  // Procedure
  getProcedureDepositsChart,
  getProcedureChargesChart,
  getProcedureMore,
  getProcedureDodMore,
  getProcedureDodAdjustments,
  getProcedureDodPaymentsHistory,
  getProcedureDodByBillingEntity,
  getProcedureDodByPayer,
};
