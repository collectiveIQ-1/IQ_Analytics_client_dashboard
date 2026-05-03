'use strict';

const pool = require('../db/pool');
const logger = require('../utils/logger');

const SCHEMA = 'iq_qfd';
const tbl = (name) => `${SCHEMA}.${name}`;

const num = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v));

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
      logger.warn(`[QFD] ${label}: schema/table/column missing — ${err.message}`);
      return fallback;
    }
    logger.error(`[QFD] ${label} failed: ${err.message}`);
    throw err;
  }
}

function normalizePercent(v) {
  const value = num(v);
  if (value === 0) return 0;
  return Math.abs(value) <= 1.5 ? value * 100 : value;
}

function monthSeries(rows, valueMapper) {
  return rows.map((r) => ({
    date: r.date,
    ...valueMapper(r),
  }));
}

// ── KPIs ─────────────────────────────────────────────────────────────────────

async function getTotalPayments() {
  return safeQuery('getTotalPayments', async () => {
    // deposit_report already contains last-12-months data — no extra date filter
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(payments), 0) AS total_payments
      FROM ${tbl('deposit_report')}
      WHERE deposit_date IS NOT NULL
    `);
    const v = num(rows[0]?.total_payments);
    logger.info(`[QFD] getTotalPayments = ${v}`);
    return { total_payments: v };
  }, { total_payments: 0 });
}

async function getTotalChargesKpi() {
  return safeQuery('getTotalChargesKpi', async () => {
    // doe already contains last-12-months data — no extra date filter
    // Adding one here caused double-filtering and under-reported charges
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(totalcharge), 0) AS total_charges
      FROM ${tbl('doe')}
      WHERE doe IS NOT NULL
    `);
    const v = num(rows[0]?.total_charges);
    logger.info(`[QFD] getTotalChargesKpi = ${v}`);
    return { total_charges: v };
  }, { total_charges: 0 });
}

async function getAvgDaysDosToDoc() {
  return safeQuery('getAvgDaysDosToDoc', async () => {
    // dos already contains last-12-months data — no extra date filter
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
    const hist = await pool.query(`
      SELECT adjusted
      FROM ${tbl('ccr_history')}
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
          WHEN SUM(COALESCE(claimcount::numeric, 0)) > 0 THEN SUM(COALESCE(ccr::numeric, 0) * COALESCE(claimcount::numeric, 0)) / NULLIF(SUM(COALESCE(claimcount::numeric, 0)), 0)
          ELSE AVG(ccr::numeric)
        END AS ccr
      FROM ${tbl('ccr')}
      WHERE ccr IS NOT NULL
    `);

    return { ccr: normalizePercent(rows[0]?.ccr) };
  }, { ccr: 0 });
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
    total_charges: charges.total_charges,
    avg_days: avgDays.avg_days,
    ccr: ccr.ccr,
  };
}

// ── Payment History ───────────────────────────────────────────────────────────

async function getPaymentHistory() {
  return safeQuery('getPaymentHistory', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', deposit_date)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payments), 0) AS payments
      FROM ${tbl('deposit_report')}
      WHERE deposit_date IS NOT NULL
      GROUP BY DATE_TRUNC('month', deposit_date)
      ORDER BY DATE_TRUNC('month', deposit_date) ASC
    `);
    return monthSeries(rows, (r) => ({ payments: num(r.payments) }));
  }, []);
}

async function getPaymentHistoryFull() {
  return safeQuery('getPaymentHistoryFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', deposit_date)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(payments), 0) AS payments
      FROM ${tbl('full_deposit_report')}
      WHERE deposit_date IS NOT NULL
      GROUP BY DATE_TRUNC('month', deposit_date)
      ORDER BY DATE_TRUNC('month', deposit_date) ASC
    `);
    return monthSeries(rows, (r) => ({ payments: num(r.payments) }));
  }, []);
}


