/**
 * confidas.controller.js — HTTP handlers for Confidas dashboard endpoints.
 */

'use strict';

const confidasService = require('../services/confidas.service');
const { ok }          = require('../utils/responseHelper');

async function getKpis(req, res, next) {
  try { return ok(res, await confidasService.getAllKpis()); }
  catch (err) { next(err); }
}

async function getPaymentHistory(req, res, next) {
  try { return ok(res, await confidasService.getPaymentHistory()); }
  catch (err) { next(err); }
}

async function getPaymentHistoryFull(req, res, next) {
  try { return ok(res, await confidasService.getPaymentHistoryFull()); }
  catch (err) { next(err); }
}

async function getChargesVsPayments(req, res, next) {
  try { return ok(res, await confidasService.getChargesVsPayments()); }
  catch (err) { next(err); }
}

async function getChargesVsPaymentsFull(req, res, next) {
  try { return ok(res, await confidasService.getChargesVsPaymentsFull()); }
  catch (err) { next(err); }
}

async function getCcrHistory(req, res, next) {
  try { return ok(res, await confidasService.getCcrHistory()); }
  catch (err) { next(err); }
}

async function getArPie(req, res, next) {
  try { return ok(res, await confidasService.getArPie()); }
  catch (err) { next(err); }
}

async function getArDonut(req, res, next) {
  try { return ok(res, await confidasService.getArDonut()); }
  catch (err) { next(err); }
}

async function getTotalChargesChart(req, res, next) {
  try { return ok(res, await confidasService.getTotalChargesChart()); }
  catch (err) { next(err); }
}

async function getTotalChargesChartFull(req, res, next) {
  try { return ok(res, await confidasService.getTotalChargesChartFull()); }
  catch (err) { next(err); }
}

async function getAdjustments(req, res, next) {
  try { return ok(res, await confidasService.getAdjustments()); }
  catch (err) { next(err); }
}

async function getAdjustmentsFull(req, res, next) {
  try { return ok(res, await confidasService.getAdjustmentsFull()); }
  catch (err) { next(err); }
}

async function getDenialReasons(req, res, next) {
  try { return ok(res, await confidasService.getDenialReasons()); }
  catch (err) { next(err); }
}

async function getSchemaColumns(req, res, next) {
  try { return ok(res, await confidasService.getSchemaColumns()); }
  catch (err) { next(err); }
}



async function getProductionDosChart(req, res, next) {
  try { return ok(res, await confidasService.getProductionDosChart()); } catch (err) { next(err); }
}
async function getProductionDosReimbursement(req, res, next) {
  try { return ok(res, await confidasService.getProductionDosReimbursement()); } catch (err) { next(err); }
}
async function getProductionDoeChart(req, res, next) {
  try { return ok(res, await confidasService.getProductionDoeChart()); } catch (err) { next(err); }
}
async function getProductionDoeReimbursement(req, res, next) {
  try { return ok(res, await confidasService.getProductionDoeReimbursement()); } catch (err) { next(err); }
}
async function getProductionDodPaymentMethod(req, res, next) {
  try { return ok(res, await confidasService.getProductionDodPaymentMethod()); } catch (err) { next(err); }
}
async function getProductionDodReimbursement(req, res, next) {
  try { return ok(res, await confidasService.getProductionDodReimbursement()); } catch (err) { next(err); }
}

async function getBankDeposits(req, res, next) {
  try { return ok(res, await confidasService.getBankDeposits()); }
  catch (err) { next(err); }
}

async function getDepositsByProvider(req, res, next) {
  try {
    const { month = null } = req.query;
    return ok(res, await confidasService.getDepositsByProvider(month));
  }
  catch (err) { next(err); }
}

// ── Facility ──────────────────────────────────────────────────────────────────
async function getFacilityDosLast12(req, res, next) {
  try { const { month = null } = req.query; return ok(res, await confidasService.getConfidasFacilityDosLast12(month)); }
  catch (err) { next(err); }
}
async function getFacilityDosLastMonth(req, res, next) {
  try { return ok(res, await confidasService.getConfidasFacilityDosLastMonth()); }
  catch (err) { next(err); }
}
async function getFacilityDoeLast12(req, res, next) {
  try { const { month = null } = req.query; return ok(res, await confidasService.getConfidasFacilityDoeLast12(month)); }
  catch (err) { next(err); }
}
async function getFacilityDoeLastMonth(req, res, next) {
  try { return ok(res, await confidasService.getConfidasFacilityDoeLastMonth()); }
  catch (err) { next(err); }
}
async function getFacilityDodLast12(req, res, next) {
  try { const { month = null } = req.query; return ok(res, await confidasService.getConfidasFacilityDodLast12(month)); }
  catch (err) { next(err); }
}
async function getFacilityDodLastMonth(req, res, next) {
  try { return ok(res, await confidasService.getConfidasFacilityDodLastMonth()); }
  catch (err) { next(err); }
}

