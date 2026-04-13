/**
 * error.middleware.js — Global Express error handler.
 * Must be the last middleware registered in server.js.
 */

const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  logger.error(`${req.method} ${req.path} —`, err.message);

  const statusCode = err.statusCode || 500;
  const message    = err.statusCode ? err.message : 'Internal server error.';

  res.status(statusCode).json({ success: false, message });
}

module.exports = errorMiddleware;
