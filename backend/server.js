/**
 * IQ Dashboard Platform — Express Server Entry Point
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

const env            = require('./src/config/env');
const routes         = require('./src/routes');
const errorMiddleware = require('./src/middleware/error.middleware');
const logger         = require('./src/utils/logger');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── HTTP request logging ──────────────────────────────────────────────────────
app.use(morgan('dev'));

// ── Rate limiting on auth routes (anti brute-force) ───────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});
app.use('/api/auth', authLimiter);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorMiddleware);

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  logger.info(`IQ Dashboard backend running on port ${env.PORT} [${env.NODE_ENV}]`);
});

module.exports = app;
