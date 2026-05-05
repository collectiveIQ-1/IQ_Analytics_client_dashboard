/**
 * neurowatch.service.js — Data layer for Neuro Watch dashboard.
 *
 * Schema  : iq_neurowatch
 * Tables  :
 *   neurowatch_full_deposit  (equivalent to payment_report)
 *   neurowatch_full_billing  (equivalent to billing_report_iomhelp)
 *
 * Column mapping:
 *   Deposit : date_collected, payment_collected, surgeon, hospital,
 *             billing_type, insurance_type
 *   Billing : dos, billing_date, charged, collected, write_off,
 *             total_balance
 */

'use strict';

const pool   = require('../db/pool');
const logger = require('../utils/logger');

const SCHEMA = 'iq_neurowatch';
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
      logger.warn('[NW] ' + label + ': schema/table/column missing — ' + err.message);
      return fallback;
    }
    logger.error('[NW] ' + label + ' failed: ' + err.message);
    throw err;
  }
}

function monthSeries(rows, valueMapper) {
  return rows.map((r) => ({ date: r.date, ...valueMapper(r) }));
}

const num0 = (r, col) => num(r[col]);

// ── Date filter helpers ───────────────────────────────────────────────────────

const dateFilter12M = (col) => `
  AND ${col} >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '35 months'
  AND DATE_TRUNC('month', ${col}) < DATE_TRUNC('month', CURRENT_DATE)
`;

const dateFilter12M_dos = `
  AND dos IS NOT NULL
  AND dos >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '35 months'
  AND DATE_TRUNC('month', dos) < DATE_TRUNC('month', CURRENT_DATE)
`;

const dateFilter12M_doe = `
  AND billing_date IS NOT NULL
  AND billing_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '35 months'
  AND DATE_TRUNC('month', billing_date) < DATE_TRUNC('month', CURRENT_DATE)
`;

// Home charts: COALESCE(billing_date, dos) + wide 36-month window so sparse billing_date still returns data
const dateFilter12M_doe_home = `
  AND COALESCE(billing_date, dos) IS NOT NULL
  AND COALESCE(billing_date, dos) >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '35 months'
  AND DATE_TRUNC('month', COALESCE(billing_date, dos)) < DATE_TRUNC('month', CURRENT_DATE)
`;

// ── KPIs ──────────────────────────────────────────────────────────────────────

async function getTotalPayments() {
  return safeQuery('getTotalPayments', async () => {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(payment_collected), 0) AS total_payments
      FROM ${tbl('neurowatch_full_deposit')}
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
      FROM ${tbl('neurowatch_full_billing')}
      WHERE 1=1 ${dateFilter12M_dos}
    `);
    return { total_charges: num(rows[0]?.total_charges) };
  }, { total_charges: 0 });
}

async function getAvgDays() {
  return safeQuery('getAvgDays', async () => {
    const { rows } = await pool.query(`
      SELECT ROUND(AVG((billing_date::date - dos::date))::numeric, 1) AS avg_days
      FROM ${tbl('neurowatch_full_billing')}
      WHERE billing_date IS NOT NULL
        AND dos IS NOT NULL
        ${dateFilter12M_dos}
    `);
    return { avg_days: num(rows[0]?.avg_days) };
  }, { avg_days: 0 });
}

async function getAllKpis() {
  const [pmts, charges, avgDays] = await Promise.all([
    getTotalPayments(),
    getTotalChargesKpi(),
    getAvgDays(),
  ]);
  return { ...pmts, ...charges, ...avgDays };
}

// ── Home charts ───────────────────────────────────────────────────────────────

async function getPaymentHistory() {
  return safeQuery('getPaymentHistory', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('neurowatch_full_deposit')}
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
      FROM ${tbl('neurowatch_full_deposit')}
      WHERE date_collected IS NOT NULL
      GROUP BY DATE_TRUNC('month', date_collected)
      ORDER BY DATE_TRUNC('month', date_collected) ASC
    `);
    return monthSeries(rows, (r) => ({ payments: num(r.payments) }));
  }, []);
}

