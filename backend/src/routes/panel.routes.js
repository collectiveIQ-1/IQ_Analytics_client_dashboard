'use strict';

const express          = require('express');
const panelController  = require('../controllers/panel.controller');
const authMiddleware   = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

// Summary KPIs + monthly trend
router.get('/summary',       panelController.getSummary);      // ?dateMode=dos|doe|dod

// DOS endpoints
router.get('/dos/last12',    panelController.getDosLast12);    // ?groupBy=payor|panel|provider|referringprovider&month=YYYY-MM&filter=X&panelType=urine|oral|other
router.get('/dos/lastmonth', panelController.getDosLastMonth); // ?groupBy=...&filter=X&panelType=...

// DOE endpoints
router.get('/doe/last12',    panelController.getDoeLast12);
router.get('/doe/lastmonth', panelController.getDoeLastMonth);

// DOD endpoints (uses enddos column)
router.get('/dod/last12',    panelController.getDodLast12);
router.get('/dod/lastmonth', panelController.getDodLastMonth);

// Filter values for dropdowns
router.get('/filters',       panelController.getFilterValues); // ?dateMode=dos&groupBy=payor

// Debug
router.get('/debug/columns', panelController.getDebugColumns);

module.exports = router;
