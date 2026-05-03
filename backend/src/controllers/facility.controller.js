/**
 * facility.controller.js — HTTP handlers for Facility Analysis endpoints.
 */

'use strict';

const facilityService = require('../services/facility.service');
const { ok }          = require('../utils/responseHelper');

async function getDosLast12(req, res, next) {
  try { return ok(res, await facilityService.getFacilityDosLast12(req.query.month || null)); }
  catch (err) { next(err); }
}

async function getDosLastMonth(req, res, next) {
  try { return ok(res, await facilityService.getFacilityDosLastMonth()); }
  catch (err) { next(err); }
}

async function getDoeLast12(req, res, next) {
  try { return ok(res, await facilityService.getFacilityDoeLast12(req.query.month || null)); }
  catch (err) { next(err); }
}

async function getDoeLastMonth(req, res, next) {
  try { return ok(res, await facilityService.getFacilityDoeLastMonth()); }
  catch (err) { next(err); }
}

async function getDebugColumns(req, res, next) {
  try { return ok(res, await facilityService.getFacilityDebugColumns()); }
  catch (err) { next(err); }
}


async function getDodLast12(req, res, next) {
  try { return ok(res, await facilityService.getFacilityDodLast12(req.query.month || null)); }
  catch (err) { next(err); }
}

async function getDodLastMonth(req, res, next) {
  try { return ok(res, await facilityService.getFacilityDodLastMonth()); }
  catch (err) { next(err); }
}

module.exports = { getDodLast12, getDodLastMonth, getDosLast12, getDosLastMonth, getDoeLast12, getDoeLastMonth, getDebugColumns };
