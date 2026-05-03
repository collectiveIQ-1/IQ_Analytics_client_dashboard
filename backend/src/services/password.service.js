/**
 * password.service.js — Secure password management: change, forgot, reset.
 *
 * Security model:
 *   • Reset tokens: crypto.randomBytes(32) → 64-char hex raw token sent to user.
 *     Only the SHA-256 hash of the token is stored in the DB (never the raw token).
 *   • Tokens expire after PASSWORD_RESET_EXPIRES_MINUTES (default 60 min).
 *   • Tokens are single-use: marked used=true immediately on successful reset.
 *   • Existing unused tokens for a user are invalidated when a new one is requested.
 *   • Forgot-password always returns 200 regardless of whether the email exists.
 *   • Password changes require bcrypt verification of the current password.
 *   • New passwords must pass strength validation before hashing.
 */

'use strict';

const bcrypt       = require('bcrypt');
const crypto       = require('crypto');
const pool         = require('../db/pool');
const env          = require('../config/env');
const logger       = require('../utils/logger');
const emailService = require('./email.service');

// ── Password strength validation ──────────────────────────────────────────────

/**
 * Enforces server-side password strength rules.
 * Throws a 400 error with a descriptive message if the password is too weak.
 */
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    throw Object.assign(new Error('Password is required.'), { statusCode: 400 });
  }
  if (password.length > 128) {
    throw Object.assign(new Error('Password must not exceed 128 characters.'), { statusCode: 400 });
  }

  const failures = [];
  if (password.length < 8)        failures.push('at least 8 characters');
  if (!/[A-Z]/.test(password))    failures.push('one uppercase letter (A–Z)');
  if (!/[a-z]/.test(password))    failures.push('one lowercase letter (a–z)');
  if (!/[0-9]/.test(password))    failures.push('one number (0–9)');

  if (failures.length > 0) {
    throw Object.assign(
      new Error(`Password must contain ${failures.join(', ')}.`),
      { statusCode: 400 }
    );
  }
}

// ── Change password (requires current password) ───────────────────────────────

/**
 * Change password for an already-authenticated user.
 * @param {number} userId - from the JWT payload
 * @param {string} currentPassword - plain-text; verified against stored hash
 * @param {string} newPassword - plain-text; validated + hashed before storing
 */
