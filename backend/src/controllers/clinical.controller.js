/**
 * clinical.controller.js — Thin handlers for /api/clinical/* routes.
 *
 * All heavy lifting is done in clinical.service.js.
 */

'use strict';

const svc = require('../services/clinical.service');

const ok  = (res, data) => res.json({ success: true, data });
const err = (res, e, label) => {
  console.error(`[clinical.controller] ${label}:`, e.message);
  res.status(500).json({ success: false, error: e.message });
};

// GET /api/clinical/overview
async function getOverview(req, res) {
  try { ok(res, await svc.getOverview()); }
  catch (e) { err(res, e, 'getOverview'); }
}

// GET /api/clinical/weekly-volume
async function getWeeklyVolume(req, res) {
  try { ok(res, await svc.getWeeklyVolume()); }
  catch (e) { err(res, e, 'getWeeklyVolume'); }
}

// GET /api/clinical/weekly-accounts
async function getWeeklyAccounts(req, res) {
  try { ok(res, await svc.getWeeklyAccounts()); }
  catch (e) { err(res, e, 'getWeeklyAccounts'); }
}

// GET /api/clinical/clinic-summary
async function getClinicSummary(req, res) {
  try { ok(res, await svc.getClinicSummary()); }
  catch (e) { err(res, e, 'getClinicSummary'); }
}

// GET /api/clinical/clinic-weekly?topN=10
async function getClinicWeekly(req, res) {
  const topN = Math.min(parseInt(req.query.topN, 10) || 10, 20);
  try { ok(res, await svc.getClinicWeekly(topN)); }
  catch (e) { err(res, e, 'getClinicWeekly'); }
}

// GET /api/clinical/by-provider?limit=20
async function getByProvider(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  try { ok(res, await svc.getByProvider(limit)); }
  catch (e) { err(res, e, 'getByProvider'); }
}

// GET /api/clinical/by-panel?limit=20
async function getByPanel(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  try { ok(res, await svc.getByPanel(limit)); }
  catch (e) { err(res, e, 'getByPanel'); }
}

// GET /api/clinical/by-specimen
async function getBySpecimen(req, res) {
  try { ok(res, await svc.getBySpecimen()); }
  catch (e) { err(res, e, 'getBySpecimen'); }
}

// GET /api/clinical/by-runby?limit=20
async function getByRunBy(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  try { ok(res, await svc.getByRunBy(limit)); }
  catch (e) { err(res, e, 'getByRunBy'); }
}

// GET /api/clinical/monthly-volume
async function getMonthlyVolume(req, res) {
  try { ok(res, await svc.getMonthlyVolume()); }
  catch (e) { err(res, e, 'getMonthlyVolume'); }
}

// GET /api/clinical/monthly-accounts
async function getMonthlyAccounts(req, res) {
  try { ok(res, await svc.getMonthlyAccounts()); }
  catch (e) { err(res, e, 'getMonthlyAccounts'); }
}

// GET /api/clinical/debug/columns
async function getDebugColumns(req, res) {
  try { ok(res, await svc.getDebugColumns()); }
  catch (e) { err(res, e, 'getDebugColumns'); }
}

module.exports = {
  getOverview,
  getWeeklyVolume,
  getWeeklyAccounts,
  getMonthlyVolume,
  getMonthlyAccounts,
  getClinicSummary,
  getClinicWeekly,
  getByProvider,
  getByPanel,
  getBySpecimen,
  getByRunBy,
  getDebugColumns,
};
