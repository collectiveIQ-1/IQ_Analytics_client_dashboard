/**
 * users.routes.js — User management routes (admin only)
 */

const express           = require('express');
const { body }          = require('express-validator');
const usersController   = require('../controllers/users.controller');
const authMiddleware    = require('../middleware/auth.middleware');
const { requireAdmin }  = require('../middleware/role.middleware');

const router = express.Router();

// All user routes require admin
router.use(authMiddleware, requireAdmin);

router.get('/',    usersController.getAll);
router.get('/:id', usersController.getById);

router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('full_name').notEmpty().withMessage('Full name is required.'),
    body('role').isIn(['admin', 'client']).withMessage('Role must be admin or client.'),
  ],
  usersController.create
);

router.put('/:id', usersController.update);
router.delete('/:id', usersController.remove);

// Client access assignment for a user
router.get('/:id/clients',                usersController.getUserClients);
router.post('/:id/clients',               usersController.assignClientAccess);
router.delete('/:id/clients/:clientId',   usersController.removeClientAccess);

module.exports = router;
