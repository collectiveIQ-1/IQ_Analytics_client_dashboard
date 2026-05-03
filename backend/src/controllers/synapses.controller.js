/**
 * synapses.controller.js — HTTP handlers for Synapses dashboard endpoints.
 */

'use strict';

const synapsesSvc = require('../services/synapses.service');
const { ok }      = require('../utils/responseHelper');

async function getKpis(req, res, next) {
  try { return ok(res, await synapsesSvc.getAllKpis()); } catch (e) { next(e); }
}
async function getPaymentHistory(req, res, next) {
  try { return ok(res, await synapsesSvc.getPaymentHistory()); } catch (e) { next(e); }
}
async function getPaymentHistoryFull(req, res, next) {
  try { return ok(res, await synapsesSvc.getPaymentHistoryFull()); } catch (e) { next(e); }
}
async function getChargesVsPayments(req, res, next) {
  try { return ok(res, await synapsesSvc.getChargesVsPayments()); } catch (e) { next(e); }
}
async function getChargesVsPaymentsFull(req, res, next) {
  try { return ok(res, await synapsesSvc.getChargesVsPaymentsFull()); } catch (e) { next(e); }
}
async function getCcrHistory(req, res, next) {
  try { return ok(res, await synapsesSvc.getCcrHistory()); } catch (e) { next(e); }
}
async function getArPie(req, res, next) {
  try { return ok(res, await synapsesSvc.getArPie()); } catch (e) { next(e); }
}
async function getTotalChargesChart(req, res, next) {
  try { return ok(res, await synapsesSvc.getTotalChargesChart()); } catch (e) { next(e); }
}
async function getTotalChargesChartFull(req, res, next) {
  try { return ok(res, await synapsesSvc.getTotalChargesChartFull()); } catch (e) { next(e); }
}
async function getAdjustments(req, res, next) {
  try { return ok(res, await synapsesSvc.getAdjustments()); } catch (e) { next(e); }
}
async function getAdjustmentsFull(req, res, next) {
  try { return ok(res, await synapsesSvc.getAdjustmentsFull()); } catch (e) { next(e); }
}
async function getArDonut(req, res, next) {
  try { return ok(res, await synapsesSvc.getArDonut()); } catch (e) { next(e); }
}
async function getDenialReasons(req, res, next) {
  try { return ok(res, await synapsesSvc.getDenialReasons()); } catch (e) { next(e); }
}
async function getSchemaInfo(req, res, next) {
  try { return ok(res, await synapsesSvc.getSchemaInfo()); } catch (e) { next(e); }
}
async function getSchemaColumns(req, res, next) {
  try { return ok(res, await synapsesSvc.getSchemaColumns()); } catch (e) { next(e); }
}

// --- Payments page ---
async function getPaymentLineChart(req, res, next) {
  try { return ok(res, await synapsesSvc.getPaymentLineChart()); } catch (e) { next(e); }
}
async function getDepositsBySurgeon(req, res, next) {
  try { return ok(res, await synapsesSvc.getDepositsBySurgeon()); } catch (e) { next(e); }
}
async function getDepositsByHospital(req, res, next) {
  try { return ok(res, await synapsesSvc.getDepositsByHospital()); } catch (e) { next(e); }
}
async function getDepositsByBillingType(req, res, next) {
  try { return ok(res, await synapsesSvc.getDepositsByBillingType()); } catch (e) { next(e); }
}
async function getDepositsByInsurance(req, res, next) {
  try { return ok(res, await synapsesSvc.getDepositsByInsurance()); } catch (e) { next(e); }
}

// --- Production page ---
async function getDodAdjustmentsAllTime(req, res, next) {
  try { return ok(res, await synapsesSvc.getDodAdjustmentsAllTime()); } catch (e) { next(e); }
}
async function getProductionDosChart(req, res, next) {
  try { return ok(res, await synapsesSvc.getProductionDosChart()); } catch (e) { next(e); }
}
async function getProductionDoeChart(req, res, next) {
  try { return ok(res, await synapsesSvc.getProductionDoeChart()); } catch (e) { next(e); }
}
async function getProductionDosReimbursement(req, res, next) {
  try { return ok(res, await synapsesSvc.getProductionDosReimbursement()); } catch (e) { next(e); }
}
async function getProductionDoeReimbursement(req, res, next) {
  try { return ok(res, await synapsesSvc.getProductionDoeReimbursement()); } catch (e) { next(e); }
}
async function getProductionDodByPayer(req, res, next) {
  try { return ok(res, await synapsesSvc.getProductionDodByPayer()); } catch (e) { next(e); }
}
async function getProductionDodByBillingEntity(req, res, next) {
  try { return ok(res, await synapsesSvc.getProductionDodByBillingEntity()); } catch (e) { next(e); }
}

