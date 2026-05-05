/**
 * innervate.service.js — Data layer for Innervate dashboard.
 *
 * Schema  : iq_innervate
 * Tables  : innervate_full_billing, innervate_full_deposit
 *
 * Date filter strategy:
 *   - Deposit queries  → filter by date_collected  (innervate_full_deposit)
 *   - DOS queries      → filter by dos             (innervate_full_billing)
 *   - DOE queries      → filter by billing_date    (innervate_full_billing)
 *
 * Column notes:
 *   innervate_full_deposit → payment column = payment_collected
 *   innervate_full_billing → charge column  = charged
 *   innervate_full_billing → payment column = collected
 *   innervate_full_billing → write-off col  = write_off
 *   innervate_full_billing → balance col    = total_balance
 *
 * NOTE: No CCR tables exist for Innervate — no CCR KPI, no CCR page.
 */

'use strict';

const pool   = require('../db/pool');
const logger = require('../utils/logger');

const SCHEMA = 'iq_innervate';
const tbl    = (name) => `${SCHEMA}."${name}"`;

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
      logger.warn(`[Innervate] ${label}: schema/table/column missing — ${err.message}`);
      return fallback;
    }
    logger.error(`[Innervate] ${label} failed: ${err.message}`);
    throw err;
  }
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
      FROM ${tbl('innervate_full_deposit')}
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
      FROM ${tbl('innervate_full_billing')}
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
      FROM ${tbl('innervate_full_billing')}
      WHERE billing_date IS NOT NULL
        AND dos IS NOT NULL
        ${dateFilter12M_dos}
    `);
    return { avg_days: num(rows[0]?.avg_days) };
  }, { avg_days: 0 });
}

async function getAllKpis() {
  const [payments, charges, avgDays] = await Promise.all([
    getTotalPayments(),
    getTotalChargesKpi(),
    getAvgDays(),
  ]);
  return {
    total_payments: payments.total_payments,
    total_charges:  charges.total_charges,
    avg_days:       avgDays.avg_days,
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
      FROM ${tbl('innervate_full_deposit')}
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
      FROM ${tbl('innervate_full_deposit')}
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
      FROM ${tbl('innervate_full_billing')}
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
      FROM ${tbl('innervate_full_billing')}
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

// ── AR Pie (DOE age buckets — billing_date) ───────────────────────────────────

async function getArPie() {
  return safeQuery('getArPie', async () => {
    const { rows } = await pool.query(`
      WITH raw AS (
        SELECT
          CASE
            WHEN (CURRENT_DATE - billing_date::date) < 30             THEN 'Current'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 30 AND 59  THEN '30-60'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 60 AND 89  THEN '60-90'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 90 AND 119 THEN '90-120'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 120 AND 149 THEN '120-150'
            ELSE '150+'
          END AS bucket,
          ABS(COALESCE(total_balance, 0)) AS total_balance
        FROM ${tbl('innervate_full_billing')}
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
      FROM ${tbl('innervate_full_billing')}
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
      FROM ${tbl('innervate_full_billing')}
      WHERE billing_date IS NOT NULL
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return monthSeries(rows, (r) => ({ total_charges: num(r.total_charges) }));
  }, []);
}

// ── Total Adjustments (write_off by billing_date) ─────────────────────────────

async function getAdjustments() {
  return safeQuery('getAdjustments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(write_off), 0) AS adjustments
      FROM ${tbl('innervate_full_billing')}
      WHERE billing_date IS NOT NULL
        ${dateFilter12M_doe}
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return monthSeries(rows, (r) => ({ adjustments: num(r.adjustments) }));
  }, []);
}

async function getAdjustmentsFull() {
  return safeQuery('getAdjustmentsFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(write_off), 0) AS adjustments
      FROM ${tbl('innervate_full_billing')}
      WHERE billing_date IS NOT NULL
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return monthSeries(rows, (r) => ({ adjustments: num(r.adjustments) }));
  }, []);
}

