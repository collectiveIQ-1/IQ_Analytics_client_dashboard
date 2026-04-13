/**
 * role.middleware.js — Role-based access control middleware.
 * Always used AFTER authMiddleware (requires req.user to be set).
 */

const { forbidden } = require('../utils/responseHelper');

/**
 * Restricts route to admin users only.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return forbidden(res, 'Admin access required.');
  }
  next();
}

/**
 * Restricts route to authenticated users who have access to the given clientId.
 * Admins always pass. Client users must have the clientId in their token.
 * Use AFTER authMiddleware. Reads clientId from req.params.clientId.
 */
function requireClientAccess(req, res, next) {
  if (!req.user) {
    return forbidden(res, 'Authentication required.');
  }

  // Admins have access to everything
  if (req.user.role === 'admin') {
    return next();
  }

  const clientId = parseInt(req.params.clientId, 10);
  const allowedIds = req.user.clientIds || [];

  if (!allowedIds.includes(clientId)) {
    return forbidden(res, 'You do not have access to this client.');
  }

  next();
}

module.exports = { requireAdmin, requireClientAccess };