// ── AR Page ───────────────────────────────────────────────────────────────────
async function getArBar(req, res, next) {
  try {
    const { mode = 'dos', bucket = null, carrier = null, financial = null } = req.query;
    return ok(res, await confidasService.getConfidasArBar(mode, bucket, carrier, financial));
  } catch (err) { next(err); }
}
async function getArPieChart(req, res, next) {
  try {
    const { mode = 'dos', bucket = null, carrier = null, financial = null } = req.query;
    return ok(res, await confidasService.getConfidasArPieChart(mode, bucket, carrier, financial));
  } catch (err) { next(err); }
}
async function getArCarrier(req, res, next) {
  try {
    const { mode = 'dos', bucket = null, carrier = null, financial = null } = req.query;
    return ok(res, await confidasService.getConfidasArCarrier(mode, bucket, carrier, financial));
  } catch (err) { next(err); }
}
async function getArFinancial(req, res, next) {
  try {
    const { mode = 'dos', bucket = null, carrier = null, financial = null } = req.query;
    return ok(res, await confidasService.getConfidasArFinancial(mode, bucket, carrier, financial));
  } catch (err) { next(err); }
}

// ── Insight ───────────────────────────────────────────────────────────────────
async function getInsightDosLast12(req, res, next) {
  try { const { groupBy = 'provider', filter = null } = req.query; return ok(res, await confidasService.getConfidasInsightDosLast12(groupBy, filter)); }
  catch (err) { next(err); }
}
async function getInsightDosLastMonth(req, res, next) {
  try { const { groupBy = 'provider', filter = null } = req.query; return ok(res, await confidasService.getConfidasInsightDosLastMonth(groupBy, filter)); }
  catch (err) { next(err); }
}
async function getInsightDosFilters(req, res, next) {
  try { const { groupBy = 'provider' } = req.query; return ok(res, await confidasService.getConfidasInsightDosFilters(groupBy)); }
  catch (err) { next(err); }
}
async function getInsightDoeLast12(req, res, next) {
  try { const { groupBy = 'provider', filter = null } = req.query; return ok(res, await confidasService.getConfidasInsightDoeLast12(groupBy, filter)); }
  catch (err) { next(err); }
}
async function getInsightDoeLastMonth(req, res, next) {
  try { const { groupBy = 'provider', filter = null } = req.query; return ok(res, await confidasService.getConfidasInsightDoeLastMonth(groupBy, filter)); }
  catch (err) { next(err); }
}
async function getInsightDoeFilters(req, res, next) {
  try { const { groupBy = 'provider' } = req.query; return ok(res, await confidasService.getConfidasInsightDoeFilters(groupBy)); }
  catch (err) { next(err); }
}
async function getInsightDodLast12(req, res, next) {
  try { const { groupBy = 'provider', filter = null } = req.query; return ok(res, await confidasService.getConfidasInsightDodLast12(groupBy, filter)); }
  catch (err) { next(err); }
}
async function getInsightDodLastMonth(req, res, next) {
  try { const { groupBy = 'provider', filter = null } = req.query; return ok(res, await confidasService.getConfidasInsightDodLastMonth(groupBy, filter)); }
  catch (err) { next(err); }
}
async function getInsightDodFilters(req, res, next) {
  try { const { groupBy = 'provider' } = req.query; return ok(res, await confidasService.getConfidasInsightDodFilters(groupBy)); }
  catch (err) { next(err); }
}

