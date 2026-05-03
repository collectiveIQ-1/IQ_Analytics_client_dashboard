/**
 * error.middleware.js — Global Express error handler.
 * Must be the last middleware registered in server.js.
 *
 * In development:  returns the real error message so you can diagnose quickly.
 * In production:   returns only the generic "Internal server error." for unhandled errors,
 *                  preventing DB internals from leaking to clients.
 */

const logger = require('../utils/logger');
const env    = require('../config/env');

const isDev = env.NODE_ENV === 'development';

// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  // Always log the full error server-side
  logger.error(`${req.method} ${req.path} [${statusCode}] — ${err.message}`);
  if (isDev && !err.statusCode) {
    // Log stack trace for unexpected errors in development
    logger.error(err.stack || err);
  }

  // Craft the response message
  let message;
  if (err.statusCode) {
    // Known application error — always safe to surface
    message = err.message;
  } else if (isDev) {
    // Unknown error in dev — surface the real message for diagnostics
    message = err.message || 'Internal server error.';
  } else {
    // Unknown error in production — hide internals
    message = 'Internal server error.';
  }

  res.status(statusCode).json({ success: false, message });
}

module.exports = errorMiddleware;
