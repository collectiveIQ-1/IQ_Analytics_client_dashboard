/**
 * auth.middleware.js — JWT verification middleware.
 * Attaches the decoded user payload to req.user on success.
 */

const jwt    = require('jsonwebtoken');
const env    = require('../config/env');
const { unauthorized } = require('../utils/responseHelper');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded; // { userId, email, role, clientIds }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token has expired. Please log in again.');
    }
    return unauthorized(res, 'Invalid token.');
  }
}

module.exports = authMiddleware;