async function getBankDepositHistory() {
  return safeQuery('getBankDepositHistory', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', monthend)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(bank_deposit_amount), 0) AS bank_deposit_amount
      FROM ${tbl('bank')}
      WHERE monthend IS NOT NULL
        AND monthend >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
      GROUP BY DATE_TRUNC('month', monthend)
      ORDER BY DATE_TRUNC('month', monthend) ASC
    `);
    return monthSeries(rows, (r) => ({ bank_deposit_amount: num(r.bank_deposit_amount) }));
  }, []);
}

async function getDepositsByReferringProvider(monthDate, facilityName = null) {
  return safeQuery('getDepositsByReferringProvider', async () => {
    const params = [];
    let monthFilter    = '';
    let facilityFilter = '';

    if (monthDate) {
      params.push(monthDate);
      monthFilter = `AND DATE_TRUNC('month', deposit_date) = DATE_TRUNC('month', $${params.length}::date)`;
    }
    if (facilityName && facilityName !== 'all') {
      params.push(facilityName);
      facilityFilter = `AND TRIM(COALESCE(NULLIF(SPLIT_PART(facility, '-', 2), ''), facility, 'N/A')) = $${params.length}`;
    }

    const { rows } = await pool.query(`
      SELECT
        TRIM(COALESCE(NULLIF(SPLIT_PART(referring_provider, '-', 2), ''), referring_provider, 'N/A')) AS referring_provider,
        COALESCE(SUM(payments), 0) AS payments
      FROM ${tbl('deposit_report')}
      WHERE deposit_date IS NOT NULL
        AND COALESCE(referring_provider, '') <> ''
        ${monthFilter}
        ${facilityFilter}
      GROUP BY 1
      ORDER BY payments DESC, referring_provider ASC
      LIMIT 12
    `, params);
    return rows.map((r) => ({
      referring_provider: r.referring_provider,
      payments: num(r.payments),
    }));
  }, []);
}

async function getDepositsByFacility(monthDate, providerName = null) {
  return safeQuery('getDepositsByFacility', async () => {
    const params = [];
    let monthFilter    = '';
    let providerFilter = '';

    if (monthDate) {
      params.push(monthDate);
      monthFilter = `AND DATE_TRUNC('month', deposit_date) = DATE_TRUNC('month', $${params.length}::date)`;
    }
    if (providerName && providerName !== 'all') {
      params.push(providerName);
      providerFilter = `AND TRIM(COALESCE(NULLIF(SPLIT_PART(referring_provider, '-', 2), ''), referring_provider, 'N/A')) = $${params.length}`;
    }

    const { rows } = await pool.query(`
      SELECT
        TRIM(COALESCE(NULLIF(SPLIT_PART(facility, '-', 2), ''), facility, 'N/A')) AS facility,
        COALESCE(SUM(payments), 0) AS payments
      FROM ${tbl('deposit_report')}
      WHERE deposit_date IS NOT NULL
        AND COALESCE(facility, '') <> ''
        ${monthFilter}
        ${providerFilter}
      GROUP BY 1
      ORDER BY payments DESC, facility ASC
      LIMIT 12
    `, params);
    return rows.map((r) => ({
      facility: r.facility,
      payments: num(r.payments),
    }));
  }, []);
}

// ── Charges vs Payments ───────────────────────────────────────────────────────

async function getChargesVsPayments() {
  return safeQuery('getChargesVsPayments', async () => {
    // Charges from doe, payments from deposit_report — never joined at row level.
    // doe already contains last-12-months data; deposit_report likewise.
    const [doeRows, depRows] = await Promise.all([
      pool.query(`
        SELECT
          DATE_TRUNC('month', doe) AS month_trunc,
          COALESCE(SUM(totalcharge), 0) AS total_charges
        FROM ${tbl('doe')}
        WHERE doe IS NOT NULL
        GROUP BY DATE_TRUNC('month', doe)
        ORDER BY DATE_TRUNC('month', doe) ASC
      `),
      pool.query(`
        SELECT
          DATE_TRUNC('month', deposit_date) AS month_trunc,
          COALESCE(SUM(payments), 0) AS total_payments
        FROM ${tbl('deposit_report')}
        WHERE deposit_date IS NOT NULL
        GROUP BY DATE_TRUNC('month', deposit_date)
        ORDER BY DATE_TRUNC('month', deposit_date) ASC
      `),
    ]);

    // Merge by month in application code — no SQL join between the two tables
    const payMap = {};
    for (const r of depRows.rows) {
      payMap[r.month_trunc.toISOString()] = num(r.total_payments);
    }

    return doeRows.rows.map((r) => {
      const key = r.month_trunc.toISOString();
      const monthEnd = new Date(r.month_trunc);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(monthEnd.getDate() - 1);
      return {
        date:           monthEnd.toISOString().slice(0, 10),
        total_charges:  num(r.total_charges),
        total_payments: payMap[key] ?? 0,
      };
    });
  }, []);
}

async function getChargesVsPaymentsFull() {
  return safeQuery('getChargesVsPaymentsFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', doe)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(totalcharge), 0) AS total_charges,
        COALESCE(SUM(COALESCE(carrierpayment, 0) + COALESCE(patientpayment, 0)), 0) AS total_payments
      FROM ${tbl('full_ar')}
      WHERE doe IS NOT NULL
      GROUP BY DATE_TRUNC('month', doe)
      ORDER BY DATE_TRUNC('month', doe) ASC
    `);
    return monthSeries(rows, (r) => ({
      total_charges: num(r.total_charges),
      total_payments: num(r.total_payments),
    }));
  }, []);
}

