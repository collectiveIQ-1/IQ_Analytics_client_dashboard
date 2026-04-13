/**
 * routes/index.js — Aggregates all route modules under /api
 */

const express         = require('express');
const authRoutes      = require('./auth.routes');
const usersRoutes     = require('./users.routes');
const clientsRoutes   = require('./clients.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

router.use('/auth',      authRoutes);
router.use('/users',     usersRoutes);
router.use('/clients',   clientsRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
