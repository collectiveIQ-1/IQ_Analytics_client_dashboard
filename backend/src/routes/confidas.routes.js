/**
 * confidas.routes.js — Confidas dashboard API routes.
 * Base path: /api/confidas
 */

'use strict';

const express              = require('express');
const confidasController   = require('../controllers/confidas.controller');
const authMiddleware        = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/kpis',                    confidasController.getKpis);
router.get('/payment-history',         confidasController.getPaymentHistory);
router.get('/payment-history-full',    confidasController.getPaymentHistoryFull);
router.get('/charges-vs-payments',     confidasController.getChargesVsPayments);
router.get('/charges-vs-payments-full',confidasController.getChargesVsPaymentsFull);
router.get('/ccr-history',             confidasController.getCcrHistory);
router.get('/ar-pie',                  confidasController.getArPie);
router.get('/ar-donut',                confidasController.getArDonut);
router.get('/total-charges',           confidasController.getTotalChargesChart);
router.get('/total-charges-full',      confidasController.getTotalChargesChartFull);
router.get('/adjustments',             confidasController.getAdjustments);
router.get('/adjustments-full',        confidasController.getAdjustmentsFull);
router.get('/denial-reasons',          confidasController.getDenialReasons);
router.get('/production/dos-chart',         confidasController.getProductionDosChart);
router.get('/production/dos-reimbursement', confidasController.getProductionDosReimbursement);
router.get('/production/doe-chart',         confidasController.getProductionDoeChart);
router.get('/production/doe-reimbursement', confidasController.getProductionDoeReimbursement);
router.get('/production/dod-payment-method',confidasController.getProductionDodPaymentMethod);
router.get('/production/dod-reimbursement', confidasController.getProductionDodReimbursement);
router.get('/bank-deposits',           confidasController.getBankDeposits);
router.get('/deposits-by-provider',    confidasController.getDepositsByProvider);

// Facility
router.get('/facility/dos/last12',     confidasController.getFacilityDosLast12);
router.get('/facility/dos/lastmonth',  confidasController.getFacilityDosLastMonth);
router.get('/facility/doe/last12',     confidasController.getFacilityDoeLast12);
router.get('/facility/doe/lastmonth',  confidasController.getFacilityDoeLastMonth);
router.get('/facility/dod/last12',     confidasController.getFacilityDodLast12);
router.get('/facility/dod/lastmonth',  confidasController.getFacilityDodLastMonth);

router.get('/debug/columns',           confidasController.getSchemaColumns);

// AR Page  — ?mode=dos|doe  &bucket=...  &carrier=...  &financial=...
router.get('/ar/bar',       confidasController.getArBar);
router.get('/ar/pie-chart', confidasController.getArPieChart);
router.get('/ar/carrier',   confidasController.getArCarrier);
router.get('/ar/financial', confidasController.getArFinancial);

// Insight  — ?groupBy=provider|carrier|procedure|referringprovider  &filter=<value>
router.get('/insight/dos/last12',    confidasController.getInsightDosLast12);
router.get('/insight/dos/lastmonth', confidasController.getInsightDosLastMonth);
router.get('/insight/dos/filters',   confidasController.getInsightDosFilters);
router.get('/insight/doe/last12',    confidasController.getInsightDoeLast12);
router.get('/insight/doe/lastmonth', confidasController.getInsightDoeLastMonth);
router.get('/insight/doe/filters',   confidasController.getInsightDoeFilters);
router.get('/insight/dod/last12',    confidasController.getInsightDodLast12);
router.get('/insight/dod/lastmonth', confidasController.getInsightDodLastMonth);
router.get('/insight/dod/filters',   confidasController.getInsightDodFilters);

// --- Data Source export: GET /api/confidas/datasource?chart=X ---
router.get('/datasource', confidasController.getDataSource);

module.exports = router;