// ── CCR History ───────────────────────────────────────────────────────────────

async function getCcrHistory() {
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

  return safeQuery('getCcrHistory', async () => {
    // Primary: ccr_history table with non-null adjusted values
    const { rows } = await pool.query(`
      SELECT month::text AS month_raw, adjusted
      FROM ${tbl('ccr_history')}
      WHERE month IS NOT NULL
        AND adjusted IS NOT NULL
    `);

    const primary = rows
      .map((r) => ({ month: r.month_raw, adjusted: normalizePercent(r.adjusted) }))
      .filter((r) => r.adjusted > 0)
      .sort((a, b) => toSortKey(a.month) - toSortKey(b.month));

    if (primary.length > 0) return primary;

    // Fallback: compute monthly CCR proxy from dos table
    // CCR approximation = % of visits with no write-offs (clean first submission)
    try {
      const { rows: dosRows } = await pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', begindos), 'YYYY-MM-DD') AS month_raw,
          ROUND(
            100.0 * SUM(CASE WHEN COALESCE(carrierwo::numeric, 0) = 0
                              AND COALESCE(patientwo::numeric, 0) = 0
                         THEN 1 ELSE 0 END)
            / NULLIF(COUNT(*), 0), 1
          ) AS adjusted
        FROM ${tbl('dos')}
        WHERE begindos IS NOT NULL
        GROUP BY DATE_TRUNC('month', begindos)
        HAVING COUNT(*) > 0
        ORDER BY DATE_TRUNC('month', begindos)
      `);
      if (dosRows.length > 0) {
        return dosRows
          .map((r) => ({ month: r.month_raw, adjusted: num(r.adjusted) }))
          .filter((r) => r.adjusted > 0)
          .sort((a, b) => toSortKey(a.month) - toSortKey(b.month));
      }
    } catch (fbErr) {
      logger.warn(`[QFD] getCcrHistory fallback failed: ${fbErr.message}`);
    }

    return [];
  }, []);
}

// ── AR Pie (DOE age buckets) ──────────────────────────────────────────────────

async function getArPie() {
  return safeQuery('getArPie', async () => {
    const { rows } = await pool.query(`
      WITH ref AS (
        SELECT COALESCE(MAX(doe)::date, CURRENT_DATE) AS as_of_date
        FROM ${tbl('full_ar')}
        WHERE doe IS NOT NULL
      ),
      raw AS (
        SELECT
          CASE
            WHEN ((SELECT as_of_date FROM ref) - doe::date) < 30 THEN 'Current'
            WHEN ((SELECT as_of_date FROM ref) - doe::date) BETWEEN 30 AND 60 THEN '30-60'
            WHEN ((SELECT as_of_date FROM ref) - doe::date) BETWEEN 61 AND 90 THEN '60-90'
            WHEN ((SELECT as_of_date FROM ref) - doe::date) BETWEEN 91 AND 120 THEN '90-120'
            WHEN ((SELECT as_of_date FROM ref) - doe::date) BETWEEN 121 AND 150 THEN '120-150'
            ELSE '150+'
          END AS bucket,
          ABS(COALESCE(totalbalance, 0)) AS total_balance
        FROM ${tbl('full_ar')}
        WHERE doe IS NOT NULL
      ),
      agg AS (
        SELECT bucket, COALESCE(SUM(total_balance), 0) AS total_balance
        FROM raw
        GROUP BY bucket
      ),
      buckets AS (
        SELECT * FROM (VALUES
          ('Current', 1),
          ('30-60', 2),
          ('60-90', 3),
          ('90-120', 4),
          ('120-150', 5),
          ('150+', 6)
        ) AS v(bucket, sort_order)
      )
      SELECT b.bucket, COALESCE(a.total_balance, 0) AS total_balance
      FROM buckets b
      LEFT JOIN agg a ON a.bucket = b.bucket
      ORDER BY b.sort_order
    `);
    return rows.map((r) => ({ bucket: r.bucket, total_balance: num(r.total_balance) }));
  }, []);
}

// ── Total Charges chart ───────────────────────────────────────────────────────

async function getTotalChargesChart() {
  return safeQuery('getTotalChargesChart', async () => {
    // doe already contains last-12-months data — no extra date filter
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', doe)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(totalcharge), 0) AS total_charges
      FROM ${tbl('doe')}
      WHERE doe IS NOT NULL
      GROUP BY DATE_TRUNC('month', doe)
      ORDER BY DATE_TRUNC('month', doe) ASC
    `);
    return monthSeries(rows, (r) => ({ total_charges: num(r.total_charges) }));
  }, []);
}