// ── AR Donut (billing_date age buckets, grouped ≤60 vs >60 days) ─────────────

async function getArDonut() {
  return safeQuery('getArDonut', async () => {
    const { rows } = await pool.query(`
      WITH bucketed AS (
        SELECT
          CASE
            WHEN (CURRENT_DATE - billing_date::date) < 30             THEN 'Current'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 30 AND 59  THEN '30-60'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 60 AND 89  THEN '60-90'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 90 AND 119 THEN '90-120'
            WHEN (CURRENT_DATE - billing_date::date) BETWEEN 120 AND 149 THEN '120-150'
            ELSE '150+'
          END AS raw_bucket,
          ABS(COALESCE(total_balance, 0)) AS total_balance
        FROM ${tbl('innervate_full_billing')}
        WHERE billing_date IS NOT NULL
      ),
      grouped AS (
        SELECT
          CASE
            WHEN raw_bucket IN ('Current','30-60') THEN '0-60 Days'
            ELSE '>60 Days'
          END AS bucket,
          SUM(total_balance) AS total_balance
        FROM bucketed
        GROUP BY 1
      )
      SELECT bucket, COALESCE(total_balance, 0) AS total_balance
      FROM grouped
      ORDER BY
        CASE bucket WHEN '>60 Days' THEN 1 ELSE 2 END
    `);
    return rows.map((r) => ({ bucket: r.bucket, total_balance: num(r.total_balance) }));
  }, []);
}

// ── PAYMENTS PAGE ─────────────────────────────────────────────────────────────

async function getPaymentLineChart() {
  return safeQuery('getPaymentLineChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('innervate_full_deposit')}
      WHERE date_collected IS NOT NULL
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return monthSeries(rows, (r) => ({ payments: num(r.payments) }));
  }, []);
}

async function getDepositsBySurgeon() {
  return safeQuery('getDepositsBySurgeon', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(surgeon, 'Unknown') AS surgeon,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('innervate_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY surgeon
      ORDER BY payments DESC
      LIMIT 30
    `);
    return rows.map((r) => ({ surgeon: r.surgeon, payments: num(r.payments) }));
  }, []);
}

async function getDepositsByHospital() {
  return safeQuery('getDepositsByHospital', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(hospital, 'Unknown') AS hospital,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('innervate_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY hospital
      ORDER BY payments DESC
      LIMIT 30
    `);
    return rows.map((r) => ({ hospital: r.hospital, payments: num(r.payments) }));
  }, []);
}

async function getDepositsByBillingType() {
  return safeQuery('getDepositsByBillingType', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(billing_type, 'Null') AS billing_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('innervate_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY billing_type
      ORDER BY payments DESC
    `);
    return rows.map((r) => ({ billing_type: r.billing_type, payments: num(r.payments) }));
  }, []);
}

async function getDepositsByInsurance() {
  return safeQuery('getDepositsByInsurance', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(insurance_type, 'Unknown') AS insurance_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('innervate_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY insurance_type
      ORDER BY payments DESC
      LIMIT 20
    `);
    return rows.map((r) => ({ insurance_type: r.insurance_type, payments: num(r.payments) }));
  }, []);
}

// ── Schema debug ──────────────────────────────────────────────────────────────

