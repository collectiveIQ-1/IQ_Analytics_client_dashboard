/**
 * synapses.service.js — Data layer for Synapses dashboard.
 *
 * Schema  : iq_synapses
 * Tables  : synapses_full_deposit, synapses_full_billing
 *
 * NO CCR support — getCleanClaimRate returns 0, getCcrHistory returns [].
 */

'use strict';

const pool   = require('../db/pool');
const logger = require('../utils/logger');

const SCHEMA = 'iq_synapses';
const tbl    = (name) => `${SCHEMA}.${name}`;

const num = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v);

function isSchemaError(err) {
  const c = err.code || '';
  const m = (err.message || '').toLowerCase();
  return (
    c === '42P01' ||   // undefined table
    c === '3F000' ||   // invalid schema name
    c === '42703' ||   // undefined column
    c === '22007' ||   // invalid_datetime_format (text cast to date)
    c === '22P02' ||   // invalid_text_representation
    c === '22003' ||   // numeric_value_out_of_range
    c === '42883' ||   // undefined function (e.g. bad operator)
    c === '42804' ||   // datatype mismatch
    m.includes('does not exist') ||
    m.includes('invalid input syntax') ||
    m.includes('out of range') ||
    m.includes('cannot cast')
  );
}

async function safeQuery(label, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    if (isSchemaError(err)) {
      // Always log with code so we can see exactly what's failing in server terminal
      console.warn(`[SYNM] ${label} → code=${err.code || 'none'} msg="${err.message}"`);
      logger.warn(`[SYNM] ${label}: schema/data error (code=${err.code}) — ${err.message}`);
      return fallback;
    }
    console.error(`[SYNM] ${label} FATAL: code=${err.code} msg="${err.message}"`);
    logger.error(`[SYNM] ${label} failed: ${err.message}`);
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

// Date filters removed — queries return all available historical data.
// 12-month filter anchored to the MAX date in each table (not CURRENT_DATE).
// This ensures we always show 12 months of data even when the dataset lags behind today.
const dateFilter12M = (col, tblAlias) => {
  const src = tblAlias || `${SCHEMA}.synapses_full_deposit`;
  return `AND ${col} >= (SELECT DATE_TRUNC('month', MAX(${col})) - INTERVAL '11 months' FROM ${src})`;
};
const dateFilter12M_dos = `
  AND dos >= (SELECT DATE_TRUNC('month', MAX(dos)) - INTERVAL '11 months'
              FROM ${SCHEMA}.synapses_full_billing)`;
const dateFilter12M_doe = `
  AND billing_date >= (SELECT DATE_TRUNC('month', MAX(billing_date)) - INTERVAL '11 months'
                       FROM ${SCHEMA}.synapses_full_billing)`;

// ── KPIs ──────────────────────────────────────────────────────────────────────

/** Total Payments — payment_report, column: payment_collected, last 12 months by date_collected */
async function getTotalPayments() {
  return safeQuery('getTotalPayments', async () => {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(payment_collected), 0) AS total_payments
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
    `);
    return { total_payments: num(rows[0]?.total_payments) };
  }, { total_payments: 0 });
}

/** Total Charges — synapses_full_billing, column: charged (all-time) */
async function getTotalChargesKpi() {
  return safeQuery('getTotalChargesKpi', async () => {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(charged), 0) AS total_charges
      FROM ${tbl('synapses_full_billing')}
    `);
    return { total_charges: num(rows[0]?.total_charges) };
  }, { total_charges: 0 });
}

/** Avg Days DOS to DOE — synapses_full_billing (all-time, safe date cast) */
async function getAvgDays() {
  return safeQuery('getAvgDays', async () => {
    const { rows } = await pool.query(`
      SELECT ROUND(AVG(
        CASE
          WHEN billing_date IS NOT NULL AND dos IS NOT NULL
          THEN (billing_date::date - dos::date)
          ELSE NULL
        END
      )::numeric, 1) AS avg_days
      FROM ${tbl('synapses_full_billing')}
      WHERE billing_date IS NOT NULL
        AND dos IS NOT NULL
    `);
    return { avg_days: num(rows[0]?.avg_days) };
  }, { avg_days: 0 });
}

