/**
 * ionm.controller.js — HTTP handlers for IOM Help dashboard endpoints.
 */

'use strict';

const ionmService = require('../services/ionm.service');
const { ok }      = require('../utils/responseHelper');

async function getKpis(req, res, next) {
  try { return ok(res, await ionmService.getAllKpis()); } catch (e) { next(e); }
}
async function getPaymentHistory(req, res, next) {
  try { return ok(res, await ionmService.getPaymentHistory()); } catch (e) { next(e); }
}
async function getPaymentHistoryFull(req, res, next) {
  try { return ok(res, await ionmService.getPaymentHistoryFull()); } catch (e) { next(e); }
}
async function getChargesVsPayments(req, res, next) {
  try { return ok(res, await ionmService.getChargesVsPayments()); } catch (e) { next(e); }
}
async function getChargesVsPaymentsFull(req, res, next) {
  try { return ok(res, await ionmService.getChargesVsPaymentsFull()); } catch (e) { next(e); }
}
async function getCcrHistory(req, res, next) {
  try { return ok(res, await ionmService.getCcrHistory()); } catch (e) { next(e); }
}
async function getArPie(req, res, next) {
  try { return ok(res, await ionmService.getArPie()); } catch (e) { next(e); }
}
async function getTotalChargesChart(req, res, next) {
  try { return ok(res, await ionmService.getTotalChargesChart()); } catch (e) { next(e); }
}
async function getTotalChargesChartFull(req, res, next) {
  try { return ok(res, await ionmService.getTotalChargesChartFull()); } catch (e) { next(e); }
}
async function getAdjustments(req, res, next) {
  try { return ok(res, await ionmService.getAdjustments()); } catch (e) { next(e); }
}
async function getAdjustmentsFull(req, res, next) {
  try { return ok(res, await ionmService.getAdjustmentsFull()); } catch (e) { next(e); }
}
async function getArDonut(req, res, next) {
  try { return ok(res, await ionmService.getArDonut()); } catch (e) { next(e); }
}
async function getDenialReasons(req, res, next) {
  try { return ok(res, await ionmService.getDenialReasons()); } catch (e) { next(e); }
}
async function getSchemaColumns(req, res, next) {
  try { return ok(res, await ionmService.getSchemaColumns()); } catch (e) { next(e); }
}

// --- Payments page ---
async function getPaymentLineChart(req, res, next) {
  try { return ok(res, await ionmService.getPaymentLineChart()); } catch (e) { next(e); }
}
async function getDepositsBySurgeon(req, res, next) {
  try { return ok(res, await ionmService.getDepositsBySurgeon()); } catch (e) { next(e); }
}
async function getDepositsByHospital(req, res, next) {
  try { return ok(res, await ionmService.getDepositsByHospital()); } catch (e) { next(e); }
}
async function getDepositsByBillingType(req, res, next) {
  try { return ok(res, await ionmService.getDepositsByBillingType()); } catch (e) { next(e); }
}
async function getDepositsByInsurance(req, res, next) {
  try { return ok(res, await ionmService.getDepositsByInsurance()); } catch (e) { next(e); }
}

// --- Production page ---
async function getProductionDosChart(req, res, next) {
  try { return ok(res, await ionmService.getProductionDosChart()); } catch (e) { next(e); }
}
async function getProductionDoeChart(req, res, next) {
  try { return ok(res, await ionmService.getProductionDoeChart()); } catch (e) { next(e); }
}
async function getProductionDosReimbursement(req, res, next) {
  try { return ok(res, await ionmService.getProductionDosReimbursement()); } catch (e) { next(e); }
}
async function getProductionDoeReimbursement(req, res, next) {
  try { return ok(res, await ionmService.getProductionDoeReimbursement()); } catch (e) { next(e); }
}
async function getProductionDodByPayer(req, res, next) {
  try { return ok(res, await ionmService.getProductionDodByPayer()); } catch (e) { next(e); }
}
async function getProductionDodByBillingEntity(req, res, next) {
  try { return ok(res, await ionmService.getProductionDodByBillingEntity()); } catch (e) { next(e); }
}

