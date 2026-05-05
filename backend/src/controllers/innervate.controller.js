/**
 * innervate.controller.js — HTTP handlers for Innervate dashboard endpoints.
 */

'use strict';

const innervateService = require('../services/innervate.service');
const { ok }           = require('../utils/responseHelper');

// ── Home page KPIs ─────────────────────────────────────────────────────────────

async function getKpis(req, res, next) {
  try { return ok(res, await innervateService.getAllKpis()); } catch (e) { next(e); }
}

// ── Payment History ────────────────────────────────────────────────────────────

async function getPaymentHistory(req, res, next) {
  try { return ok(res, await innervateService.getPaymentHistory()); } catch (e) { next(e); }
}
async function getPaymentHistoryFull(req, res, next) {
  try { return ok(res, await innervateService.getPaymentHistoryFull()); } catch (e) { next(e); }
}

// ── Charges vs Payments ────────────────────────────────────────────────────────

async function getChargesVsPayments(req, res, next) {
  try { return ok(res, await innervateService.getChargesVsPayments()); } catch (e) { next(e); }
}
async function getChargesVsPaymentsFull(req, res, next) {
  try { return ok(res, await innervateService.getChargesVsPaymentsFull()); } catch (e) { next(e); }
}

// ── AR Pie ─────────────────────────────────────────────────────────────────────

async function getArPie(req, res, next) {
  try { return ok(res, await innervateService.getArPie()); } catch (e) { next(e); }
}

// ── Total Charges ──────────────────────────────────────────────────────────────

async function getTotalChargesChart(req, res, next) {
  try { return ok(res, await innervateService.getTotalChargesChart()); } catch (e) { next(e); }
}
async function getTotalChargesChartFull(req, res, next) {
  try { return ok(res, await innervateService.getTotalChargesChartFull()); } catch (e) { next(e); }
}

// ── Adjustments ────────────────────────────────────────────────────────────────

async function getAdjustments(req, res, next) {
  try { return ok(res, await innervateService.getAdjustments()); } catch (e) { next(e); }
}
async function getAdjustmentsFull(req, res, next) {
  try { return ok(res, await innervateService.getAdjustmentsFull()); } catch (e) { next(e); }
}

// ── AR Donut ───────────────────────────────────────────────────────────────────

async function getArDonut(req, res, next) {
  try { return ok(res, await innervateService.getArDonut()); } catch (e) { next(e); }
}

// ── Payments page ──────────────────────────────────────────────────────────────

async function getPaymentLineChart(req, res, next) {
  try { return ok(res, await innervateService.getPaymentLineChart()); } catch (e) { next(e); }
}
async function getDepositsBySurgeon(req, res, next) {
  try { return ok(res, await innervateService.getDepositsBySurgeon()); } catch (e) { next(e); }
}
async function getDepositsByHospital(req, res, next) {
  try { return ok(res, await innervateService.getDepositsByHospital()); } catch (e) { next(e); }
}
async function getDepositsByBillingType(req, res, next) {
  try { return ok(res, await innervateService.getDepositsByBillingType()); } catch (e) { next(e); }
}
async function getDepositsByInsurance(req, res, next) {
  try { return ok(res, await innervateService.getDepositsByInsurance()); } catch (e) { next(e); }
}

// ── Debug ──────────────────────────────────────────────────────────────────────

async function getSchemaColumns(req, res, next) {
  try { return ok(res, await innervateService.getSchemaColumns()); } catch (e) { next(e); }
}

module.exports = {
  getKpis,
  getPaymentHistory,
  getPaymentHistoryFull,
  getChargesVsPayments,
  getChargesVsPaymentsFull,
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
  getDepositsByInsurance,
  getSchemaColumns,
};

// ── Production page ────────────────────────────────────────────────────────────