async function changePassword(userId, currentPassword, newPassword) {
  // 1. Fetch user
  const result = await pool.query(
    `SELECT id, email, password_hash FROM public.users WHERE id = $1`,
    [userId]
  );
  const user = result.rows[0];
  if (!user) {
    throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  }

  // 2. Verify current password (bcrypt.compare throws on malformed hashes)
  let match = false;
  try {
    match = await bcrypt.compare(currentPassword, user.password_hash);
  } catch (bcryptErr) {
    logger.error(`[AUTH] bcrypt error for user ${user.email}: ${bcryptErr.message}`);
    throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 400 });
  }
  if (!match) {
    throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 400 });
  }

  // 3. Validate new password strength
  validatePasswordStrength(newPassword);

  // 4. New password must differ from current
  const sameAsCurrent = await bcrypt.compare(newPassword, user.password_hash);
  if (sameAsCurrent) {
    throw Object.assign(
      new Error('New password must be different from your current password.'),
      { statusCode: 400 }
    );
  }

  // 5. Hash and persist
  const rounds  = (Number.isInteger(env.BCRYPT_ROUNDS) && env.BCRYPT_ROUNDS > 0) ? env.BCRYPT_ROUNDS : 12;
  const newHash = await bcrypt.hash(newPassword, rounds);

  await pool.query(
    `UPDATE public.users
     SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [newHash, userId]
  );

  logger.info(`[AUTH] Password changed for user ${user.email} (id: ${userId})`);
  return { success: true };
}

// ── Forgot password (initiates reset flow) ────────────────────────────────────

/**
 * Initiates a password reset for the given email address.
 * ALWAYS returns success — never reveals whether the email exists in the system.
 * @param {string} email
 */
async function forgotPassword(email) {
  const normalised = typeof email === 'string' ? email.toLowerCase().trim() : String(email).toLowerCase().trim();

  // Lookup user — silently succeed if not found or inactive
  const result = await pool.query(
    `SELECT id, email, full_name, is_active FROM public.users WHERE LOWER(email) = $1`,
    [normalised]
  );

  if (result.rows.length === 0 || !result.rows[0].is_active) {
    logger.info(`[AUTH] Forgot-password request for unknown/inactive email: ${normalised} (no action taken)`);
    return { success: true }; // Do NOT indicate whether the email exists
  }

  const user = result.rows[0];

  // Generate cryptographically secure raw token (64-char hex = 256 bits of entropy)
  const rawToken  = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(
    Date.now() + (env.PASSWORD_RESET_EXPIRES_MINUTES || 60) * 60 * 1000
  );

  // Invalidate any existing unused tokens for this user (one active reset at a time)
  try {
    await pool.query(
      `UPDATE public.password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
      [user.id]
    );
  } catch (dbErr) {
    if (dbErr.code === '42P01') {
      // Table doesn't exist — migration hasn't been run yet
      logger.error(
        '[AUTH] password_reset_tokens table not found. ' +
        'Run the migration: psql ... -f sql/09_add_password_reset.sql'
      );
      throw Object.assign(
        new Error('Password reset is not yet configured on this server. Please contact your administrator.'),
        { statusCode: 503 }
      );
    }
    throw dbErr;
  }

  // Store only the hashed token
  await pool.query(
    `INSERT INTO public.password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  // Build the reset URL with the RAW token (only this is sent to the user)
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;

  // Send email (falls back to console log if email is not configured)
  await emailService.sendPasswordResetEmail(user.email, user.full_name, resetUrl, expiresAt);

  logger.info(`[AUTH] Password reset token issued for user ${user.email} (expires: ${expiresAt.toISOString()})`);
  return { success: true };
}

// ── Validate reset token (used by frontend before showing the reset form) ─────

/**
 * Validates a raw reset token without consuming it.
 * The frontend calls this on mount to confirm the token is still valid before
 * showing the reset-password form.
 * @param {string} rawToken
 */
async function validateResetToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length !== 64) {
    throw Object.assign(new Error('Invalid reset link. Please request a new one.'), { statusCode: 400 });
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  let result;
  try {
    result = await pool.query(
      `SELECT id, expires_at, used FROM public.password_reset_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
  } catch (dbErr) {
    if (dbErr.code === '42P01') {
      throw Object.assign(
        new Error('Password reset is not yet configured on this server. Please contact your administrator.'),
        { statusCode: 503 }
      );
    }
    throw dbErr;
  }

  const token = result.rows[0];
  if (!token) {
    throw Object.assign(new Error('Invalid or expired reset link. Please request a new one.'), { statusCode: 400 });
  }
  if (token.used) {
    throw Object.assign(
      new Error('This reset link has already been used. Please request a new one.'),
      { statusCode: 400 }
    );
  }
  if (new Date(token.expires_at) < new Date()) {
    throw Object.assign(
      new Error('This reset link has expired. Please request a new one.'),
      { statusCode: 400 }
    );
  }

  return { valid: true };
}

// ── Reset password (consumes the token) ───────────────────────────────────────

/**
 * Resets the password for the user identified by the raw reset token.
 * The token is marked as used atomically with the password update (transaction).
 * @param {string} rawToken - the token from the URL query string
 * @param {string} newPassword - plain-text; validated + hashed before storing
 */
async function resetPassword(rawToken, newPassword) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length !== 64) {
    throw Object.assign(new Error('Invalid reset link. Please request a new one.'), { statusCode: 400 });
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const result = await pool.query(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.email
     FROM public.password_reset_tokens prt
     JOIN public.users u ON u.id = prt.user_id
     WHERE prt.token_hash = $1`,
    [tokenHash]
  );

  const token = result.rows[0];
  if (!token) {
    throw Object.assign(new Error('Invalid or expired reset link. Please request a new one.'), { statusCode: 400 });
  }
  if (token.used) {
    throw Object.assign(
      new Error('This reset link has already been used. Please request a new one.'),
      { statusCode: 400 }
    );
  }
  if (new Date(token.expires_at) < new Date()) {
    throw Object.assign(
      new Error('This reset link has expired. Please request a new one.'),
      { statusCode: 400 }
    );
  }

  // Validate strength before touching the DB
  validatePasswordStrength(newPassword);

  const rounds  = (Number.isInteger(env.BCRYPT_ROUNDS) && env.BCRYPT_ROUNDS > 0) ? env.BCRYPT_ROUNDS : 12;
  const newHash = await bcrypt.hash(newPassword, rounds);

  // Atomic transaction: update password + mark token used
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE public.users
       SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [newHash, token.user_id]
    );

    await client.query(
      `UPDATE public.password_reset_tokens SET used = TRUE WHERE id = $1`,
      [token.id]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  logger.info(`[AUTH] Password reset successfully for user ${token.email} (userId: ${token.user_id})`);
  return { success: true };
}

module.exports = {
  validatePasswordStrength,
  changePassword,
  forgotPassword,
  validateResetToken,
  resetPassword,
};
