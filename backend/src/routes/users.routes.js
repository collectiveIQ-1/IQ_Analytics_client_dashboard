/**
 * users.routes.js — User management routes
 *
 * Permission matrix
 * ─────────────────────────────────────────────────────────────
 * GET    /               → admin, super_admin (super_admin sees all, admin sees non-super_admins)
 * GET    /:id            → admin, super_admin
 * POST   /               → admin (client only) | super_admin (admin or client)
 * PUT    /:id            → admin, super_admin
 * DELETE /:id            → super_admin ONLY
 * GET    /:id/clients    → admin, super_admin
 * POST   /:id/clients    → super_admin ONLY  (assign client access)
 * DELETE /:id/clients/:clientId → super_admin ONLY (revoke access)
 * ─────────────────────────────────────────────────────────────
 */

const express                              = require('express');
const { body }                             = require('express-validator');
const usersController                      = require('../controllers/users.controller');
const authMiddleware                       = require('../middleware/auth.middleware');
const { requireAdmin, requireSuperAdmin }  = require('../middleware/role.middleware');

const router = express.Router();

// All user routes require at minimum admin-level authentication
router.use(authMiddleware, requireAdmin);

// ── Read ──────────────────────────────────────────────────────
router.get('/',    usersController.getAll);
router.get('/:id', usersController.getById);

// ── Create ────────────────────────────────────────────────────
// Validation allows admin and client roles.
// The controller enforces that only super_admin can create an admin user.
router.post(
  '/',
  [
    body('email')
      .isEmail().withMessage('Valid email required.')
      .customSanitizer((val) => (typeof val === 'string' ? val.toLowerCase().trim() : val)),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('full_name')
      .notEmpty().withMessage('Full name is required.'),
    body('role')
      .isIn(['admin', 'client']).withMessage('Role must be "admin" or "client".'),
  ],
  usersController.create
);

// ── Update ────────────────────────────────────────────────────
// admin + super_admin can update users (name, active flag)
router.put('/:id', usersController.update);

// ── Delete ────────────────────────────────────────────────────
// EXCLUSIVE to super_admin — admins cannot delete users
router.delete('/:id', requireSuperAdmin, usersController.remove);

// ── Client access management ──────────────────────────────────
// Viewing which clients a user can access → admin + super_admin
router.get('/:id/clients', usersController.getUserClients);

// Assigning / revoking client access → super_admin ONLY
router.post('/:id/clients',               requireSuperAdmin, usersController.assignClientAccess);
router.delete('/:id/clients/:clientId',   requireSuperAdmin, usersController.removeClientAccess);

module.exports = router;
