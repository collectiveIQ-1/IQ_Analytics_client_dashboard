/**
 * neurowatch.routes.js — Neuro Watch dashboard API routes.
 * Base path: /api/neurowatch
 */

'use strict';

const express        = require('express');
const nwCtrl         = require('../controllers/neurowatch.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

// ── Home page ──────────────────────────────────────────────────────────────
router.get('/kpis',                     nwCtrl.getKpis);
router.get('/payment-history',          nwCtrl.getPaymentHistory);
router.get('/payment-history-full',     nwCtrl.getPaymentHistoryFull);
router.get('/charges-vs-payments',      nwCtrl.getChargesVsPayments);
router.get('/charges-vs-payments-full', nwCtrl.getChargesVsPaymentsFull);
router.get('/ar-pie',                   nwCtrl.getArPie);
router.get('/ar-donut',                 nwCtrl.getArDonut);
router.get('/total-charges',            nwCtrl.getTotalCharges);
router.get('/total-charges-full',       nwCtrl.getTotalChargesFull);
router.get('/adjustments',              nwCtrl.getAdjustments);
router.get('/adjustments-full',         nwCtrl.getAdjustmentsFull);

// ── Payments page ──────────────────────────────────────────────────────────
router.get('/payments/line',         nwCtrl.getPaymentLineChart);
router.get('/payments/surgeon',      nwCtrl.getDepositsBySurgeon);
router.get('/payments/hospital',     nwCtrl.getDepositsByHospital);
router.get('/payments/billing-type', nwCtrl.getDepositsByBillingType);
router.get('/payments/insurance',    nwCtrl.getDepositsByInsurance);

// ── Production page ────────────────────────────────────────────────────────
router.get('/production/dos-chart',  nwCtrl.getProductionDosChart);
router.get('/production/doe-chart',  nwCtrl.getProductionDoeChart);
router.get('/production/dos-reimb',  nwCtrl.getProductionDosReimb);
router.get('/production/doe-reimb',  nwCtrl.getProductionDoeReimb);
router.get('/production/dod-payer',  nwCtrl.getProductionDodByPayer);
router.get('/production/dod-biller', nwCtrl.getProductionDodByBiller);

// ── AR page ────────────────────────────────────────────────────────────────
router.get('/ar/dos',       nwCtrl.getArDosBuckets);
router.get('/ar/doe',       nwCtrl.getArDoeBuckets);
router.get('/ar/treemap',   nwCtrl.getArTreemap);
router.get('/ar/insurance', nwCtrl.getArByInsurance);
router.get('/ar/surgeon',   nwCtrl.getArBySurgeon);
router.get('/ar/surgeons',  nwCtrl.getArSurgeons);

// ── Insights page ──────────────────────────────────────────────────────────
router.get('/insights/insurance',    nwCtrl.getInsightsInsurance);
router.get('/insights/surgeon',      nwCtrl.getInsightsSurgeon);
router.get('/insights/reader',       nwCtrl.getInsightsReader);
router.get('/insights/technician',   nwCtrl.getInsightsTechnician);
router.get('/insights/surgeon-list', nwCtrl.getInsightsSurgeonList);
router.get('/insights/reader-list',  nwCtrl.getInsightsReaderList);
router.get('/insights/tech-list',    nwCtrl.getInsightsTechList);

// ── Procedure page ─────────────────────────────────────────────────────────
router.get('/procedure/deposits', nwCtrl.getNwProcedureDeposits);
router.get('/procedure/charges',  nwCtrl.getNwProcedureCharges);
router.get('/procedure/more',     nwCtrl.getNwProcedureMore);
router.get('/procedure/dod-more', nwCtrl.getNwProcedureDodMore);

// ── Data source ────────────────────────────────────────────────────────────
router.get('/datasource', nwCtrl.getDataSource);

module.exports = router;