async function getChargesVsPayments() {
  return safeQuery('getChargesVsPayments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', COALESCE(billing_date, dos))::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged),   0) AS total_charges,
        COALESCE(SUM(collected), 0) AS total_payments
      FROM ${tbl('neurowatch_full_billing')}
      WHERE 1=1 ${dateFilter12M_doe_home}
      GROUP BY DATE_TRUNC('month', COALESCE(billing_date, dos))
      ORDER BY DATE_TRUNC('month', COALESCE(billing_date, dos)) ASC
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
        (DATE_TRUNC('month', COALESCE(billing_date, dos))::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged),   0) AS total_charges,
        COALESCE(SUM(collected), 0) AS total_payments
      FROM ${tbl('neurowatch_full_billing')}
      WHERE COALESCE(billing_date, dos) IS NOT NULL
      GROUP BY DATE_TRUNC('month', COALESCE(billing_date, dos))
      ORDER BY DATE_TRUNC('month', COALESCE(billing_date, dos)) ASC
    `);
    return monthSeries(rows, (r) => ({
      total_charges:  num(r.total_charges),
      total_payments: num(r.total_payments),
    }));
  }, []);
}

// AR bucket logic (shared)
const AR_BUCKET_SQL = `
  CASE
    WHEN COALESCE(billing_date, dos) IS NULL THEN 'Current'
    WHEN (CURRENT_DATE - COALESCE(billing_date, dos)::date) < 30   THEN 'Current'
    WHEN (CURRENT_DATE - COALESCE(billing_date, dos)::date) < 60   THEN '30-60'
    WHEN (CURRENT_DATE - COALESCE(billing_date, dos)::date) < 90   THEN '60-90'
    WHEN (CURRENT_DATE - COALESCE(billing_date, dos)::date) < 120  THEN '90-120'
    WHEN (CURRENT_DATE - COALESCE(billing_date, dos)::date) < 150  THEN '120-150'
    ELSE '150+'
  END AS bucket
`;

const BUCKET_ORDER = "CASE bucket WHEN 'Current' THEN 1 WHEN '30-60' THEN 2 WHEN '60-90' THEN 3 WHEN '90-120' THEN 4 WHEN '120-150' THEN 5 ELSE 6 END";

async function getArPie() {
  return safeQuery('getArPie', async () => {
    const { rows } = await pool.query(`
      SELECT bucket, total_balance FROM (
        SELECT
          ${AR_BUCKET_SQL},
          COALESCE(SUM(total_balance), 0) AS total_balance
        FROM ${tbl('neurowatch_full_billing')}
        WHERE total_balance IS NOT NULL AND total_balance <> 0
        GROUP BY 1
      ) sub
      ORDER BY ${BUCKET_ORDER}
    `);
    return rows.map((r) => ({ bucket: r.bucket, total_balance: num(r.total_balance) }));
  }, []);
}

async function getArDonut() {
  return safeQuery('getArDonut', async () => {
    const { rows } = await pool.query(`
      SELECT bucket, total_balance FROM (
        SELECT
          CASE
            WHEN (CURRENT_DATE - COALESCE(billing_date, dos)::date) >= 60 THEN '>60 Days'
            ELSE 'Current & <60'
          END AS bucket,
          COALESCE(SUM(total_balance), 0) AS total_balance
        FROM ${tbl('neurowatch_full_billing')}
        WHERE total_balance IS NOT NULL AND total_balance <> 0
        GROUP BY 1
      ) sub
      ORDER BY CASE bucket WHEN '>60 Days' THEN 1 ELSE 2 END
    `);
    return rows.map((r) => ({ bucket: r.bucket, total_balance: num(r.total_balance) }));
  }, []);
}

async function getTotalChargesChart() {
  return safeQuery('getTotalChargesChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', COALESCE(billing_date, dos))::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0) AS total_charges
      FROM ${tbl('neurowatch_full_billing')}
      WHERE 1=1 ${dateFilter12M_doe_home}
      GROUP BY DATE_TRUNC('month', COALESCE(billing_date, dos))
      ORDER BY DATE_TRUNC('month', COALESCE(billing_date, dos)) ASC
    `);
    return monthSeries(rows, (r) => ({ total_charges: num(r.total_charges) }));
  }, []);
}

