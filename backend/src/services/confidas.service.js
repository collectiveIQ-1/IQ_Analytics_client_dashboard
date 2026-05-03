'use strict';

/**
 * confidas.service.js — All database queries for the iq_confidas schema.
 *
 * Tables used:
 *   deposit_report      — last-12-months payments (column: `payment` singular)
 *   full_deposit_report — all-time payments       (column: `payments` plural, `deposit_date`)
 *   doe                 — last-12-months billing   (totalcharge, carrierpayment, patientpayment,
 *                                                   carrierwo, patientwo, doe date)
 *   full_ar             — all-time AR              (same columns + begindos for AR age)
 *   dos                 — DOS records              (begindos, doe for AVG days calc)
 *   ccr_history         — CCR monthly (future)
 *   ccr                 — CCR/denial reasons (future)
 */

const pool   = require('../db/pool');
const logger = require('../utils/logger');

const SCHEMA = 'iq_confidas';
const tbl    = (name) => `"${SCHEMA}"."${name}"`;

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
      logger.warn(`[Confidas] ${label}: schema/table/column missing — ${err.message}`);
      return fallback;
    }
    logger.error(`[Confidas] ${label} failed: ${err.message}`);
    throw err;
  }
}

function normalizePercent(v) {
  const value = num(v);
  if (value === 0) return 0;
  return Math.abs(value) <= 1.5 ? value * 100 : value;
}

// ── KPIs ─────────────────────────────────────────────────────────────────────

async function getTotalPayments() {
  return safeQuery('getTotalPayments', async () => {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(payment), 0) AS total_payments
      FROM ${tbl('deposit_report')}
      WHERE date IS NOT NULL
    `);
    const v = num(rows[0]?.total_payments);
    logger.info(`[Confidas] getTotalPayments = ${v}`);
    return { total_payments: v };
  }, { total_payments: 0 });
}

async function getTotalChargesKpi() {
  return safeQuery('getTotalChargesKpi', async () => {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(totalcharge), 0) AS total_charges
      FROM ${tbl('doe')}
      WHERE doe IS NOT NULL
    `);
    const v = num(rows[0]?.total_charges);
    logger.info(`[Confidas] getTotalChargesKpi = ${v}`);
    return { total_charges: v };
  }, { total_charges: 0 });
}

async function getAvgDaysDosToDoc() {
  return safeQuery('getAvgDaysDosToDoc', async () => {
    const { rows } = await pool.query(`
      SELECT ROUND(AVG((doe::date - begindos::date))::numeric, 1) AS avg_days
      FROM ${tbl('dos')}
      WHERE doe IS NOT NULL
        AND begindos IS NOT NULL
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
    if (rows.length > 0) {
      return { ccr: normalizePercent(rows[0]?.adjusted) };
    }
    return { ccr: null };
  }, { ccr: null });
}

async function getAllKpis() {
  const [payments, charges, avgDays, ccr] = await Promise.all([
    getTotalPayments(),
    getTotalChargesKpi(),
    getAvgDaysDosToDoc(),
    getCleanClaimRate(),
  ]);
  return {
    total_payments: payments.total_payments,
    total_charges:  charges.total_charges,
    avg_days:       avgDays.avg_days,
    ccr:            ccr.ccr,
  };
}

// ── Payment History ───────────────────────────────────────────────────────────

async function getPaymentHistory() {
  return safeQuery('getPaymentHistory', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment), 0) AS payments
      FROM ${tbl('deposit_report')}
      WHERE date IS NOT NULL
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY DATE_TRUNC('month', date) ASC
    `);
    return rows.map((r) => ({ date: r.date, payments: num(r.payments) }));
  }, []);
}

async function getPaymentHistoryFull() {
  return safeQuery('getPaymentHistoryFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', date)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payment), 0) AS payments
      FROM ${tbl('deposit_report')}
      WHERE date IS NOT NULL
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY DATE_TRUNC('month', date) ASC
    `);
    return rows.map((r) => ({ date: r.date, payments: num(r.payments) }));
  }, []);
}

// ── Charges vs Payments ───────────────────────────────────────────────────────

async function getChargesVsPayments() {
  return safeQuery('getChargesVsPayments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', doe)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(totalcharge), 0)                              AS total_charges,
        COALESCE(SUM(COALESCE(carrierpayment, 0)
                   + COALESCE(patientpayment, 0)), 0)              AS total_payments
      FROM ${tbl('doe')}
      WHERE doe IS NOT NULL
      GROUP BY DATE_TRUNC('month', doe)
      ORDER BY DATE_TRUNC('month', doe) ASC
    `);
    return rows.map((r) => ({
      date:           r.date,
      total_charges:  num(r.total_charges),
      total_payments: num(r.total_payments),
    }));
  }, []);
}

