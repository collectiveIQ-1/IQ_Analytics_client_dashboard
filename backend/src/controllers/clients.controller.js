/**
 * clients.controller.js — Handles client registry HTTP requests
 *
 * getAll() role behaviour:
 *   • super_admin → all clients (same as admin)
 *   • admin       → all clients
 *   • client      → only their assigned clients
 */

const clientsService = require('../services/clients.service');
const { ok, created } = require('../utils/responseHelper');

async function getAll(req, res, next) {
  try {
    const { role, userId } = req.user;
    const isAdminLevel = role === 'admin' || role === 'super_admin';
    const clients = isAdminLevel
      ? await clientsService.getAll()
      : await clientsService.getAssignedForUser(userId);
    return ok(res, clients);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const client = await clientsService.getById(parseInt(req.params.id, 10));
    return ok(res, client);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const client = await clientsService.create(req.body);
    return created(res, client, 'Client created.');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const client = await clientsService.update(parseInt(req.params.id, 10), req.body);
    return ok(res, client, 'Client updated.');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    // requireSuperAdmin middleware guards this route.
    // Defence-in-depth: re-check at service call boundary.
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only a Super Admin can delete clients.' });
    }
    const result = await clientsService.remove(parseInt(req.params.id, 10));
    return ok(res, result, 'Client deleted.');
  } catch (err) { next(err); }
}

async function toggleLiveStatus(req, res, next) {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only Super Admin can change live status.' });
    }
    const { is_live } = req.body;
    if (typeof is_live !== 'boolean') {
      return res.status(400).json({ success: false, message: 'is_live must be a boolean.' });
    }
    const client = await clientsService.update(parseInt(req.params.id, 10), { is_live });
    return ok(res, client, is_live ? 'Client marked as Live.' : 'Client set to Coming Soon.');
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, remove, toggleLiveStatus };
