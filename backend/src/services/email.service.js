/**
 * email.service.js — Email delivery for the IQ Dashboard platform.
 *
 * Priority order — uses the first one that is configured:
 *
 *   1. RESEND  (recommended) — Set RESEND_API_KEY in .env.
 *      Sign up free at resend.com → API Keys → Create Key.
 *      3,000 emails/month free. No SMTP, no domain setup needed for testing.
 *
 *   2. SMTP — Set EMAIL_HOST + EMAIL_USER + EMAIL_PASSWORD in .env.
 *      Works with Gmail App Password, Office 365, SendGrid, etc.
 *
 *   3. ETHEREAL (auto fallback) — When nothing is configured, nodemailer
 *      creates a free test inbox and logs a clickable preview URL to the console.
 *      No setup needed — useful for development.
 *
 *   4. CONSOLE — Last resort if nodemailer isn't installed.
 */

'use strict';

const env    = require('../config/env');
const logger = require('../utils/logger');

// ── Lazy-load optional packages ───────────────────────────────────────────────
let Resend     = null;
let nodemailer = null;

try { ({ Resend } = require('resend')); } catch (_) {}
try { nodemailer = require('nodemailer'); } catch (_) {}

// ── In-memory dev store (for /api/auth/dev/reset-link) ───────────────────────
const _devStore = { lastResetUrl: null, lastTo: null, lastAt: null };
function getLastDevResetLink() { return _devStore; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function _expiryLabel(expiresAt) {
  if (!expiresAt) return '1 hour';
  const diffMin = Math.round((new Date(expiresAt) - Date.now()) / 60000);
  return diffMin >= 60 ? `${Math.round(diffMin / 60)} hour(s)` : `${diffMin} minute(s)`;
}

// ── Shared send dispatcher ────────────────────────────────────────────────────
async function _send({ to, subject, html, text }) {
  // 1. Resend API
  if (Resend && env.RESEND_API_KEY) {
    try {
      const resend = new Resend(env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from:    env.EMAIL_FROM || '"IQ Dashboard" <onboarding@resend.dev>',
        to:      [to],
        subject,
        html,
        text,
      });
      if (error) throw new Error(error.message);
      logger.info(`[EMAIL] ✅ Sent via Resend to ${to}`);
      return 'resend';
    } catch (err) {
      logger.error(`[EMAIL] Resend failed: ${err.message}`);
    }
  }

  // 2. SMTP (nodemailer)
  if (nodemailer && env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        host:   env.EMAIL_HOST,
        port:   env.EMAIL_PORT || 587,
        secure: env.EMAIL_SECURE || env.EMAIL_PORT === 465,
        auth:   { user: env.EMAIL_USER, pass: env.EMAIL_PASSWORD },
        tls:    { rejectUnauthorized: env.NODE_ENV === 'production' },
      });
      await transporter.sendMail({
        from: env.EMAIL_FROM || '"IQ Dashboard" <no-reply@collectivercm.com>',
        to, subject, html, text,
      });
      logger.info(`[EMAIL] ✅ Sent via SMTP to ${to}`);
      return 'smtp';
    } catch (err) {
      logger.error(`[EMAIL] SMTP failed: ${err.message}`);
    }
  }

  // 3. Ethereal (auto test account)
  if (nodemailer) {
    try {
      const account     = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: account.smtp.host, port: account.smtp.port, secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass },
      });
      const info       = await transporter.sendMail({ from: '"IQ Dashboard" <test@iq-dashboard.test>', to, subject, html, text });
      const previewUrl = nodemailer.getTestMessageUrl(info);
      logger.warn('');
      logger.warn('╔══════════════════════════════════════════════════════════════════╗');
      logger.warn('║  [EMAIL] ETHEREAL TEST — no Resend/SMTP configured              ║');
      logger.warn(`║  To: ${to.padEnd(58)}║`);
      logger.warn(`║  📧 Preview: ${previewUrl}`);
      logger.warn('║  Set RESEND_API_KEY in backend/.env to send real emails.        ║');
      logger.warn('╚══════════════════════════════════════════════════════════════════╝');
      logger.warn('');
      return 'ethereal';
    } catch (err) {
      logger.error(`[EMAIL] Ethereal failed: ${err.message}`);
    }
  }

  // 4. Console only
  logger.warn(`[EMAIL] CONSOLE FALLBACK — install nodemailer or set RESEND_API_KEY`);
  return 'console';
}

