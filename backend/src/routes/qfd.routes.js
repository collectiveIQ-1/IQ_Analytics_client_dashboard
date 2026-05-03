/**
 * qfd.routes.js — QFD dashboard API routes.
 *
 * Access: any authenticated user (admin, super_admin, or client assigned to QFD).
 * We intentionally do NOT apply requireAdmin here — client-role users need access
 * to view their own QFD dashboard. Frontend routing already ensures only assigned
 * users can navigate to /dashboard/qfd.
 *
 * All routes require a valid JWT (authMiddleware).
 * Base path: /api/qfd
 */

'use strict';

const express          = require('express');
const qfdController    = require('../controllers/qfd.controller');
const authMiddleware   = require('../middleware/auth.middleware');

const router = express.Router();

// Require valid JWT for every QFD endpoint
router.use(authMiddleware);

// ── KPIs ──────────────────────────────────────────────────────────────────────
router.get('/kpis', qfdController.getKpis);

// ── Payment History ───────────────────────────────────────────────────────────
router.get('/payment-history',      qfdController.getPaymentHistory);
router.get('/payment-history-full', qfdController.getPaymentHistoryFull);
router.get('/bank-deposit-history', qfdController.getBankDepositHistory);
router.get('/deposits-by-referring-provider', qfdController.getDepositsByReferringProvider);
router.get('/deposits-by-facility', qfdController.getDepositsByFacility);

// ── Charges vs Payments ───────────────────────────────────────────────────────
router.get('/charges-vs-payments',      qfdController.getChargesVsPayments);
router.get('/charges-vs-payments-full', qfdController.getChargesVsPaymentsFull);

// ── CCR History ───────────────────────────────────────────────────────────────
router.get('/ccr-history', qfdController.getCcrHistory);

// ── AR Pie (DOE age buckets) ──────────────────────────────────────────────────
router.get('/ar-pie', qfdController.getArPie);

// ── Total Charges chart ───────────────────────────────────────────────────────
router.get('/total-charges',      qfdController.getTotalChargesChart);
router.get('/total-charges-full', qfdController.getTotalChargesChartFull);

// ── Total Adjustments area chart ──────────────────────────────────────────────
router.get('/adjustments',      qfdController.getAdjustments);
router.get('/adjustments-full', qfdController.getAdjustmentsFull);

// ── AR Donut (DOS age buckets, grouped) ───────────────────────────────────────
router.get('/ar-donut', qfdController.getArDonut);

// ── Denial Reasons table ──────────────────────────────────────────────────────
router.get('/denial-reasons', qfdController.getDenialReasons);

// ── Data Source export — returns exact chart query results as JSON ─────────────
// GET /api/qfd/datasource?chart=payment-history-dod
// GET /api/qfd/datasource?chart=all&charts=payment-history-dod,ccr-history
router.get('/datasource', qfdController.getDataSource);

// ── Debug: list actual iq_qfd columns (admin use — verify column names) ───────
router.get('/debug/columns', qfdController.getSchemaColumns);

// ── Production page ───────────────────────────────────────────────────────────
router.get('/production/dos-chart',         qfdController.getProductionDosChart);
router.get('/production/dod-by-method',     qfdController.getProductionDodByMethod);
router.get('/production/dos-reimbursement', qfdController.getProductionDosReimbursement);
router.get('/production/doe-reimbursement', qfdController.getProductionDoeReimbursement);
router.get('/production/dod-reimbursement', qfdController.getProductionDodReimbursement);

module.exports = router;
