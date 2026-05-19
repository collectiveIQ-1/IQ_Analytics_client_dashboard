'use strict';

const express             = require('express');
const clinicalController  = require('../controllers/clinical.controller');
const authMiddleware      = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

// Overview KPIs
router.get('/overview',        clinicalController.getOverview);

// Weekly trends
router.get('/weekly-volume',    clinicalController.getWeeklyVolume);   // PCR + TOX per week
router.get('/weekly-accounts',  clinicalController.getWeeklyAccounts); // Active / new clinics per week

// Monthly trends (one point per month)
router.get('/monthly-volume',   clinicalController.getMonthlyVolume);   // Monthly PCR + TOX totals
router.get('/monthly-accounts', clinicalController.getMonthlyAccounts); // Monthly active + new clinics

// Clinic-level data
router.get('/clinic-summary',  clinicalController.getClinicSummary);  // Per-clinic totals (ranked bar + donut)
router.get('/clinic-weekly',   clinicalController.getClinicWeekly);   // ?topN=10 — top-N clinics over time

// Detailed breakdowns (Clinical Detail tab)
router.get('/by-provider',     clinicalController.getByProvider);     // ?limit=20
router.get('/by-panel',        clinicalController.getByPanel);        // ?limit=20
router.get('/by-specimen',     clinicalController.getBySpecimen);
router.get('/by-runby',        clinicalController.getByRunBy);        // ?limit=20

// Debug
router.get('/debug/columns',   clinicalController.getDebugColumns);

module.exports = router;
