'use strict';

const express       = require('express');
const arController  = require('../controllers/ar.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/dos',       arController.getArDos);
router.get('/doe',       arController.getArDoe);
router.get('/carrier',   arController.getArCarrier);
router.get('/financial', arController.getArFinancial);

module.exports = router;
