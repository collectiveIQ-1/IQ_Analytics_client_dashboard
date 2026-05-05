/**
 * neurowatch.controller.js — HTTP handlers for Neuro Watch dashboard.
 */

'use strict';

const nwService = require('../services/neurowatch.service');
const { ok }    = require('../utils/responseHelper');

const wrap = (fn) => async (req, res, next) => {
  try { return ok(res, await fn(req)); } catch (e) { next(e); }
};

// ── Home page ─────────────────────────────────────────────────────────────────
module.exports.getKpis                  = wrap(() => nwService.getAllKpis());
module.exports.getPaymentHistory        = wrap(() => nwService.getPaymentHistory());
module.exports.getPaymentHistoryFull    = wrap(() => nwService.getPaymentHistoryFull());
module.exports.getChargesVsPayments     = wrap(() => nwService.getChargesVsPayments());
module.exports.getChargesVsPaymentsFull = wrap(() => nwService.getChargesVsPaymentsFull());
module.exports.getArPie                 = wrap(() => nwService.getArPie());
module.exports.getArDonut               = wrap(() => nwService.getArDonut());
module.exports.getTotalCharges          = wrap(() => nwService.getTotalChargesChart());
module.exports.getTotalChargesFull      = wrap(() => nwService.getTotalChargesChartFull());
module.exports.getAdjustments           = wrap(() => nwService.getAdjustments());
module.exports.getAdjustmentsFull       = wrap(() => nwService.getAdjustmentsFull());

// ── Payments page ─────────────────────────────────────────────────────────────
module.exports.getPaymentLineChart      = wrap(() => nwService.getPaymentLineChart());
module.exports.getDepositsBySurgeon     = wrap(() => nwService.getDepositsBySurgeon());
module.exports.getDepositsByHospital    = wrap(() => nwService.getDepositsByHospital());
module.exports.getDepositsByBillingType = wrap(() => nwService.getDepositsByBillingType());
module.exports.getDepositsByInsurance   = wrap(() => nwService.getDepositsByInsurance());

// ── Production page ───────────────────────────────────────────────────────────
module.exports.getProductionDosChart    = wrap(() => nwService.getProductionDosChart());
module.exports.getProductionDoeChart    = wrap(() => nwService.getProductionDoeChart());
module.exports.getProductionDosReimb    = wrap(() => nwService.getProductionDosReimb());
module.exports.getProductionDoeReimb    = wrap(() => nwService.getProductionDoeReimb());
module.exports.getProductionDodByPayer  = wrap(() => nwService.getProductionDodByPayer());
module.exports.getProductionDodByBiller = wrap(() => nwService.getProductionDodByBillingEntity());

// ── AR page ───────────────────────────────────────────────────────────────────
module.exports.getArDosBuckets = wrap(() => nwService.getArDosBuckets());
module.exports.getArDoeBuckets = wrap(() => nwService.getArDoeBuckets());
module.exports.getArTreemap    = wrap((req) => {
  const mode = req.query.mode || 'dos';
  return nwService.getArTreemap(mode === 'doe' ? 'billing_date' : 'dos');
});
module.exports.getArByInsurance = wrap((req) => {
  const mode = req.query.mode || 'dos';
  return nwService.getArByInsurance(mode === 'doe' ? 'billing_date' : 'dos');
});
module.exports.getArBySurgeon = wrap((req) => {
  const mode    = req.query.mode    || 'dos';
  const surgeon = req.query.surgeon || 'All';
  return nwService.getArBySurgeon(mode === 'doe' ? 'billing_date' : 'dos', surgeon);
});
module.exports.getArSurgeons = wrap(() => nwService.getArSurgeons());

// ── Data source export placeholder ───────────────────────────────────────────
module.exports.getDataSource = wrap((req) => {
  const chart = req.query.chart || '';
  return { chart, message: 'Use /api/export/data-source/download?client=neurowatch&charts=' + chart };
});

// ── Insights page ─────────────────────────────────────────────────────────────
module.exports.getInsightsInsurance   = wrap(() => nwService.getInsightsInsurance());
module.exports.getInsightsSurgeon     = wrap((req) => nwService.getInsightsSurgeon(req.query.surgeon || ''));
module.exports.getInsightsReader      = wrap((req) => nwService.getInsightsReader(req.query.reader   || ''));
module.exports.getInsightsTechnician  = wrap((req) => nwService.getInsightsTechnician(req.query.tech || ''));
module.exports.getInsightsSurgeonList = wrap(() => nwService.getInsightsSurgeonList());
module.exports.getInsightsReaderList  = wrap(() => nwService.getInsightsReaderList());
module.exports.getInsightsTechList    = wrap(() => nwService.getInsightsTechList());

// ── Procedure page ────────────────────────────────────────────────────────────
module.exports.getNwProcedureDeposits = wrap(() => nwService.getNwProcedureDeposits());
module.exports.getNwProcedureCharges  = wrap((req) => {
  const mode = req.query.mode || 'dos';
  return nwService.getNwProcedureCharges(mode);
});
module.exports.getNwProcedureMore     = wrap((req) => {
  const mode = req.query.mode || 'dos';
  return nwService.getNwProcedureMore(mode);
});
module.exports.getNwProcedureDodMore  = wrap(() => nwService.getNwProcedureDodMore());
