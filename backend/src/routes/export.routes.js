/**
 * export.routes.js — Data Source streaming export
 *
 * GET /api/export/data-source/download?client=qfd&charts=chart1,chart2
 *   — Returns a .xlsx file with one sheet per chart, generated entirely on
 *     the backend using SheetJS (aoa_to_sheet) to avoid browser memory crashes.
 *
 * Requires a valid JWT (authMiddleware).
 */

'use strict';

const express        = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { downloadDataSource } = require('../controllers/export.controller');

const router = express.Router();

// GET /api/export/data-source/download
router.get('/data-source/download', authMiddleware, downloadDataSource);

module.exports = router;
