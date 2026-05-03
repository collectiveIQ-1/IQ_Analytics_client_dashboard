/**
 * completeneuro.controller.js — HTTP handlers for Complete Neuro dashboard.
 *
 * Data Source export uses a server-side chart-ID map (CN_DS_MAP).
 * Frontend sends ?chart=<id>. Backend resolves to schema + table.
 * Raw table names are NEVER accepted from the frontend.
 */

'use strict';

const cnSvc  = require('../services/completeneuro.service');
const { ok } = require('../utils/responseHelper');

// ── Data Source map: chart ID → source table ──────────────────────────────────
const CN_SCHEMA = 'iq_completeneuro';

const CN_DS_MAP = {
  'payment-history':     { label: 'Payment History',              table: 'completeneuro_full_deposit' },
  'charges-vs-payments': { label: 'Charges vs Payments',          table: 'completeneuro_full_billing' },
  'ccr-history':         { label: 'CCR History',                  table: 'ccr_history' },
  'accounts-receivable': { label: 'Accounts Receivable',          table: 'completeneuro_full_billing' },
  'total-charges':       { label: 'Total Charges',                table: 'completeneuro_full_billing' },
  'adjustments':         { label: 'Total Adjustments',            table: 'completeneuro_full_billing' },
  'ar-donut':            { label: 'AR % >60 Days',                table: 'completeneuro_full_billing' },
  'payment-line':        { label: 'All Time Payment History',     table: 'completeneuro_full_deposit' },
  'deposits-surgeon':    { label: 'Deposits by Surgeon',          table: 'completeneuro_full_deposit' },
  'deposits-hospital':   { label: 'Deposits by Hospital',         table: 'completeneuro_full_deposit' },
  'deposits-billing':    { label: 'Deposits by Billing Type',     table: 'completeneuro_full_deposit' },
  'deposits-insurance':  { label: 'Deposits by Insurance Type',   table: 'completeneuro_full_deposit' },
  'cn-prod-billing':     { label: 'Production Billing Data',      table: 'completeneuro_full_billing' },
  'cn-prod-deposit':     { label: 'Production Deposit Data',      table: 'completeneuro_full_deposit' },
  'cn-ar-billing':       { label: 'AR Billing Data',              table: 'completeneuro_full_billing' },
  'cn-insights-billing': { label: 'Insights Billing Data',        table: 'completeneuro_full_billing' },
};

// ── Home handlers ─────────────────────────────────────────────────────────────

async function getKpis(req, res, next) {
  try { return ok(res, await cnSvc.getAllKpis()); } catch (e) { next(e); }
}
async function getPaymentHistory(req, res, next) {
  try { return ok(res, await cnSvc.getPaymentHistory()); } catch (e) { next(e); }
}
async function getPaymentHistoryFull(req, res, next) {
  try { return ok(res, await cnSvc.getPaymentHistoryFull()); } catch (e) { next(e); }
}
async function getChargesVsPayments(req, res, next) {
  try { return ok(res, await cnSvc.getChargesVsPayments()); } catch (e) { next(e); }
}
async function getChargesVsPaymentsFull(req, res, next) {
  try { return ok(res, await cnSvc.getChargesVsPaymentsFull()); } catch (e) { next(e); }
}
async function getCcrHistory(req, res, next) {
  try { return ok(res, await cnSvc.getCcrHistory()); } catch (e) { next(e); }
}
async function getArPie(req, res, next) {
  try { return ok(res, await cnSvc.getArPie()); } catch (e) { next(e); }
}
async function getTotalChargesChart(req, res, next) {
  try { return ok(res, await cnSvc.getTotalChargesChart()); } catch (e) { next(e); }
}
async function getTotalChargesChartFull(req, res, next) {
  try { return ok(res, await cnSvc.getTotalChargesChartFull()); } catch (e) { next(e); }
}
async function getAdjustments(req, res, next) {
  try { return ok(res, await cnSvc.getAdjustments()); } catch (e) { next(e); }
}
async function getAdjustmentsFull(req, res, next) {
  try { return ok(res, await cnSvc.getAdjustmentsFull()); } catch (e) { next(e); }
}
async function getArDonut(req, res, next) {
  try { return ok(res, await cnSvc.getArDonut()); } catch (e) { next(e); }
}
async function getPaymentLineChart(req, res, next) {
  try { return ok(res, await cnSvc.getPaymentLineChart()); } catch (e) { next(e); }
}
async function getDepositsBySurgeon(req, res, next) {
  try { return ok(res, await cnSvc.getDepositsBySurgeon(req.query.month)); } catch (e) { next(e); }
}
async function getDepositsByHospital(req, res, next) {
  try { return ok(res, await cnSvc.getDepositsByHospital(req.query.month)); } catch (e) { next(e); }
}
async function getDepositsByBillingType(req, res, next) {
  try { return ok(res, await cnSvc.getDepositsByBillingType(req.query.month)); } catch (e) { next(e); }
}
async function getDepositsByInsuranceType(req, res, next) {
  try { return ok(res, await cnSvc.getDepositsByInsuranceType(req.query.month)); } catch (e) { next(e); }
}