/** Clean Claim Rate — Synapses has no CCR data, return 0 immediately */
async function getCleanClaimRate() {
  return { ccr: 0 };
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
// Source: payment_report | X: date_collected | Y: payment_collected

async function getPaymentHistory() {
  return safeQuery('getPaymentHistory', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
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
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return monthSeries(rows, (r) => ({ payments: num(r.payments) }));
  }, []);
}

// ── Charges vs Payments (DOE) ─────────────────────────────────────────────────
// Source: billing_report_iomhelp | X: billing_date | Y: charge + collected

async function getChargesVsPayments() {
  return safeQuery('getChargesVsPayments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0)    AS total_charges,
        COALESCE(SUM(collected), 0)  AS total_payments
      FROM ${tbl('synapses_full_billing')}
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
        COALESCE(SUM(charged), 0)    AS total_charges,
        COALESCE(SUM(collected), 0)  AS total_payments
      FROM ${tbl('synapses_full_billing')}
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

/** CCR History — Synapses has no CCR data, return empty array */
async function getCcrHistory() {
  return [];
}

// ── AR Pie (DOE age buckets — billing_date) ───────────────────────────────────

async function getArPie() {
  return safeQuery('getArPie', async () => {
    const { rows } = await pool.query(`
      WITH raw AS (
        SELECT
          CASE
            WHEN age_days < 30            THEN 'Current'
            WHEN age_days BETWEEN 30  AND 59  THEN '30-60'
            WHEN age_days BETWEEN 60  AND 89  THEN '60-90'
            WHEN age_days BETWEEN 90  AND 119 THEN '90-120'
            WHEN age_days BETWEEN 120 AND 149 THEN '120-150'
            ELSE '150+'
          END AS bucket,
          ABS(COALESCE(total_balance, 0)) AS total_balance
        FROM (
          SELECT
            (CURRENT_DATE - billing_date::date)::int AS age_days,
            total_balance
          FROM ${tbl('synapses_full_billing')}
          WHERE billing_date IS NOT NULL
        ) sub
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
      FROM ${tbl('synapses_full_billing')}
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
      FROM ${tbl('synapses_full_billing')}
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
      FROM ${tbl('synapses_full_billing')}
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
      FROM ${tbl('synapses_full_billing')}
      WHERE billing_date IS NOT NULL
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return monthSeries(rows, (r) => ({ adjustments: num(r.adjustments) }));
  }, []);
}

// ── AR Donut (DOS age buckets, grouped ≤60 vs >60 days) ──────────────────────

async function getArDonut() {
  return safeQuery('getArDonut', async () => {
    const { rows } = await pool.query(`
      WITH aged AS (
        SELECT
          (CURRENT_DATE - billing_date::date)::int AS age_days,
          COALESCE(total_balance, 0) AS bal
        FROM ${tbl('synapses_full_billing')}
        WHERE billing_date IS NOT NULL
      ),
      bucketed AS (
        SELECT
          CASE
            WHEN age_days < 30            THEN 'Current'
            WHEN age_days BETWEEN 30  AND 59  THEN '30-60'
            WHEN age_days BETWEEN 60  AND 89  THEN '60-90'
            WHEN age_days BETWEEN 90  AND 119 THEN '90-120'
            WHEN age_days BETWEEN 120 AND 149 THEN '120-150'
            ELSE '150+'
          END AS raw_bucket,
          bal
        FROM aged
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

// ── Denial Reasons (CCR page table) ──────────────────────────────────────────

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
      FROM ${tbl('synapses_ccr')}
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

// ── PAYMENTS PAGE ─────────────────────────────────────────────────────────────

/**
 * All-time payment line chart (no date filter).
 * mode param unused for IOM — kept for API consistency.
 */
async function getPaymentLineChart() {
  return safeQuery('getPaymentLineChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return monthSeries(rows, (r) => ({ payments: num(r.payments) }));
  }, []);
}

/** Deposits by surgeon — last 12 months */
async function getDepositsBySurgeon() {
  return safeQuery('getDepositsBySurgeon', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(surgeon, 'Unknown') AS surgeon,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY surgeon
      ORDER BY payments DESC
      LIMIT 30
    `);
    return rows.map((r) => ({ surgeon: r.surgeon, payments: num(r.payments) }));
  }, []);
}

/** Deposits by hospital — last 12 months */
async function getDepositsByHospital() {
  return safeQuery('getDepositsByHospital', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(hospital, 'Unknown') AS hospital,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY hospital
      ORDER BY payments DESC
      LIMIT 30
    `);
    return rows.map((r) => ({ hospital: r.hospital, payments: num(r.payments) }));
  }, []);
}

/** Deposits by billing type — last 12 months */
async function getDepositsByBillingType() {
  return safeQuery('getDepositsByBillingType', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(billing_type, 'Null') AS billing_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY billing_type
      ORDER BY payments DESC
    `);
    return rows.map((r) => ({ billing_type: r.billing_type, payments: num(r.payments) }));
  }, []);
}

/** Deposits by insurance type — last 12 months */
async function getDepositsByInsurance() {
  return safeQuery('getDepositsByInsurance', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(insurance_type, 'Unknown') AS insurance_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY insurance_type
      ORDER BY payments DESC
      LIMIT 20
    `);
    return rows.map((r) => ({ insurance_type: r.insurance_type, payments: num(r.payments) }));
  }, []);
}

// ── PRODUCTION PAGE ───────────────────────────────────────────────────────────

/** DOS chart: charged vs collected grouped by dos month (last 12 months) */
async function getProductionDosChart() {
  return safeQuery('getProductionDosChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', dos)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged),   0)   AS total_charges,
        COALESCE(SUM(collected), 0)   AS total_payments,
        CASE
          WHEN SUM(charged) > 0
          THEN ROUND(((SUM(collected) / SUM(charged)) * 100)::numeric, 2)
          ELSE 0
        END AS gcr_pct
      FROM ${tbl('synapses_full_billing')}
      WHERE 1=1
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

/** DOE chart: charged grouped by billing_date month (last 12 months) */
async function getProductionDoeChart() {
  return safeQuery('getProductionDoeChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0) AS total_charges
      FROM ${tbl('synapses_full_billing')}
      WHERE 1=1
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

/** Reimbursement analysis table - DOS (grouped by dos month, last 12 months) */
async function getProductionDosReimbursement() {
  return safeQuery('getProductionDosReimbursement', async () => {
    const { rows } = await pool.query(`
      SELECT
        DATE_TRUNC('month', dos) AS month,
        COUNT(DISTINCT claim_seq)  AS visit_count,
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
      FROM ${tbl('synapses_full_billing')}
      WHERE 1=1
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

/** Reimbursement analysis table - DOE (grouped by billing_date month, last 12 months) */
async function getProductionDoeReimbursement() {
  return safeQuery('getProductionDoeReimbursement', async () => {
    const { rows } = await pool.query(`
      SELECT
        DATE_TRUNC('month', billing_date) AS month,
        COUNT(DISTINCT claim_seq)  AS visit_count,
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
      FROM ${tbl('synapses_full_billing')}
      WHERE 1=1
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

/** DOD - payments by payer (payer column in synapses_full_deposit) */
async function getProductionDodByPayer() {
  return safeQuery('getProductionDodByPayer', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(payer), ''), 'Unknown') AS payer,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY COALESCE(NULLIF(TRIM(payer), ''), 'Unknown')
      ORDER BY payments DESC
      LIMIT 20
    `);
    return rows.map((r) => ({ payer: r.payer, payments: num(r.payments) }));
  }, []);
}

/** DOD - payments by billing entity (billing_entity in synapses_full_deposit) for pie chart */
async function getProductionDodByBillingEntity() {
  return safeQuery('getProductionDodByBillingEntity', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(billing_entity), ''), 'Unknown') AS billing_entity,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY COALESCE(NULLIF(TRIM(billing_entity), ''), 'Unknown')
      ORDER BY payments DESC
      LIMIT 10
    `);
    return rows.map((r) => ({ billing_entity: r.billing_entity, payments: num(r.payments) }));
  }, []);
}

/** DOD - All Time Adjustment History from synapses_full_billing (by date_collected) */
async function getDodAdjustmentsAllTime() {
  return safeQuery('getDodAdjustmentsAllTime', async () => {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', date_collected), 'YYYY-MM-DD') AS date,
        COALESCE(SUM(write_off), 0) AS adjustments
      FROM ${tbl('synapses_full_billing')}
      WHERE date_collected IS NOT NULL
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return rows.map(r => ({ date: r.date, adjustments: num(r.adjustments) }));
  }, []);
}


// ── AR Bucket helpers ─────────────────────────────────────────────────────────

const BUCKET_ORDER = ['Current', '30-60', '60-90', '90-120', '120-150', '150+'];

function bucketSql(col) {
  return `CASE
      WHEN (CURRENT_DATE - ${col}) < 30              THEN 'Current'
      WHEN (CURRENT_DATE - ${col}) BETWEEN 30 AND 60  THEN '30-60'
      WHEN (CURRENT_DATE - ${col}) BETWEEN 61 AND 90  THEN '60-90'
      WHEN (CURRENT_DATE - ${col}) BETWEEN 91 AND 120 THEN '90-120'
      WHEN (CURRENT_DATE - ${col}) BETWEEN 121 AND 150 THEN '120-150'
      ELSE '150+'
    END`;
}

function bucketOrderSql(col) {
  return `CASE
      WHEN (CURRENT_DATE - ${col}) < 30               THEN 1
      WHEN (CURRENT_DATE - ${col}) BETWEEN 30 AND 60  THEN 2
      WHEN (CURRENT_DATE - ${col}) BETWEEN 61 AND 90  THEN 3
      WHEN (CURRENT_DATE - ${col}) BETWEEN 91 AND 120 THEN 4
      WHEN (CURRENT_DATE - ${col}) BETWEEN 121 AND 150 THEN 5
      ELSE 6
    END`;
}

/** Sort by bucket string — reference a real outer-query column named `bucket`. */
const BUCKET_SORT_SQL = `CASE bucket
      WHEN 'Current'  THEN 1
      WHEN '30-60'    THEN 2
      WHEN '60-90'    THEN 3
      WHEN '90-120'   THEN 4
      WHEN '120-150'  THEN 5
      ELSE 6
    END`;

/** Pivot raw (label, bucket, total_balance) rows into wide format. */
function pivotAr(rows, labelKey) {
  const map = {};
  rows.forEach((r) => {
    const k = r[labelKey];
    if (!map[k]) {
      map[k] = { [labelKey]: k };
      BUCKET_ORDER.forEach((b) => { map[k][b] = 0; });
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

/**
 * Main AR data for a mode ('dos' | 'doe').
 * Returns: { buckets, byCarrier, treemap, category }
 */
async function getArData(mode) {
  const col = mode === 'doe' ? 'billing_date' : 'dos';
  return safeQuery(`getArData_${mode}`, async () => {
    // 1. Bucket-level splits (subquery so ORDER BY can reference 'bucket' alias)
    const { rows: bucketRows } = await pool.query(`
      SELECT bucket, insurance_ar, patient_ar, total_ar
      FROM (
        SELECT
          ${bucketSql(col)} AS bucket,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay'
                            THEN total_balance ELSE 0 END), 0) AS insurance_ar,
          COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay'
                            THEN total_balance ELSE 0 END), 0) AS patient_ar,
          COALESCE(SUM(total_balance), 0) AS total_ar
        FROM ${tbl('synapses_full_billing')}
        WHERE ${col} IS NOT NULL AND total_balance IS NOT NULL
        GROUP BY 1
      ) sub
      ORDER BY ${BUCKET_SORT_SQL}
    `);

    // 2. Carrier x bucket (subquery so ORDER BY can reference 'bucket' alias)
    const { rows: carrierRows } = await pool.query(`
      SELECT insurance_type, bucket, total_balance
      FROM (
        SELECT
          COALESCE(insurance_type, 'Unknown') AS insurance_type,
          ${bucketSql(col)} AS bucket,
          COALESCE(SUM(total_balance), 0) AS total_balance
        FROM ${tbl('synapses_full_billing')}
        WHERE ${col} IS NOT NULL AND total_balance IS NOT NULL
        GROUP BY 1, 2
      ) sub
      ORDER BY insurance_type, ${BUCKET_SORT_SQL}
    `);

    // 3. Category totals (Patient vs Insurance)
    const { rows: catRows } = await pool.query(`
      SELECT
        CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay'
             THEN 'Patient' ELSE 'Insurance' END AS category,
        COALESCE(SUM(total_balance), 0) AS total_balance
      FROM ${tbl('synapses_full_billing')}
      WHERE ${col} IS NOT NULL AND total_balance IS NOT NULL
      GROUP BY 1
    `);

    // Build treemap from carrier totals
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
      buckets: bucketRows.map((r) => ({
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

/** AR pivot by insurance_type (expand view). */
async function getArInsurance(mode) {
  const col = mode === 'doe' ? 'billing_date' : 'dos';
  return safeQuery(`getArInsurance_${mode}`, async () => {
    const { rows } = await pool.query(`
      SELECT insurance_type, bucket, total_balance
      FROM (
        SELECT
          COALESCE(insurance_type, 'Unknown') AS insurance_type,
          ${bucketSql(col)} AS bucket,
          COALESCE(SUM(total_balance), 0) AS total_balance
        FROM ${tbl('synapses_full_billing')}
        WHERE ${col} IS NOT NULL AND total_balance IS NOT NULL
        GROUP BY 1, 2
      ) sub
      ORDER BY insurance_type, ${BUCKET_SORT_SQL}
    `);
    return pivotAr(rows, 'insurance_type');
  }, []);
}

/** AR pivot by surgeon (expand view). */
async function getArSurgeon(mode) {
  const col = mode === 'doe' ? 'billing_date' : 'dos';
  return safeQuery(`getArSurgeon_${mode}`, async () => {
    const { rows } = await pool.query(`
      SELECT surgeon, bucket, total_balance
      FROM (
        SELECT
          COALESCE(surgeon, 'Unknown') AS surgeon,
          ${bucketSql(col)} AS bucket,
          COALESCE(SUM(total_balance), 0) AS total_balance
        FROM ${tbl('synapses_full_billing')}
        WHERE ${col} IS NOT NULL AND total_balance IS NOT NULL
        GROUP BY 1, 2
      ) sub
      ORDER BY surgeon, ${BUCKET_SORT_SQL}
    `);
    return pivotAr(rows, 'surgeon');
  }, []);
}


// ── Procedure page ────────────────────────────────────────────────────────────

/**
 * Deposits by Procedure Type (payment_report, date_collected, billing_type)
 * Returns: [{ month, billing_type, payments }]
 */
async function getProcedureDeposits() {
  return safeQuery('getProcedureDeposits', async () => {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', date_collected), 'YYYY-MM-DD') AS month,
        COALESCE(NULLIF(TRIM(billing_type),''), 'Unknown') AS billing_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
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
 * Charges by Procedure Type (billing_report_iomhelp)
 * mode = 'dos' | 'doe'
 * Returns: [{ month, procedure_type, charges }]
 */
/**
 * Charges by Procedure Type (billing_report_iomhelp)
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
      FROM ${tbl('synapses_full_billing')}
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
 * Returns: [{ procedure_type, month, total_charge, ... }]
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
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN collected ELSE 0 END), 0) AS patient_payment,
        COALESCE(SUM(write_off), 0) AS total_adjustments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) <> 'self pay' THEN write_off ELSE 0 END), 0) AS insurance_adjustments,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN write_off ELSE 0 END), 0) AS patient_adjustments,
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
      FROM ${tbl('synapses_full_billing')}
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
 * Returns: [{ billing_type, month, claim_seq_count, charges, payments }]
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
      FROM ${tbl('synapses_full_deposit')}
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


// ── Insights page ─────────────────────────────────────────────────────────────

/**
 * Generic insights query: entity × month with 6 metrics + % of month total.
 * entityCol: 'insurance_type' | 'surgeon' | 'reader' | 'collector'
 * filter: optional extra WHERE clause string (e.g. "AND surgeon = $1")
 * params: bound values array
 */
async function getInsightsData(entityCol, extraWhere, params) {
  const label = entityCol;
  return safeQuery(`getInsights_${label}`, async () => {
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
        FROM ${tbl('synapses_full_billing')}
        WHERE billing_date IS NOT NULL
          ${dateFilter12M_doe}
          ${extraWhere || ''}
        GROUP BY 1, DATE_TRUNC('month', billing_date)
      ) sub
      ORDER BY entity, month
    `, params || []);
    return rows.map((r) => ({
      entity:           r.entity,
      month:            r.month,
      visit_count:      num(r.visit_count),
      total_charge:     num(r.total_charge),
      total_payments:   num(r.total_payments),
      pct_total_payments: num(r.pct_total_payments),
      refund:           num(r.refund),
      total_adjustments: num(r.total_adjustments),
    }));
  }, []);
}

async function getInsightsInsurance()                { return getInsightsData('insurance_type'); }
async function getInsightsSurgeon(surgeon)           { return getInsightsData('surgeon',   surgeon ? 'AND surgeon = $1' : '', surgeon ? [surgeon] : []); }
async function getInsightsReader(reader)             { return getInsightsData('reader',    reader  ? 'AND reader = $1'  : '', reader  ? [reader]  : []); }
async function getInsightsTechnician(tech)           { return getInsightsData('collector', tech    ? 'AND collector = $1' : '', tech  ? [tech]    : []); }

/** Distinct surgeon values for dropdown */
async function getInsightsSurgeonList() {
  return safeQuery('getInsightsSurgeonList', async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT COALESCE(NULLIF(TRIM(surgeon),''), 'Unknown') AS value
      FROM ${tbl('synapses_full_billing')}
      WHERE billing_date IS NOT NULL ${dateFilter12M_doe}
      ORDER BY 1
    `);
    return rows.map((r) => r.value);
  }, []);
}

/** Distinct reader values for dropdown */
async function getInsightsReaderList() {
  return safeQuery('getInsightsReaderList', async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT COALESCE(NULLIF(TRIM(reader),''), 'Unknown') AS value
      FROM ${tbl('synapses_full_billing')}
      WHERE billing_date IS NOT NULL ${dateFilter12M_doe}
      ORDER BY 1
    `);
    return rows.map((r) => r.value);
  }, []);
}

/** Distinct tech_name values for dropdown */
async function getInsightsTechList() {
  return safeQuery('getInsightsTechList', async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT COALESCE(NULLIF(TRIM(collector),''), 'Unknown') AS value
      FROM ${tbl('synapses_full_billing')}
      WHERE billing_date IS NOT NULL ${dateFilter12M_doe}
      ORDER BY 1
    `);
    return rows.map((r) => r.value);
  }, []);
}

// ── IDR Payment Summary page ─────────────────────────────────────────────────
// Synapses mirrors IOM Help — IDR page uses smartsheet table (safe fallback if absent)

// ── Debug ─────────────────────────────────────────────────────────────────────


async function getSchemaInfo() {
  return safeQuery('getSchemaInfo', async () => {
    const { rows } = await pool.query(`
      SELECT
        t.table_name,
        array_agg(c.column_name::text ORDER BY c.ordinal_position) AS columns,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${SCHEMA}' AND table_type = 'BASE TABLE') AS table_count
      FROM information_schema.tables t
      JOIN information_schema.columns c
        ON c.table_schema = t.table_schema AND c.table_name = t.table_name
      WHERE t.table_schema = '${SCHEMA}'
      GROUP BY t.table_name
      ORDER BY t.table_name
    `);
    return rows;
  }, []);
}

async function getSchemaColumns() {
  return safeQuery('getSchemaColumns', async () => {
    const { rows } = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = '${SCHEMA}'
      ORDER BY table_name, ordinal_position
    `);
    return rows;
  }, []);
}

async function getFullSourceTable(tableName) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    logger.error(`[SYNM] getFullSourceTable: unsafe table name rejected — "${tableName}"`);
    return [];
  }
  try {
    logger.info(`[SYNM] getFullSourceTable: querying iq_synapses."${tableName}" …`);
    const result = await pool.exportQuery(`SELECT * FROM iq_synapses."${tableName}" LIMIT 500000`);
    logger.info(`[SYNM] getFullSourceTable("${tableName}"): ${result.rows.length} rows`);
    return result.rows;
  } catch (err) {
    logger.error(`[SYNM] getFullSourceTable("${tableName}") FAILED: ${err.message}`);
    return [];
  }
}

module.exports = {
  getAllKpis,
  // Home charts
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
  // CCR page
  getDenialReasons,
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
  getDodAdjustmentsAllTime,
  getProductionDodByPayer,
  getProductionDodByBillingEntity,
  // AR page
  getArData,
  getArInsurance,
  getArSurgeon,
  // Procedure page
  getProcedureDeposits,
  getProcedureCharges,
  getProcedureMore,
  getProcedureDodMore,
  // Insights page
  getInsightsInsurance,
  getInsightsSurgeon,
  getInsightsReader,
  getInsightsTechnician,
  getInsightsSurgeonList,
  getInsightsReaderList,
  getInsightsTechList,
  // Payments page (filter-aware)
  getPaymentsLine,
  getPaymentsBySurgeon,
  getPaymentsByHospital,
  getPaymentsByBillingType,
  getPaymentsByInsuranceType,
  // Debug
  getSchemaColumns,
};

// ── Payments page (filter-aware, cross-filtering) ─────────────────────────────
// These replace the generic deposit functions for the Payments tab.
// All filters are optional — undefined/null means no filter applied.

function buildPaymentsWhere(filters) {
  const params = [];
  const conds  = [];

  if (filters.month) {
    params.push(filters.month);
    conds.push(`DATE_TRUNC('month', date_collected) = DATE_TRUNC('month', $${params.length}::date)`);
  }
  if (filters.surgeon) {
    params.push(filters.surgeon);
    conds.push(`surgeon = $${params.length}`);
  }
  if (filters.hospital) {
    params.push(filters.hospital);
    conds.push(`hospital = $${params.length}`);
  }
  if (filters.billing_type) {
    params.push(filters.billing_type);
    conds.push(`billing_type = $${params.length}`);
  }
  if (filters.insurance_type) {
    params.push(filters.insurance_type);
    conds.push(`insurance_type = $${params.length}`);
  }

  return { where: conds.length ? 'AND ' + conds.join(' AND ') : '', params };
}

/** All-time payment line (month-end dates), optionally filtered by a bar selection. */
async function getPaymentsLine(filters = {}) {
  return safeQuery('getPaymentsLine', async () => {
    const { where, params } = buildPaymentsWhere({
      surgeon:       filters.surgeon       || null,
      hospital:      filters.hospital      || null,
      billing_type:  filters.billing_type  || null,
      insurance_type: filters.insurance_type || null,
    });
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${where}
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `, params);
    return monthSeries(rows, (r) => ({ payments: num(r.payments) }));
  }, []);
}

/** Deposits grouped by surgeon, optionally filtered by month + other categories. */
async function getPaymentsBySurgeon(filters = {}) {
  return safeQuery('getPaymentsBySurgeon', async () => {
    const { where, params } = buildPaymentsWhere({
      month:         filters.month         || null,
      hospital:      filters.hospital      || null,
      billing_type:  filters.billing_type  || null,
      insurance_type: filters.insurance_type || null,
    });
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(surgeon), ''), 'Unknown') AS surgeon,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${where}
      GROUP BY COALESCE(NULLIF(TRIM(surgeon), ''), 'Unknown')
      ORDER BY payments DESC
      LIMIT 50
    `, params);
    return rows.map((r) => ({ surgeon: r.surgeon, payments: num(r.payments) }));
  }, []);
}

/** Deposits grouped by hospital, optionally filtered. */
async function getPaymentsByHospital(filters = {}) {
  return safeQuery('getPaymentsByHospital', async () => {
    const { where, params } = buildPaymentsWhere({
      month:         filters.month         || null,
      surgeon:       filters.surgeon       || null,
      billing_type:  filters.billing_type  || null,
      insurance_type: filters.insurance_type || null,
    });
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(hospital), ''), 'Unknown') AS hospital,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${where}
      GROUP BY COALESCE(NULLIF(TRIM(hospital), ''), 'Unknown')
      ORDER BY payments DESC
      LIMIT 50
    `, params);
    return rows.map((r) => ({ hospital: r.hospital, payments: num(r.payments) }));
  }, []);
}

/** Deposits grouped by billing_type, optionally filtered. */
async function getPaymentsByBillingType(filters = {}) {
  return safeQuery('getPaymentsByBillingType', async () => {
    const { where, params } = buildPaymentsWhere({
      month:         filters.month         || null,
      surgeon:       filters.surgeon       || null,
      hospital:      filters.hospital      || null,
      insurance_type: filters.insurance_type || null,
    });
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(billing_type), ''), 'Unknown') AS billing_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${where}
      GROUP BY COALESCE(NULLIF(TRIM(billing_type), ''), 'Unknown')
      ORDER BY payments DESC
    `, params);
    return rows.map((r) => ({ billing_type: r.billing_type, payments: num(r.payments) }));
  }, []);
}

/** Deposits grouped by insurance_type, optionally filtered. */
async function getPaymentsByInsuranceType(filters = {}) {
  return safeQuery('getPaymentsByInsuranceType', async () => {
    const { where, params } = buildPaymentsWhere({
      month:         filters.month         || null,
      surgeon:       filters.surgeon       || null,
      hospital:      filters.hospital      || null,
      billing_type:  filters.billing_type  || null,
    });
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(insurance_type), ''), 'Unknown') AS insurance_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('synapses_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${where}
      GROUP BY COALESCE(NULLIF(TRIM(insurance_type), ''), 'Unknown')
      ORDER BY payments DESC
      LIMIT 30
    `, params);
    return rows.map((r) => ({ insurance_type: r.insurance_type, payments: num(r.payments) }));
  }, []);
}

module.exports = {
  // KPIs
  getAllKpis,
  getTotalPayments,
  getTotalChargesKpi,
  getAvgDays,
  getCleanClaimRate,
  // Home charts
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
  // Payments page
  getPaymentLineChart,
  getDepositsBySurgeon,
  getDepositsByHospital,
  getDepositsByBillingType,
  getDepositsByInsurance,
  // Payments page (filter-aware)
  getPaymentsLine,
  getPaymentsBySurgeon,
  getPaymentsByHospital,
  getPaymentsByBillingType,
  getPaymentsByInsuranceType,
  // Production page
  getProductionDosChart,
  getProductionDoeChart,
  getProductionDosReimbursement,
  getProductionDoeReimbursement,
  getProductionDodByPayer,
  getProductionDodByBillingEntity,
  getDodAdjustmentsAllTime,
  // AR page
  getArData,
  getArInsurance,
  getArSurgeon,
  // Procedure page
  getProcedureDeposits,
  getProcedureCharges,
  getProcedureMore,
  getProcedureDodMore,
  // Insights page
  getInsightsInsurance,
  getInsightsSurgeon,
  getInsightsReader,
  getInsightsTechnician,
  getInsightsSurgeonList,
  getInsightsReaderList,
  getInsightsTechList,
  // Debug / schema
  getSchemaInfo,
  getSchemaColumns,
  // Data source export
  getFullSourceTable,
};
