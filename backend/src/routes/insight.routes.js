'use strict';

const express            = require('express');
const insightController  = require('../controllers/insight.controller');
const authMiddleware     = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

// ?groupBy=provider|carrier|procedure|referringprovider  &filter=<value>
router.get('/dos/last12',    insightController.getDosLast12);
router.get('/dos/lastmonth', insightController.getDosLastMonth);
router.get('/doe/last12',    insightController.getDoeLast12);
router.get('/doe/lastmonth', insightController.getDoeLastMonth);

// Filter dropdown values
router.get('/dos/filters',   insightController.getDosFilters);
router.get('/doe/filters',   insightController.getDoeFilters);

// DOD
router.get('/dod/last12',    insightController.getDodLast12);
router.get('/dod/lastmonth', insightController.getDodLastMonth);
router.get('/dod/filters',   insightController.getDodFilters);

module.exports = router;
