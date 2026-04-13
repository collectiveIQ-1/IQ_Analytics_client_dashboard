/**
 * auth.controller.js — Handles auth HTTP requests
 */

const { validationResult } = require('express-validator');
const authService = require('../services/auth.service');
const { ok, badRequest } = require('../utils/responseHelper');

async function login(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return badRequest(res, 'Validation failed.', errors.array());

  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return ok(res, result, 'Login successful.');
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.userId);
    return ok(res, user);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