async function getTotalChargesChartFull() {
  return safeQuery('getTotalChargesChartFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', COALESCE(billing_date, dos))::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0) AS total_charges
      FROM ${tbl('neurowatch_full_billing')}
      WHERE COALESCE(billing_date, dos) IS NOT NULL
      GROUP BY DATE_TRUNC('month', COALESCE(billing_date, dos))
      ORDER BY DATE_TRUNC('month', COALESCE(billing_date, dos)) ASC
    `);
    return monthSeries(rows, (r) => ({ total_charges: num(r.total_charges) }));
  }, []);
}

async function getAdjustments() {
  return safeQuery('getAdjustments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', COALESCE(billing_date, dos))::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(write_off), 0) AS adjustments
      FROM ${tbl('neurowatch_full_billing')}
      WHERE 1=1 ${dateFilter12M_doe_home}
      GROUP BY DATE_TRUNC('month', COALESCE(billing_date, dos))
      ORDER BY DATE_TRUNC('month', COALESCE(billing_date, dos)) ASC
    `);
    return monthSeries(rows, (r) => ({ adjustments: num(r.adjustments) }));
  }, []);
}

async function getAdjustmentsFull() {
  return safeQuery('getAdjustmentsFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', COALESCE(billing_date, dos))::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(write_off), 0) AS adjustments
      FROM ${tbl('neurowatch_full_billing')}
      WHERE COALESCE(billing_date, dos) IS NOT NULL
      GROUP BY DATE_TRUNC('month', COALESCE(billing_date, dos))
      ORDER BY DATE_TRUNC('month', COALESCE(billing_date, dos)) ASC
    `);
    return monthSeries(rows, (r) => ({ adjustments: num(r.adjustments) }));
  }, []);
}

// ── Payments page ─────────────────────────────────────────────────────────────

async function getPaymentLineChart() {
  return safeQuery('getPaymentLineChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date_collected)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('neurowatch_full_deposit')}
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
      FROM ${tbl('neurowatch_full_deposit')}
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
      FROM ${tbl('neurowatch_full_deposit')}
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
        COALESCE(billing_type, 'Unknown') AS billing_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('neurowatch_full_deposit')}
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
      FROM ${tbl('neurowatch_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY insurance_type
      ORDER BY payments DESC
      LIMIT 20
    `);
    return rows.map((r) => ({ insurance_type: r.insurance_type, payments: num(r.payments) }));
  }, []);
}

// ── Production Page ───────────────────────────────────────────────────────────

async function getProductionDosChart() {
  return safeQuery('getProductionDosChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', dos)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged),   0) AS total_charges,
        COALESCE(SUM(collected), 0) AS total_payments,
        CASE WHEN SUM(charged) > 0
          THEN ROUND(((SUM(collected) / SUM(charged)) * 100)::numeric, 2)
          ELSE 0 END AS gcr_pct
      FROM ${tbl('neurowatch_full_billing')}
      WHERE 1=1 ${dateFilter12M_dos}
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

