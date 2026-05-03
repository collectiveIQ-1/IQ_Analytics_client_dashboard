/**
 * IQ Dashboard Platform — Express Server Entry Point
 *
 * Changes from the original:
 *   • Imports connectionManager and calls initialize() before listen().
 *   • Adds an X-DB-Mode response header on every API call (read by the frontend
 *     to show a fallback-mode banner).
 *   • /health endpoint now reports both primary and local pool statuses.
 *   • Graceful shutdown on SIGTERM / SIGINT closes both DB pools cleanly.
 */

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const env               = require('./src/config/env');
const routes            = require('./src/routes');
const errorMiddleware   = require('./src/middleware/error.middleware');
const logger            = require('./src/utils/logger');
const connectionManager = require('./src/db/connectionManager');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
// exposedHeaders lets the browser-side axios interceptor read X-DB-Mode.
app.use(cors({
  origin:         env.FRONTEND_URL,
  credentials:    true,
  exposedHeaders: ['X-DB-Mode'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── HTTP request logging ──────────────────────────────────────────────────────
app.use(morgan('dev'));

// ── DB mode header ────────────────────────────────────────────────────────────
// Adds X-DB-Mode: primary|local to every response.
// The React frontend reads this header and shows an amber banner when in local mode.
app.use((_req, res, next) => {
  res.setHeader('X-DB-Mode', connectionManager.mode);
  next();
});

// ── Rate limiting on auth routes (anti brute-force) ───────────────────────────
const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // 15 minutes
  max:            20,
  standardHeaders: true,
  legacyHeaders:  false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});
app.use('/api/auth', authLimiter);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Health check ─────────────────────────────────────────────────────────────
// Reports the status of both pools and the current active mode.
// Returns HTTP 200 if the active database is healthy, HTTP 503 otherwise.
app.get('/health', async (_req, res) => {
  const status = connectionManager.getStatus();

  const activeHealthy =
    (status.mode === 'primary' && status.primary.healthy) ||
    (status.mode === 'local'   && status.local.healthy);

  res.status(activeHealthy ? 200 : 503).json({
    status:    activeHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    dbMode:    status.mode,

    primary: {
      status:      status.primary.healthy  ? 'ok'
                 : status.primary.configured ? 'error'
                 : 'not_configured',
      forced_off:  status.primary.forced_off,
      host:        status.primary.host,
      database:    status.primary.database,
      pool:        status.primary.pool,
    },

    local: {
      status:   status.local.healthy ? 'ok' : 'error',
      host:     status.local.host,
      database: status.local.database,
      pool:     status.local.pool,
    },

    switchCount: status.switchCount,
    initialized: status.initialized,
  });
});

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorMiddleware);

// ── Start server ─────────────────────────────────────────────────────────────
// We initialise the connection manager (runs startup health checks and sets the
// correct mode) before calling listen(). The app starts regardless of DB state —
// individual requests handle errors gracefully.
connectionManager.initialize()
  .catch((err) => {
    logger.error(`[DB] Initialisation warning — proceeding anyway: ${err.message}`);
  })
  .finally(() => {
    app.listen(env.PORT, () => {
      logger.info(`IQ Dashboard backend running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`[DB] Active database mode on startup: ${connectionManager.mode.toUpperCase()}`);
    });
  });

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// Closes both database pools cleanly before the process exits.
async function gracefulShutdown(signal) {
  logger.info(`[Server] ${signal} received — shutting down gracefully...`);
  try {
    await connectionManager.shutdown();
    logger.info('[Server] Database connections closed. Bye.');
  } catch (err) {
    logger.error(`[Server] Error during shutdown: ${err.message}`);
  }
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

module.exports = app;