async function getProductionDosChart(req, res, next) {
  try { return ok(res, await innervateService.getProductionDosChart()); } catch (e) { next(e); }
}
async function getProductionDoeChart(req, res, next) {
  try { return ok(res, await innervateService.getProductionDoeChart()); } catch (e) { next(e); }
}
async function getProductionDosReimbursement(req, res, next) {
  try { return ok(res, await innervateService.getProductionDosReimbursement()); } catch (e) { next(e); }
}
async function getProductionDoeReimbursement(req, res, next) {
  try { return ok(res, await innervateService.getProductionDoeReimbursement()); } catch (e) { next(e); }
}
async function getProductionDodAdjustments(req, res, next) {
  try { return ok(res, await innervateService.getProductionDodAdjustments()); } catch (e) { next(e); }
}
async function getProductionDodPayments(req, res, next) {
  try { return ok(res, await innervateService.getProductionDodPayments()); } catch (e) { next(e); }
}
async function getProductionDodByPayer(req, res, next) {
  try { return ok(res, await innervateService.getProductionDodByPayer()); } catch (e) { next(e); }
}
async function getProductionDodByBillerEntity(req, res, next) {
  try { return ok(res, await innervateService.getProductionDodByBillerEntity()); } catch (e) { next(e); }
}

// ── AR page ────────────────────────────────────────────────────────────────────

async function getArDos(req, res, next) {
  try { return ok(res, await innervateService.getArDos()); } catch (e) { next(e); }
}
async function getArDoe(req, res, next) {
  try { return ok(res, await innervateService.getArDoe()); } catch (e) { next(e); }
}
async function getArInsurance(req, res, next) {
  try { return ok(res, await innervateService.getArInsurance(req.query.mode || 'dos')); } catch (e) { next(e); }
}
async function getArSurgeon(req, res, next) {
  try { return ok(res, await innervateService.getArSurgeon(req.query.mode || 'dos')); } catch (e) { next(e); }
}

Object.assign(module.exports, {
  getProductionDosChart,
  getProductionDoeChart,
  getProductionDosReimbursement,
  getProductionDoeReimbursement,
  getProductionDodAdjustments,
  getProductionDodPayments,
  getProductionDodByPayer,
  getProductionDodByBillerEntity,
  getArDos,
  getArDoe,
  getArInsurance,
  getArSurgeon,
});

// ── Insights handlers ─────────────────────────────────────────────────────────

const insightHandlers = {
  async getInsightsInsurance(req, res, next) {
    try {
      const data = await innervateService.getInsightsInsurance();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async getInsightsSurgeon(req, res, next) {
    try {
      const data = await innervateService.getInsightsSurgeon(req.query.filter || '');
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async getInsightsReader(req, res, next) {
    try {
      const data = await innervateService.getInsightsReader(req.query.filter || '');
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async getInsightsTechnician(req, res, next) {
    try {
      const data = await innervateService.getInsightsTechnician(req.query.filter || '');
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async getInsightsSurgeonList(req, res, next) {
    try {
      const data = await innervateService.getInsightsSurgeonList();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async getInsightsReaderList(req, res, next) {
    try {
      const data = await innervateService.getInsightsReaderList();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async getInsightsTechList(req, res, next) {
    try {
      const data = await innervateService.getInsightsTechList();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
};

// ── Procedure handlers ────────────────────────────────────────────────────────

const procedureHandlers = {
  async getProcedureDeposits(req, res, next) {
    try {
      const data = await innervateService.getProcedureDeposits();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async getProcedureCharges(req, res, next) {
    try {
      const mode = req.query.mode === 'doe' ? 'doe' : 'dos';
      const data = await innervateService.getProcedureCharges(mode);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async getProcedureMore(req, res, next) {
    try {
      const mode = req.query.mode === 'doe' ? 'doe' : 'dos';
      const data = await innervateService.getProcedureMore(mode);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async getProcedureDodMore(req, res, next) {
    try {
      const data = await innervateService.getProcedureDodMore();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
};

Object.assign(module.exports, insightHandlers, procedureHandlers);
