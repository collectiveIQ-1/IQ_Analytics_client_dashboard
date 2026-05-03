/**
 * usneuro.controller.js - HTTP handlers for US Neuro dashboard endpoints.
 */

'use strict';

const usneuroService = require('../services/usneuro.service');
const { ok }         = require('../utils/responseHelper');

async function getKpis(req, res, next) {
  try { return ok(res, await usneuroService.getAllKpis()); } catch (e) { next(e); }
}
async function getPaymentHistory(req, res, next) {
  try { return ok(res, await usneuroService.getPaymentHistory()); } catch (e) { next(e); }
}
async function getPaymentHistoryFull(req, res, next) {
  try { return ok(res, await usneuroService.getPaymentHistoryFull()); } catch (e) { next(e); }
}
async function getChargesVsPayments(req, res, next) {
  try { return ok(res, await usneuroService.getChargesVsPayments()); } catch (e) { next(e); }
}
async function getChargesVsPaymentsFull(req, res, next) {
  try { return ok(res, await usneuroService.getChargesVsPaymentsFull()); } catch (e) { next(e); }
}
async function getCcrHistory(req, res, next) {
  try { return ok(res, await usneuroService.getCcrHistory()); } catch (e) { next(e); }
}
async function getArPie(req, res, next) {
  try { return ok(res, await usneuroService.getArPie()); } catch (e) { next(e); }
}
async function getTotalChargesChart(req, res, next) {
  try { return ok(res, await usneuroService.getTotalChargesChart()); } catch (e) { next(e); }
}
async function getTotalChargesChartFull(req, res, next) {
  try { return ok(res, await usneuroService.getTotalChargesChartFull()); } catch (e) { next(e); }
}
async function getAdjustments(req, res, next) {
  try { return ok(res, await usneuroService.getAdjustments()); } catch (e) { next(e); }
}
async function getAdjustmentsFull(req, res, next) {
  try { return ok(res, await usneuroService.getAdjustmentsFull()); } catch (e) { next(e); }
}
async function getArDonut(req, res, next) {
  try { return ok(res, await usneuroService.getArDonut()); } catch (e) { next(e); }
}
async function getDenialReasons(req, res, next) {
  try { return ok(res, await usneuroService.getDenialReasons()); } catch (e) { next(e); }
}
async function getSchemaColumns(req, res, next) {
  try { return ok(res, await usneuroService.getSchemaColumns()); } catch (e) { next(e); }
}

// --- Payments page ---
async function getPaymentLineChart(req, res, next) {
  try { return ok(res, await usneuroService.getPaymentLineChart(req.query.mode || 'rcm')); } catch (e) { next(e); }
}
async function getDepositsBySurgeon(req, res, next) {
  try { return ok(res, await usneuroService.getDepositsBySurgeon(req.query.mode || 'rcm')); } catch (e) { next(e); }
}
async function getDepositsByHospital(req, res, next) {
  try { return ok(res, await usneuroService.getDepositsByHospital(req.query.mode || 'rcm')); } catch (e) { next(e); }
}
async function getDepositsByBillingType(req, res, next) {
  try { return ok(res, await usneuroService.getDepositsByBillingType(req.query.mode || 'rcm')); } catch (e) { next(e); }
}
async function getDepositsByInsurance(req, res, next) {
  try { return ok(res, await usneuroService.getDepositsByInsurance(req.query.mode || 'rcm')); } catch (e) { next(e); }
}

// --- Production page ---
async function getProductionDosChart(req, res, next) {
  try { return ok(res, await usneuroService.getProductionDosChart()); } catch (e) { next(e); }
}
async function getProductionDoeChart(req, res, next) {
  try { return ok(res, await usneuroService.getProductionDoeChart()); } catch (e) { next(e); }
}
async function getProductionDosReimbursement(req, res, next) {
  try { return ok(res, await usneuroService.getProductionDosReimbursement()); } catch (e) { next(e); }
}
async function getProductionDoeReimbursement(req, res, next) {
  try { return ok(res, await usneuroService.getProductionDoeReimbursement()); } catch (e) { next(e); }
}
async function getProductionDodByPayer(req, res, next) {
  try { return ok(res, await usneuroService.getProductionDodByPayer()); } catch (e) { next(e); }
}
async function getProductionDodByBillerEntity(req, res, next) {
  try { return ok(res, await usneuroService.getProductionDodByBillerEntity()); } catch (e) { next(e); }
}

