/**
 * users.controller.js — Handles user management HTTP requests
 */

const { validationResult } = require('express-validator');
const usersService = require('../services/users.service');
const { ok, created, badRequest } = require('../utils/responseHelper');

async function getAll(req, res, next) {
  try {
    const users = await usersService.getAll();
    return ok(res, users);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const user = await usersService.getById(parseInt(req.params.id, 10));
    return ok(res, user);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return badRequest(res, 'Validation failed.', errors.array());
  try {
    const user = await usersService.create(req.body);
    return created(res, user, 'User created successfully.');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const user = await usersService.update(parseInt(req.params.id, 10), req.body);
    return ok(res, user, 'User updated.');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const result = await usersService.remove(parseInt(req.params.id, 10));
    return ok(res, result, 'User deleted.');
  } catch (err) { next(err); }
}

async function getUserClients(req, res, next) {
  try {
    const clients = await usersService.getUserClients(parseInt(req.params.id, 10));
    return ok(res, clients);
  } catch (err) { next(err); }
}

async function assignClientAccess(req, res, next) {
  try {
    const { clientId } = req.body;
    if (!clientId) return badRequest(res, 'clientId is required.');
    const result = await usersService.assignClientAccess(
      parseInt(req.params.id, 10),
      parseInt(clientId, 10),
      req.user.userId
    );
    return ok(res, result, 'Client access assigned.');
  } catch (err) { next(err); }
}

async function removeClientAccess(req, res, next) {
  try {
    const result = await usersService.removeClientAccess(
      parseInt(req.params.id, 10),
      parseInt(req.params.clientId, 10)
    );
    return ok(res, result, 'Client access removed.');
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, remove, getUserClients, assignClientAccess, removeClientAccess };