async function getChargesVsPaymentsFull() {
  return safeQuery('getChargesVsPaymentsFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', doe)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(totalcharge), 0)                              AS total_charges,
        COALESCE(SUM(COALESCE(carrierpayment, 0)
                   + COALESCE(patientpayment, 0)), 0)              AS total_payments
      FROM ${tbl('full_ar')}
      WHERE doe IS NOT NULL
      GROUP BY DATE_TRUNC('month', doe)
      ORDER BY DATE_TRUNC('month', doe) ASC
    `);
    return rows.map((r) => ({
      date:           r.date,
      total_charges:  num(r.total_charges),
      total_payments: num(r.total_payments),
    }));
  }, []);
}

// ── CCR History ───────────────────────────────────────────────────────────────

async function getCcrHistory() {
  return safeQuery('getCcrHistory', async () => {
    const { rows } = await pool.query(`
      SELECT month, COALESCE(adjusted, 0) AS adjusted
      FROM ${tbl('ccr_history')}
      WHERE month IS NOT NULL
      ORDER BY month ASC
    `);
    return rows.map((r) => ({ month: r.month, adjusted: normalizePercent(r.adjusted) }));
  }, []);
}

// ── AR Pie — DOE age buckets ──────────────────────────────────────────────────

async function getArPie() {
  return safeQuery('getArPie', async () => {
    const { rows } = await pool.query(`
      WITH bucketed AS (
        SELECT
          totalbalance,
          CASE
            WHEN EXTRACT('day' FROM NOW() - doe::timestamp) < 30  THEN 'Current'
            WHEN EXTRACT('day' FROM NOW() - doe::timestamp) < 60  THEN '30-60'
            WHEN EXTRACT('day' FROM NOW() - doe::timestamp) < 90  THEN '60-90'
            WHEN EXTRACT('day' FROM NOW() - doe::timestamp) < 120 THEN '90-120'
            WHEN EXTRACT('day' FROM NOW() - doe::timestamp) < 150 THEN '120-150'
            ELSE '150+'
          END AS bucket
        FROM ${tbl('full_ar')}
        WHERE doe IS NOT NULL
          AND totalbalance IS NOT NULL
          AND totalbalance <> 0
      )
      SELECT
        bucket,
        COALESCE(SUM(totalbalance), 0) AS total_balance
      FROM bucketed
      GROUP BY bucket
      ORDER BY
        CASE bucket
          WHEN 'Current' THEN 1
          WHEN '30-60'   THEN 2
          WHEN '60-90'   THEN 3
          WHEN '90-120'  THEN 4
          WHEN '120-150' THEN 5
          ELSE 6
        END
    `);
    return rows
      .filter((r) => num(r.total_balance) !== 0)
      .map((r) => ({ bucket: r.bucket, total_balance: num(r.total_balance) }));
  }, []);
}

// ── AR Donut — begindos age (>60 days grouping) ───────────────────────────────

async function getArDonut() {
  return safeQuery('getArDonut', async () => {
    const { rows } = await pool.query(`
      WITH bucketed AS (
        SELECT
          totalbalance,
          CASE
            WHEN EXTRACT('day' FROM NOW() - begindos::timestamp) < 30  THEN 'Current'
            WHEN EXTRACT('day' FROM NOW() - begindos::timestamp) < 60  THEN '30-60'
            WHEN EXTRACT('day' FROM NOW() - begindos::timestamp) < 90  THEN '60-90'
            WHEN EXTRACT('day' FROM NOW() - begindos::timestamp) < 120 THEN '90-120'
            WHEN EXTRACT('day' FROM NOW() - begindos::timestamp) < 150 THEN '120-150'
            ELSE '150+'
          END AS raw_bucket
        FROM ${tbl('full_ar')}
        WHERE begindos IS NOT NULL
          AND totalbalance IS NOT NULL
          AND totalbalance <> 0
      )
      SELECT
        CASE
          WHEN raw_bucket IN ('Current', '30-60') THEN '30-60 & Current'
          ELSE 'Other'
        END AS bucket,
        COALESCE(SUM(totalbalance), 0) AS total_balance
      FROM bucketed
      GROUP BY 1
      ORDER BY 1
    `);
    return rows.map((r) => ({ bucket: r.bucket, total_balance: num(r.total_balance) }));
  }, []);
}

// ── Total Charges (DOE) step-line ─────────────────────────────────────────────

async function getTotalChargesChart() {
  return safeQuery('getTotalChargesChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', doe)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(totalcharge), 0) AS total_charges
      FROM ${tbl('doe')}
      WHERE doe IS NOT NULL
      GROUP BY DATE_TRUNC('month', doe)
      ORDER BY DATE_TRUNC('month', doe) ASC
    `);
    return rows.map((r) => ({ date: r.date, total_charges: num(r.total_charges) }));
  }, []);
}

async function getTotalChargesChartFull() {
  return safeQuery('getTotalChargesChartFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', doe)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(totalcharge), 0) AS total_charges
      FROM ${tbl('full_ar')}
      WHERE doe IS NOT NULL
      GROUP BY DATE_TRUNC('month', doe)
      ORDER BY DATE_TRUNC('month', doe) ASC
    `);
    return rows.map((r) => ({ date: r.date, total_charges: num(r.total_charges) }));
  }, []);
}

// ── Total Adjustments area chart ──────────────────────────────────────────────

async function getAdjustments() {
  return safeQuery('getAdjustments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', doe)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(COALESCE(carrierwo, 0) + COALESCE(patientwo, 0)), 0) AS adjustments
      FROM ${tbl('doe')}
      WHERE doe IS NOT NULL
      GROUP BY DATE_TRUNC('month', doe)
      ORDER BY DATE_TRUNC('month', doe) ASC
    `);
    return rows.map((r) => ({ date: r.date, adjustments: num(r.adjustments) }));
  }, []);
}

async function getAdjustmentsFull() {
  return safeQuery('getAdjustmentsFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', doe)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(COALESCE(carrierwo, 0) + COALESCE(patientwo, 0)), 0) AS adjustments
      FROM ${tbl('full_ar')}
      WHERE doe IS NOT NULL
      GROUP BY DATE_TRUNC('month', doe)
      ORDER BY DATE_TRUNC('month', doe) ASC
    `);
    return rows.map((r) => ({ date: r.date, adjustments: num(r.adjustments) }));
  }, []);
}

// ── Denial Reasons ────────────────────────────────────────────────────────────

async function getDenialReasons() {
  return safeQuery('getDenialReasons', async () => {
    const { rows } = await pool.query(`
      SELECT
        denialreason AS denial_reason,
        COALESCE(SUM(claimcount), 0) AS claimcount,
        COALESCE(SUM(value), 0)      AS value,
        COALESCE(SUM(
          CASE
            WHEN percentage IS NULL OR TRIM(percentage) = '' THEN 0
            ELSE REPLACE(TRIM(percentage), '%', '')::numeric
          END
        ), 0)                        AS percentage
      FROM ${tbl('ccr')}
      WHERE denialreason IS NOT NULL
        AND TRIM(denialreason) <> ''
      GROUP BY denialreason
      ORDER BY SUM(claimcount) DESC NULLS LAST
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

// ── Debug ─────────────────────────────────────────────────────────────────────

async function getSchemaColumns() {
  return safeQuery('getSchemaColumns', async () => {
    const { rows } = await pool.query(`
      SELECT table_name, column_name, data_type, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = '${SCHEMA}'
      ORDER BY table_name, ordinal_position
    `);
    return rows;
  }, []);
}

// ── Production helpers ────────────────────────────────────────────────────────

