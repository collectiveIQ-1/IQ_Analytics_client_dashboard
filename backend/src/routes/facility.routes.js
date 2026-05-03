'use strict';

const express            = require('express');
const facilityController = require('../controllers/facility.controller');
const authMiddleware     = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/dos/last12',      facilityController.getDosLast12);     // ?month=YYYY-MM
router.get('/dos/lastmonth',   facilityController.getDosLastMonth);
router.get('/doe/last12',      facilityController.getDoeLast12);     // ?month=YYYY-MM or omit for all
router.get('/doe/lastmonth',   facilityController.getDoeLastMonth);
router.get('/debug/columns',   facilityController.getDebugColumns);
router.get('/dod/last12',      facilityController.getDodLast12);
router.get('/dod/lastmonth',   facilityController.getDodLastMonth);

module.exports = router;
