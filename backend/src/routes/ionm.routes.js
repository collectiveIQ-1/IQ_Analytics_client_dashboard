/**
 * ionm.routes.js — IOM Help dashboard API routes.
 * Base path: /api/ionm
 */

'use strict';

const express        = require('express');
const ionmController = require('../controllers/ionm.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// KPIs
router.get('/kpis', ionmController.getKpis);

// Payment History
router.get('/payment-history',      ionmController.getPaymentHistory);
router.get('/payment-history-full', ionmController.getPaymentHistoryFull);

// Charges vs Payments
router.get('/charges-vs-payments',      ionmController.getChargesVsPayments);
router.get('/charges-vs-payments-full', ionmController.getChargesVsPaymentsFull);

// CCR History
router.get('/ccr-history', ionmController.getCcrHistory);

// AR Pie
router.get('/ar-pie', ionmController.getArPie);

// Total Charges
router.get('/total-charges',      ionmController.getTotalChargesChart);
router.get('/total-charges-full', ionmController.getTotalChargesChartFull);

// Total Adjustments
router.get('/adjustments',      ionmController.getAdjustments);
router.get('/adjustments-full', ionmController.getAdjustmentsFull);

// AR Donut
router.get('/ar-donut', ionmController.getArDonut);

// Denial Reasons
router.get('/denial-reasons', ionmController.getDenialReasons);

// Payments page
router.get('/payments/line',         ionmController.getPaymentLineChart);
router.get('/payments/surgeon',      ionmController.getDepositsBySurgeon);
router.get('/payments/hospital',     ionmController.getDepositsByHospital);
router.get('/payments/billing-type', ionmController.getDepositsByBillingType);
router.get('/payments/insurance',    ionmController.getDepositsByInsurance);

// Production page
router.get('/production/dos-chart',  ionmController.getProductionDosChart);
router.get('/production/doe-chart',  ionmController.getProductionDoeChart);
router.get('/production/dos-reimb',  ionmController.getProductionDosReimbursement);
router.get('/production/doe-reimb',  ionmController.getProductionDoeReimbursement);
router.get('/production/dod-payer',  ionmController.getProductionDodByPayer);
router.get('/production/dod-biller', ionmController.getProductionDodByBillingEntity);

// AR page
router.get('/ar/dos',       ionmController.getArDos);
router.get('/ar/doe',       ionmController.getArDoe);
router.get('/ar/insurance', ionmController.getArInsurance);
router.get('/ar/surgeon',   ionmController.getArSurgeon);

// Procedure page
router.get('/procedure/deposits',  ionmController.getProcedureDeposits);
router.get('/procedure/charges',   ionmController.getProcedureCharges);
router.get('/procedure/more',      ionmController.getProcedureMore);
router.get('/procedure/dod-more',  ionmController.getProcedureDodMore);

// Insights page
router.get('/insights/insurance',   ionmController.getInsightsInsurance);
router.get('/insights/surgeon',     ionmController.getInsightsSurgeon);
router.get('/insights/reader',      ionmController.getInsightsReader);
router.get('/insights/technician',  ionmController.getInsightsTechnician);
router.get('/insights/surgeon-list',  ionmController.getInsightsSurgeonList);
router.get('/insights/reader-list',   ionmController.getInsightsReaderList);
router.get('/insights/tech-list',     ionmController.getInsightsTechList);

// IDR Payment Summary page
router.get('/idr/payment-trend', ionmController.getIdrPaymentTrend);
router.get('/idr/status-count',  ionmController.getIdrStatusCount);
router.get('/idr/pro-tech',      ionmController.getIdrProTech);
router.get('/idr/insurance',     ionmController.getIdrInsurance);

// Debug
router.get('/debug/columns', ionmController.getSchemaColumns);

// --- Data Source export: GET /api/ionm/datasource?chart=X ---
router.get('/datasource', ionmController.getDataSource);

module.exports = router;
