/**
 * tat.service.js — Turnaround Time queries for QFD Dashboard.
 * Tables: iq_qfd.turnarround_report        (last month)
 *         iq_qfd.turnarround_report_last12  (last 12 months)
 *
 * Uses SELECT * and a case-insensitive column normalizer to be resilient
 * against minor column-name differences in the source DB.
 */

'use strict';

const pool   = require('../db/pool');
const logger = require('../utils/logger');

const SCHEMA = 'iq_qfd';

function isSchemaError(err) {
  return (
    err.code === '42P01' || err.code === '3F000' || err.code === '42703' ||
    (err.message || '').toLowerCase().includes('does not exist')
  );
}

async function safeQuery(label, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    if (isSchemaError(err)) {
      logger.warn(`[TAT] ${label}: schema/table/column missing — ${err.message}`);
      return fallback;
    }
    logger.error(`[TAT] ${label} failed: ${err.message}`);
    throw err;
  }
}

const num = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

// ── Case-insensitive column finder ────────────────────────────────────────────
// Strips spaces and underscores, lower-cases, then matches.
// Handles: "AvgDosToOrderDate", "avg_dos_to_order_date", "avgdostoorderdate", etc.
function normalize(s) {
  return String(s || '').toLowerCase().replace(/[\s_]/g, '');
}

const CANONICAL = [
  { key: 'panel',                           aliases: ['panel'] },
  { key: 'numberoflines',                   aliases: ['numberoflines', 'numlines', 'lines', 'count'] },
  { key: 'avgdostoorderdate',               aliases: ['avgdostoorderdate', 'avgdosorder', 'dostoorderdate'] },
  { key: 'avgorderdatetofinalprinteddate',   aliases: ['avgorderdatetofinalprinteddate', 'avgordertofinal', 'orderdatetofinalprinteddate'] },
  { key: 'avgfinalprintedtodoe',             aliases: ['avgfinalprintedtodoe', 'avgfinaltodoe', 'finalprintedtodoe'] },
  { key: 'avgdoetosubmissiondate',           aliases: ['avgdoetosubmissiondate', 'avgdoetosubmission', 'doetosubmissiondate'] },
  { key: 'avgsubmissiondatetopaymentdate',   aliases: ['avgsubmissiondatetopaymentdate', 'avgsubmissiontopayment', 'submissiondatetopaymentdate'] },
];

function normalizeRow(raw) {
  // Build lookup: normalize(actualKey) → actualKey
  const lookup = {};
  Object.keys(raw).forEach((k) => { lookup[normalize(k)] = k; });

  const out = {};
  CANONICAL.forEach(({ key, aliases }) => {
    // First try exact normalized match
    const match = aliases.map(normalize).find((a) => lookup[a]);
    if (match) {
      out[key] = raw[lookup[match]];
    } else {
      // Fallback: partial substring match against any actual column
      const partial = Object.keys(lookup).find((lk) =>
        aliases.some((a) => lk.includes(normalize(a)) || normalize(a).includes(lk))
      );
      out[key] = partial ? raw[lookup[partial]] : null;
    }
  });
  return out;
}

// ── Grand Total row ────────────────────────────────────────────────────────────

function addGrandTotal(rows) {
  if (!rows.length) return rows;
  let totalLines = 0;
  const sums   = { dos: 0, ord: 0, fin: 0, doe: 0, sub: 0 };
  const counts = { dos: 0, ord: 0, fin: 0, doe: 0, sub: 0 };

  rows.forEach((r) => {
    const lines = num(r.numberoflines) || 0;
    totalLines += lines;
    [
      ['avgdostoorderdate',              'dos'],
      ['avgorderdatetofinalprinteddate', 'ord'],
      ['avgfinalprintedtodoe',           'fin'],
      ['avgdoetosubmissiondate',         'doe'],
      ['avgsubmissiondatetopaymentdate', 'sub'],
    ].forEach(([col, k]) => {
      const v = num(r[col]);
      if (v !== null && lines > 0) { sums[k] += v * lines; counts[k] += lines; }
    });
  });

  return [...rows, {
    panel:                            'Grand Total',
    numberoflines:                    totalLines,
    avgdostoorderdate:               counts.dos ? Math.round(sums.dos / counts.dos) : null,
    avgorderdatetofinalprinteddate:  counts.ord ? Math.round(sums.ord / counts.ord) : null,
    avgfinalprintedtodoe:            counts.fin ? Math.round(sums.fin / counts.fin) : null,
    avgdoetosubmissiondate:          counts.doe ? Math.round(sums.doe / counts.doe) : null,
    avgsubmissiondatetopaymentdate:  counts.sub ? Math.round(sums.sub / counts.sub) : null,
  }];
}

// ── Debug: return actual column names ─────────────────────────────────────────

async function getTatColumns() {
  try {
    const { rows } = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name IN ('turnarround_report', 'turnarround_report_last12')
      ORDER BY table_name, ordinal_position
    `, [SCHEMA]);
    return rows;
  } catch (err) {
    logger.error(`[TAT] getTatColumns failed: ${err.message}`);
    return [];
  }
}

// ── Last Month ────────────────────────────────────────────────────────────────

async function getTatLastMonth() {
  return safeQuery('getTatLastMonth', async () => {
    const { rows } = await pool.query(
      `SELECT * FROM ${SCHEMA}.turnarround_report ORDER BY panel ASC NULLS LAST`
    );
    logger.info(`[TAT] turnarround_report returned ${rows.length} rows. Sample keys: ${rows[0] ? Object.keys(rows[0]).join(', ') : 'none'}`);
    const normalized = rows.map(normalizeRow);
    return addGrandTotal(normalized);
  }, []);
}

// ── Last 12 Months ────────────────────────────────────────────────────────────

async function getTatLast12() {
  return safeQuery('getTatLast12', async () => {
    const { rows } = await pool.query(
      `SELECT * FROM ${SCHEMA}.turnarround_report_last12 ORDER BY panel ASC NULLS LAST`
    );
    logger.info(`[TAT] turnarround_report_last12 returned ${rows.length} rows. Sample keys: ${rows[0] ? Object.keys(rows[0]).join(', ') : 'none'}`);
    const normalized = rows.map(normalizeRow);
    return addGrandTotal(normalized);
  }, []);
}

module.exports = { getTatLastMonth, getTatLast12, getTatColumns };