// --- AR page ---
async function getArDosBuckets(req, res, next) {
  try { return ok(res, await usneuroService.getArDosBuckets()); } catch (e) { next(e); }
}
async function getArDoeBuckets(req, res, next) {
  try { return ok(res, await usneuroService.getArDoeBuckets()); } catch (e) { next(e); }
}
async function getArTreemap(req, res, next) {
  const { mode = 'dos' } = req.query;
  try { return ok(res, await usneuroService.getArTreemap(mode === 'doe' ? 'billing_date' : 'dos')); } catch (e) { next(e); }
}
async function getArByInsurance(req, res, next) {
  const { mode = 'dos' } = req.query;
  try { return ok(res, await usneuroService.getArByInsurance(mode === 'doe' ? 'billing_date' : 'dos')); } catch (e) { next(e); }
}
async function getArBySurgeon(req, res, next) {
  const { mode = 'dos', surgeon } = req.query;
  try { return ok(res, await usneuroService.getArBySurgeon(mode === 'doe' ? 'billing_date' : 'dos', surgeon)); } catch (e) { next(e); }
}
async function getArSurgeons(req, res, next) {
  try { return ok(res, await usneuroService.getArSurgeons()); } catch (e) { next(e); }
}

// --- Insights page ---
async function getInsightsByInsurance(req, res, next) {
  try { return ok(res, await usneuroService.getInsightsByInsurance()); } catch (e) { next(e); }
}
async function getInsightsBySurgeon(req, res, next) {
  const { surgeon } = req.query;
  try { return ok(res, await usneuroService.getInsightsBySurgeon(surgeon)); } catch (e) { next(e); }
}
async function getInsightsSurgeons(req, res, next) {
  try { return ok(res, await usneuroService.getInsightsSurgeons()); } catch (e) { next(e); }
}

// ── Data Source export — returns full source table (SELECT * FROM iq_usneuro.table) ──
const USNEURO_SCHEMA = 'iq_usneuro';

const USNEURO_DS_MAP = {
  // ── Home tab ─────────────────────────────────────────────────────────────
  'home-total-payments':    { label: 'Total Payments',                      table: 'usneuro_full_deposit' },
  'home-total-charges':     { label: 'Total Charges',                       table: 'usneuro_full_billing' },
  'home-avg-days':          { label: 'AVG Days DOS to DOE',                 table: 'usneuro_full_billing' },
  'home-ccr':               { label: 'Clean Claim Rate',                    table: 'usneuro_ccr'          },
  'payment-history':        { label: 'Payment History',                     table: 'usneuro_full_deposit' },
  'charges-vs-payments':    { label: 'Charges vs Payments',                 table: 'usneuro_full_billing' },
  'ccr-history':            { label: 'CCR History',                         table: 'usneuro_ccrhistory'   },
  'ar-buckets':             { label: 'Accounts Receivable',                 table: 'usneuro_full_billing' },
  'home-total-adjustments': { label: 'Total Adjustments',                   table: 'usneuro_full_billing' },
  'home-ar-over-60':        { label: 'AR % > 60+ Days',                     table: 'usneuro_full_billing' },
  // ── CCR sub-view ─────────────────────────────────────────────────────────
  'ccr-denial-reasons':     { label: 'Top Denial Reasons',                  table: 'usneuro_ccr'          },
  'ccr-detail-history':     { label: 'Clean Claim Rate History',            table: 'usneuro_ccrhistory'   },
  // ── Payments tab ─────────────────────────────────────────────────────────
  'payment-line':           { label: 'Payment Trend Line',                  table: 'usneuro_full_deposit' },
  'deposits-surgeon':       { label: 'Deposits by Surgeon',                 table: 'usneuro_full_deposit' },
  'deposits-hospital':      { label: 'Deposits by Hospital',                table: 'usneuro_full_deposit' },
  'deposits-billing':       { label: 'Deposits by Billing Type',            table: 'usneuro_full_deposit' },
  'deposits-insurance':     { label: 'Deposits by Insurance',               table: 'usneuro_full_deposit' },
  // ── Productions tab ──────────────────────────────────────────────────────
  'production-doe':         { label: 'DOE Charges',                         table: 'usneuro_full_billing' },
  'production-dos':         { label: 'DOS Charges vs Payments',             table: 'usneuro_full_billing' },
  'prod-dod-adjustments':   { label: 'DOD Adjustments',                     table: 'usneuro_full_deposit' },
  'prod-dod-payments':      { label: 'DOD Payments History',                table: 'usneuro_full_deposit' },
  'prod-dod-payer':         { label: 'DOD Payments by Payer',               table: 'usneuro_full_deposit' },
  'prod-dod-biller':        { label: 'DOD Payments by Biller Entity',       table: 'usneuro_full_deposit' },
  'prod-reimb-doe':         { label: 'Reimbursement Analysis — DOE',        table: 'usneuro_full_billing' },
  'prod-reimb-dos':         { label: 'Reimbursement Analysis — DOS',        table: 'usneuro_full_billing' },
  // ── Accounts Receivable tab ───────────────────────────────────────────────
  'ar-dos':                 { label: 'AR — Date of Service',                table: 'usneuro_full_billing' },
  'ar-doe':                 { label: 'AR — Date of Entry',                  table: 'usneuro_full_billing' },
  'ar-treemap':             { label: 'AR by Carrier',                       table: 'usneuro_full_billing' },
  'ar-insurance':           { label: 'AR by Insurance',                     table: 'usneuro_full_billing' },
  'ar-surgeon':             { label: 'AR by Surgeon',                       table: 'usneuro_full_billing' },
  'ar-expanded':            { label: 'AR Expanded View',                    table: 'usneuro_full_billing' },
  // ── Insights tab ─────────────────────────────────────────────────────────
  'insight-insurance':      { label: 'Insurance Wise Analysis',             table: 'usneuro_full_billing' },
  'insight-surgeon':        { label: 'Surgeon Wise Analysis',               table: 'usneuro_full_billing' },
};

