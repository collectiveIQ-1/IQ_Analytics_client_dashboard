/**
 * env.js — Validates and exports all environment variables.
 *
 * PRIMARY DATABASE (remote):
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *   These are optional. If missing or if the DB is unreachable at runtime,
 *   the system automatically uses the local fallback database.
 *   Set FORCE_LOCAL_DB=true to skip primary entirely (useful for local development
 *   or when you know the remote DB is unavailable).
 *
 * LOCAL FALLBACK DATABASE:
 *   LOCAL_DB_HOST, LOCAL_DB_PORT, LOCAL_DB_NAME, LOCAL_DB_USER, LOCAL_DB_PASSWORD
 *   All have sensible defaults (localhost / iq_local / iqlocal).
 *   Override in .env as needed. Run sql/local/ scripts to set up the local DB.
 *
 * REQUIRED (always):
 *   JWT_SECRET — app will crash on startup if missing.
 */

'use strict';

// ── Always required ────────────────────────────────────────────────────────────
const alwaysRequired = ['JWT_SECRET'];
alwaysRequired.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
});

// ── Primary DB — warn if incomplete but do NOT crash ──────────────────────────
// The ConnectionManager will handle the missing-vars case by using local DB.
if (process.env.FORCE_LOCAL_DB !== 'true') {
  const primaryKeys = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = primaryKeys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.warn(
      `[env] WARN: Primary DB variable(s) not set: ${missing.join(', ')}. ` +
      `The application will use the LOCAL fallback database.`
    );
  }
}

module.exports = {
  // ── App ───────────────────────────────────────────────────────────────────
  NODE_ENV:      process.env.NODE_ENV     || 'development',
  PORT:          parseInt(process.env.PORT, 10) || 4000,
  FRONTEND_URL:  process.env.FRONTEND_URL || 'http://localhost:5173',

  // ── Primary (remote) PostgreSQL ───────────────────────────────────────────
  // null means "not configured" — ConnectionManager will skip creating this pool.
  DB_HOST:     process.env.DB_HOST     || null,
  DB_PORT:     parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME:     process.env.DB_NAME     || null,
  DB_USER:     process.env.DB_USER     || null,
  DB_PASSWORD: process.env.DB_PASSWORD || null,

  // ── Local fallback PostgreSQL ─────────────────────────────────────────────
  // Defaults point to a local PostgreSQL instance.
  // Run sql/local/ scripts to create and seed the local DB.
  LOCAL_DB_HOST:     process.env.LOCAL_DB_HOST     || 'localhost',
  LOCAL_DB_PORT:     parseInt(process.env.LOCAL_DB_PORT, 10) || 5432,
  LOCAL_DB_NAME:     process.env.LOCAL_DB_NAME     || 'iq_local',
  LOCAL_DB_USER:     process.env.LOCAL_DB_USER     || 'iqlocal',
  LOCAL_DB_PASSWORD: process.env.LOCAL_DB_PASSWORD || 'iqlocal_password',

  // ── Fallback / health-check control ──────────────────────────────────────
  // FORCE_LOCAL_DB=true  → Skip primary pool entirely; always use local DB.
  //                         Useful for local-only development or emergency mode.
  FORCE_LOCAL_DB: process.env.FORCE_LOCAL_DB === 'true',

  // FALLBACK_AUTO_RECOVERY=false → Once on local, stay on local until manual restart.
  //                                  Prevents ping-pong between primary and local.
  FALLBACK_AUTO_RECOVERY: process.env.FALLBACK_AUTO_RECOVERY !== 'false', // default: true

  // How often (ms) the health-check loop pings both databases.
  DB_HEALTH_CHECK_INTERVAL_MS: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL_MS, 10) || 30000,

  // Max ms to wait for pool.connect() when acquiring a real connection.
  DB_CONNECTION_TIMEOUT_MS: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS, 10) || 5000,

  // Max ms for the health-check SELECT 1 ping before declaring a DB unhealthy.
  DB_HEALTH_CHECK_TIMEOUT_MS: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT_MS, 10) || 3000,

  // ── JWT ───────────────────────────────────────────────────────────────────
  JWT_SECRET:     process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // ── Bcrypt ────────────────────────────────────────────────────────────────
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,

  // ── Password reset ────────────────────────────────────────────────────────
  // How many minutes a reset token remains valid (default 60 = 1 hour).
  PASSWORD_RESET_EXPIRES_MINUTES: parseInt(process.env.PASSWORD_RESET_EXPIRES_MINUTES, 10) || 60,

  // ── Email ─────────────────────────────────────────────────────────────────
  // Option A (recommended): Resend — sign up at resend.com, get one API key.
  //   Free: 3,000 emails/month. No SMTP, no domain setup for testing.
  //   Set RESEND_API_KEY and leave EMAIL_HOST empty.
  RESEND_API_KEY: process.env.RESEND_API_KEY || null,

  // Option B: Any SMTP server (Gmail, Office 365, SendGrid, etc.)
  //   Set EMAIL_HOST + EMAIL_USER + EMAIL_PASSWORD.
  EMAIL_HOST:     process.env.EMAIL_HOST     || null,
  EMAIL_PORT:     parseInt(process.env.EMAIL_PORT, 10) || 587,
  EMAIL_SECURE:   process.env.EMAIL_SECURE === 'true',
  EMAIL_USER:     process.env.EMAIL_USER     || null,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || null,

  // The "From" address shown in emails.
  // For Resend free tier use: onboarding@resend.dev (works without domain verification)
  // For production use your own domain: noreply@collectivercm.com
  EMAIL_FROM: process.env.EMAIL_FROM || '"IQ Dashboard" <onboarding@resend.dev>',
};