// ── Data Source export — returns full source table (SELECT * FROM iq_confidas.table) ──
const CONFIDAS_DS_MAP = {
  // Home tab
  'payment-history':       { label: 'Payment History (DOD)',          table: 'deposit_report' },
  'payment-history-full':  { label: 'All Time Payment History',       table: 'full_deposit_report' },
  'charges-vs-payments':   { label: 'Charges vs Payments (DOE)',      table: 'doe' },
  'accounts-receivable':   { label: 'Accounts Receivable',            table: 'full_ar' },
  'ccr-history':           { label: 'CCR History',                    table: 'ccr_history' },
  // Payments tab
  'bank-deposits':         { label: 'Bank Deposits',                  table: 'bank' },
  'deposits-by-provider':  { label: 'Deposits by Provider',           table: 'deposit_report' },
  // Productions tab
  'production-dos':        { label: 'Production — DOS',               table: 'dos' },
  'production-doe':        { label: 'Production — DOE',               table: 'doe' },
  // Facilities tab
  'facility-dos':          { label: 'Facility Analysis — DOS',        table: 'dos' },
  'facility-doe':          { label: 'Facility Analysis — DOE',        table: 'doe' },
  // Accounts Receivable tab
  'ar-bar':                { label: 'AR by Bucket',                   table: 'full_ar' },
  'ar-carrier':            { label: 'AR by Carrier',                  table: 'full_ar' },
  'ar-financial':          { label: 'AR by Financial Class',          table: 'full_ar' },
  // Insights tab
  'insight-dos':           { label: 'Insights — DOS',                 table: 'dos' },
  'insight-doe':           { label: 'Insights — DOE',                 table: 'doe' },
};

async function getDataSource(req, res, next) {
  try {
    const { chart } = req.query;
    if (!chart) return res.status(400).json({ success: false, message: 'Missing required query param: chart' });

    if (chart === 'all') {
      const ids = req.query.charts ? req.query.charts.split(',').map((s) => s.trim()) : Object.keys(CONFIDAS_DS_MAP);
      const results = await Promise.all(ids.map(async (id) => {
        const def = CONFIDAS_DS_MAP[id];
        if (!def) return null;
        console.log(`[Confidas DS] chart="${id}" → table="${def.table}"`);
        const rows = await confidasService.getFullSourceTable(def.table);
        console.log(`[Confidas DS] chart="${id}" → ${rows.length} rows returned`);
        return { chartId: id, label: def.label, schema: 'iq_confidas', table: def.table, rowCount: rows.length, rows };
      }));
      return ok(res, { charts: results.filter(Boolean) });
    }

    const def = CONFIDAS_DS_MAP[chart];
    if (!def) {
      console.log(`[Confidas DS] Unknown chartId="${chart}" — not in CONFIDAS_DS_MAP`);
      return res.status(400).json({ success: false, message: `Unknown chart: "${chart}"` });
    }

    console.log(`[Confidas DS] chart="${chart}" → schema=iq_confidas, table="${def.table}"`);
    const rows = await confidasService.getFullSourceTable(def.table);
    console.log(`[Confidas DS] chart="${chart}" → ${rows.length} rows returned`);
    return ok(res, { chartId: chart, label: def.label, schema: 'iq_confidas', table: def.table, rowCount: rows.length, rows });
  } catch (err) { next(err); }
}

module.exports = {
  getKpis,
  getPaymentHistory,
  getPaymentHistoryFull,
  getChargesVsPayments,
  getChargesVsPaymentsFull,
  getCcrHistory,
  getArPie,
  getArDonut,
  getTotalChargesChart,
  getTotalChargesChartFull,
  getAdjustments,
  getAdjustmentsFull,
  getDenialReasons,
  getSchemaColumns,
  getProductionDosChart,
  getProductionDosReimbursement,
  getProductionDoeChart,
  getProductionDoeReimbursement,
  getProductionDodPaymentMethod,
  getProductionDodReimbursement,
  getBankDeposits,
  getDepositsByProvider,
  // AR Page
  getArBar,
  getArPieChart,
  getArCarrier,
  getArFinancial,
  // Facility
  getFacilityDosLast12,
  getFacilityDosLastMonth,
  getFacilityDoeLast12,
  getFacilityDoeLastMonth,
  getFacilityDodLast12,
  getFacilityDodLastMonth,
  // Insight
  getInsightDosLast12,
  getInsightDosLastMonth,
  getInsightDosFilters,
  getInsightDoeLast12,
  getInsightDoeLastMonth,
  getInsightDoeFilters,
  getInsightDodLast12,
  getInsightDodLastMonth,
  getInsightDodFilters,
  getDataSource,
};
