/**
 * clients.controller.js — Handles client registry HTTP requests
 */

const clientsService = require('../services/clients.service');
const { ok, created } = require('../utils/responseHelper');

async function getAll(req, res, next) {
  try {
    // Admins see all; client users see only their assigned clients
    const clients = req.user.role === 'admin'
      ? await clientsService.getAll()
      : await clientsService.getAssignedForUser(req.user.userId);
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
    const result = await clientsService.remove(parseInt(req.params.id, 10));
    return ok(res, result, 'Client deleted.');
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, remove };
