/**
 * completeneuro.routes.js — Complete Neuro dashboard API routes.
 * Base path: /api/completeneuro
 */

'use strict';

const express        = require('express');
const cnController   = require('../controllers/completeneuro.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

// KPIs
router.get('/kpis', cnController.getKpis);

// Payment History
router.get('/payment-history',      cnController.getPaymentHistory);
router.get('/payment-history-full', cnController.getPaymentHistoryFull);

// Charges vs Payments
router.get('/charges-vs-payments',      cnController.getChargesVsPayments);
router.get('/charges-vs-payments-full', cnController.getChargesVsPaymentsFull);

// CCR History
router.get('/ccr-history', cnController.getCcrHistory);

// AR Pie
router.get('/ar-pie', cnController.getArPie);

// Total Charges
router.get('/total-charges',      cnController.getTotalChargesChart);
router.get('/total-charges-full', cnController.getTotalChargesChartFull);

// Total Adjustments
router.get('/adjustments',      cnController.getAdjustments);
router.get('/adjustments-full', cnController.getAdjustmentsFull);

// AR Donut
router.get('/ar-donut', cnController.getArDonut);

// Data source export
router.get('/datasource', cnController.getDataSource);

// Payments page
router.get('/payments/line',           cnController.getPaymentLineChart);
router.get('/payments/surgeon',        cnController.getDepositsBySurgeon);
router.get('/payments/hospital',       cnController.getDepositsByHospital);
router.get('/payments/billing-type',   cnController.getDepositsByBillingType);
router.get('/payments/insurance-type', cnController.getDepositsByInsuranceType);

// Production page
router.get('/production/dos-chart',          cnController.getProductionDosChart);
router.get('/production/doe-chart',          cnController.getProductionDoeChart);
router.get('/production/dos-reimbursement',  cnController.getProductionDosReimbursement);
router.get('/production/doe-reimbursement',  cnController.getProductionDoeReimbursement);
router.get('/production/dod-adjustments',    cnController.getProductionDodAdjustments);
router.get('/production/dod-payments',       cnController.getProductionDodPayments);
router.get('/production/dod-by-payer',       cnController.getProductionDodByPayer);
router.get('/production/dod-by-biller',      cnController.getProductionDodByBiller);
router.get('/production/dod-reimbursement',  cnController.getProductionDodReimbursement);

// Accounts Receivable page
router.get('/ar/dos',       cnController.getArDos);
router.get('/ar/doe',       cnController.getArDoe);
router.get('/ar/insurance', cnController.getArByInsurance);
router.get('/ar/surgeon',   cnController.getArBySurgeon);

// Insights page
router.get('/insights/insurance',   cnController.getInsightsInsurance);
router.get('/insights/surgeon',     cnController.getInsightsSurgeon);
router.get('/insights/reader',      cnController.getInsightsReader);
router.get('/insights/technician',  cnController.getInsightsTechnician);

// Procedure page
router.get('/procedure/deposits',             cnController.getProcedureDepositsChart);
router.get('/procedure/charges',              cnController.getProcedureChargesChart);
router.get('/procedure/more',                 cnController.getProcedureMore);
router.get('/procedure/dod-more',             cnController.getProcedureDodMore);
router.get('/procedure/dod-adjustments',      cnController.getProcedureDodAdjustments);
router.get('/procedure/dod-payments-history', cnController.getProcedureDodPaymentsHistory);
router.get('/procedure/dod-billing-entity',   cnController.getProcedureDodByBillingEntity);
router.get('/procedure/dod-payer',            cnController.getProcedureDodByPayer);

module.exports = router;
