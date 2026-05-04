/**
 * routes/index.js - Aggregates all route modules under /api
 */

const express         = require('express');
const authRoutes      = require('./auth.routes');
const usersRoutes     = require('./users.routes');
const clientsRoutes   = require('./clients.routes');
const dashboardRoutes = require('./dashboard.routes');
const qfdRoutes       = require('./qfd.routes');
const usneuroRoutes   = require('./usneuro.routes');
const ionmRoutes      = require('./ionm.routes');
const arRoutes        = require('./ar.routes');
const tatRoutes       = require('./tat.routes');
const facilityRoutes  = require('./facility.routes');
const insightRoutes   = require('./insight.routes');
const panelRoutes     = require('./panel.routes');
const clinicalRoutes  = require('./clinical.routes');
const confidasRoutes      = require('./confidas.routes');
const completeneuroRoutes = require('./completeneuro.routes');
const synapsesRoutes      = require('./synapses.routes');
const exportRoutes        = require('./export.routes');

const router = express.Router();

router.use('/auth',           authRoutes);
router.use('/users',          usersRoutes);
router.use('/clients',        clientsRoutes);
router.use('/dashboard',      dashboardRoutes);
router.use('/qfd',            qfdRoutes);
router.use('/usneuro',        usneuroRoutes);
router.use('/ionm',           ionmRoutes);
router.use('/ar',             arRoutes);
router.use('/tat',            tatRoutes);
router.use('/facility',       facilityRoutes);
router.use('/insight',        insightRoutes);
router.use('/panel',          panelRoutes);
router.use('/clinical',       clinicalRoutes);
router.use('/confidas',       confidasRoutes);
router.use('/completeneuro',  completeneuroRoutes);
router.use('/synapses',       synapsesRoutes);
router.use('/export',         exportRoutes);

module.exports = router;