async function getTotalChargesChartFull() {
  return safeQuery('getTotalChargesChartFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', doe)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(totalcharge), 0) AS total_charges
      FROM ${tbl('full_ar')}
      WHERE doe IS NOT NULL
      GROUP BY DATE_TRUNC('month', doe)
      ORDER BY DATE_TRUNC('month', doe) ASC
    `);
    return monthSeries(rows, (r) => ({ total_charges: num(r.total_charges) }));
  }, []);
}

// ── Adjustments ───────────────────────────────────────────────────────────────

async function getAdjustments() {
  return safeQuery('getAdjustments', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', entry_date)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(adjustments), 0) AS adjustments
      FROM ${tbl('adj_report')}
      WHERE entry_date IS NOT NULL
        AND entry_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
      GROUP BY DATE_TRUNC('month', entry_date)
      ORDER BY DATE_TRUNC('month', entry_date) ASC
    `);
    return monthSeries(rows, (r) => ({ adjustments: num(r.adjustments) }));
  }, []);
}

async function getAdjustmentsFull() {
  return safeQuery('getAdjustmentsFull', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', entry_date)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(adjustments), 0) AS adjustments
      FROM ${tbl('adj_report')}
      WHERE entry_date IS NOT NULL
      GROUP BY DATE_TRUNC('month', entry_date)
      ORDER BY DATE_TRUNC('month', entry_date) ASC
    `);
    return monthSeries(rows, (r) => ({ adjustments: num(r.adjustments) }));
  }, []);
}

// ── AR Donut (DOS age buckets, grouped) ───────────────────────────────────────

async function getArDonut() {
  return safeQuery('getArDonut', async () => {
    const { rows } = await pool.query(`
      WITH ref AS (
        SELECT COALESCE(MAX(begindos)::date, CURRENT_DATE) AS as_of_date
        FROM ${tbl('full_ar')}
        WHERE begindos IS NOT NULL
      ),
      bucketed AS (
        SELECT
          CASE
            WHEN ((SELECT as_of_date FROM ref) - begindos::date) < 30 THEN 'Current'
            WHEN ((SELECT as_of_date FROM ref) - begindos::date) BETWEEN 30 AND 60 THEN '30-60'
            WHEN ((SELECT as_of_date FROM ref) - begindos::date) BETWEEN 61 AND 90 THEN '60-90'
            WHEN ((SELECT as_of_date FROM ref) - begindos::date) BETWEEN 91 AND 120 THEN '90-120'
            WHEN ((SELECT as_of_date FROM ref) - begindos::date) BETWEEN 121 AND 150 THEN '120-150'
            ELSE '150+'
          END AS raw_bucket,
          COALESCE(totalbalance, 0) AS bal
        FROM ${tbl('full_ar')}
        WHERE begindos IS NOT NULL
      )
      SELECT
        CASE WHEN raw_bucket IN ('Current', '30-60') THEN '30-60 & Current' ELSE 'Other' END AS bucket,
        COALESCE(SUM(bal), 0) AS total_balance
      FROM bucketed
      GROUP BY 1
      ORDER BY 1
    `);
    return rows.map((r) => ({ bucket: r.bucket, total_balance: num(r.total_balance) }));
  }, []);
}

// ── Denial Reasons ────────────────────────────────────────────────────────────

async function getDenialReasons() {
  return safeQuery('getDenialReasons', async () => {
    // FIX: column is `denialreason` (singular), not `denialreasons`
    // `percentage` stored as text — strip any trailing "%" before casting to numeric
    const { rows } = await pool.query(`
      SELECT
        denialreason AS denial_reason,
        COALESCE(SUM(claimcount), 0)                                          AS claimcount,
        COALESCE(SUM(value), 0)                                               AS value,
        COALESCE(SUM(
          CASE
            WHEN percentage IS NULL OR TRIM(percentage) = '' THEN 0
            ELSE REPLACE(TRIM(percentage), '%', '')::numeric
          END
        ), 0)                                                                 AS percentage
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

async function getSchemaColumns() {
  return safeQuery('getSchemaColumns', async () => {
    const { rows } = await pool.query(`
      SELECT table_name, column_name, data_type, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'iq_qfd'
      ORDER BY table_name, ordinal_position
    `);
    return rows;
  }, []);
}

// ── Production: DOS Chart (charges vs payments by begindos) ──────────────────

async function getProductionDosChart() {
  return safeQuery('getProductionDosChart', async () => {
    const { rows } = await pool.query(`
      SELECT
        (DATE_TRUNC('month', begindos)::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS date,
        COALESCE(SUM(totalcharge), 0)                                                        AS total_charges,
        COALESCE(SUM(COALESCE(carrierpayment,0) + COALESCE(patientpayment,0)), 0)            AS total_payments,
        CASE
          WHEN SUM(totalcharge) > 0
          THEN ROUND(
            (SUM(COALESCE(carrierpayment,0) + COALESCE(patientpayment,0)) /
             NULLIF(SUM(totalcharge), 0) * 100)::numeric, 1)
          ELSE 0
        END AS gcr_pct
      FROM ${tbl('dos')}
      WHERE begindos IS NOT NULL
      GROUP BY DATE_TRUNC('month', begindos)
      ORDER BY DATE_TRUNC('month', begindos) ASC
    `);
    return monthSeries(rows, (r) => ({
      total_charges:  num(r.total_charges),
      total_payments: num(r.total_payments),
      gcr_pct:        num(r.gcr_pct),
    }));
  }, []);
}

// ── Production: DOD Payments by Method ───────────────────────────────────────

async function getProductionDodByMethod() {
  return safeQuery('getProductionDodByMethod', async () => {
    const { rows } = await pool.query(`
      SELECT
        TRIM(COALESCE(NULLIF(payment_method, ''), 'Other')) AS payment_method,
        COALESCE(SUM(payments), 0)                          AS payments
      FROM ${tbl('deposit_report')}
      WHERE deposit_date IS NOT NULL
      GROUP BY 1
      ORDER BY payments DESC
    `);
    return rows.map((r) => ({
      payment_method: r.payment_method,
      payments:       num(r.payments),
    }));
  }, []);
}

// ── Production: Reimbursement Analysis — shared CTE builder ──────────────────

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
      ROUND((SUM(totalcharge) / NULLIF(COUNT(DISTINCT visitnum),0))::numeric, 0)
                                                                              AS avg_chrg_per_visit,
      ROUND((SUM(carrierpayment + patientpayment) / NULLIF(COUNT(DISTINCT visitnum),0))::numeric, 0)
                                                                              AS avg_pmt_per_visit,
      ROUND((SUM(carrierpayment + patientpayment) / NULLIF(SUM(totalcharge),0) * 100)::numeric, 1)
                                                                              AS gcr_pct,
      ROUND(((SUM(carrierpayment + patientpayment) + SUM(patientbalance)) / NULLIF(SUM(totalcharge),0) * 100)::numeric, 0)
                                                                              AS gcr_without_pt_balance,
      ROUND((SUM(CASE WHEN fully_paid=1 THEN carrierpayment+patientpayment ELSE 0 END) / NULLIF(SUM(totalcharge),0) * 100)::numeric, 0)
                                                                              AS gcr_fully_paid,
      ROUND((
        SUM(CASE WHEN ncr_eligible=1 THEN carrierpayment+patientpayment ELSE 0 END) /
        NULLIF(
          SUM(CASE WHEN ncr_eligible=1 THEN totalcharge ELSE 0 END) -
          SUM(CASE WHEN ncr_eligible=1 THEN carrierwo    ELSE 0 END),
          0
        ) * 100
      )::numeric, 0)                                                         AS ncr_pct
    FROM monthly_base
    GROUP BY month_trunc
    ORDER BY month_trunc ASC
  `;
}

function mapReimbursementRow(r) {
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

async function getProductionDosReimbursement() {
  return safeQuery('getProductionDosReimbursement', async () => {
    const { rows } = await pool.query(reimbursementQuery('dos', 'begindos'));
    return rows.map(mapReimbursementRow);
  }, []);
}

async function getProductionDoeReimbursement() {
  return safeQuery('getProductionDoeReimbursement', async () => {
    const { rows } = await pool.query(reimbursementQuery('doe', 'doe'));
    return rows.map(mapReimbursementRow);
  }, []);
}


// ── Production: DOD Reimbursement (pivot table by doe month) ─────────────────
// Columns = months from doe table. Payments from deposit_report, adjustments from adj_report.

async function getProductionDodReimbursement() {
  return safeQuery('getProductionDodReimbursement', async () => {
    const { rows } = await pool.query(`
      WITH date_range AS (
        SELECT
          (DATE_TRUNC('month', MAX(doe)) - INTERVAL '11 months')::date AS l12_start,
          (DATE_TRUNC('month', MAX(doe)) + INTERVAL  '1 month')::date  AS l12_end
        FROM ${tbl('doe')} WHERE doe IS NOT NULL
      ),
      doe_months AS (
        SELECT
          DATE_TRUNC('month', doe)          AS month_trunc,
          COUNT(DISTINCT visitnum)           AS visit_count,
          COUNT(DISTINCT procedure)          AS procedure_count,
          COALESCE(SUM(totalcharge), 0)::numeric AS total_charge
        FROM ${tbl('doe')}
        WHERE doe IS NOT NULL
          AND doe >= (SELECT l12_start FROM date_range)
          AND doe <  (SELECT l12_end   FROM date_range)
        GROUP BY 1
      ),
      dep_months AS (
        SELECT
          DATE_TRUNC('month', deposit_date)  AS month_trunc,
          COALESCE(SUM(payments), 0)::numeric AS total_payments
        FROM ${tbl('deposit_report')}
        WHERE deposit_date IS NOT NULL
          AND deposit_date >= (SELECT l12_start FROM date_range)
          AND deposit_date <  (SELECT l12_end   FROM date_range)
        GROUP BY 1
      ),
      adj_months AS (
        SELECT
          DATE_TRUNC('month', entry_date)       AS month_trunc,
          COALESCE(SUM(adjustments), 0)::numeric AS total_adjustments
        FROM ${tbl('adj_report')}
        WHERE entry_date IS NOT NULL
          AND entry_date >= (SELECT l12_start FROM date_range)
          AND entry_date <  (SELECT l12_end   FROM date_range)
        GROUP BY 1
      )
      SELECT
        dm.month_trunc,
        dm.visit_count,
        dm.procedure_count,
        dm.total_charge,
        COALESCE(dep.total_payments,    0) AS total_payments,
        COALESCE(adj.total_adjustments, 0) AS total_adjustments
      FROM doe_months dm
      LEFT JOIN dep_months dep ON dm.month_trunc = dep.month_trunc
      LEFT JOIN adj_months adj ON dm.month_trunc = adj.month_trunc
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


async function getFullSourceTable(tableName) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    logger.error(`[QFD] getFullSourceTable: unsafe table name rejected — "${tableName}"`);
    return [];
  }
  try {
    logger.info(`[QFD] getFullSourceTable: querying iq_qfd."${tableName}" …`);
    const result = await pool.exportQuery(`SELECT * FROM iq_qfd."${tableName}" LIMIT 500000`);
    logger.info(`[QFD] getFullSourceTable("${tableName}"): ${result.rows.length} rows`);
    return result.rows;
  } catch (err) {
    logger.error(`[QFD] getFullSourceTable("${tableName}") FAILED: ${err.message}`);
    return [];
  }
}

module.exports = {
  getAllKpis,
  // Home charts
  getPaymentHistory,
  getPaymentHistoryFull,
  getBankDepositHistory,
  getDepositsByReferringProvider,
  getDepositsByFacility,
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
  // Production
  getProductionDosChart,
  getProductionDodByMethod,
  getProductionDosReimbursement,
  getProductionDoeReimbursement,
  getProductionDodReimbursement,
};
