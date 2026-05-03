/**
 * synapses.routes.js — Synapses dashboard API routes.
 * Base path: /api/synapses
 */

'use strict';

const express            = require('express');
const synapsesController = require('../controllers/synapses.controller');
const authMiddleware     = require('../middleware/auth.middleware');

const router = express.Router();

// ── PUBLIC diagnostic (no auth) — remove after debugging ──────────────────────
router.get('/debug/diagnose', async (req, res, next) => {
  try {
    const pool = require('../db/pool');

    // Helper: run a query and return { ok, result, error }
    async function tryQ(label, sql) {
      try {
        const r = await pool.query(sql);
        return { label, ok: true, result: r.rows };
      } catch (e) {
        return { label, ok: false, error: e.message, code: e.code };
      }
    }

    const [
      counts,
      colTypes,
      sampleBilling,
      sampleDeposit,
      chargesSum,
      paymentSum,
      dateGroups,
      depositGroups,
    ] = await Promise.all([
      tryQ('row_counts',
        "SELECT " +
        "(SELECT COUNT(*) FROM iq_synapses.synapses_full_billing) AS billing_rows," +
        "(SELECT COUNT(*) FROM iq_synapses.synapses_full_deposit) AS deposit_rows," +
        "(SELECT COUNT(*) FROM iq_synapses.synapses_full_billing WHERE billing_date IS NOT NULL) AS has_billing_date," +
        "(SELECT COUNT(*) FROM iq_synapses.synapses_full_billing WHERE charged IS NOT NULL) AS has_charged," +
        "(SELECT COUNT(*) FROM iq_synapses.synapses_full_billing WHERE collected IS NOT NULL) AS has_collected"
      ),
      tryQ('column_types',
        "SELECT table_name, column_name, data_type, udt_name " +
        "FROM information_schema.columns " +
        "WHERE table_schema = 'iq_synapses' " +
        "AND table_name IN ('synapses_full_billing','synapses_full_deposit') " +
        "ORDER BY table_name, ordinal_position"
      ),
      tryQ('sample_billing',
        "SELECT billing_date, dos, charged, collected, write_off, total_balance " +
        "FROM iq_synapses.synapses_full_billing LIMIT 3"
      ),
      tryQ('sample_deposit',
        "SELECT date_collected, payment_collected " +
        "FROM iq_synapses.synapses_full_deposit LIMIT 3"
      ),
      tryQ('charges_sum',
        "SELECT COALESCE(SUM(charged),0) AS total_charges FROM iq_synapses.synapses_full_billing"
      ),
      tryQ('payment_sum',
        "SELECT COALESCE(SUM(payment_collected),0) AS total_payments FROM iq_synapses.synapses_full_deposit WHERE date_collected IS NOT NULL"
      ),
      tryQ('date_trunc_billing',
        "SELECT DATE_TRUNC('month', billing_date) AS m, COUNT(*) FROM iq_synapses.synapses_full_billing WHERE billing_date IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 5"
      ),
      tryQ('date_trunc_deposit',
        "SELECT DATE_TRUNC('month', date_collected) AS m, COUNT(*) FROM iq_synapses.synapses_full_deposit WHERE date_collected IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 5"
      ),
    ]);

    res.json({ counts, colTypes, sampleBilling, sampleDeposit, chargesSum, paymentSum, dateGroups, depositGroups });
  } catch (e) { next(e); }
});

// ── Auth required for everything below ────────────────────────────────────────
router.use(authMiddleware);

// KPIs
router.get('/kpis', synapsesController.getKpis);

// Payment History
router.get('/payment-history',      synapsesController.getPaymentHistory);
router.get('/payment-history-full', synapsesController.getPaymentHistoryFull);

// Charges vs Payments
router.get('/charges-vs-payments',      synapsesController.getChargesVsPayments);
router.get('/charges-vs-payments-full', synapsesController.getChargesVsPaymentsFull);

// CCR History
router.get('/ccr-history', synapsesController.getCcrHistory);

// AR Pie
router.get('/ar-pie', synapsesController.getArPie);

// Total Charges
router.get('/total-charges',      synapsesController.getTotalChargesChart);
router.get('/total-charges-full', synapsesController.getTotalChargesChartFull);

// Total Adjustments
router.get('/adjustments',      synapsesController.getAdjustments);
router.get('/adjustments-full', synapsesController.getAdjustmentsFull);

// AR Donut
router.get('/ar-donut', synapsesController.getArDonut);

// Denial Reasons
router.get('/denial-reasons', synapsesController.getDenialReasons);

// Payments page (filter-aware, cross-filtering)
router.get('/payments/line',           synapsesController.getPaymentsLine);
router.get('/payments/surgeon',        synapsesController.getPaymentsBySurgeon);
router.get('/payments/hospital',       synapsesController.getPaymentsByHospital);
router.get('/payments/billing-type',   synapsesController.getPaymentsByBillingType);
router.get('/payments/insurance-type', synapsesController.getPaymentsByInsuranceType);
router.get('/payments/insurance',      synapsesController.getPaymentsByInsuranceType);

// Production page
router.get('/production/dod-adjustments', synapsesController.getDodAdjustmentsAllTime);
router.get('/production/dos-chart',       synapsesController.getProductionDosChart);
router.get('/production/doe-chart',       synapsesController.getProductionDoeChart);
router.get('/production/dos-reimb',       synapsesController.getProductionDosReimbursement);
router.get('/production/doe-reimb',       synapsesController.getProductionDoeReimbursement);
router.get('/production/dod-payer',       synapsesController.getProductionDodByPayer);
router.get('/production/dod-biller',      synapsesController.getProductionDodByBillingEntity);

// AR page
router.get('/ar/dos',       synapsesController.getArDos);
router.get('/ar/doe',       synapsesController.getArDoe);
router.get('/ar/insurance', synapsesController.getArInsurance);
router.get('/ar/surgeon',   synapsesController.getArSurgeon);

// Procedure page
router.get('/procedure/deposits', synapsesController.getProcedureDeposits);
router.get('/procedure/charges',  synapsesController.getProcedureCharges);
router.get('/procedure/more',     synapsesController.getProcedureMore);
router.get('/procedure/dod-more', synapsesController.getProcedureDodMore);

// Insights page
router.get('/insights/insurance',    synapsesController.getInsightsInsurance);
router.get('/insights/surgeon',      synapsesController.getInsightsSurgeon);
router.get('/insights/reader',       synapsesController.getInsightsReader);
router.get('/insights/technician',   synapsesController.getInsightsTechnician);
router.get('/insights/surgeon-list', synapsesController.getInsightsSurgeonList);
router.get('/insights/reader-list',  synapsesController.getInsightsReaderList);
router.get('/insights/tech-list',    synapsesController.getInsightsTechList);

// Debug — column list
router.get('/debug/schema',  synapsesController.getSchemaInfo);
router.get('/debug/columns', synapsesController.getSchemaColumns);

// Data Source export
router.get('/datasource', synapsesController.getDataSource);

module.exports = router;
