/**
 * clients.routes.js — Client registry routes
 *
 * Permission matrix
 * ─────────────────────────────────────────────────────────────
 * GET    /       → all authenticated users (role-filtered in controller)
 * GET    /:id    → all authenticated users
 * POST   /       → admin, super_admin
 * PUT    /:id    → admin, super_admin
 * DELETE /:id    → super_admin ONLY
 * ─────────────────────────────────────────────────────────────
 */

const express                              = require('express');
const clientsController                    = require('../controllers/clients.controller');
const authMiddleware                       = require('../middleware/auth.middleware');
const { requireAdmin, requireSuperAdmin }  = require('../middleware/role.middleware');

const router = express.Router();

// All client routes require authentication
router.use(authMiddleware);

// ── Read ──────────────────────────────────────────────────────
router.get('/',    clientsController.getAll);   // role-filtered inside controller
router.get('/:id', clientsController.getById);

// ── Create / Update → admin + super_admin ─────────────────────
router.post('/',    requireAdmin, clientsController.create);
router.put('/:id',  requireAdmin, clientsController.update);

// ── Delete → super_admin ONLY ─────────────────────────────────
router.patch('/:id/live-status', requireSuperAdmin, clientsController.toggleLiveStatus);
router.delete('/:id', requireSuperAdmin, clientsController.remove);

module.exports = router;