async function getProductionDoeChart() {
  return safeQuery('getProductionDoeChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', billing_date)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(charged), 0) AS total_charges
      FROM ${tbl('neurowatch_full_billing')}
      WHERE 1=1 ${dateFilter12M_doe}
      GROUP BY DATE_TRUNC('month', billing_date)
      ORDER BY DATE_TRUNC('month', billing_date) ASC
    `);
    return rows.map((r) => ({ date: r.date, total_charges: num(r.total_charges) }));
  }, []);
}

function _reimbQuery(dateCol, dateFilter) {
  return `
    SELECT
      DATE_TRUNC('month', ${dateCol}) AS month,
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
      CASE WHEN COUNT(DISTINCT claim_seq) > 0 THEN ROUND(SUM(charged)::numeric / COUNT(DISTINCT claim_seq), 0) ELSE 0 END AS avg_chrg_per_visit,
      CASE WHEN COUNT(DISTINCT claim_seq) > 0 THEN ROUND(SUM(collected)::numeric / COUNT(DISTINCT claim_seq), 0) ELSE 0 END AS avg_pmt_per_visit,
      CASE WHEN SUM(charged) > 0 THEN ROUND(((SUM(collected) / SUM(charged)) * 100)::numeric, 2) ELSE 0 END AS gcr_pct,
      CASE WHEN SUM(charged) > 0 THEN ROUND(((SUM(collected) / SUM(charged)) * 100)::numeric, 1) ELSE 0 END AS gcr_without_pt_balance,
      CASE WHEN SUM(CASE WHEN charged <> write_off AND total_balance = 0 THEN charged ELSE 0 END) > 0
        THEN ROUND((SUM(CASE WHEN charged <> write_off AND total_balance = 0 THEN collected ELSE 0 END)::numeric / SUM(CASE WHEN charged <> write_off AND total_balance = 0 THEN charged ELSE 0 END)::numeric * 100), 1)
        ELSE 0 END AS gcr_fully_paid,
      CASE WHEN SUM(CASE WHEN collected + write_off > 0 THEN charged - write_off ELSE 0 END) > 0
        THEN ROUND((SUM(CASE WHEN collected + write_off > 0 THEN collected ELSE 0 END)::numeric / NULLIF(SUM(CASE WHEN collected + write_off > 0 THEN charged - write_off ELSE 0 END), 0)::numeric * 100), 1)
        ELSE 0 END AS ncr_pct
    FROM ${tbl('neurowatch_full_billing')}
    WHERE 1=1 ${dateFilter}
    GROUP BY DATE_TRUNC('month', ${dateCol})
    ORDER BY DATE_TRUNC('month', ${dateCol}) ASC
  `;
}

function _mapReimb(rows) {
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
}

async function getProductionDosReimb() {
  return safeQuery('getProductionDosReimb', async () => {
    const { rows } = await pool.query(_reimbQuery('dos', dateFilter12M_dos));
    return _mapReimb(rows);
  }, []);
}

async function getProductionDoeReimb() {
  return safeQuery('getProductionDoeReimb', async () => {
    const { rows } = await pool.query(_reimbQuery('billing_date', dateFilter12M_doe));
    return _mapReimb(rows);
  }, []);
}

async function getProductionDodByPayer() {
  return safeQuery('getProductionDodByPayer', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(insurance_type, 'Unknown') AS payer,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('neurowatch_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY insurance_type
      ORDER BY payments DESC
      LIMIT 15
    `);
    return rows.map((r) => ({ payer: r.payer, payments: num(r.payments) }));
  }, []);
}

