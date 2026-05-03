/**
 * panel.controller.js — HTTP handlers for Panel Analysis endpoints.
 */

'use strict';

const panelService = require('../services/panel.service');
const { ok }       = require('../utils/responseHelper');

async function getSummary(req, res, next) {
  try {
    const dateMode = req.query.dateMode || 'dos';
    return ok(res, await panelService.getPanelSummary(dateMode));
  } catch (err) { next(err); }
}

async function getDosLast12(req, res, next) {
  try {
    const { groupBy = 'payor', filter, month, panelType } = req.query;
    return ok(res, await panelService.getPanelDosLast12(groupBy, filter || null, month || null, panelType || null));
  } catch (err) { next(err); }
}

async function getDosLastMonth(req, res, next) {
  try {
    const { groupBy = 'payor', filter, panelType } = req.query;
    return ok(res, await panelService.getPanelDosLastMonth(groupBy, filter || null, panelType || null));
  } catch (err) { next(err); }
}

async function getDoeLast12(req, res, next) {
  try {
    const { groupBy = 'payor', filter, month, panelType } = req.query;
    return ok(res, await panelService.getPanelDoeLast12(groupBy, filter || null, month || null, panelType || null));
  } catch (err) { next(err); }
}

async function getDoeLastMonth(req, res, next) {
  try {
    const { groupBy = 'payor', filter, panelType } = req.query;
    return ok(res, await panelService.getPanelDoeLastMonth(groupBy, filter || null, panelType || null));
  } catch (err) { next(err); }
}

async function getDodLast12(req, res, next) {
  try {
    const { groupBy = 'payor', filter, month, panelType } = req.query;
    return ok(res, await panelService.getPanelDodLast12(groupBy, filter || null, month || null, panelType || null));
  } catch (err) { next(err); }
}

async function getDodLastMonth(req, res, next) {
  try {
    const { groupBy = 'payor', filter, panelType } = req.query;
    return ok(res, await panelService.getPanelDodLastMonth(groupBy, filter || null, panelType || null));
  } catch (err) { next(err); }
}

async function getFilterValues(req, res, next) {
  try {
    const { dateMode = 'dos', groupBy = 'payor' } = req.query;
    return ok(res, await panelService.getPanelFilterValues(dateMode, groupBy));
  } catch (err) { next(err); }
}

async function getDebugColumns(req, res, next) {
  try { return ok(res, await panelService.getPanelDebugColumns()); }
  catch (err) { next(err); }
}

module.exports = {
  getSummary,
  getDosLast12, getDosLastMonth,
  getDoeLast12, getDoeLastMonth,
  getDodLast12, getDodLastMonth,
  getFilterValues,
  getDebugColumns,
};
