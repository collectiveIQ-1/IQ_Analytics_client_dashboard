/**
 * dashboard.routes.js — Schema-scoped dashboard data routes
 * All routes are protected and schema-validated server-side.
 */

const express                          = require('express');
const dashboardController              = require('../controllers/dashboard.controller');
const authMiddleware                   = require('../middleware/auth.middleware');
const { requireClientAccess }          = require('../middleware/role.middleware');

const router = express.Router();

// All dashboard routes require auth + client access check
router.use(authMiddleware);

// :clientId triggers the requireClientAccess middleware
router.get('/:clientId/summary', requireClientAccess, dashboardController.getSummary);
router.get('/:clientId/kpis',    requireClientAccess, dashboardController.getKpis);
router.get('/:clientId/charts',  requireClientAccess, dashboardController.getCharts);
router.get('/:clientId/reports', requireClientAccess, dashboardController.getReports);

module.exports = router;