async function getProductionDodByBillingEntity() {
  return safeQuery('getProductionDodByBillingEntity', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(billing_entity, COALESCE(hospital, 'Unknown')) AS biller_entity,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('neurowatch_full_deposit')}
      WHERE date_collected IS NOT NULL
        ${dateFilter12M('date_collected')}
      GROUP BY 1
      ORDER BY payments DESC
      LIMIT 10
    `);
    return rows.map((r) => ({ biller_entity: r.biller_entity, payments: num(r.payments) }));
  }, []);
}

// ── AR Page ───────────────────────────────────────────────────────────────────

function nwArBucketCase(col) {
  return `
    CASE
      WHEN (CURRENT_DATE - ${col}::date) < 30            THEN 'Current'
      WHEN (CURRENT_DATE - ${col}::date) BETWEEN 30  AND 60  THEN '30-60'
      WHEN (CURRENT_DATE - ${col}::date) BETWEEN 61  AND 90  THEN '60-90'
      WHEN (CURRENT_DATE - ${col}::date) BETWEEN 91  AND 120 THEN '90-120'
      WHEN (CURRENT_DATE - ${col}::date) BETWEEN 121 AND 150 THEN '120-150'
      ELSE '150+'
    END`;
}

const NW_AR_BUCKET_ORDER = ['Current', '30-60', '60-90', '90-120', '120-150', '150+'];

const NW_AR_BUCKET_SORT = `CASE bucket
  WHEN 'Current' THEN 1 WHEN '30-60' THEN 2 WHEN '60-90' THEN 3
  WHEN '90-120'  THEN 4 WHEN '120-150' THEN 5 ELSE 6 END`;

async function getArBuckets(dateCol) {
  return safeQuery(`nwArBuckets_${dateCol}`, async () => {
    const { rows } = await pool.query(`
      SELECT bucket,
        SUM(ins_balance)     AS ins_balance,
        SUM(patient_balance) AS patient_balance,
        SUM(total_balance)   AS total_balance
      FROM (
        SELECT
          ${nwArBucketCase(dateCol)} AS bucket,
          CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN 0 ELSE total_balance END AS ins_balance,
          CASE WHEN LOWER(COALESCE(insurance_type,'')) = 'self pay' THEN total_balance ELSE 0 END AS patient_balance,
          total_balance
        FROM ${tbl('neurowatch_full_billing')}
        WHERE ${dateCol} IS NOT NULL
      ) sub
      GROUP BY bucket
      ORDER BY ${NW_AR_BUCKET_SORT}
    `);
    return rows.map((r) => ({
      bucket:          r.bucket,
      ins_balance:     num(r.ins_balance),
      patient_balance: num(r.patient_balance),
      total_balance:   num(r.total_balance),
    }));
  }, []);
}

async function getArDosBuckets() { return getArBuckets('dos'); }
async function getArDoeBuckets() { return getArBuckets('billing_date'); }

async function getArTreemap(dateCol) {
  return safeQuery(`nwArTreemap_${dateCol}`, async () => {
    const { rows } = await pool.query(`
      SELECT COALESCE(insurance_type, 'Unknown') AS insurance_type, SUM(total_balance) AS total_balance
      FROM ${tbl('neurowatch_full_billing')}
      WHERE ${dateCol} IS NOT NULL
      GROUP BY 1
      ORDER BY total_balance DESC
    `);
    return rows.map((r) => ({ insurance_type: r.insurance_type, total_balance: num(r.total_balance) }));
  }, []);
}

async function getArByInsurance(dateCol) {
  return safeQuery(`nwArByInsurance_${dateCol}`, async () => {
    const { rows } = await pool.query(`
      SELECT insurance_type, bucket, total_balance
      FROM (
        SELECT
          COALESCE(insurance_type, 'Unknown') AS insurance_type,
          ${nwArBucketCase(dateCol)} AS bucket,
          SUM(total_balance) AS total_balance
        FROM ${tbl('neurowatch_full_billing')}
        WHERE ${dateCol} IS NOT NULL
        GROUP BY 1, 2
      ) sub
      ORDER BY insurance_type, ${NW_AR_BUCKET_SORT}
    `);
    const map = {};
    rows.forEach((r) => {
      if (!map[r.insurance_type]) {
        map[r.insurance_type] = { insurance_type: r.insurance_type, grand_total: 0 };
        NW_AR_BUCKET_ORDER.forEach((b) => { map[r.insurance_type][b] = 0; });
      }
      map[r.insurance_type][r.bucket] = (map[r.insurance_type][r.bucket] || 0) + num(r.total_balance);
      map[r.insurance_type].grand_total += num(r.total_balance);
    });
    return Object.values(map).sort((a, b) => a.insurance_type.localeCompare(b.insurance_type));
  }, []);
}

async function getArBySurgeon(dateCol, surgeon) {
  return safeQuery(`nwArBySurgeon_${dateCol}`, async () => {
    const params = [];
    let sf = '';
    if (surgeon && surgeon !== 'All') { params.push(surgeon); sf = `AND surgeon = $1`; }
    const { rows } = await pool.query(`
      SELECT surgeon, bucket, total_balance
      FROM (
        SELECT
          COALESCE(surgeon, 'Unknown') AS surgeon,
          ${nwArBucketCase(dateCol)} AS bucket,
          SUM(total_balance) AS total_balance
        FROM ${tbl('neurowatch_full_billing')}
        WHERE ${dateCol} IS NOT NULL ${sf}
        GROUP BY 1, 2
      ) sub
      ORDER BY surgeon, ${NW_AR_BUCKET_SORT}
    `, params);
    const map = {};
    rows.forEach((r) => {
      if (!map[r.surgeon]) {
        map[r.surgeon] = { surgeon: r.surgeon, grand_total: 0 };
        NW_AR_BUCKET_ORDER.forEach((b) => { map[r.surgeon][b] = 0; });
      }
      map[r.surgeon][r.bucket] = (map[r.surgeon][r.bucket] || 0) + num(r.total_balance);
      map[r.surgeon].grand_total += num(r.total_balance);
    });
    return Object.values(map).sort((a, b) => (a.surgeon || '').localeCompare(b.surgeon || ''));
  }, []);
}

async function getArSurgeons() {
  return safeQuery('nwArSurgeons', async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT COALESCE(surgeon, 'Unknown') AS surgeon
      FROM ${tbl('neurowatch_full_billing')}
      WHERE surgeon IS NOT NULL
      ORDER BY 1
    `);
    return rows.map((r) => r.surgeon);
  }, []);
}

