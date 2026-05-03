/**
 * auth.controller.js — Handles all authentication HTTP requests.
 *
 * Endpoints:
 *   POST   /api/auth/login                  — email + password login
 *   GET    /api/auth/me                     — current user profile (protected)
 *   PUT    /api/auth/change-password        — change password (protected)
 *   POST   /api/auth/forgot-password        — initiate reset flow (public)
 *   GET    /api/auth/reset-password/validate — validate a reset token (public)
 *   POST   /api/auth/reset-password         — complete reset with token (public)
 */

const { validationResult } = require('express-validator');
const authService     = require('../services/auth.service');
const passwordService = require('../services/password.service');
const emailService    = require('../services/email.service');
const { ok, badRequest } = require('../utils/responseHelper');
const env = require('../config/env');

// ── Login ─────────────────────────────────────────────────────────────────────

async function login(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return badRequest(res, 'Validation failed.', errors.array());

  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return ok(res, result, 'Login successful.');
  } catch (err) {
    next(err);
  }
}

// ── Get current user ──────────────────────────────────────────────────────────

async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.userId);
    return ok(res, user);
  } catch (err) {
    next(err);
  }
}

// ── Change password (requires active session) ─────────────────────────────────

async function changePassword(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return badRequest(res, 'Validation failed.', errors.array());

  try {
    const { currentPassword, newPassword } = req.body;
    await passwordService.changePassword(req.user.userId, currentPassword, newPassword);
    return ok(res, null, 'Password changed successfully. Please log in again with your new password.');
  } catch (err) {
    next(err);
  }
}

// ── Forgot password (initiates reset email) ───────────────────────────────────

async function forgotPassword(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return badRequest(res, 'Validation failed.', errors.array());

  try {
    const { email } = req.body;
    await passwordService.forgotPassword(email);
    // ALWAYS return the same message — never reveal whether the email exists
    return ok(
      res,
      null,
      'If an account with that email address exists, a password reset link has been sent. Please check your inbox (and spam folder).'
    );
  } catch (err) {
    next(err);
  }
}

// ── Validate reset token (frontend calls this before showing the reset form) ──

async function validateResetToken(req, res, next) {
  try {
    const { token } = req.query;
    await passwordService.validateResetToken(token);
    return ok(res, { valid: true }, 'Reset token is valid.');
  } catch (err) {
    next(err);
  }
}

// ── Reset password (consumes the token) ──────────────────────────────────────

async function resetPassword(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return badRequest(res, 'Validation failed.', errors.array());

  try {
    const { token, newPassword } = req.body;
    await passwordService.resetPassword(token, newPassword);
    return ok(
      res,
      null,
      'Your password has been reset successfully. You can now log in with your new password.'
    );
  } catch (err) {
    next(err);
  }
}

// ── Dev: get last reset link (DEVELOPMENT ONLY — disabled in production) ─────

async function devGetLastResetLink(req, res) {
  if (env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'Not found.' });
  }
  const store = emailService.getLastDevResetLink();
  if (!store.lastResetUrl) {
    return res.status(404).json({
      success: false,
      message: 'No reset link has been generated yet in this server session. Submit the forgot-password form first.',
    });
  }
  return res.json({
    success:    true,
    message:    'Last generated reset link (DEV only — not available in production).',
    data: {
      to:         store.lastTo,
      resetUrl:   store.lastResetUrl,
      generatedAt: store.lastAt,
    },
  });
}

module.exports = { login, me, changePassword, forgotPassword, validateResetToken, resetPassword, devGetLastResetLink };