function reimbursementQuery(table, dateCol) {
  return `
    WITH monthly_base AS (
      SELECT
        DATE_TRUNC('month', ${dateCol})                                              AS month_trunc,
        chartnum,
        visitnum,
        COALESCE(totalcharge,    0) AS totalcharge,
        COALESCE(carrierpayment, 0) AS carrierpayment,
        COALESCE(patientpayment, 0) AS patientpayment,
        COALESCE(carrierwo,      0) AS carrierwo,
        COALESCE(patientwo,      0) AS patientwo,
        COALESCE(totalbalance,   0) AS totalbalance,
        COALESCE(carrierbalance, 0) AS carrierbalance,
        COALESCE(patientbalance, 0) AS patientbalance,
        CASE WHEN COALESCE(carrierpayment,0) + COALESCE(carrierwo,0) > 0 THEN 1 ELSE 0 END AS ncr_eligible,
        CASE
          WHEN COALESCE(totalcharge,0) <> COALESCE(carrierwo,0) + COALESCE(patientwo,0)
           AND COALESCE(totalbalance,0) = 0
          THEN 1 ELSE 0
        END AS fully_paid
      FROM ${tbl(table)}
      WHERE ${dateCol} IS NOT NULL
    )
    SELECT
      month_trunc,
      COUNT(DISTINCT chartnum)                                                AS patient_count,
      COUNT(DISTINCT visitnum)                                                AS visit_count,
      SUM(totalcharge)                                                        AS total_charge,
      SUM(carrierpayment + patientpayment)                                    AS total_payments,
      SUM(carrierpayment)                                                     AS insurance_payments,
      SUM(patientpayment)                                                     AS patient_payment,
      SUM(carrierwo + patientwo)                                              AS total_adjustments,
      SUM(carrierwo)                                                          AS insurance_adjustments,
      SUM(patientwo)                                                          AS patient_adjustments,
      SUM(totalbalance)                                                       AS total_balance,
      SUM(carrierbalance)                                                     AS insurance_balance,
      SUM(patientbalance)                                                     AS patient_balance,
      ROUND((SUM(totalcharge) / NULLIF(COUNT(DISTINCT visitnum),0))::numeric,0)  AS avg_chrg_per_visit,
      ROUND((SUM(carrierpayment+patientpayment) / NULLIF(COUNT(DISTINCT visitnum),0))::numeric,0) AS avg_pmt_per_visit,
      ROUND((SUM(carrierpayment+patientpayment) / NULLIF(SUM(totalcharge),0)*100)::numeric,1) AS gcr_pct,
      ROUND(((SUM(carrierpayment+patientpayment)+SUM(patientbalance)) / NULLIF(SUM(totalcharge),0)*100)::numeric,0) AS gcr_without_pt_balance,
      ROUND((SUM(CASE WHEN fully_paid=1 THEN carrierpayment+patientpayment ELSE 0 END)/NULLIF(SUM(totalcharge),0)*100)::numeric,0) AS gcr_fully_paid,
      ROUND((
        SUM(CASE WHEN ncr_eligible=1 THEN carrierpayment+patientpayment ELSE 0 END) /
        NULLIF(
          SUM(CASE WHEN ncr_eligible=1 THEN totalcharge ELSE 0 END) -
          SUM(CASE WHEN ncr_eligible=1 THEN carrierwo    ELSE 0 END), 0
        ) * 100
      )::numeric,0) AS ncr_pct
    FROM monthly_base
    GROUP BY month_trunc
    ORDER BY month_trunc ASC
  `;
}

function mapReimbRow(r) {
  return {
    month:                  r.month_trunc,
    patient_count:          num(r.patient_count),
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
  };
}

// ── Production: DOS Chart ─────────────────────────────────────────────────────

async function getProductionDosChart() {
  return safeQuery('getProductionDosChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', begindos)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(totalcharge), 0)                                                        AS total_charges,
        COALESCE(SUM(COALESCE(carrierpayment,0) + COALESCE(patientpayment,0)), 0)            AS total_payments,
        ROUND(
          CASE WHEN SUM(totalcharge) > 0
          THEN SUM(COALESCE(carrierpayment,0)+COALESCE(patientpayment,0)) /
               NULLIF(SUM(totalcharge),0) * 100
          ELSE 0 END::numeric, 1)                                                            AS gcr_pct
      FROM ${tbl('dos')}
      WHERE begindos IS NOT NULL
      GROUP BY DATE_TRUNC('month', begindos)
      ORDER BY DATE_TRUNC('month', begindos) ASC
    `);
    return rows.map((r) => ({
      date:           r.date,
      total_charges:  num(r.total_charges),
      total_payments: num(r.total_payments),
      gcr_pct:        num(r.gcr_pct),
    }));
  }, []);
}

async function getProductionDosReimbursement() {
  return safeQuery('getProductionDosReimbursement', async () => {
    const { rows } = await pool.query(reimbursementQuery('dos', 'begindos'));
    return rows.map(mapReimbRow);
  }, []);
}

// ── Production: DOE Chart ─────────────────────────────────────────────────────

async function getProductionDoeChart() {
  return safeQuery('getProductionDoeChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', doe)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(totalcharge), 0) AS total_charges
      FROM ${tbl('doe')}
      WHERE doe IS NOT NULL
      GROUP BY DATE_TRUNC('month', doe)
      ORDER BY DATE_TRUNC('month', doe) ASC
    `);
    return rows.map((r) => ({ date: r.date, total_charges: num(r.total_charges) }));
  }, []);
}

async function getProductionDoeReimbursement() {
  return safeQuery('getProductionDoeReimbursement', async () => {
    const { rows } = await pool.query(reimbursementQuery('doe', 'doe'));
    return rows.map(mapReimbRow);
  }, []);
}

// ── Production: DOD Payment Method ───────────────────────────────────────────

async function getProductionDodPaymentMethod() {
  return safeQuery('getProductionDodPaymentMethod', async () => {
    const { rows } = await pool.query(`
      SELECT
        TRIM(COALESCE(NULLIF(payment_resource,''), 'Other')) AS payment_method,
        COALESCE(SUM(payment), 0)                            AS payments
      FROM ${tbl('deposit_report')}
      WHERE date IS NOT NULL
      GROUP BY 1
      ORDER BY payments DESC
    `);
    return rows.map((r) => ({ payment_method: r.payment_method, payments: num(r.payments) }));
  }, []);
}

// ── Production: DOD Reimbursement ─────────────────────────────────────────────

async function getProductionDodReimbursement() {
  return safeQuery('getProductionDodReimbursement', async () => {
    const { rows } = await pool.query(`
      WITH doe_months AS (
        SELECT
          DATE_TRUNC('month', doe)           AS month_trunc,
          COUNT(DISTINCT visitnum)            AS visit_count,
          COUNT(DISTINCT procedure)           AS procedure_count,
          COALESCE(SUM(totalcharge), 0)       AS total_charge,
          COALESCE(SUM(COALESCE(carrierwo,0) + COALESCE(patientwo,0)), 0) AS total_adjustments
        FROM ${tbl('doe')}
        WHERE doe IS NOT NULL
        GROUP BY 1
      ),
      dep_months AS (
        SELECT
          DATE_TRUNC('month', date)           AS month_trunc,
          COALESCE(SUM(payment), 0)           AS total_payments
        FROM ${tbl('deposit_report')}
        WHERE date IS NOT NULL
        GROUP BY 1
      )
      SELECT
        dm.month_trunc,
        dm.visit_count,
        dm.procedure_count,
        dm.total_charge,
        COALESCE(dep.total_payments, 0)  AS total_payments,
        dm.total_adjustments
      FROM doe_months dm
      LEFT JOIN dep_months dep ON dm.month_trunc = dep.month_trunc
      ORDER BY dm.month_trunc ASC
    `);
    return rows.map((r) => ({
      month:             r.month_trunc,
      visit_count:       num(r.visit_count),
      procedure_count:   num(r.procedure_count),
      total_charge:      num(r.total_charge),
      total_payments:    num(r.total_payments),
      total_adjustments: num(r.total_adjustments),
    }));
  }, []);
}