module.exports = {
  getAllKpis,
  getPaymentHistory,
  getPaymentHistoryFull,
  getChargesVsPayments,
  getChargesVsPaymentsFull,
  getArPie,
  getArDonut,
  getTotalChargesChart,
  getTotalChargesChartFull,
  getAdjustments,
  getAdjustmentsFull,
  getPaymentLineChart,
  getDepositsBySurgeon,
  getDepositsByHospital,
  getDepositsByBillingType,
  getDepositsByInsurance,
  // Production page
  getProductionDosChart,
  getProductionDoeChart,
  getProductionDosReimb,
  getProductionDoeReimb,
  getProductionDodByPayer,
  getProductionDodByBillingEntity,
  // AR page
  getArDosBuckets,
  getArDoeBuckets,
  getArTreemap,
  getArByInsurance,
  getArBySurgeon,
  getArSurgeons,
  // Insights page
  getInsightsInsurance,
  getInsightsSurgeon,
  getInsightsReader,
  getInsightsTechnician,
  getInsightsSurgeonList,
  getInsightsReaderList,
  getInsightsTechList,
  // Procedure page
  getNwProcedureDeposits,
  getNwProcedureCharges,
  getNwProcedureMore,
  getNwProcedureDodMore,
};

// ── Insights Page ─────────────────────────────────────────────────────────────

/**
 * Generic insights: entityCol × billing_date month, 6 metrics + % of month total.
 * % Total Payments = each entity's collected / total collected for that month × 100
 */