// --- AR page ---
async function getArDos(req, res, next) {
  try { return ok(res, await synapsesSvc.getArData('dos')); } catch (e) { next(e); }
}
async function getArDoe(req, res, next) {
  try { return ok(res, await synapsesSvc.getArData('doe')); } catch (e) { next(e); }
}
async function getArInsurance(req, res, next) {
  try { return ok(res, await synapsesSvc.getArInsurance(req.query.mode || 'dos')); } catch (e) { next(e); }
}
async function getArSurgeon(req, res, next) {
  try { return ok(res, await synapsesSvc.getArSurgeon(req.query.mode || 'dos')); } catch (e) { next(e); }
}

// --- Procedure page ---
async function getProcedureDeposits(req, res, next) {
  try { return ok(res, await synapsesSvc.getProcedureDeposits()); } catch (e) { next(e); }
}
async function getProcedureCharges(req, res, next) {
  try { return ok(res, await synapsesSvc.getProcedureCharges(req.query.mode || 'dos')); } catch (e) { next(e); }
}
async function getProcedureMore(req, res, next) {
  try { return ok(res, await synapsesSvc.getProcedureMore(req.query.mode || 'dos')); } catch (e) { next(e); }
}
async function getProcedureDodMore(req, res, next) {
  try { return ok(res, await synapsesSvc.getProcedureDodMore()); } catch (e) { next(e); }
}

// --- Insights page ---
async function getInsightsInsurance(req, res, next) {
  try { return ok(res, await synapsesSvc.getInsightsInsurance()); } catch (e) { next(e); }
}
async function getInsightsSurgeon(req, res, next) {
  try { return ok(res, await synapsesSvc.getInsightsSurgeon(req.query.filter || '')); } catch (e) { next(e); }
}
async function getInsightsReader(req, res, next) {
  try { return ok(res, await synapsesSvc.getInsightsReader(req.query.filter || '')); } catch (e) { next(e); }
}
async function getInsightsTechnician(req, res, next) {
  try { return ok(res, await synapsesSvc.getInsightsTechnician(req.query.filter || '')); } catch (e) { next(e); }
}
async function getInsightsSurgeonList(req, res, next) {
  try { return ok(res, await synapsesSvc.getInsightsSurgeonList()); } catch (e) { next(e); }
}
async function getInsightsReaderList(req, res, next) {
  try { return ok(res, await synapsesSvc.getInsightsReaderList()); } catch (e) { next(e); }
}
async function getInsightsTechList(req, res, next) {
  try { return ok(res, await synapsesSvc.getInsightsTechList()); } catch (e) { next(e); }
}



// ── Payments page (filter-aware) ──────────────────────────────────────────────

function parsePaymentFilters(query) {
  return {
    month:          query.month          || null,
    surgeon:        query.surgeon        || null,
    hospital:       query.hospital       || null,
    billing_type:   query.billing_type   || null,
    insurance_type: query.insurance_type || null,
  };
}

async function getPaymentsLine(req, res, next) {
  try { return ok(res, await synapsesSvc.getPaymentsLine(parsePaymentFilters(req.query))); } catch (e) { next(e); }
}
async function getPaymentsBySurgeon(req, res, next) {
  try { return ok(res, await synapsesSvc.getPaymentsBySurgeon(parsePaymentFilters(req.query))); } catch (e) { next(e); }
}
async function getPaymentsByHospital(req, res, next) {
  try { return ok(res, await synapsesSvc.getPaymentsByHospital(parsePaymentFilters(req.query))); } catch (e) { next(e); }
}
async function getPaymentsByBillingType(req, res, next) {
  try { return ok(res, await synapsesSvc.getPaymentsByBillingType(parsePaymentFilters(req.query))); } catch (e) { next(e); }
}
async function getPaymentsByInsuranceType(req, res, next) {
  try { return ok(res, await synapsesSvc.getPaymentsByInsuranceType(parsePaymentFilters(req.query))); } catch (e) { next(e); }
}

