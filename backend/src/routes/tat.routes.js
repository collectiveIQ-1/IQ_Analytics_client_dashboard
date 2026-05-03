'use strict';

const express        = require('express');
const tatController  = require('../controllers/tat.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/lastmonth',      tatController.getTatLastMonth);
router.get('/last12',         tatController.getTatLast12);
router.get('/debug/columns',  tatController.getTatColumns);   // ← reveals real column names

module.exports = router;
