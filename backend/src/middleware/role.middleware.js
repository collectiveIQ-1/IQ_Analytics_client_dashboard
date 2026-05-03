/**
 * role.middleware.js — Role-based access control middleware.
 * Always used AFTER authMiddleware (requires req.user to be set).
 *
 * Role hierarchy (highest → lowest):
 *   super_admin  → can do everything admin can, plus exclusive destructive actions
 *   admin        → manage client users and dashboards; cannot delete or promote
 *   client       → view own dashboards only
 */

const { forbidden } = require('../utils/responseHelper');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the requester holds super_admin. */
function isSuperAdmin(req) {
  return req.user && req.user.role === 'super_admin';
}

/** Returns true if the requester holds admin OR super_admin. */
function isAdmin(req) {
  return req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');
}

// ── Exported middleware ──────────────────────────────────────────────────────

/**
 * requireAdmin
 * Allows: admin, super_admin
 * Blocks: client, unauthenticated
 *
 * Use this as the baseline guard for all admin-panel routes.
 * super_admin automatically passes because it sits above admin.
 */
function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return forbidden(res, 'Admin access required.');
  }
  next();
}

/**
 * requireSuperAdmin
 * Allows: super_admin ONLY
 * Blocks: admin, client, unauthenticated
 *
 * Use this for high-privilege exclusive actions:
 *   • DELETE /users/:id
 *   • DELETE /clients/:id
 *   • POST   /users  (when creating an admin-role user)
 *   • POST   /users/:id/clients  (assign client access)
 *   • DELETE /users/:id/clients/:clientId (revoke client access)
 */
function requireSuperAdmin(req, res, next) {
  if (!isSuperAdmin(req)) {
    return forbidden(res, 'Super Admin access required. This action is restricted to Super Administrators.');
  }
  next();
}

/**
 * requireClientAccess
 * Grants access when the authenticated user is allowed to view the given clientId.
 *
 * Access rules:
 *   • super_admin → always allowed (full visibility)
 *   • admin       → always allowed (manages all clients)
 *   • client      → only if clientId appears in their JWT clientIds array
 *
 * Use AFTER authMiddleware. Reads clientId from req.params.clientId.
 */
function requireClientAccess(req, res, next) {
  if (!req.user) {
    return forbidden(res, 'Authentication required.');
  }

  // super_admin and admin have access to all clients
  if (isSuperAdmin(req) || req.user.role === 'admin') {
    return next();
  }

  const clientId  = parseInt(req.params.clientId, 10);
  const allowedIds = req.user.clientIds || [];

  if (!allowedIds.includes(clientId)) {
    return forbidden(res, 'You do not have access to this client.');
  }

  next();
}

module.exports = { requireAdmin, requireSuperAdmin, requireClientAccess };
