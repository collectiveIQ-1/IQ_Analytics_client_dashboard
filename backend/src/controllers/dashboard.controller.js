/**
 * dashboard.controller.js — Handles dashboard data HTTP requests
 */

const dashboardService = require('../services/dashboard.service');
const { ok } = require('../utils/responseHelper');

async function getSummary(req, res, next) {
  try {
    const data = await dashboardService.getSummary(
      parseInt(req.params.clientId, 10),
      req.user.userId,
      req.user.role
    );
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getKpis(req, res, next) {
  try {
    const data = await dashboardService.getKpis(
      parseInt(req.params.clientId, 10),
      req.user.userId,
      req.user.role
    );
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getCharts(req, res, next) {
  try {
    const data = await dashboardService.getCharts(
      parseInt(req.params.clientId, 10),
      req.user.userId,
      req.user.role
    );
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getReports(req, res, next) {
  try {
    const data = await dashboardService.getReports(
      parseInt(req.params.clientId, 10),
      req.user.userId,
      req.user.role
    );
    return ok(res, data);
  } catch (err) { next(err); }
}

module.exports = { getSummary, getKpis, getCharts, getReports };