// ── Password reset email ──────────────────────────────────────────────────────
async function sendPasswordResetEmail(to, fullName, resetUrl, expiresAt) {
  const name   = fullName || 'User';
  const expiry = _expiryLabel(expiresAt);

  // Always save for dev endpoint
  _devStore.lastResetUrl = resetUrl;
  _devStore.lastTo       = to;
  _devStore.lastAt       = new Date().toISOString();

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reset Your IQ Dashboard Password</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
       style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:560px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);padding:32px 40px;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">IQ Dashboard</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.78);font-size:13px;">Collective IQ — Internal Platform</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <h2 style="margin:0 0 20px;color:#1e293b;font-size:20px;font-weight:700;">Reset Your Password</h2>
    <p style="margin:0 0 12px;color:#475569;font-size:15px;line-height:1.65;">Hello <strong>${name}</strong>,</p>
    <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.65;">
      We received a request to reset your IQ Dashboard password.
      Click the button below — this link expires in <strong>${expiry}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="center" style="padding-bottom:32px;">
        <a href="${resetUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);
                  color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;
                  font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(220,38,38,0.38);">
          Reset My Password
        </a>
      </td>
    </tr></table>
    <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
      If you didn't request this, you can safely ignore this email.
      This link expires in <strong>${expiry}</strong> and can only be used once.
    </p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;">
    <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;">Button not working? Paste this link into your browser:</p>
    <p style="margin:0;font-size:12px;word-break:break-all;">
      <a href="${resetUrl}" style="color:#3b82f6;">${resetUrl}</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    `Hello ${name},`,
    '',
    'Reset your IQ Dashboard password:',
    resetUrl,
    '',
    `Link expires in ${expiry} and can only be used once.`,
    "If you didn't request this, ignore this email.",
  ].join('\n');

  await _send({ to, subject: 'Reset Your IQ Dashboard Password', html, text });
}

// ── Welcome email ─────────────────────────────────────────────────────────────
async function sendWelcomeEmail(to, fullName, plainPassword, role) {
  const name      = fullName || 'User';
  const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Client';
  const loginUrl  = `${env.FRONTEND_URL || 'http://localhost:5173'}/login`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome to IQ Dashboard</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
       style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:560px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);padding:32px 40px;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">IQ Dashboard</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.78);font-size:13px;">Collective IQ — Internal Platform</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:700;">Welcome, ${name}!</h2>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.65;">
      Your <strong>${roleLabel}</strong> account on the IQ Dashboard has been created.
      Use the credentials below to sign in.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;">
        <p style="margin:0 0 12px;color:#64748b;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
          Your Login Credentials
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#94a3b8;font-size:13px;padding:4px 0;width:80px;">Email</td>
            <td style="color:#1e293b;font-size:14px;font-weight:600;padding:4px 0;">${to}</td>
          </tr>
          <tr>
            <td style="color:#94a3b8;font-size:13px;padding:4px 0;">Password</td>
            <td style="color:#dc2626;font-size:15px;font-weight:700;padding:4px 0;font-family:monospace;">${plainPassword}</td>
          </tr>
        </table>
      </td></tr>
    </table>
    <p style="margin:0 0 24px;color:#f97316;font-size:13px;font-weight:600;">
      ⚠️ Please change your password after your first login.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="center" style="padding-bottom:24px;">
        <a href="${loginUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);
                  color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;
                  font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(220,38,38,0.38);">
          Sign In to IQ Dashboard
        </a>
      </td>
    </tr></table>
    <p style="margin:0;color:#94a3b8;font-size:13px;">
      If you have trouble, contact your administrator.
    </p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;">
    <p style="margin:0;color:#94a3b8;font-size:12px;">
      Login page: <a href="${loginUrl}" style="color:#3b82f6;">${loginUrl}</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    `Welcome to IQ Dashboard, ${name}!`,
    `Your ${roleLabel} account has been created.`,
    '',
    `Email:    ${to}`,
    `Password: ${plainPassword}`,
    '',
    '⚠️  Change your password after first login.',
    `Login: ${loginUrl}`,
  ].join('\n');

  await _send({ to, subject: `Welcome to IQ Dashboard — Your ${roleLabel} Account`, html, text });
}

module.exports = { sendPasswordResetEmail, sendWelcomeEmail, getLastDevResetLink };
