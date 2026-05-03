/**
 * usneuro.routes.js - US Neuro dashboard API routes.
 * Base path: /api/usneuro
 */

'use strict';

const express            = require('express');
const usneuroController  = require('../controllers/usneuro.controller');
const authMiddleware     = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/kpis',                       usneuroController.getKpis);
router.get('/payment-history',            usneuroController.getPaymentHistory);
router.get('/payment-history-full',       usneuroController.getPaymentHistoryFull);
router.get('/charges-vs-payments',        usneuroController.getChargesVsPayments);
router.get('/charges-vs-payments-full',   usneuroController.getChargesVsPaymentsFull);
router.get('/ccr-history',                usneuroController.getCcrHistory);
router.get('/ar-pie',                     usneuroController.getArPie);
router.get('/total-charges',              usneuroController.getTotalChargesChart);
router.get('/total-charges-full',         usneuroController.getTotalChargesChartFull);
router.get('/adjustments',                usneuroController.getAdjustments);
router.get('/adjustments-full',           usneuroController.getAdjustmentsFull);
router.get('/ar-donut',                   usneuroController.getArDonut);
router.get('/denial-reasons',             usneuroController.getDenialReasons);
router.get('/debug/columns',              usneuroController.getSchemaColumns);

// --- Payments page ---
router.get('/payments/line',              usneuroController.getPaymentLineChart);
router.get('/payments/surgeon',           usneuroController.getDepositsBySurgeon);
router.get('/payments/hospital',          usneuroController.getDepositsByHospital);
router.get('/payments/billing-type',      usneuroController.getDepositsByBillingType);
router.get('/payments/insurance-type',    usneuroController.getDepositsByInsurance);

// --- Production page ---
router.get('/production/dos-chart',       usneuroController.getProductionDosChart);
router.get('/production/doe-chart',       usneuroController.getProductionDoeChart);
router.get('/production/dos-reimb',       usneuroController.getProductionDosReimbursement);
router.get('/production/doe-reimb',       usneuroController.getProductionDoeReimbursement);
router.get('/production/dod-payer',       usneuroController.getProductionDodByPayer);
router.get('/production/dod-biller',      usneuroController.getProductionDodByBillerEntity);

// --- AR page ---
router.get('/ar/dos',           usneuroController.getArDosBuckets);
router.get('/ar/doe',           usneuroController.getArDoeBuckets);
router.get('/ar/treemap',       usneuroController.getArTreemap);
router.get('/ar/insurance',     usneuroController.getArByInsurance);
router.get('/ar/surgeon',       usneuroController.getArBySurgeon);
router.get('/ar/surgeons',      usneuroController.getArSurgeons);

// --- Insights page ---
router.get('/insights/insurance', usneuroController.getInsightsByInsurance);
router.get('/insights/surgeon',   usneuroController.getInsightsBySurgeon);
router.get('/insights/surgeons',  usneuroController.getInsightsSurgeons);

// --- Data Source export: GET /api/usneuro/datasource?chart=X ---
router.get('/datasource', usneuroController.getDataSource);

module.exports = router;
