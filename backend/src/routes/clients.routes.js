/**
 * clients.routes.js — Client registry routes
 * GET  /api/clients          → admin: all clients; client user: assigned only
 * GET  /api/clients/:id      → single client
 * POST /api/clients          → admin only
 * PUT  /api/clients/:id      → admin only
 * DELETE /api/clients/:id    → admin only
 */

const express             = require('express');
const clientsController   = require('../controllers/clients.controller');
const authMiddleware      = require('../middleware/auth.middleware');
const { requireAdmin }    = require('../middleware/role.middleware');

const router = express.Router();

// All client routes require authentication
router.use(authMiddleware);

router.get('/',    clientsController.getAll);    // role-filtered inside controller
router.get('/:id', clientsController.getById);

// Admin-only mutations
router.post('/',    requireAdmin, clientsController.create);
router.put('/:id',  requireAdmin, clientsController.update);
router.delete('/:id', requireAdmin, clientsController.remove);

module.exports = router;