// ── Data Source export ────────────────────────────────────────────────────────

async function getDataSource(req, res, next) {
  try {
    const { chart } = req.query;
    if (!chart) {
      return res.status(400).json({ success: false, message: 'Missing required query param: chart' });
    }
    if (chart === 'all') {
      const ids = req.query.charts
        ? req.query.charts.split(',').map((s) => s.trim())
        : Object.keys(CN_DS_MAP);
      const results = await Promise.all(
        ids.map(async (id) => {
          const def = CN_DS_MAP[id];
          if (!def) return null;
          const rows = await cnSvc.getFullSourceTable(def.table);
          return { chartId: id, label: def.label, schema: CN_SCHEMA, table: def.table, rowCount: rows.length, rows };
        }),
      );
      return ok(res, { charts: results.filter(Boolean) });
    }
    const def = CN_DS_MAP[chart];
    if (!def) {
      return res.status(400).json({ success: false, message: `Unknown chart: "${chart}"` });
    }
    const rows = await cnSvc.getFullSourceTable(def.table);
    return ok(res, { chartId: chart, label: def.label, schema: CN_SCHEMA, table: def.table, rowCount: rows.length, rows });
  } catch (err) { next(err); }
}

// ── Production handlers ───────────────────────────────────────────────────────

async function getProductionDosChart(req, res, next) {
  try { return ok(res, await cnSvc.getProductionDosChart()); } catch (e) { next(e); }
}
async function getProductionDoeChart(req, res, next) {
  try { return ok(res, await cnSvc.getProductionDoeChart()); } catch (e) { next(e); }
}
async function getProductionDosReimbursement(req, res, next) {
  try { return ok(res, await cnSvc.getProductionDosReimbursement()); } catch (e) { next(e); }
}
async function getProductionDoeReimbursement(req, res, next) {
  try { return ok(res, await cnSvc.getProductionDoeReimbursement()); } catch (e) { next(e); }
}
async function getProductionDodAdjustments(req, res, next) {
  try { return ok(res, await cnSvc.getProductionDodAdjustments()); } catch (e) { next(e); }
}
async function getProductionDodPayments(req, res, next) {
  try { return ok(res, await cnSvc.getProductionDodPayments()); } catch (e) { next(e); }
}
async function getProductionDodByPayer(req, res, next) {
  try { return ok(res, await cnSvc.getProductionDodByPayer()); } catch (e) { next(e); }
}
async function getProductionDodByBiller(req, res, next) {
  try { return ok(res, await cnSvc.getProductionDodByBiller()); } catch (e) { next(e); }
}
async function getProductionDodReimbursement(req, res, next) {
  try { return ok(res, await cnSvc.getProductionDodReimbursement()); } catch (e) { next(e); }
}

