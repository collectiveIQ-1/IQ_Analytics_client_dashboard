/**
 * qfd.controller.js — HTTP handlers for QFD dashboard endpoints.
 * Each handler delegates to qfd.service and returns a uniform JSON response.
 */

'use strict';

const qfdService = require('../services/qfd.service');
const { ok }     = require('../utils/responseHelper');

// ── KPIs ─────────────────────────────────────────────────────────────────────

async function getKpis(req, res, next) {
  try {
    const data = await qfdService.getAllKpis();
    return ok(res, data);
  } catch (err) { next(err); }
}

// ── Charts ────────────────────────────────────────────────────────────────────

async function getPaymentHistory(req, res, next) {
  try {
    const data = await qfdService.getPaymentHistory();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getPaymentHistoryFull(req, res, next) {
  try {
    const data = await qfdService.getPaymentHistoryFull();
    return ok(res, data);
  } catch (err) { next(err); }
}


async function getBankDepositHistory(req, res, next) {
  try {
    const data = await qfdService.getBankDepositHistory();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getDepositsByReferringProvider(req, res, next) {
  try {
    const { month, facility = null } = req.query;
    const data = await qfdService.getDepositsByReferringProvider(month, facility);
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getDepositsByFacility(req, res, next) {
  try {
    const { month, provider = null } = req.query;
    const data = await qfdService.getDepositsByFacility(month, provider);
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getChargesVsPayments(req, res, next) {
  try {
    const data = await qfdService.getChargesVsPayments();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getChargesVsPaymentsFull(req, res, next) {
  try {
    const data = await qfdService.getChargesVsPaymentsFull();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getCcrHistory(req, res, next) {
  try {
    const data = await qfdService.getCcrHistory();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getArPie(req, res, next) {
  try {
    const data = await qfdService.getArPie();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getTotalChargesChart(req, res, next) {
  try {
    const data = await qfdService.getTotalChargesChart();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getTotalChargesChartFull(req, res, next) {
  try {
    const data = await qfdService.getTotalChargesChartFull();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getAdjustments(req, res, next) {
  try {
    const data = await qfdService.getAdjustments();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getAdjustmentsFull(req, res, next) {
  try {
    const data = await qfdService.getAdjustmentsFull();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getArDonut(req, res, next) {
  try {
    const data = await qfdService.getArDonut();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getDenialReasons(req, res, next) {
  try {
    const data = await qfdService.getDenialReasons();
    return ok(res, data);
  } catch (err) { next(err); }
}

// ── Debug ─────────────────────────────────────────────────────────────────────

async function getSchemaColumns(req, res, next) {
  try {
    const data = await qfdService.getSchemaColumns();
    return ok(res, data);
  } catch (err) { next(err); }
}


// ── Production ────────────────────────────────────────────────────────────────

async function getProductionDosChart(req, res, next) {
  try {
    const data = await qfdService.getProductionDosChart();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getProductionDodByMethod(req, res, next) {
  try {
    const data = await qfdService.getProductionDodByMethod();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getProductionDosReimbursement(req, res, next) {
  try {
    const data = await qfdService.getProductionDosReimbursement();
    return ok(res, data);
  } catch (err) { next(err); }
}

async function getProductionDoeReimbursement(req, res, next) {
  try {
    const data = await qfdService.getProductionDoeReimbursement();
    return ok(res, data);
  } catch (err) { next(err); }
}


async function getProductionDodReimbursement(req, res, next) {
  try {
    const data = await qfdService.getProductionDodReimbursement();
    return ok(res, data);
  } catch (err) { next(err); }
}

// ── Data Source export ────────────────────────────────────────────────────────
// Returns FULL source table data (SELECT * FROM iq_qfd.table) for each chart.
// NOT chart aggregation. NOT chart summary. ALL columns, ALL rows.
//
// SECURITY: table names come from this server-side map only — never from user input.

const SCHEMA = 'iq_qfd';

const CHART_DS_MAP = {
  // ── Home tab ──────────────────────────────────────────────────────────────
  'payment-history-dod':        { label: 'Payment History (DOD)',                   table: 'deposit_report'           },
  'charges-vs-payments':        { label: 'Charges vs Payments (DOE)',               table: 'doe'                      },
  'ccr-history':                { label: 'CCR History',                             table: 'ccr_history'              },
  'accounts-receivable':        { label: 'Accounts Receivable',                     table: 'full_ar'                  },
  'total-charges':              { label: 'Total Charges (DOE)',                     table: 'doe'                      },
  'total-adjustments':          { label: 'Total Adjustments',                       table: 'adj_report'               },
  'ar-over-60':                 { label: 'AR % > 60+ Days',                         table: 'full_ar'                  },
  // ── CCR sub-view (home/ccr) ───────────────────────────────────────────────
  'ccr-claims':                 { label: 'Clean Claim Rate — Claims',               table: 'ccr'                      },
  'ccr-detail-history':         { label: 'Clean Claim Rate — History',              table: 'ccr_history'              },
  'ccr-denial-reasons':         { label: 'Denial Reasons',                          table: 'ccr'                      },
  // ── Payments tab ──────────────────────────────────────────────────────────
  'payment-history-full':       { label: 'All Time Payment History (DOD)',          table: 'full_deposit_report'      },
  'bank-deposit-history':       { label: 'Bank Deposits',                           table: 'bank'                     },
  'pay-deposits-provider':      { label: 'Deposits by Referring Provider',          table: 'deposit_report'           },
  'pay-deposits-facility':      { label: 'Deposits by Facility',                    table: 'deposit_report'           },
  'charges-vs-payments-full':   { label: 'All Time Charges vs Payments (DOE)',      table: 'doe'                      },
  'total-charges-full':         { label: 'All Time Total Charges (DOE)',            table: 'doe'                      },
  'adjustments-full':           { label: 'All Time Total Adjustments',              table: 'adj_report'               },
  // ── Accounts Receivable tab ───────────────────────────────────────────────
  'ar-dos':                     { label: 'AR — Date of Service',                    table: 'full_ar'                  },
  'ar-doe':                     { label: 'AR — Date of Entry',                      table: 'full_ar'                  },
  'ar-by-carrier':              { label: 'AR by Carrier',                           table: 'full_ar'                  },
  'ar-by-financial':            { label: 'AR by Financial Category',                table: 'full_ar'                  },
  // ── Production tab ────────────────────────────────────────────────────────
  'production-dos':             { label: 'Production — DOS',                        table: 'dos'                      },
  'production-doe':             { label: 'Production — DOE',                        table: 'doe'                      },
  'production-dod-adj':         { label: 'DOD Adjustment History',                  table: 'adj_report'               },
  'production-dod-deposit':     { label: 'DOD Payment History',                     table: 'deposit_report'           },
  'production-dod-method':      { label: 'DOD Payment Method',                      table: 'deposit_report'           },
  'production-reimb-dos':       { label: 'Reimbursement Analysis — DOS',            table: 'dos'                      },
  'production-reimb-doe':       { label: 'Reimbursement Analysis — DOE',            table: 'doe'                      },
  'production-reimb-dod-doe':   { label: 'Reimbursement DOD — DOE Data',            table: 'doe'                      },
  'production-reimb-dod-dep':   { label: 'Reimbursement DOD — Payments',            table: 'deposit_report'           },
  'production-reimb-dod-adj':   { label: 'Reimbursement DOD — Adjustments',         table: 'adj_report'               },
  // ── Facilities tab ────────────────────────────────────────────────────────
  'facility-dos':               { label: 'Facility Analysis — DOS',                 table: 'dos'                      },
  'facility-doe':               { label: 'Facility Analysis — DOE',                 table: 'doe'                      },
  'facility-dod-doe':           { label: 'Facility DOD — DOE Data',                 table: 'doe'                      },
  'facility-dod-deposit':       { label: 'Facility DOD — Payments',                 table: 'deposit_report'           },
  'facility-dod-adj':           { label: 'Facility DOD — Adjustments',              table: 'adj_report'               },
  // ── Insight tab ───────────────────────────────────────────────────────────
  'insight-provider-dos':       { label: 'Provider Analysis — DOS',                 table: 'dos'                      },
  'insight-provider-doe':       { label: 'Provider Analysis — DOE',                 table: 'doe'                      },
  'insight-provider-dod-doe':   { label: 'Provider DOD — DOE Data',                 table: 'doe'                      },
  'insight-provider-dod-dep':   { label: 'Provider DOD — Payments',                 table: 'deposit_report'           },
  'insight-provider-dod-adj':   { label: 'Provider DOD — Adjustments',              table: 'adj_report'               },
  'insight-payer-dos':          { label: 'Payer Analysis — DOS',                    table: 'dos'                      },
  'insight-payer-doe':          { label: 'Payer Analysis — DOE',                    table: 'doe'                      },
  'insight-payer-dod-doe':      { label: 'Payer DOD — DOE Data',                    table: 'doe'                      },
  'insight-payer-dod-dep':      { label: 'Payer DOD — Payments',                    table: 'deposit_report'           },
  'insight-payer-dod-adj':      { label: 'Payer DOD — Adjustments',                 table: 'adj_report'               },
  'insight-proc-dos':           { label: 'Procedure Analysis — DOS',                table: 'dos'                      },
  'insight-proc-doe':           { label: 'Procedure Analysis — DOE',                table: 'doe'                      },
  'insight-proc-dod-doe':       { label: 'Procedure DOD — DOE Data',                table: 'doe'                      },
  'insight-proc-dod-dep':       { label: 'Procedure DOD — Payments',                table: 'deposit_report'           },
  'insight-proc-dod-adj':       { label: 'Procedure DOD — Adjustments',             table: 'adj_report'               },
  'insight-ref-dos':            { label: 'Referring Provider Analysis — DOS',       table: 'dos'                      },
  'insight-ref-doe':            { label: 'Referring Provider Analysis — DOE',       table: 'doe'                      },
  'insight-ref-dod-doe':        { label: 'Referring Provider DOD — DOE Data',       table: 'doe'                      },
  'insight-ref-dod-dep':        { label: 'Referring Provider DOD — Payments',       table: 'deposit_report'           },
  'insight-ref-dod-adj':        { label: 'Referring Provider DOD — Adjustments',    table: 'adj_report'               },
  // ── Panel Analysis tab ────────────────────────────────────────────────────
  'panel-analysis':             { label: 'Panel Analysis',                          table: 'panel'                    },
  // ── Turnaround Time tab ───────────────────────────────────────────────────
  'tat-last-month':             { label: 'Turnaround — Last Month',                 table: 'turnaround_report'        },
  'tat-last-12':                { label: 'Turnaround — Last 12 Months',             table: 'turnaround_report_last12' },
  // ── Clinical Analysis tab ─────────────────────────────────────────────────
  'clinical-pipeline':          { label: 'Clinical Analysis',                       table: 'pipeline_report'          },
};

async function getDataSource(req, res, next) {
  try {
    const { chart } = req.query;

    if (!chart) {
      return res.status(400).json({ success: false, message: 'Missing required query param: chart' });
    }

    // "all" — whole-page export: return full source tables for every requested chart.
    // Duplicate tables are intentional — each chart gets its own row set per spec.
    if (chart === 'all') {
      const ids = req.query.charts
        ? req.query.charts.split(',').map((s) => s.trim())
        : Object.keys(CHART_DS_MAP);

      const results = await Promise.all(
        ids.map(async (id) => {
          const def = CHART_DS_MAP[id];
          if (!def) return null;
          console.log(`[QFD DS] chart="${id}" → table="${def.table}"`);
          const rows = await qfdService.getFullSourceTable(def.table);
          console.log(`[QFD DS] chart="${id}" → ${rows.length} rows returned`);
          return { chartId: id, label: def.label, schema: SCHEMA, table: def.table, rowCount: rows.length, rows };
        }),
      );
      return ok(res, { charts: results.filter(Boolean) });
    }

    // Single chart export
    const def = CHART_DS_MAP[chart];
    if (!def) {
      console.log(`[QFD DS] Unknown chartId="${chart}" — not in CHART_DS_MAP`);
      return res.status(400).json({ success: false, message: `Unknown chart: "${chart}"` });
    }

    console.log(`[QFD DS] chart="${chart}" → schema=${SCHEMA}, table="${def.table}"`);
    const rows = await qfdService.getFullSourceTable(def.table);
    console.log(`[QFD DS] chart="${chart}" → ${rows.length} rows returned`);
    return ok(res, { chartId: chart, label: def.label, schema: SCHEMA, table: def.table, rowCount: rows.length, rows });
  } catch (err) { next(err); }
}

module.exports = {
  getKpis,
  getPaymentHistory,
  getPaymentHistoryFull,
  getBankDepositHistory,
  getDepositsByReferringProvider,
  getDepositsByFacility,
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
  // Production
  getProductionDosChart,
  getProductionDodByMethod,
  getProductionDosReimbursement,
  getProductionDoeReimbursement,
  getProductionDodReimbursement,
  getDataSource,
};
