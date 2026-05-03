/**
 * auth.routes.js — Authentication routes
 *
 * Public:
 *   POST   /api/auth/login
 *   POST   /api/auth/forgot-password          (rate-limited: 5/15 min per IP)
 *   GET    /api/auth/reset-password/validate  (token check before showing form)
 *   POST   /api/auth/reset-password
 *
 * Protected (requires valid JWT):
 *   GET    /api/auth/me
 *   PUT    /api/auth/change-password
 */

const express    = require('express');
const { body }   = require('express-validator');
const rateLimit  = require('express-rate-limit');

const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// ── Rate limiter for forgot-password ─────────────────────────────────────────
// 5 requests per 15 minutes per IP — prevents mass-reset abuse.
const forgotPasswordLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please wait 15 minutes and try again.',
  },
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email')
      .isEmail().withMessage('A valid email address is required.')
      .customSanitizer((v) => (typeof v === 'string' ? v.toLowerCase().trim() : v)),
    body('password')
      .notEmpty().withMessage('Password is required.'),
  ],
  authController.login
);

// ── Get current user (protected) ──────────────────────────────────────────────
router.get('/me', authMiddleware, authController.me);

// ── Change password (protected — must be logged in) ───────────────────────────
router.put(
  '/change-password',
  authMiddleware,
  [
    body('currentPassword')
      .notEmpty().withMessage('Current password is required.'),
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('New password must be between 8 and 128 characters.'),
    body('confirmPassword')
      .custom((val, { req }) => {
        if (val !== req.body.newPassword) {
          throw new Error('Passwords do not match.');
        }
        return true;
      }),
  ],
  authController.changePassword
);

// ── Forgot password (public, rate-limited) ────────────────────────────────────
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  [
    body('email')
      .isEmail().withMessage('A valid email address is required.')
      .customSanitizer((v) => (typeof v === 'string' ? v.toLowerCase().trim() : v)),
  ],
  authController.forgotPassword
);

// ── Validate reset token (public GET) ─────────────────────────────────────────
// Frontend calls this on page mount to verify the token before showing the form.
router.get('/reset-password/validate', authController.validateResetToken);

// ── Reset password with token (public) ───────────────────────────────────────
router.post(
  '/reset-password',
  [
    body('token')
      .notEmpty().withMessage('Reset token is required.'),
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters.'),
    body('confirmPassword')
      .custom((val, { req }) => {
        if (val !== req.body.newPassword) {
          throw new Error('Passwords do not match.');
        }
        return true;
      }),
  ],
  authController.resetPassword
);

// ── Dev: retrieve last reset link without digging through console logs ────────
// Only works when NODE_ENV !== 'production'. Returns 404 in production.
// Usage: GET /api/auth/dev/reset-link
router.get('/dev/reset-link', authController.devGetLastResetLink);

module.exports = router;