// ── Accounts Receivable handlers ──────────────────────────────────────────────

async function getArDos(req, res, next) {
  try { return ok(res, await cnSvc.getArDos()); } catch (e) { next(e); }
}
async function getArDoe(req, res, next) {
  try { return ok(res, await cnSvc.getArDoe()); } catch (e) { next(e); }
}
async function getArByInsurance(req, res, next) {
  try { return ok(res, await cnSvc.getArByInsurance(req.query.view || 'dos')); } catch (e) { next(e); }
}
async function getArBySurgeon(req, res, next) {
  try { return ok(res, await cnSvc.getArBySurgeon(req.query.view || 'dos')); } catch (e) { next(e); }
}

// ── Insights handlers ─────────────────────────────────────────────────────────

async function getInsightsInsurance(req, res, next) {
  try { return ok(res, await cnSvc.getInsightsInsurance()); } catch (e) { next(e); }
}
async function getInsightsSurgeon(req, res, next) {
  try { return ok(res, await cnSvc.getInsightsSurgeon()); } catch (e) { next(e); }
}
async function getInsightsReader(req, res, next) {
  try { return ok(res, await cnSvc.getInsightsReader()); } catch (e) { next(e); }
}
async function getInsightsTechnician(req, res, next) {
  try { return ok(res, await cnSvc.getInsightsTechnician()); } catch (e) { next(e); }
}

// ── Procedure handlers ────────────────────────────────────────────────────────

async function getProcedureDepositsChart(req, res, next) {
  try { return ok(res, await cnSvc.getProcedureDepositsChart()); } catch (e) { next(e); }
}
async function getProcedureChargesChart(req, res, next) {
  try { return ok(res, await cnSvc.getProcedureChargesChart(req.query.mode || 'dos')); } catch (e) { next(e); }
}
async function getProcedureMore(req, res, next) {
  try { return ok(res, await cnSvc.getProcedureMore(req.query.mode || 'dos')); } catch (e) { next(e); }
}
async function getProcedureDodMore(req, res, next) {
  try { return ok(res, await cnSvc.getProcedureDodMore()); } catch (e) { next(e); }
}
async function getProcedureDodAdjustments(req, res, next) {
  try { return ok(res, await cnSvc.getProcedureDodAdjustments()); } catch (e) { next(e); }
}
async function getProcedureDodPaymentsHistory(req, res, next) {
  try { return ok(res, await cnSvc.getProcedureDodPaymentsHistory()); } catch (e) { next(e); }
}
async function getProcedureDodByBillingEntity(req, res, next) {
  try { return ok(res, await cnSvc.getProcedureDodByBillingEntity()); } catch (e) { next(e); }
}
async function getProcedureDodByPayer(req, res, next) {
  try { return ok(res, await cnSvc.getProcedureDodByPayer()); } catch (e) { next(e); }
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
  getPaymentLineChart,
  getDepositsBySurgeon,
  getDepositsByHospital,
  getDepositsByBillingType,
  getDepositsByInsuranceType,
  getDataSource,
  // Production
  getProductionDosChart,
  getProductionDoeChart,
  getProductionDosReimbursement,
  getProductionDoeReimbursement,
  getProductionDodAdjustments,
  getProductionDodPayments,
  getProductionDodByPayer,
  getProductionDodByBiller,
  getProductionDodReimbursement,
  // Accounts Receivable
  getArDos,
  getArDoe,
  getArByInsurance,
  getArBySurgeon,
  // Insights
  getInsightsInsurance,
  getInsightsSurgeon,
  getInsightsReader,
  getInsightsTechnician,
  // Procedure
  getProcedureDepositsChart,
  getProcedureChargesChart,
  getProcedureMore,
  getProcedureDodMore,
  getProcedureDodAdjustments,
  getProcedureDodPaymentsHistory,
  getProcedureDodByBillingEntity,
  getProcedureDodByPayer,
};