// --- AR page ---
async function getArDos(req, res, next) {
  try { return ok(res, await ionmService.getArData('dos')); } catch (e) { next(e); }
}
async function getArDoe(req, res, next) {
  try { return ok(res, await ionmService.getArData('doe')); } catch (e) { next(e); }
}
async function getArInsurance(req, res, next) {
  try { return ok(res, await ionmService.getArInsurance(req.query.mode || 'dos')); } catch (e) { next(e); }
}
async function getArSurgeon(req, res, next) {
  try { return ok(res, await ionmService.getArSurgeon(req.query.mode || 'dos')); } catch (e) { next(e); }
}

// --- Procedure page ---
async function getProcedureDeposits(req, res, next) {
  try { return ok(res, await ionmService.getProcedureDeposits()); } catch (e) { next(e); }
}
async function getProcedureCharges(req, res, next) {
  try { return ok(res, await ionmService.getProcedureCharges(req.query.mode || 'dos')); } catch (e) { next(e); }
}
async function getProcedureMore(req, res, next) {
  try { return ok(res, await ionmService.getProcedureMore(req.query.mode || 'dos')); } catch (e) { next(e); }
}
async function getProcedureDodMore(req, res, next) {
  try { return ok(res, await ionmService.getProcedureDodMore()); } catch (e) { next(e); }
}

// --- Insights page ---
async function getInsightsInsurance(req, res, next) {
  try { return ok(res, await ionmService.getInsightsInsurance()); } catch (e) { next(e); }
}
async function getInsightsSurgeon(req, res, next) {
  try { return ok(res, await ionmService.getInsightsSurgeon(req.query.filter || '')); } catch (e) { next(e); }
}
async function getInsightsReader(req, res, next) {
  try { return ok(res, await ionmService.getInsightsReader(req.query.filter || '')); } catch (e) { next(e); }
}
async function getInsightsTechnician(req, res, next) {
  try { return ok(res, await ionmService.getInsightsTechnician(req.query.filter || '')); } catch (e) { next(e); }
}
async function getInsightsSurgeonList(req, res, next) {
  try { return ok(res, await ionmService.getInsightsSurgeonList()); } catch (e) { next(e); }
}
async function getInsightsReaderList(req, res, next) {
  try { return ok(res, await ionmService.getInsightsReaderList()); } catch (e) { next(e); }
}
async function getInsightsTechList(req, res, next) {
  try { return ok(res, await ionmService.getInsightsTechList()); } catch (e) { next(e); }
}

// --- IDR Payment Summary page ---
async function getIdrPaymentTrend(req, res, next) {
  try { return ok(res, await ionmService.getIdrPaymentTrend()); } catch (e) { next(e); }
}
async function getIdrStatusCount(req, res, next) {
  try { return ok(res, await ionmService.getIdrStatusCount()); } catch (e) { next(e); }
}
async function getIdrProTech(req, res, next) {
  try { return ok(res, await ionmService.getIdrProTech()); } catch (e) { next(e); }
}
async function getIdrInsurance(req, res, next) {
  try { return ok(res, await ionmService.getIdrInsurance()); } catch (e) { next(e); }
}

