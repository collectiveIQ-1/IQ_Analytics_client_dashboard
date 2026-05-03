/**
 * tat.controller.js — HTTP handlers for Turnaround Time endpoints.
 */

'use strict';

const tatService = require('../services/tat.service');
const { ok }     = require('../utils/responseHelper');

async function getTatLastMonth(req, res, next) {
  try { return ok(res, await tatService.getTatLastMonth()); }
  catch (err) { next(err); }
}

async function getTatLast12(req, res, next) {
  try { return ok(res, await tatService.getTatLast12()); }
  catch (err) { next(err); }
}

// Debug: returns the actual column names in the DB tables
async function getTatColumns(req, res, next) {
  try { return ok(res, await tatService.getTatColumns()); }
  catch (err) { next(err); }
}

module.exports = { getTatLastMonth, getTatLast12, getTatColumns };
