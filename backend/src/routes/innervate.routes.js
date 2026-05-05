/**
 * innervate.routes.js — Innervate dashboard API routes.
 * Base path: /api/innervate
 */

'use strict';

const express              = require('express');
const innervateController  = require('../controllers/innervate.controller');
const authMiddleware       = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// Home page KPIs
router.get('/home/kpis', innervateController.getKpis);

// Payment History
router.get('/home/payment-history',      innervateController.getPaymentHistory);
router.get('/home/payment-history-full', innervateController.getPaymentHistoryFull);

// Charges vs Payments
router.get('/home/charges-vs-payments',      innervateController.getChargesVsPayments);
router.get('/home/charges-vs-payments-full', innervateController.getChargesVsPaymentsFull);

// Accounts Receivable Pie
router.get('/home/accounts-receivable', innervateController.getArPie);

// Total Charges
router.get('/home/total-charges',      innervateController.getTotalChargesChart);
router.get('/home/total-charges-full', innervateController.getTotalChargesChartFull);

// Total Adjustments
router.get('/home/total-adjustments',      innervateController.getAdjustments);
router.get('/home/total-adjustments-full', innervateController.getAdjustmentsFull);

// AR % > 60+ Days (donut)
router.get('/home/ar-aging', innervateController.getArDonut);

// Payments page
router.get('/payments/line',         innervateController.getPaymentLineChart);
router.get('/payments/surgeon',      innervateController.getDepositsBySurgeon);
router.get('/payments/hospital',     innervateController.getDepositsByHospital);
router.get('/payments/billing-type', innervateController.getDepositsByBillingType);
router.get('/payments/insurance-type', innervateController.getDepositsByInsurance);

// Debug
router.get('/debug/columns', innervateController.getSchemaColumns);

module.exports = router;

// Production page
router.get('/production/dos',               innervateController.getProductionDosChart);
router.get('/production/doe',               innervateController.getProductionDoeChart);
router.get('/production/reimbursement/dos', innervateController.getProductionDosReimbursement);
router.get('/production/reimbursement/doe', innervateController.getProductionDoeReimbursement);
router.get('/production/dod/adjustments',   innervateController.getProductionDodAdjustments);
router.get('/production/dod/payments',      innervateController.getProductionDodPayments);
router.get('/production/dod/payer',         innervateController.getProductionDodByPayer);
router.get('/production/dod/biller-entity', innervateController.getProductionDodByBillerEntity);

// AR page
router.get('/ar/dos',      innervateController.getArDos);
router.get('/ar/doe',      innervateController.getArDoe);
router.get('/ar/insurance',innervateController.getArInsurance);
router.get('/ar/surgeon',  innervateController.getArSurgeon);

// ── Insights routes ───────────────────────────────────────────────────────────
router.get('/insights/insurance',      innervateController.getInsightsInsurance);
router.get('/insights/surgeon',        innervateController.getInsightsSurgeon);
router.get('/insights/reader',         innervateController.getInsightsReader);
router.get('/insights/technician',     innervateController.getInsightsTechnician);
router.get('/insights/surgeon-list',   innervateController.getInsightsSurgeonList);
router.get('/insights/reader-list',    innervateController.getInsightsReaderList);
router.get('/insights/tech-list',      innervateController.getInsightsTechList);

// ── Procedure routes ──────────────────────────────────────────────────────────
router.get('/procedure/deposits',      innervateController.getProcedureDeposits);
router.get('/procedure/charges',       innervateController.getProcedureCharges);
router.get('/procedure/more',          innervateController.getProcedureMore);
router.get('/procedure/dod-more',      innervateController.getProcedureDodMore);