async function getSchemaColumns() {
  const { rows } = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = '${SCHEMA}'
    ORDER BY table_name, ordinal_position
  `);
  return rows;
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  getAllKpis,
  getPaymentHistory,
  getPaymentHistoryFull,
  getChargesVsPayments,
  getChargesVsPaymentsFull,
  getArPie,
  getTotalChargesChart,
  getTotalChargesChartFull,
  getAdjustments,
  getAdjustmentsFull,
  getArDonut,
  // Payments page
  getPaymentLineChart,
  getDepositsBySurgeon,
  getDepositsByHospital,
  getDepositsByBillingType,
  getDepositsByInsurance,
  // Debug
  getSchemaColumns,
};

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTION PAGE
// ══════════════════════════════════════════════════════════════════════════════

// ── DOS chart ─────────────────────────────────────────────────────────────────

async function getProductionDosChart() {
  return safeQuery('getProductionDosChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', dos)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged),   0) AS total_charges,
        COALESCE(SUM(collected), 0) AS total_payments,
        CASE WHEN SUM(charged) > 0
          THEN ROUND(((SUM(collected) / SUM(charged)) * 100)::numeric, 2)
          ELSE 0 END AS gcr_pct
      FROM ${tbl('innervate_full_billing')}
      WHERE dos IS NOT NULL
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

// ── DOE chart ─────────────────────────────────────────────────────────────────

async function getProductionDoeChart() {
  return safeQuery('getProductionDoeChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0) AS total_charges
      FROM ${tbl('innervate_full_billing')}
      WHERE billing_date IS NOT NULL
        ${dateFilter12M_doe}
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return rows.map((r) => ({ date: r.date, total_charges: num(r.total_charges) }));
  }, []);
}

// ── DOS Reimbursement table ───────────────────────────────────────────────────

async function getProductionDosReimbursement() {
  return safeQuery('getProductionDosReimbursement', async () => {
    const { rows } = await pool.query(`
      SELECT
        DATE_TRUNC('month', dos) AS month,
        COUNT(DISTINCT claim_seq) AS visit_count,
        COALESCE(SUM(charged),   0) AS total_charge,
        COALESCE(SUM(collected), 0) AS total_payments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay' THEN collected ELSE 0 END), 0) AS insurance_payments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN collected ELSE 0 END), 0) AS patient_payment,
        COALESCE(SUM(write_off), 0) AS total_adjustments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay' THEN write_off ELSE 0 END), 0) AS insurance_adjustments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN write_off ELSE 0 END), 0) AS patient_adjustments,
        COALESCE(SUM(total_balance), 0) AS total_balance,
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
      FROM ${tbl('innervate_full_billing')}
      WHERE dos IS NOT NULL
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

// ── DOE Reimbursement table ───────────────────────────────────────────────────

async function getProductionDoeReimbursement() {
  return safeQuery('getProductionDoeReimbursement', async () => {
    const { rows } = await pool.query(`
      SELECT
        DATE_TRUNC('month', billing_date) AS month,
        COUNT(DISTINCT claim_seq) AS visit_count,
        COALESCE(SUM(charged),   0) AS total_charge,
        COALESCE(SUM(collected), 0) AS total_payments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay' THEN collected ELSE 0 END), 0) AS insurance_payments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN collected ELSE 0 END), 0) AS patient_payment,
        COALESCE(SUM(write_off), 0) AS total_adjustments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay' THEN write_off ELSE 0 END), 0) AS insurance_adjustments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN write_off ELSE 0 END), 0) AS patient_adjustments,
        COALESCE(SUM(total_balance), 0) AS total_balance,
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
      FROM ${tbl('innervate_full_billing')}
      WHERE billing_date IS NOT NULL
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

// ── DOD charts ────────────────────────────────────────────────────────────────

async function getProductionDodAdjustments() {
  return safeQuery('getProductionDodAdjustments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(write_off), 0) AS adjustments
      FROM ${tbl('innervate_full_billing')}
      WHERE billing_date IS NOT NULL
        ${dateFilter12M_doe}
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return rows.map((r) => ({ date: r.date, adjustments: num(r.adjustments) }));
  }, []);
}

async function getProductionDodPayments() {
  return safeQuery('getProductionDodPayments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('innervate_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return rows.map((r) => ({ date: r.date, payments: num(r.payments) }));
  }, []);
}

async function getProductionDodByPayer() {
  return safeQuery('getProductionDodByPayer', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(insurance_type, 'Unknown') AS payer,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('innervate_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY insurance_type
      ORDER BY payments DESC
      LIMIT 15
    `);
    return rows.map((r) => ({ payer: r.payer, payments: num(r.payments) }));
  }, []);
}

async function getProductionDodByBillerEntity() {
  return safeQuery('getProductionDodByBillerEntity', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(billing_entity, COALESCE(biller, 'Unknown')) AS biller_entity,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('innervate_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY 1
      ORDER BY payments DESC
      LIMIT 15
    `);
    return rows.map((r) => ({ biller_entity: r.biller_entity, payments: num(r.payments) }));
  }, []);
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCOUNTS RECEIVABLE PAGE
// ══════════════════════════════════════════════════════════════════════════════

const INNERVATE_BUCKET_ORDER = ['Current', '30-60', '60-90', '90-120', '120-150', '150+'];

function inBucketSql(col) {
  return `CASE
      WHEN (CURRENT_DATE - ${col}::date) < 30               THEN 'Current'
      WHEN (CURRENT_DATE - ${col}::date) BETWEEN 30 AND 60  THEN '30-60'
      WHEN (CURRENT_DATE - ${col}::date) BETWEEN 61 AND 90  THEN '60-90'
      WHEN (CURRENT_DATE - ${col}::date) BETWEEN 91 AND 120 THEN '90-120'
      WHEN (CURRENT_DATE - ${col}::date) BETWEEN 121 AND 150 THEN '120-150'
      ELSE '150+'
    END`;
}

const INNERVATE_BUCKET_SORT_SQL = `CASE bucket
      WHEN 'Current'  THEN 1
      WHEN '30-60'    THEN 2
      WHEN '60-90'    THEN 3
      WHEN '90-120'   THEN 4
      WHEN '120-150'  THEN 5
      ELSE 6
    END`;

function pivotArData(rows, labelKey) {
  const map = {};
  rows.forEach((r) => {
    const k = r[labelKey];
    if (!map[k]) {
      map[k] = { [labelKey]: k };
      INNERVATE_BUCKET_ORDER.forEach((b) => { map[k][b] = 0; });
      map[k].grand_total = 0;
    }
    const val = num(r.total_balance);
    map[k][r.bucket] = (map[k][r.bucket] || 0) + val;
    map[k].grand_total += val;
  });
  return Object.values(map).sort((a, b) =>
    String(a[labelKey]).localeCompare(String(b[labelKey]))
  );
}

async function getArData(mode) {
  const col = mode === 'doe' ? 'billing_date' : 'dos';
  return safeQuery(`getArData_${mode}`, async () => {
    const { rows: bucketRows } = await pool.query(`
      SELECT bucket, insurance_ar, patient_ar, total_ar
      FROM (
        SELECT
          ${inBucketSql(col)} AS bucket,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay'
                            THEN total_balance ELSE 0 END), 0) AS insurance_ar,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay'
                            THEN total_balance ELSE 0 END), 0) AS patient_ar,
          COALESCE(SUM(total_balance), 0) AS total_ar
        FROM ${tbl('innervate_full_billing')}
        WHERE ${col} IS NOT NULL AND total_balance IS NOT NULL
        GROUP BY 1
      ) sub
      ORDER BY ${INNERVATE_BUCKET_SORT_SQL}
    `);

    const { rows: carrierRows } = await pool.query(`
      SELECT insurance_type, bucket, total_balance
      FROM (
        SELECT
          COALESCE(insurance_type, 'Unknown') AS insurance_type,
          ${inBucketSql(col)} AS bucket,
          COALESCE(SUM(total_balance), 0) AS total_balance
        FROM ${tbl('innervate_full_billing')}
        WHERE ${col} IS NOT NULL AND total_balance IS NOT NULL
        GROUP BY 1, 2
      ) sub
      ORDER BY insurance_type, ${INNERVATE_BUCKET_SORT_SQL}
    `);

    const { rows: catRows } = await pool.query(`
      SELECT
        CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay'
             THEN 'Patient' ELSE 'Insurance' END AS category,
        COALESCE(SUM(total_balance), 0) AS total_balance
      FROM ${tbl('innervate_full_billing')}
      WHERE ${col} IS NOT NULL AND total_balance IS NOT NULL
      GROUP BY 1
    `);

    const carrierTotals = {};
    carrierRows.forEach((r) => {
      const k = r.insurance_type;
      if (!carrierTotals[k]) carrierTotals[k] = 0;
      carrierTotals[k] += num(r.total_balance);
    });
    const treemap = Object.entries(carrierTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      buckets:   bucketRows.map((r) => ({
        bucket:       r.bucket,
        insurance_ar: num(r.insurance_ar),
        patient_ar:   num(r.patient_ar),
        total_ar:     num(r.total_ar),
      })),
      byCarrier: carrierRows.map((r) => ({
        insurance_type: r.insurance_type,
        bucket:         r.bucket,
        total_balance:  num(r.total_balance),
      })),
      treemap,
      category: catRows.map((r) => ({
        category:      r.category,
        total_balance: num(r.total_balance),
      })),
    };
  }, { buckets: [], byCarrier: [], treemap: [], category: [] });
}

async function getArDos() { return getArData('dos'); }
async function getArDoe() { return getArData('doe'); }

async function getArInsurance(mode) {
  const col = mode === 'doe' ? 'billing_date' : 'dos';
  return safeQuery(`getArInsurance_${mode}`, async () => {
    const { rows } = await pool.query(`
      SELECT insurance_type, bucket, total_balance
      FROM (
        SELECT
          COALESCE(insurance_type, 'Unknown') AS insurance_type,
          ${inBucketSql(col)} AS bucket,
          COALESCE(SUM(total_balance), 0) AS total_balance
        FROM ${tbl('innervate_full_billing')}
        WHERE ${col} IS NOT NULL AND total_balance IS NOT NULL
        GROUP BY 1, 2
      ) sub
      ORDER BY insurance_type, ${INNERVATE_BUCKET_SORT_SQL}
    `);
    return pivotArData(rows, 'insurance_type');
  }, []);
}

async function getArSurgeon(mode) {
  const col = mode === 'doe' ? 'billing_date' : 'dos';
  return safeQuery(`getArSurgeon_${mode}`, async () => {
    const { rows } = await pool.query(`
      SELECT surgeon, bucket, total_balance
      FROM (
        SELECT
          COALESCE(surgeon, 'Unknown') AS surgeon,
          ${inBucketSql(col)} AS bucket,
          COALESCE(SUM(total_balance), 0) AS total_balance
        FROM ${tbl('innervate_full_billing')}
        WHERE ${col} IS NOT NULL AND total_balance IS NOT NULL
        GROUP BY 1, 2
      ) sub
      ORDER BY surgeon, ${INNERVATE_BUCKET_SORT_SQL}
    `);
    return pivotArData(rows, 'surgeon');
  }, []);
}

// ── Append to module.exports ──────────────────────────────────────────────────
Object.assign(module.exports, {
  // Production
  getProductionDosChart,
  getProductionDoeChart,
  getProductionDosReimbursement,
  getProductionDoeReimbursement,
  getProductionDodAdjustments,
  getProductionDodPayments,
  getProductionDodByPayer,
  getProductionDodByBillerEntity,
  // AR
  getArDos,
  getArDoe,
  getArInsurance,
  getArSurgeon,
});

// ── Insights page ─────────────────────────────────────────────────────────────

/**
 * Generic insights query: entity × month with 6 metrics + % of month total.
 * entityCol: 'insurance_type' | 'surgeon' | 'reader' | 'technician'
 */
async function getInsightsData(entityCol, extraWhere, params) {
  return safeQuery(`getInsights_${entityCol}`, async () => {
    const { rows } = await pool.query(`
      SELECT
        entity,
        month,
        visit_count,
        total_charge,
        total_payments,
        refund,
        total_adjustments,
        CASE WHEN month_total > 0
          THEN ROUND((total_payments / month_total * 100)::numeric, 2)
          ELSE 0
        END AS pct_total_payments
      FROM (
        SELECT
          COALESCE(NULLIF(TRIM(${entityCol}),''), 'Unknown') AS entity,
          TO_CHAR(DATE_TRUNC('month', billing_date), 'YYYY-MM') AS month,
          COUNT(DISTINCT claim_seq)   AS visit_count,
          COALESCE(SUM(charged),   0) AS total_charge,
          COALESCE(SUM(collected), 0) AS total_payments,
          COALESCE(SUM(refund),    0) AS refund,
          COALESCE(SUM(write_off), 0) AS total_adjustments,
          SUM(SUM(collected)) OVER (PARTITION BY DATE_TRUNC('month', billing_date)) AS month_total
        FROM ${tbl('innervate_full_billing')}
        WHERE billing_date IS NOT NULL
          ${dateFilter12M_doe}
          ${extraWhere || ''}
        GROUP BY 1, DATE_TRUNC('month', billing_date)
      ) sub
      ORDER BY entity, month
    `, params || []);
    return rows.map((r) => ({
      entity:             r.entity,
      month:              r.month,
      visit_count:        num(r.visit_count),
      total_charge:       num(r.total_charge),
      total_payments:     num(r.total_payments),
      pct_total_payments: num(r.pct_total_payments),
      refund:             num(r.refund),
      total_adjustments:  num(r.total_adjustments),
    }));
  }, []);
}

async function getInsightsInsurance()        { return getInsightsData('insurance_type'); }
async function getInsightsSurgeon(surgeon)   { return getInsightsData('surgeon',    surgeon    ? 'AND surgeon = $1'    : '', surgeon    ? [surgeon]    : []); }
async function getInsightsReader(reader)     { return getInsightsData('reader',     reader     ? 'AND reader = $1'     : '', reader     ? [reader]     : []); }
async function getInsightsTechnician(tech)   { return getInsightsData('technician', tech       ? 'AND technician = $1' : '', tech       ? [tech]       : []); }

async function getInsightsSurgeonList() {
  return safeQuery('getInsightsSurgeonList', async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT COALESCE(NULLIF(TRIM(surgeon),''), 'Unknown') AS value
      FROM ${tbl('innervate_full_billing')}
      WHERE billing_date IS NOT NULL ${dateFilter12M_doe}
      ORDER BY 1
    `);
    return rows.map((r) => r.value);
  }, []);
}