async function getInsightsData(entityCol, extraWhere, params) {
  return safeQuery(`nwInsights_${entityCol}`, async () => {
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
        FROM ${tbl('neurowatch_full_billing')}
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

async function getInsightsInsurance()          { return getInsightsData('insurance_type'); }
async function getInsightsSurgeon(surgeon)     { return getInsightsData('surgeon',    surgeon ? 'AND surgeon = $1'    : '', surgeon    ? [surgeon]    : []); }
async function getInsightsReader(reader)       { return getInsightsData('reader',     reader  ? 'AND reader = $1'     : '', reader     ? [reader]     : []); }
async function getInsightsTechnician(tech)     { return getInsightsData('technician', tech    ? 'AND technician = $1' : '', tech       ? [tech]       : []); }

async function getInsightsSurgeonList() {
  return safeQuery('nwInsightsSurgeonList', async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT COALESCE(NULLIF(TRIM(surgeon),''), 'Unknown') AS value
      FROM ${tbl('neurowatch_full_billing')}
      WHERE billing_date IS NOT NULL ${dateFilter12M_doe}
      ORDER BY 1
    `);
    return rows.map((r) => r.value);
  }, []);
}

async function getInsightsReaderList() {
  return safeQuery('nwInsightsReaderList', async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT COALESCE(NULLIF(TRIM(reader),''), 'Unknown') AS value
      FROM ${tbl('neurowatch_full_billing')}
      WHERE billing_date IS NOT NULL ${dateFilter12M_doe}
      ORDER BY 1
    `);
    return rows.map((r) => r.value);
  }, []);
}

async function getInsightsTechList() {
  return safeQuery('nwInsightsTechList', async () => {
    const { rows } = await pool.query(`
      SELECT DISTINCT COALESCE(NULLIF(TRIM(technician),''), 'Unknown') AS value
      FROM ${tbl('neurowatch_full_billing')}
      WHERE billing_date IS NOT NULL ${dateFilter12M_doe}
      ORDER BY 1
    `);
    return rows.map((r) => r.value);
  }, []);
}

// ── Procedure Page ────────────────────────────────────────────────────────────

/**
 * Deposits by Procedure Type — neurowatch_full_deposit, billing_type, date_collected (last 12M)
 * Returns: [{ month, billing_type, payments }]
 */
async function getNwProcedureDeposits() {
  return safeQuery('nwProcedureDeposits', async () => {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', date_collected), 'YYYY-MM-DD') AS month,
        COALESCE(NULLIF(TRIM(billing_type),''), 'Unknown') AS billing_type,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('neurowatch_full_deposit')}
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
 * Charges by Procedure Type — neurowatch_full_billing, procedure_type, dos|billing_date (last 12M)
 * mode = 'dos' | 'doe'
 * Returns: [{ month, procedure_type, charges }]
 */
async function getNwProcedureCharges(mode) {
  const col    = mode === 'doe' ? 'billing_date' : 'dos';
  const filter = mode === 'doe' ? dateFilter12M_doe : dateFilter12M_dos;
  return safeQuery(`nwProcedureCharges_${mode}`, async () => {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', ${col}), 'YYYY-MM-DD') AS month,
        COALESCE(NULLIF(TRIM(procedure_type),''), 'Unknown') AS procedure_type,
        COALESCE(SUM(charged), 0) AS charges
      FROM ${tbl('neurowatch_full_billing')}
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
 * DOS/DOE More — procedure_type × month with full charge metrics
 * Returns: [{ procedure_type, month, total_charge, total_payments, ..., gcr_pct, ncr_pct, gcr_fully_paid }]
 */
async function getNwProcedureMore(mode) {
  const col    = mode === 'doe' ? 'billing_date' : 'dos';
  const filter = mode === 'doe' ? dateFilter12M_doe : dateFilter12M_dos;
  return safeQuery(`nwProcedureMore_${mode}`, async () => {
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
      FROM ${tbl('neurowatch_full_billing')}
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
 * DOD More — billing_type × month with deposit metrics
 * Returns: [{ billing_type, month, claim_seq_count, charges, payments }]
 */
async function getNwProcedureDodMore() {
  return safeQuery('nwProcedureDodMore', async () => {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(NULLIF(TRIM(billing_type),''), 'Unknown') AS billing_type,
        TO_CHAR(DATE_TRUNC('month', date_collected), 'YYYY-MM-DD') AS month,
        COUNT(DISTINCT claim_seq)        AS claim_seq_count,
        COALESCE(SUM(charge),            0) AS charges,
        COALESCE(SUM(payment_collected), 0) AS payments
      FROM ${tbl('neurowatch_full_deposit')}
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