// ── Bank Deposits ─────────────────────────────────────────────────────────────

async function getBankDeposits() {
  return safeQuery('getBankDeposits', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', monthend)::date
          + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(bank_deposit_amount), 0) AS payments
      FROM ${tbl('bank')}
      WHERE monthend IS NOT NULL
      GROUP BY DATE_TRUNC('month', monthend)
      ORDER BY DATE_TRUNC('month', monthend) ASC
    `);
    return rows.map((r) => ({ date: r.date, payments: num(r.payments) }));
  }, []);
}

// ── Deposits by Referring Provider ────────────────────────────────────────────

async function getDepositsByProvider(month = null) {
  return safeQuery('getDepositsByProvider', async () => {
    const monthFilter = month
      ? `AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $1::date)`
      : '';
    const params = month ? [month] : [];

    const { rows } = await pool.query(`
      SELECT
        CASE
          WHEN provider LIKE '%-%'
            THEN TRIM(SUBSTRING(provider FROM POSITION('-' IN provider) + 1))
          ELSE TRIM(provider)
        END AS provider_name,
        COALESCE(SUM(payment), 0) AS payments
      FROM ${tbl('deposit_report')}
      WHERE provider IS NOT NULL
        AND TRIM(provider) <> ''
        ${monthFilter}
      GROUP BY provider_name
      ORDER BY payments DESC
    `, params);

    return rows.map((r) => ({
      provider_name: r.provider_name,
      payments:      num(r.payments),
    }));
  }, []);
}

// ── Facility Analysis ─────────────────────────────────────────────────────────
// DOS → iq_confidas.dos  (date col: begindos)
// DOE → iq_confidas.doe  (date col: doe)
// DOD → iq_confidas.doe  (date col: doe)  — same table as DOE per spec

async function facilityDateRange(table, dateCol) {
  const { rows } = await pool.query(`
    SELECT
      DATE_TRUNC('month', MAX(${dateCol}))::date                              AS base_month,
      (DATE_TRUNC('month', MAX(${dateCol})) - INTERVAL '11 months')::date     AS l12_start,
      (DATE_TRUNC('month', MAX(${dateCol})) + INTERVAL  '1 month')::date      AS l12_end,
      (DATE_TRUNC('month', MAX(${dateCol})) - INTERVAL  '1 month')::date      AS lm_start,
       DATE_TRUNC('month', MAX(${dateCol}))::date                              AS lm_end
    FROM ${tbl(table)} WHERE ${dateCol} IS NOT NULL
  `);
  return rows[0] || {};
}

async function facilityAvailableMonths(table, dateCol, dr) {
  if (!dr.l12_start || !dr.l12_end) return [];
  const { rows } = await pool.query(`
    SELECT DISTINCT TO_CHAR(DATE_TRUNC('month', ${dateCol}), 'YYYY-MM') AS month
    FROM ${tbl(table)}
    WHERE ${dateCol} IS NOT NULL
      AND ${dateCol} >= $1::date
      AND ${dateCol} <  $2::date
    ORDER BY month DESC
  `, [dr.l12_start, dr.l12_end]);
  return rows.map((r) => r.month);
}

function facilityMonthRange(yyyyMM) {
  const [y, m] = yyyyMM.split('-').map(Number);
  const ey = m === 12 ? y + 1 : y;
  const em = m === 12 ? 1 : m + 1;
  return { start: `${yyyyMM}-01`, end: `${ey}-${String(em).padStart(2, '0')}-01` };
}

/**
 * Core per-facility aggregation for DOS/DOE/DOD.
 * Payments  = carrierpayment + patientpayment (from billing rows)
 * Adj       = carrierwo + patientwo
 * GCR%      = payments / total_charge
 * NCR%      = eligible payments / (eligible charge - eligible carrier WO)
 */
async function confFacilityAgg(table, dateCol, dateStart, dateEnd) {
  if (!dateStart || !dateEnd) return [];
  const { rows } = await pool.query(`
    WITH raw AS (
      SELECT
        COALESCE(NULLIF(TRIM(facility), ''), 'Unknown') AS facility,
        COALESCE(totalcharge,    0)::numeric              AS tc,
        COALESCE(carrierpayment, 0)::numeric              AS cp,
        COALESCE(patientpayment, 0)::numeric              AS pp,
        COALESCE(carrierwo,      0)::numeric              AS cw,
        COALESCE(patientwo,      0)::numeric              AS pw,
        procedure
      FROM ${tbl(table)}
      WHERE ${dateCol} >= $1::date
        AND ${dateCol} <  $2::date
    ),
    agg AS (
      SELECT
        facility,
        COUNT(DISTINCT procedure)::integer              AS procedure_count,
        SUM(tc)                                         AS total_charge,
        SUM(cp + pp)                                    AS total_payments,
        SUM(cw + pw)                                    AS total_adjustments,
        CASE WHEN SUM(tc) > 0
             THEN ROUND(SUM(cp + pp) / SUM(tc) * 100, 1)
             ELSE 0 END                                 AS gcr_pct,
        CASE WHEN NULLIF(
                    SUM(CASE WHEN (cp + cw) > 0 THEN tc ELSE 0 END) -
                    SUM(CASE WHEN (cp + cw) > 0 THEN cw ELSE 0 END), 0) IS NOT NULL
             THEN ROUND(
               SUM(CASE WHEN (cp + cw) > 0 THEN cp + pp ELSE 0 END) /
               NULLIF(
                 SUM(CASE WHEN (cp + cw) > 0 THEN tc ELSE 0 END) -
                 SUM(CASE WHEN (cp + cw) > 0 THEN cw ELSE 0 END), 0) * 100, 1)
             ELSE 0 END                                 AS ncr_pct
      FROM raw
      GROUP BY facility
    ),
    totals AS (
      SELECT NULLIF(SUM(procedure_count), 0)::numeric AS tot FROM agg
    )
    SELECT
      a.facility,
      a.procedure_count,
      ROUND(a.procedure_count::numeric / NULLIF(t.tot, 0) * 100, 0)::integer  AS procedure_pct,
      a.total_charge,
      a.total_payments,
      ROUND(a.total_payments / NULLIF(a.total_charge, 0) * 100, 0)::integer   AS payment_pct,
      a.total_adjustments,
      a.gcr_pct,
      a.ncr_pct
    FROM agg a CROSS JOIN totals t
    ORDER BY a.total_charge DESC NULLS LAST
  `, [dateStart, dateEnd]);
  logger.info(`[Confidas Facility] ${table} [${dateStart} to ${dateEnd}]: ${rows.length} facilities`);
  return rows;
}

// ── Facility: DOS ─────────────────────────────────────────────────────────────
async function getConfidasFacilityDosLast12(month) {
  return safeQuery('facility-dos-last12', async () => {
    const dr     = await facilityDateRange('dos', 'begindos');
    const months = await facilityAvailableMonths('dos', 'begindos', dr);
    const sel    = month && month !== 'all' ? month : (months[0] || null);
    const range  = sel ? facilityMonthRange(sel) : { start: dr.l12_start, end: dr.l12_end };
    const rows   = await confFacilityAgg('dos', 'begindos', range.start, range.end);
    return { rows, months, selectedMonth: sel || 'all' };
  }, { rows: [], months: [], selectedMonth: null });
}

async function getConfidasFacilityDosLastMonth() {
  return safeQuery('facility-dos-lastmonth', async () => {
    const dr   = await facilityDateRange('dos', 'begindos');
    const rows = await confFacilityAgg('dos', 'begindos', dr.lm_start, dr.lm_end);
    return { rows };
  }, { rows: [] });
}

// ── Facility: DOE ─────────────────────────────────────────────────────────────
async function getConfidasFacilityDoeLast12(month) {
  return safeQuery('facility-doe-last12', async () => {
    const dr     = await facilityDateRange('doe', 'doe');
    const months = await facilityAvailableMonths('doe', 'doe', dr);
    const sel    = month && month !== 'all' ? month : null;
    const range  = sel ? facilityMonthRange(sel) : { start: dr.l12_start, end: dr.l12_end };
    const rows   = await confFacilityAgg('doe', 'doe', range.start, range.end);
    return { rows, months, selectedMonth: sel || 'all' };
  }, { rows: [], months: [], selectedMonth: 'all' });
}

async function getConfidasFacilityDoeLastMonth() {
  return safeQuery('facility-doe-lastmonth', async () => {
    const dr   = await facilityDateRange('doe', 'doe');
    const rows = await confFacilityAgg('doe', 'doe', dr.lm_start, dr.lm_end);
    return { rows };
  }, { rows: [] });
}

// ── Facility: DOD (uses doe table per spec) ───────────────────────────────────
async function getConfidasFacilityDodLast12(month) {
  return safeQuery('facility-dod-last12', async () => {
    const dr     = await facilityDateRange('doe', 'doe');
    const months = await facilityAvailableMonths('doe', 'doe', dr);
    const sel    = month && month !== 'all' ? month : null;
    const range  = sel ? facilityMonthRange(sel) : { start: dr.l12_start, end: dr.l12_end };
    const rows   = await confFacilityAgg('doe', 'doe', range.start, range.end);
    return { rows, months, selectedMonth: sel || 'all' };
  }, { rows: [], months: [], selectedMonth: 'all' });
}

async function getConfidasFacilityDodLastMonth() {
  return safeQuery('facility-dod-lastmonth', async () => {
    const dr   = await facilityDateRange('doe', 'doe');
    const rows = await confFacilityAgg('doe', 'doe', dr.lm_start, dr.lm_end);
    return { rows };
  }, { rows: [] });
}

// ── Accounts Receivable Full Page ─────────────────────────────────────────────
// DOS mode: age bucket from begindos   DOE mode: age bucket from doe
// Both use iq_confidas.full_ar (tbl('full_ar'))

function arBucketSql(dateCol) {
  return `CASE
    WHEN (CURRENT_DATE - ${dateCol}::date) < 30  THEN 'Current'
    WHEN (CURRENT_DATE - ${dateCol}::date) <= 60  THEN '30-60'
    WHEN (CURRENT_DATE - ${dateCol}::date) <= 90  THEN '60-90'
    WHEN (CURRENT_DATE - ${dateCol}::date) <= 120 THEN '90-120'
    WHEN (CURRENT_DATE - ${dateCol}::date) <= 150 THEN '120-150'
    ELSE '150+'
  END`;
}

function arBucketOrderSql() {
  return `CASE bucket WHEN 'Current' THEN 0 WHEN '30-60' THEN 1 WHEN '60-90' THEN 2 WHEN '90-120' THEN 3 WHEN '120-150' THEN 4 ELSE 5 END`;
}

function arCarrierNameSql() {
  return `CASE WHEN carrier LIKE '%-%' THEN TRIM(SPLIT_PART(carrier, '-', 1)) ELSE TRIM(COALESCE(carrier, 'Unknown')) END`;
}

function arFinancialNameSql() {
  return `CASE WHEN financialclass LIKE '%-%'
    THEN TRIM(SUBSTRING(financialclass FROM POSITION('-' IN financialclass) + 1))
    ELSE TRIM(COALESCE(financialclass, 'Unknown')) END`;
}

function buildArFilter(filterBucket, filterCarrier, filterFinancial) {
  const params  = [];
  const clauses = [];
  if (filterBucket)    { params.push(filterBucket);    clauses.push(`bucket        = $${params.length}`); }
  if (filterCarrier)   { params.push(filterCarrier);   clauses.push(`carrier_name   = $${params.length}`); }
  if (filterFinancial) { params.push(filterFinancial); clauses.push(`financial_name = $${params.length}`); }
  return { params, where: clauses.length ? clauses.join(' AND ') : '1=1' };
}

function arBaseCte(dateCol) {
  return `
    WITH base AS (
      SELECT
        ${arBucketSql(dateCol)}  AS bucket,
        ${arCarrierNameSql()}    AS carrier_name,
        ${arFinancialNameSql()}  AS financial_name,
        COALESCE(carrierbalance, 0)::numeric AS cb,
        COALESCE(patientbalance, 0)::numeric AS pb,
        COALESCE(totalbalance,   0)::numeric AS tb,
        COALESCE(totalcharge,    0)::numeric AS tc
      FROM ${tbl('full_ar')}
      WHERE ${dateCol} IS NOT NULL
        AND totalbalance IS NOT NULL
        AND totalbalance <> 0
    )
  `;
}

async function getConfidasArBar(mode, filterBucket, filterCarrier, filterFinancial) {
  return safeQuery('conf-ar-bar', async () => {
    const dc = mode === 'doe' ? 'doe' : 'begindos';
    const { params, where } = buildArFilter(filterBucket, filterCarrier, filterFinancial);
    const { rows } = await pool.query(`
      ${arBaseCte(dc)}
      SELECT bucket, SUM(cb) AS carrier_balance, SUM(pb) AS patient_balance
      FROM base WHERE ${where}
      GROUP BY bucket
      ORDER BY ${arBucketOrderSql()}
    `, params);
    return rows.map((r) => ({
      bucket:          r.bucket,
      carrier_balance: num(r.carrier_balance),
      patient_balance: num(r.patient_balance),
    }));
  }, []);
}

async function getConfidasArPieChart(mode, filterBucket, filterCarrier, filterFinancial) {
  return safeQuery('conf-ar-pie-chart', async () => {
    const dc = mode === 'doe' ? 'doe' : 'begindos';
    const { params, where } = buildArFilter(filterBucket, filterCarrier, filterFinancial);
    const { rows } = await pool.query(`
      ${arBaseCte(dc)}
      SELECT bucket, SUM(tb) AS total_balance
      FROM base WHERE ${where}
      GROUP BY bucket
      ORDER BY ${arBucketOrderSql()}
    `, params);
    const grand = rows.reduce((s, r) => s + num(r.total_balance), 0);
    return rows.map((r) => {
      const tb = num(r.total_balance);
      return {
        bucket:        r.bucket,
        total_balance: tb,
        pct:           grand > 0 ? Math.round((tb / grand) * 10000) / 100 : 0,
      };
    });
  }, []);
}

async function getConfidasArCarrier(mode, filterBucket, filterCarrier, filterFinancial) {
  return safeQuery('conf-ar-carrier', async () => {
    const dc = mode === 'doe' ? 'doe' : 'begindos';
    const { params, where } = buildArFilter(filterBucket, filterCarrier, filterFinancial);
    const { rows } = await pool.query(`
      ${arBaseCte(dc)}
      SELECT carrier_name, SUM(tb) AS total_balance, SUM(tc) AS total_charge
      FROM base WHERE ${where}
      GROUP BY carrier_name
      ORDER BY total_balance DESC NULLS LAST
    `, params);
    return rows.map((r) => {
      const tb = num(r.total_balance);
      const tc = num(r.total_charge);
      return {
        carrier_name:  r.carrier_name,
        total_balance: tb,
        total_charge:  tc,
        ar_pct:        tc > 0 ? Math.round(tb / tc * 1000) / 10 : 0,
      };
    });
  }, []);
}

async function getConfidasArFinancial(mode, filterBucket, filterCarrier, filterFinancial) {
  return safeQuery('conf-ar-financial', async () => {
    const dc = mode === 'doe' ? 'doe' : 'begindos';
    const { params, where } = buildArFilter(filterBucket, filterCarrier, filterFinancial);
    const { rows } = await pool.query(`
      ${arBaseCte(dc)}
      SELECT financial_name, SUM(tb) AS total_balance, SUM(tc) AS total_charge
      FROM base WHERE ${where}
      GROUP BY financial_name
      ORDER BY total_balance DESC NULLS LAST
    `, params);
    return rows.map((r) => {
      const tb = num(r.total_balance);
      const tc = num(r.total_charge);
      return {
        financial_name: r.financial_name,
        total_balance:  tb,
        total_charge:   tc,
        ar_pct:         tc > 0 ? Math.round(tb / tc * 1000) / 10 : 0,
      };
    });
  }, []);
}

// ── Insight Analysis ──────────────────────────────────────────────────────────
// Column discovery for iq_confidas tables (insight grouping)

const confColCache = {};

const CONF_ALIASES = {
  totalcharge:       ['totalcharge','totalcharges','charges','charge','totchrg','chrg','chrgamt'],
  carrierpayment:    ['carrierpayment','carrierpmt','inspayment','insurancepayment','inspmts','inspmt'],
  patientpayment:    ['patientpayment','patientpmt','ptpayment','ptpmt'],
  carrierwo:         ['carrierwo','carrierwriteoff','carrierwroff','insadjustment','insadj','insurancewo','inswo'],
  patientwo:         ['patientwo','patientwriteoff','patientwroff','ptadjustment','patientadj','ptwo'],
  begindos:          ['begindos','dos','dateofservice','servicedate','begdos','startdos'],
  doe:               ['doe','dateofentry','entrydate','postdate'],
  provider:          ['provider','providername','providerlabel','physician','physicianname','billingprovider','renderingprovider'],
  carrier:           ['carrier','carriername','payer','payername','insurance','insurancename'],
  procedure:         ['procedure','procedurecode','proccode','cpt','cptcode','hcpcs'],
  referringprovider: ['referringprovider','referringprovidername','referringphysician','refprovider'],
};

function confNorm(s) { return String(s || '').toLowerCase().replace(/[_\s-]/g, ''); }

async function confDiscoverCols(table) {
  if (confColCache[table]) return confColCache[table];
  try {
    const result = await pool.query(`SELECT * FROM ${tbl(table)} LIMIT 0`);
    const actual = result.fields.map((f) => f.name);
    const map = {};
    for (const [canonical, aliases] of Object.entries(CONF_ALIASES)) {
      const hit = actual.find((a) => aliases.includes(confNorm(a)));
      if (hit) map[canonical] = hit;
    }
    confColCache[table] = map;
    logger.info(`[Confidas Insight] discoverCols(${table}): ${JSON.stringify(map)}`);
    return map;
  } catch (err) {
    logger.error(`[Confidas Insight] discoverCols(${table}) failed: ${err.message}`);
    throw err;
  }
}

async function confGetTableDateRange(table, dateCol) {
  const { rows } = await pool.query(`
    SELECT
      DATE_TRUNC('month', MAX(${dateCol}))::date                              AS base_month,
      (DATE_TRUNC('month', MAX(${dateCol})) - INTERVAL '11 months')::date     AS l12_start,
      (DATE_TRUNC('month', MAX(${dateCol})) + INTERVAL  '1 month')::date      AS l12_end,
      (DATE_TRUNC('month', MAX(${dateCol})) - INTERVAL  '1 month')::date      AS lm_start,
       DATE_TRUNC('month', MAX(${dateCol}))::date                              AS lm_end
    FROM ${tbl(table)} WHERE ${dateCol} IS NOT NULL
  `);
  return rows[0] || {};
}

async function confInsightAgg(table, dateColCanon, groupByCanon, dateStart, dateEnd, filterVal) {
  if (!dateStart || !dateEnd) return [];
  const cols    = await confDiscoverCols(table);
  const dateCol = cols[dateColCanon] || cols.begindos || cols.doe;
  if (!dateCol) { logger.warn(`[Confidas Insight] ${table}: no date column`); return []; }
  const grpCol  = cols[groupByCanon];
  const c       = (key) => cols[key] ? `COALESCE(${cols[key]}, 0)::numeric` : '0';
  const grpExpr = grpCol
    ? `COALESCE(NULLIF(TRIM(${grpCol}::text), ''), 'Unknown')`
    : `'All'`;
  const params = [dateStart, dateEnd];
  let filterClause = '';
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
      FROM ${tbl(table)}
      WHERE ${dateCol} >= $1::date AND ${dateCol} < $2::date ${filterClause}
    ),
    agg AS (
      SELECT grp_name,
        COUNT(*)::integer                                                    AS procedure_count,
        SUM(tc)                                                              AS total_charge,
        SUM(cp + pp)                                                         AS total_payments,
        SUM(cw + pw)                                                         AS total_adjustments,
        CASE WHEN SUM(tc) > 0
             THEN ROUND(SUM(cp+pp)::numeric / SUM(tc)::numeric * 100, 1)
             ELSE 0 END                                                      AS gcr_pct,
        CASE WHEN NULLIF(
               SUM(CASE WHEN (cp+cw)>0 THEN tc ELSE 0 END) -
               SUM(CASE WHEN (cp+cw)>0 THEN cw ELSE 0 END), 0) IS NOT NULL
             THEN ROUND(
               SUM(CASE WHEN (cp+cw)>0 THEN cp+pp ELSE 0 END)::numeric /
               NULLIF(SUM(CASE WHEN (cp+cw)>0 THEN tc ELSE 0 END) -
                      SUM(CASE WHEN (cp+cw)>0 THEN cw ELSE 0 END), 0)::numeric * 100, 1)
             ELSE 0 END                                                      AS ncr_pct
      FROM raw GROUP BY grp_name
    ),
    totals AS (SELECT SUM(procedure_count)::numeric AS tot FROM agg)
    SELECT
      a.grp_name,
      a.procedure_count,
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
  logger.info(`[Confidas Insight] ${table}/${groupByCanon} [${dateStart}→${dateEnd}] filter=${filterVal||'all'}: ${rows.length} rows`);
  return rows;
}

async function confGetFilterValues(table, dateColCanon, groupByCanon) {
  return safeQuery(`conf-filters:${table}/${groupByCanon}`, async () => {
    const cols    = await confDiscoverCols(table);
    const dateCol = cols[dateColCanon] || cols.begindos || cols.doe;
    const grpCol  = cols[groupByCanon];
    if (!dateCol || !grpCol) return [];
    const dr = await confGetTableDateRange(table, dateCol);
    if (!dr.l12_start || !dr.l12_end) return [];
    const { rows } = await pool.query(`
      SELECT DISTINCT TRIM(${grpCol}::text) AS val
      FROM ${tbl(table)}
      WHERE ${dateCol} IS NOT NULL
        AND ${dateCol} >= $1::date AND ${dateCol} < $2::date
        AND ${grpCol} IS NOT NULL AND TRIM(${grpCol}::text) <> ''
      ORDER BY val
    `, [dr.l12_start, dr.l12_end]);
    return rows.map((r) => r.val);
  }, []);
}

// ── Insight: DOS ──────────────────────────────────────────────────────────────
async function getConfidasInsightDosLast12(groupBy, filter) {
  return safeQuery('conf-insight-dos-last12', async () => {
    const cols    = await confDiscoverCols('dos');
    const dateCol = cols.begindos || cols.doe;
    if (!dateCol) return { rows: [] };
    const dr   = await confGetTableDateRange('dos', dateCol);
    const rows = await confInsightAgg('dos', 'begindos', groupBy, dr.l12_start, dr.l12_end, filter);
    return { rows };
  }, { rows: [] });
}

async function getConfidasInsightDosLastMonth(groupBy, filter) {
  return safeQuery('conf-insight-dos-lastmonth', async () => {
    const cols    = await confDiscoverCols('dos');
    const dateCol = cols.begindos || cols.doe;
    if (!dateCol) return { rows: [] };
    const dr   = await confGetTableDateRange('dos', dateCol);
    const rows = await confInsightAgg('dos', 'begindos', groupBy, dr.lm_start, dr.lm_end, filter);
    return { rows };
  }, { rows: [] });
}

async function getConfidasInsightDosFilters(groupBy) {
  return safeQuery(`conf-insight-dos-filters/${groupBy}`, async () => {
    const vals = await confGetFilterValues('dos', 'begindos', groupBy);
    return { values: vals };
  }, { values: [] });
}

// ── Insight: DOE ──────────────────────────────────────────────────────────────
async function getConfidasInsightDoeLast12(groupBy, filter) {
  return safeQuery('conf-insight-doe-last12', async () => {
    const cols    = await confDiscoverCols('doe');
    const dateCol = cols.doe || cols.begindos;
    if (!dateCol) return { rows: [] };
    const dr   = await confGetTableDateRange('doe', dateCol);
    const rows = await confInsightAgg('doe', 'doe', groupBy, dr.l12_start, dr.l12_end, filter);
    return { rows };
  }, { rows: [] });
}

async function getConfidasInsightDoeLastMonth(groupBy, filter) {
  return safeQuery('conf-insight-doe-lastmonth', async () => {
    const cols    = await confDiscoverCols('doe');
    const dateCol = cols.doe || cols.begindos;
    if (!dateCol) return { rows: [] };
    const dr   = await confGetTableDateRange('doe', dateCol);
    const rows = await confInsightAgg('doe', 'doe', groupBy, dr.lm_start, dr.lm_end, filter);
    return { rows };
  }, { rows: [] });
}

async function getConfidasInsightDoeFilters(groupBy) {
  return safeQuery(`conf-insight-doe-filters/${groupBy}`, async () => {
    const vals = await confGetFilterValues('doe', 'doe', groupBy);
    return { values: vals };
  }, { values: [] });
}

// ── Insight: DOD ──────────────────────────────────────────────────────────────
// Aggregate doe (charges + adjustments from carrierwo+patientwo) and
// deposit_report (payments from `payment` col, `date` col) SEPARATELY,
// then allocate payments proportionally by each group's charge share.

async function confInsightDodAgg(groupByCanon, dateStart, dateEnd, filterVal) {
  if (!dateStart || !dateEnd) return [];
  const cols    = await confDiscoverCols('doe');
  const docCol  = cols.doe || cols.begindos;
  if (!docCol) { logger.warn('[Confidas Insight DOD] no doe date col'); return []; }
  const tcCol   = cols.totalcharge;
  const cwCol   = cols.carrierwo;
  const pwCol   = cols.patientwo;
  const grpCol  = cols[groupByCanon];
  const grpExpr = grpCol
    ? `COALESCE(NULLIF(TRIM(${grpCol}::text), ''), 'Unknown')`
    : `'All'`;
  const tcExpr = tcCol ? `COALESCE(${tcCol}, 0)::numeric` : '0';
  const cwExpr = cwCol ? `COALESCE(${cwCol}, 0)::numeric` : '0';
  const pwExpr = pwCol ? `COALESCE(${pwCol}, 0)::numeric` : '0';

  const params = [dateStart, dateEnd];
  let filterClause = '';
  if (grpCol && filterVal && filterVal !== 'all') {
    params.push(filterVal);
    filterClause = `AND TRIM(${grpCol}::text) = $${params.length}`;
  }

  const { rows } = await pool.query(`
    WITH doe_agg AS (
      SELECT
        ${grpExpr}                 AS grp_name,
        COUNT(*)                   AS procedure_count,
        SUM(${tcExpr})             AS total_charge,
        SUM(${cwExpr} + ${pwExpr}) AS total_adjustments
      FROM ${tbl('doe')}
      WHERE ${docCol} >= $1::date AND ${docCol} < $2::date ${filterClause}
      GROUP BY 1
    ),
    tc_sum AS (
      SELECT NULLIF(SUM(total_charge), 0)::numeric AS tot FROM doe_agg
    ),
    dep AS (
      SELECT COALESCE(SUM(payment), 0)::numeric AS total_payments
      FROM ${tbl('deposit_report')}
      WHERE date IS NOT NULL AND date >= $1::date AND date < $2::date
    ),
    combined AS (
      SELECT
        d.grp_name,
        d.procedure_count,
        d.total_charge,
        ROUND(COALESCE(d.total_charge / NULLIF(tc.tot, 0), 0) * dep.total_payments, 0) AS total_payments,
        d.total_adjustments
      FROM doe_agg d CROSS JOIN tc_sum tc CROSS JOIN dep
    ),
    totals AS (SELECT SUM(procedure_count)::numeric AS tot_proc FROM combined)
    SELECT
      c.grp_name,
      c.procedure_count::integer,
      ROUND(c.procedure_count::numeric / NULLIF(t.tot_proc, 0) * 100, 0)::integer AS procedure_pct,
      c.total_charge,
      c.total_payments,
      ROUND(c.total_payments / NULLIF(c.total_charge, 0) * 100, 0)::integer AS payment_pct,
      c.total_adjustments,
      ROUND(c.total_payments / NULLIF(c.total_charge, 0) * 100, 1) AS gcr_pct,
      0 AS ncr_pct
    FROM combined c CROSS JOIN totals t
    ORDER BY c.total_charge DESC NULLS LAST
  `, params);
  logger.info(`[Confidas Insight DOD] ${groupByCanon} [${dateStart}→${dateEnd}]: ${rows.length} rows`);
  return rows;
}

async function confGetDodDateRange() {
  const { rows } = await pool.query(`
    SELECT
      (DATE_TRUNC('month', MAX(doe)) - INTERVAL '11 months')::date AS l12_start,
      (DATE_TRUNC('month', MAX(doe)) + INTERVAL  '1 month')::date  AS l12_end,
      (DATE_TRUNC('month', MAX(doe)) - INTERVAL  '1 month')::date  AS lm_start,
       DATE_TRUNC('month', MAX(doe))::date                          AS lm_end
    FROM ${tbl('doe')} WHERE doe IS NOT NULL
  `);
  return rows[0] || {};
}

async function getConfidasInsightDodLast12(groupBy, filter) {
  return safeQuery('conf-insight-dod-last12', async () => {
    const dr   = await confGetDodDateRange();
    const rows = await confInsightDodAgg(groupBy, dr.l12_start, dr.l12_end, filter);
    return { rows };
  }, { rows: [] });
}

async function getConfidasInsightDodLastMonth(groupBy, filter) {
  return safeQuery('conf-insight-dod-lastmonth', async () => {
    const dr   = await confGetDodDateRange();
    const rows = await confInsightDodAgg(groupBy, dr.lm_start, dr.lm_end, filter);
    return { rows };
  }, { rows: [] });
}

async function getConfidasInsightDodFilters(groupBy) {
  return safeQuery(`conf-insight-dod-filters/${groupBy}`, async () => {
    const cols   = await confDiscoverCols('doe');
    const docCol = cols.doe || cols.begindos;
    const grpCol = cols[groupBy];
    if (!docCol || !grpCol) return { values: [] };
    const dr = await confGetDodDateRange();
    if (!dr.l12_start || !dr.l12_end) return { values: [] };
    const { rows } = await pool.query(`
      SELECT DISTINCT TRIM(${grpCol}::text) AS val
      FROM ${tbl('doe')}
      WHERE ${docCol} IS NOT NULL
        AND ${docCol} >= $1::date AND ${docCol} < $2::date
        AND ${grpCol} IS NOT NULL AND TRIM(${grpCol}::text) <> ''
      ORDER BY val
    `, [dr.l12_start, dr.l12_end]);
    return { values: rows.map((r) => r.val) };
  }, { values: [] });
}

async function getFullSourceTable(tableName) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    logger.error(`[Confidas] getFullSourceTable: unsafe table name rejected — "${tableName}"`);
    return [];
  }
  try {
    logger.info(`[Confidas] getFullSourceTable: querying iq_confidas."${tableName}" …`);
    const result = await pool.exportQuery(`SELECT * FROM iq_confidas."${tableName}" LIMIT 500000`);
    logger.info(`[Confidas] getFullSourceTable("${tableName}"): ${result.rows.length} rows`);
    return result.rows;
  } catch (err) {
    logger.error(`[Confidas] getFullSourceTable("${tableName}") FAILED: ${err.message}`);
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
  getArDonut,
  getTotalChargesChart,
  getTotalChargesChartFull,
  getAdjustments,
  getAdjustmentsFull,
  getDenialReasons,
  getSchemaColumns,
  getFullSourceTable,
  getProductionDosChart,
  getProductionDosReimbursement,
  getProductionDoeChart,
  getProductionDoeReimbursement,
  getProductionDodPaymentMethod,
  getProductionDodReimbursement,
  getBankDeposits,
  getDepositsByProvider,
  // Facility
  getConfidasFacilityDosLast12,
  getConfidasFacilityDosLastMonth,
  getConfidasFacilityDoeLast12,
  getConfidasFacilityDoeLastMonth,
  getConfidasFacilityDodLast12,
  getConfidasFacilityDodLastMonth,
  // AR Page
  getConfidasArBar,
  getConfidasArPieChart,
  getConfidasArCarrier,
  getConfidasArFinancial,
  // Insight
  getConfidasInsightDosLast12,
  getConfidasInsightDosLastMonth,
  getConfidasInsightDosFilters,
  getConfidasInsightDoeLast12,
  getConfidasInsightDoeLastMonth,
  getConfidasInsightDoeFilters,
  getConfidasInsightDodLast12,
  getConfidasInsightDodLastMonth,
  getConfidasInsightDodFilters,
};
