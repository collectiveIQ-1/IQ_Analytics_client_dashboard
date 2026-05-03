/**
 * insight.controller.js — HTTP handlers for Insight Analysis endpoints.
 */
'use strict';

const insightService = require('../services/insight.service');
const { ok }         = require('../utils/responseHelper');

const VALID_GROUPS = ['provider', 'carrier', 'procedure', 'referringprovider'];

function resolveGroup(req) {
  const g = (req.query.groupBy || 'provider').toLowerCase();
  return VALID_GROUPS.includes(g) ? g : 'provider';
}

async function getDosLast12(req, res, next) {
  try {
    const groupBy = resolveGroup(req);
    const filter  = req.query.filter || null;
    return ok(res, await insightService.getInsightDosLast12(groupBy, filter));
  } catch (err) { next(err); }
}

async function getDosLastMonth(req, res, next) {
  try {
    const groupBy = resolveGroup(req);
    const filter  = req.query.filter || null;
    return ok(res, await insightService.getInsightDosLastMonth(groupBy, filter));
  } catch (err) { next(err); }
}

async function getDoeLast12(req, res, next) {
  try {
    const groupBy = resolveGroup(req);
    const filter  = req.query.filter || null;
    return ok(res, await insightService.getInsightDoeLast12(groupBy, filter));
  } catch (err) { next(err); }
}

async function getDoeLastMonth(req, res, next) {
  try {
    const groupBy = resolveGroup(req);
    const filter  = req.query.filter || null;
    return ok(res, await insightService.getInsightDoeLastMonth(groupBy, filter));
  } catch (err) { next(err); }
}

async function getDosFilters(req, res, next) {
  try {
    const groupBy = resolveGroup(req);
    return ok(res, await insightService.getInsightDosFilters(groupBy));
  } catch (err) { next(err); }
}

async function getDoeFilters(req, res, next) {
  try {
    const groupBy = resolveGroup(req);
    return ok(res, await insightService.getInsightDoeFilters(groupBy));
  } catch (err) { next(err); }
}


async function getDodLast12(req, res, next) {
  try {
    const groupBy = resolveGroup(req);
    const filter  = req.query.filter || null;
    return ok(res, await insightService.getInsightDodLast12(groupBy, filter));
  } catch (err) { next(err); }
}

async function getDodLastMonth(req, res, next) {
  try {
    const groupBy = resolveGroup(req);
    const filter  = req.query.filter || null;
    return ok(res, await insightService.getInsightDodLastMonth(groupBy, filter));
  } catch (err) { next(err); }
}

async function getDodFilters(req, res, next) {
  try {
    const groupBy = resolveGroup(req);
    return ok(res, await insightService.getInsightDodFilters(groupBy));
  } catch (err) { next(err); }
}

module.exports = {
  getDodLast12, getDodLastMonth, getDodFilters,
  getDosLast12,
  getDosLastMonth,
  getDoeLast12,
  getDoeLastMonth,
  getDosFilters,
  getDoeFilters,
};