async function getInsightsReaderList() {
  return safeQuery('getInsightsReaderList', async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT COALESCE(NULLIF(TRIM(reader),''), 'Unknown') AS value
      FROM ${tbl('innervate_full_billing')}
      WHERE billing_date IS NOT NULL ${dateFilter12M_doe}
      ORDER BY 1
    `);
    return rows.map((r) => r.value);
  }, []);
}

async function getInsightsTechList() {
  return safeQuery('getInsightsTechList', async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT COALESCE(NULLIF(TRIM(technician),''), 'Unknown') AS value
      FROM ${tbl('innervate_full_billing')}
      WHERE billing_date IS NOT NULL ${dateFilter12M_doe}
      ORDER BY 1
    `);
    return rows.map((r) => r.value);
  }, []);
}

// ── Procedure page ─────────────────────────────────────────────────────────────

/**
 * Deposits by Procedure Type (innervate_full_deposit, date_collected, billing_type)
 * Returns: [{ month, billing_type, payments }]
 */
async function getProcedureDeposits() {
  return safeQuery('getProcedureDeposits', async () => {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', date_collected), 'YYYY-MM-DD') AS month,
        COALESCE(NULLIF(TRIM(billing_type),''), 'Unknown') AS billing_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('innervate_full_deposit')}
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
 * Charges by Procedure Type (innervate_full_billing)
 * mode = 'dos' | 'doe'
 * Returns: [{ month, procedure_type, charges }]
 */
async function getProcedureCharges(mode) {
  const col    = mode === 'doe' ? 'billing_date' : 'dos';
  const filter = mode === 'doe' ? dateFilter12M_doe : dateFilter12M_dos;
  return safeQuery(`getProcedureCharges_${mode}`, async () => {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', ${col}), 'YYYY-MM-DD') AS month,
        COALESCE(NULLIF(TRIM(procedure_type),''), 'Unknown') AS procedure_type,
        COALESCE(SUM(charged), 0) AS charges
      FROM ${tbl('innervate_full_billing')}
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
 * DOS/DOE More table — procedure_type x month with full metrics
 */
async function getProcedureMore(mode) {
  const col    = mode === 'doe' ? 'billing_date' : 'dos';
  const filter = mode === 'doe' ? dateFilter12M_doe : dateFilter12M_dos;
  return safeQuery(`getProcedureMore_${mode}`, async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(procedure_type),''), 'Unknown') AS procedure_type,
        TO_CHAR(DATE_TRUNC('month', ${col}), 'YYYY-MM-DD') AS month,
        COALESCE(SUM(charged),   0) AS total_charge,
        COALESCE(SUM(collected), 0) AS total_payments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay' THEN collected ELSE 0 END), 0) AS insurance_payment,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay'  THEN collected ELSE 0 END), 0) AS patient_payment,
        COALESCE(SUM(write_off), 0) AS total_adjustments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay' THEN write_off ELSE 0 END), 0) AS insurance_adjustments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay'  THEN write_off ELSE 0 END), 0) AS patient_adjustments,
        CASE WHEN SUM(charged) > 0
          THEN ROUND(((SUM(collected) / SUM(charged)) * 100)::numeric, 2) ELSE 0 END AS gcr_pct,
        CASE WHEN SUM(CASE WHEN collected + write_off > 0 THEN charged - write_off ELSE 0 END) > 0
          THEN ROUND((SUM(CASE WHEN collected + write_off > 0 THEN collected ELSE 0 END)::numeric
            / NULLIF(SUM(CASE WHEN collected + write_off > 0 THEN charged - write_off ELSE 0 END),0)::numeric * 100), 2)
          ELSE 0 END AS ncr_pct,
        CASE WHEN SUM(CASE WHEN charged <> write_off AND total_balance = 0 THEN charged ELSE 0 END) > 0
          THEN ROUND((SUM(CASE WHEN charged <> write_off AND total_balance = 0 THEN collected ELSE 0 END)::numeric
            / SUM(CASE WHEN charged <> write_off AND total_balance = 0 THEN charged  ELSE 0 END)::numeric * 100), 2)
          ELSE 0 END AS gcr_fully_paid
      FROM ${tbl('innervate_full_billing')}
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
      patient_payment:       num(r.patient_payment),
      total_adjustments:     num(r.total_adjustments),
      insurance_adjustments: num(r.insurance_adjustments),
      patient_adjustments:   num(r.patient_adjustments),
      gcr_pct:               num(r.gcr_pct),
      ncr_pct:               num(r.ncr_pct),
      gcr_fully_paid:        num(r.gcr_fully_paid),
    }));
  }, []);
}

/**
 * DOD More table — billing_type x month with deposit metrics
 */
async function getProcedureDodMore() {
  return safeQuery('getProcedureDodMore', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(billing_type),''), 'Unknown') AS billing_type,
        TO_CHAR(DATE_TRUNC('month', date_collected), 'YYYY-MM-DD') AS month,
        COUNT(DISTINCT claim_seq) AS claim_seq_count,
        COALESCE(SUM(charge),            0) AS charges,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('innervate_full_deposit')}
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

Object.assign(module.exports, {
  getInsightsInsurance,
  getInsightsSurgeon,
  getInsightsReader,
  getInsightsTechnician,
  getInsightsSurgeonList,
  getInsightsReaderList,
  getInsightsTechList,
  getProcedureDeposits,
  getProcedureCharges,
  getProcedureMore,
  getProcedureDodMore,
});