async function getDataSource(req, res, next) {
  try {
    const { chart } = req.query;
    if (!chart) return res.status(400).json({ success: false, message: 'Missing required query param: chart' });

    if (chart === 'all') {
      const ids = req.query.charts ? req.query.charts.split(',').map((s) => s.trim()) : Object.keys(USNEURO_DS_MAP);
      const results = await Promise.all(ids.map(async (id) => {
        const def = USNEURO_DS_MAP[id];
        if (!def) return null;
        console.log(`[USNeuro DS] chart="${id}" → table="${def.table}"`);
        const rows = await usneuroService.getFullSourceTable(def.table);
        console.log(`[USNeuro DS] chart="${id}" → ${rows.length} rows returned`);
        return { chartId: id, label: def.label, schema: USNEURO_SCHEMA, table: def.table, rowCount: rows.length, rows };
      }));
      return ok(res, { charts: results.filter(Boolean) });
    }

    const def = USNEURO_DS_MAP[chart];
    if (!def) {
      console.log(`[USNeuro DS] Unknown chartId="${chart}" — not in USNEURO_DS_MAP`);
      return res.status(400).json({ success: false, message: `Unknown chart: "${chart}"` });
    }

    console.log(`[USNeuro DS] chart="${chart}" → schema=${USNEURO_SCHEMA}, table="${def.table}"`);
    const rows = await usneuroService.getFullSourceTable(def.table);
    console.log(`[USNeuro DS] chart="${chart}" → ${rows.length} rows returned`);
    return ok(res, { chartId: chart, label: def.label, schema: USNEURO_SCHEMA, table: def.table, rowCount: rows.length, rows });
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
  getTotalChargesChart,
  getTotalChargesChartFull,
  getAdjustments,
  getAdjustmentsFull,
  getArDonut,
  getDenialReasons,
  getSchemaColumns,
  // Payments page
  getPaymentLineChart,
  getDepositsBySurgeon,
  getDepositsByHospital,
  getDepositsByBillingType,
  getDepositsByInsurance,
  // Production page
  getProductionDosChart,
  getProductionDoeChart,
  getProductionDosReimbursement,
  getProductionDoeReimbursement,
  getProductionDodByPayer,
  getProductionDodByBillerEntity,
  // AR page
  getArDosBuckets,
  getArDoeBuckets,
  getArTreemap,
  getArByInsurance,
  getArBySurgeon,
  getArSurgeons,
  // Insights page
  getInsightsByInsurance,
  getInsightsBySurgeon,
  getInsightsSurgeons,
  getDataSource,
};