// ── Data Source export — returns full source table (SELECT * FROM iq_ionm.table) ──
const IONM_DS_MAP = {
  // Home tab
  'payment-history':       { label: 'Payment History (DOD)',            table: 'payment_report' },
  'charges-vs-payments':   { label: 'Charges vs Payments',              table: 'billing_report_iomhelp' },
  'ccr-history':           { label: 'CCR History',                      table: 'ccrhistory' },
  'accounts-receivable':   { label: 'Accounts Receivable',              table: 'billing_report_iomhelp' },
  // Payments tab
  'payment-line':          { label: 'Payment Trend',                    table: 'payment_report' },
  'deposits-surgeon':      { label: 'Deposits by Surgeon',              table: 'payment_report' },
  'deposits-hospital':     { label: 'Deposits by Hospital',             table: 'payment_report' },
  'deposits-billing':      { label: 'Deposits by Billing Type',         table: 'payment_report' },
  'deposits-insurance':    { label: 'Deposits by Insurance',            table: 'payment_report' },
  // Productions tab
  'production-dos':        { label: 'Production — DOS',                 table: 'billing_report_iomhelp' },
  'production-doe':        { label: 'Production — DOE',                 table: 'billing_report_iomhelp' },
  // Accounts Receivable tab
  'ar-dos':                { label: 'AR — Date of Service',             table: 'billing_report_iomhelp' },
  'ar-doe':                { label: 'AR — Date of Entry',               table: 'billing_report_iomhelp' },
  'ar-insurance':          { label: 'AR by Insurance',                  table: 'billing_report_iomhelp' },
  'ar-surgeon':            { label: 'AR by Surgeon',                    table: 'billing_report_iomhelp' },
  // Insights tab
  'insight-insurance':     { label: 'Insights by Insurance',            table: 'billing_report_iomhelp' },
  'insight-surgeon':       { label: 'Insights by Surgeon',              table: 'billing_report_iomhelp' },
  'insight-reader':        { label: 'Insights by Reader',               table: 'billing_report_iomhelp' },
  'insight-technician':    { label: 'Insights by Technician',           table: 'billing_report_iomhelp' },
  // Procedure tab
  'procedure-deposits':    { label: 'Procedure Deposits',               table: 'payment_report' },
  'procedure-charges':     { label: 'Procedure Charges',                table: 'billing_report_iomhelp' },
  'procedure-more':        { label: 'Procedure Detail',                 table: 'billing_report_iomhelp' },
  // IDR Payment Summary tab
  'idr-payments':          { label: 'IDR Payment Summary',              table: 'smartsheet' },
};

async function getDataSource(req, res, next) {
  try {
    const { chart } = req.query;
    if (!chart) return res.status(400).json({ success: false, message: 'Missing required query param: chart' });

    if (chart === 'all') {
      const ids = req.query.charts ? req.query.charts.split(',').map((s) => s.trim()) : Object.keys(IONM_DS_MAP);
      const results = await Promise.all(ids.map(async (id) => {
        const def = IONM_DS_MAP[id];
        if (!def) return null;
        console.log(`[IONM DS] chart="${id}" → table="${def.table}"`);
        const rows = await ionmService.getFullSourceTable(def.table);
        console.log(`[IONM DS] chart="${id}" → ${rows.length} rows returned`);
        return { chartId: id, label: def.label, schema: 'iq_ionm', table: def.table, rowCount: rows.length, rows };
      }));
      return ok(res, { charts: results.filter(Boolean) });
    }

    const def = IONM_DS_MAP[chart];
    if (!def) {
      console.log(`[IONM DS] Unknown chartId="${chart}" — not in IONM_DS_MAP`);
      return res.status(400).json({ success: false, message: `Unknown chart: "${chart}"` });
    }

    console.log(`[IONM DS] chart="${chart}" → schema=iq_ionm, table="${def.table}"`);
    const rows = await ionmService.getFullSourceTable(def.table);
    console.log(`[IONM DS] chart="${chart}" → ${rows.length} rows returned`);
    return ok(res, { chartId: chart, label: def.label, schema: 'iq_ionm', table: def.table, rowCount: rows.length, rows });
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
  getProductionDodByBillingEntity,
  // AR page
  getArDos,
  getArDoe,
  getArInsurance,
  getArSurgeon,
  // Procedure page
  getProcedureDeposits,
  getProcedureCharges,
  getProcedureMore,
  getProcedureDodMore,
  // Insights page
  getInsightsInsurance,
  getInsightsSurgeon,
  getInsightsReader,
  getInsightsTechnician,
  getInsightsSurgeonList,
  getInsightsReaderList,
  getInsightsTechList,
  // IDR Payment Summary
  getIdrPaymentTrend,
  getIdrStatusCount,
  getIdrProTech,
  getIdrInsurance,
  getDataSource,
};
