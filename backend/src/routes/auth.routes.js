/**
 * auth.routes.js — Authentication routes
 * POST /api/auth/login
 * GET  /api/auth/me
 */

const express        = require('express');
const { body }       = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  authController.login
);

// Get current user (protected)
router.get('/me', authMiddleware, authController.me);

module.exports = router;