// ── Data Source export — returns full source table (SELECT * FROM iq_ionm.table) ──
const SYNM_DS_MAP = {
  // Home tab
  'payment-history':       { label: 'Payment History (DOD)',            table: 'synapses_full_deposit' },
  'charges-vs-payments':   { label: 'Charges vs Payments',              table: 'synapses_full_billing' },
  'accounts-receivable':   { label: 'Accounts Receivable',              table: 'synapses_full_billing' },
  // Payments tab
  'payment-line':          { label: 'Payment Trend',                    table: 'synapses_full_deposit' },
  'deposits-surgeon':      { label: 'Deposits by Surgeon',              table: 'synapses_full_deposit' },
  'deposits-hospital':     { label: 'Deposits by Hospital',             table: 'synapses_full_deposit' },
  'deposits-billing':      { label: 'Deposits by Billing Type',         table: 'synapses_full_deposit' },
  'deposits-insurance':    { label: 'Deposits by Insurance',            table: 'synapses_full_deposit' },
  // Productions tab
  'production-dos':        { label: 'Production — DOS',                 table: 'synapses_full_billing' },
  'production-doe':        { label: 'Production — DOE',                 table: 'synapses_full_billing' },
  // Accounts Receivable tab
  'ar-dos':                { label: 'AR — Date of Service',             table: 'synapses_full_billing' },
  'ar-doe':                { label: 'AR — Date of Entry',               table: 'synapses_full_billing' },
  'ar-insurance':          { label: 'AR by Insurance',                  table: 'synapses_full_billing' },
  'ar-surgeon':            { label: 'AR by Surgeon',                    table: 'synapses_full_billing' },
  // Insights tab
  'insight-insurance':     { label: 'Insights by Insurance',            table: 'synapses_full_billing' },
  'insight-surgeon':       { label: 'Insights by Surgeon',              table: 'synapses_full_billing' },
  'insight-reader':        { label: 'Insights by Reader',               table: 'synapses_full_billing' },
  'insight-technician':    { label: 'Insights by Technician',           table: 'synapses_full_billing' },
  // Procedure tab
  'procedure-deposits':    { label: 'Procedure Deposits',               table: 'synapses_full_deposit' },
  'procedure-charges':     { label: 'Procedure Charges',                table: 'synapses_full_billing' },
  'procedure-more':        { label: 'Procedure Detail',                 table: 'synapses_full_billing' },
  // IDR Payment Summary tab
  'idr-payments':          { label: 'IDR Payment Summary',              table: 'smartsheet' },
};

async function getDataSource(req, res, next) {
  try {
    const { chart } = req.query;
    if (!chart) return res.status(400).json({ success: false, message: 'Missing required query param: chart' });

    if (chart === 'all') {
      const ids = req.query.charts ? req.query.charts.split(',').map((s) => s.trim()) : Object.keys(SYNM_DS_MAP);
      const results = await Promise.all(ids.map(async (id) => {
        const def = SYNM_DS_MAP[id];
        if (!def) return null;
        console.log(`[SYNM DS] chart="${id}" → table="${def.table}"`);
        const rows = await synapsesSvc.getFullSourceTable(def.table);
        console.log(`[SYNM DS] chart="${id}" → ${rows.length} rows returned`);
        return { chartId: id, label: def.label, schema: 'iq_synapses', table: def.table, rowCount: rows.length, rows };
      }));
      return ok(res, { charts: results.filter(Boolean) });
    }

    const def = SYNM_DS_MAP[chart];
    if (!def) {
      console.log(`[SYNM DS] Unknown chartId="${chart}" — not in SYNM_DS_MAP`);
      return res.status(400).json({ success: false, message: `Unknown chart: "${chart}"` });
    }

    console.log(`[SYNM DS] chart="${chart}" → schema=iq_ionm, table="${def.table}"`);
    const rows = await synapsesSvc.getFullSourceTable(def.table);
    console.log(`[SYNM DS] chart="${chart}" → ${rows.length} rows returned`);
    return ok(res, { chartId: chart, label: def.label, schema: 'iq_synapses', table: def.table, rowCount: rows.length, rows });
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
  getDodAdjustmentsAllTime,
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
  // Payments page (filter-aware)
  getPaymentsLine,
  getPaymentsBySurgeon,
  getPaymentsByHospital,
  getPaymentsByBillingType,
  getPaymentsByInsuranceType,
  getSchemaInfo,
  getDataSource,
};
