/**
 * export.controller.js — Unified backend Data Source export for ALL clients.
 *
 * GET /api/export/data-source/download
 *   ?client=qfd|usneuro|ionm|confidas|completeneuro|synapses
 *   &charts=chart1,chart2,...   (comma-separated IDs, or omit for unique tables only)
 *   &scope=whole|single        (optional, informational)
 *
 * KEY DESIGN DECISIONS:
 *  - Frontend sends only client + chart IDs. Schema/table resolved server-side.
 *  - Uses aoa_to_sheet (array-of-arrays) — avoids "Too many properties to enumerate".
 *  - Deduplicates tables: each unique source table is queried and written ONCE,
 *    regardless of how many charts reference it. Prevents 60-sheet whole-page blowup.
 *  - LIMIT 100000 rows per table — keeps response time under ~30 s with parallel fetching.
 *  - Each table query uses pool.exportQuery (dedicated pg.Client, 5-min timeout).
 */

'use strict';

const XLSX   = require('xlsx');
const pool   = require('../db/pool');
const logger = require('../utils/logger');

// ── Master chart-ID → {schema, table} map for all 6 clients ──────────────────

const CHART_DS_MAP = {

  qfd: {
    schema: 'iq_qfd',
    charts: {
      'payment-history-dod':        { label: 'Payment History (DOD)',                   table: 'deposit_report'           },
      'charges-vs-payments':        { label: 'Charges vs Payments (DOE)',               table: 'doe'                      },
      'ccr-history':                { label: 'CCR History',                             table: 'ccr_history'              },
      'accounts-receivable':        { label: 'Accounts Receivable',                     table: 'full_ar'                  },
      'total-charges':              { label: 'Total Charges (DOE)',                     table: 'doe'                      },
      'total-adjustments':          { label: 'Total Adjustments',                       table: 'adj_report'               },
      'ar-over-60':                 { label: 'AR % > 60+ Days',                         table: 'full_ar'                  },
      'ccr-claims':                 { label: 'Clean Claim Rate — Claims',               table: 'ccr'                      },
      'ccr-detail-history':         { label: 'CCR History (Detail)',                    table: 'ccr_history'              },
      'ccr-denial-reasons':         { label: 'Denial Reasons',                          table: 'ccr'                      },
      'payment-history-full':       { label: 'All Time Payment History',                table: 'full_deposit_report'      },
      'bank-deposit-history':       { label: 'Bank Deposits',                           table: 'bank'                     },
      'pay-deposits-provider':      { label: 'Deposits by Provider',                    table: 'deposit_report'           },
      'pay-deposits-facility':      { label: 'Deposits by Facility',                    table: 'deposit_report'           },
      'charges-vs-payments-full':   { label: 'All Time Charges vs Payments',            table: 'doe'                      },
      'total-charges-full':         { label: 'All Time Total Charges',                  table: 'doe'                      },
      'adjustments-full':           { label: 'All Time Total Adjustments',              table: 'adj_report'               },
      'ar-dos':                     { label: 'AR — Date of Service',                    table: 'full_ar'                  },
      'ar-doe':                     { label: 'AR — Date of Entry',                      table: 'full_ar'                  },
      'ar-by-carrier':              { label: 'AR by Carrier',                           table: 'full_ar'                  },
      'ar-by-financial':            { label: 'AR by Financial Category',                table: 'full_ar'                  },
      'production-dos':             { label: 'Production — DOS',                        table: 'dos'                      },
      'production-doe':             { label: 'Production — DOE',                        table: 'doe'                      },
      'production-dod-adj':         { label: 'DOD Adjustment History',                  table: 'adj_report'               },
      'production-dod-deposit':     { label: 'DOD Payment History',                     table: 'deposit_report'           },
      'production-dod-method':      { label: 'DOD Payment Method',                      table: 'deposit_report'           },
      'production-reimb-dos':       { label: 'Reimbursement — DOS',                     table: 'dos'                      },
      'production-reimb-doe':       { label: 'Reimbursement — DOE',                     table: 'doe'                      },
      'production-reimb-dod-doe':   { label: 'Reimbursement DOD / DOE',                 table: 'doe'                      },
      'production-reimb-dod-dep':   { label: 'Reimbursement DOD / Payments',            table: 'deposit_report'           },
      'production-reimb-dod-adj':   { label: 'Reimbursement DOD / Adjustments',         table: 'adj_report'               },
      'facility-dos':               { label: 'Facility Analysis — DOS',                 table: 'dos'                      },
      'facility-doe':               { label: 'Facility Analysis — DOE',                 table: 'doe'                      },
      'facility-dod-doe':           { label: 'Facility DOD / DOE',                      table: 'doe'                      },
      'facility-dod-deposit':       { label: 'Facility DOD / Payments',                 table: 'deposit_report'           },
      'facility-dod-adj':           { label: 'Facility DOD / Adjustments',              table: 'adj_report'               },
      'insight-provider-dos':       { label: 'Provider Analysis — DOS',                 table: 'dos'                      },
      'insight-provider-doe':       { label: 'Provider Analysis — DOE',                 table: 'doe'                      },
      'insight-provider-dod-doe':   { label: 'Provider DOD / DOE',                      table: 'doe'                      },
      'insight-provider-dod-dep':   { label: 'Provider DOD / Payments',                 table: 'deposit_report'           },
      'insight-provider-dod-adj':   { label: 'Provider DOD / Adjustments',              table: 'adj_report'               },
      'insight-payer-dos':          { label: 'Payer Analysis — DOS',                    table: 'dos'                      },
      'insight-payer-doe':          { label: 'Payer Analysis — DOE',                    table: 'doe'                      },
      'insight-payer-dod-doe':      { label: 'Payer DOD / DOE',                         table: 'doe'                      },
      'insight-payer-dod-dep':      { label: 'Payer DOD / Payments',                    table: 'deposit_report'           },
      'insight-payer-dod-adj':      { label: 'Payer DOD / Adjustments',                 table: 'adj_report'               },
      'insight-proc-dos':           { label: 'Procedure Analysis — DOS',                table: 'dos'                      },
      'insight-proc-doe':           { label: 'Procedure Analysis — DOE',                table: 'doe'                      },
      'insight-proc-dod-doe':       { label: 'Procedure DOD / DOE',                     table: 'doe'                      },
      'insight-proc-dod-dep':       { label: 'Procedure DOD / Payments',                table: 'deposit_report'           },
      'insight-proc-dod-adj':       { label: 'Procedure DOD / Adjustments',             table: 'adj_report'               },
      'insight-ref-dos':            { label: 'Referring Provider — DOS',                table: 'dos'                      },
      'insight-ref-doe':            { label: 'Referring Provider — DOE',                table: 'doe'                      },
      'insight-ref-dod-doe':        { label: 'Referring Provider DOD / DOE',            table: 'doe'                      },
      'insight-ref-dod-dep':        { label: 'Referring Provider DOD / Payments',       table: 'deposit_report'           },
      'insight-ref-dod-adj':        { label: 'Referring Provider DOD / Adjustments',    table: 'adj_report'               },
      'panel-analysis':             { label: 'Panel Analysis',                          table: 'panel'                    },
      'tat-last-month':             { label: 'Turnaround — Last Month',                 table: 'turnaround_report'        },
      'tat-last-12':                { label: 'Turnaround — Last 12 Months',             table: 'turnaround_report_last12' },
      'clinical-pipeline':          { label: 'Clinical Analysis',                       table: 'pipeline_report'          },
    },
  },

  usneuro: {
    schema: 'iq_usneuro',
    charts: {
      'home-total-payments':        { label: 'Total Payments',                          table: 'usneuro_full_deposit' },
      'home-total-charges':         { label: 'Total Charges',                           table: 'usneuro_full_billing' },
      'home-avg-days':              { label: 'AVG Days DOS to DOE',                     table: 'usneuro_full_billing' },
      'home-ccr':                   { label: 'Clean Claim Rate',                        table: 'usneuro_ccr'          },
      'payment-history':            { label: 'Payment History',                         table: 'usneuro_full_deposit' },
      'charges-vs-payments':        { label: 'Charges vs Payments',                     table: 'usneuro_full_billing' },
      'ccr-history':                { label: 'CCR History',                             table: 'usneuro_ccrhistory'   },
      'ar-buckets':                 { label: 'Accounts Receivable',                     table: 'usneuro_full_billing' },
      'home-total-adjustments':     { label: 'Total Adjustments',                       table: 'usneuro_full_billing' },
      'home-ar-over-60':            { label: 'AR % > 60+ Days',                         table: 'usneuro_full_billing' },
      'ccr-denial-reasons':         { label: 'Top Denial Reasons',                      table: 'usneuro_ccr'          },
      'ccr-detail-history':         { label: 'CCR History (Detail)',                    table: 'usneuro_ccrhistory'   },
      'payment-line':               { label: 'Payment Trend Line',                      table: 'usneuro_full_deposit' },
      'deposits-surgeon':           { label: 'Deposits by Surgeon',                     table: 'usneuro_full_deposit' },
      'deposits-hospital':          { label: 'Deposits by Hospital',                    table: 'usneuro_full_deposit' },
      'deposits-billing':           { label: 'Deposits by Billing Type',                table: 'usneuro_full_deposit' },
      'deposits-insurance':         { label: 'Deposits by Insurance',                   table: 'usneuro_full_deposit' },
      'production-dos':             { label: 'Production — DOS',                        table: 'usneuro_full_billing' },
      'production-doe':             { label: 'Production — DOE',                        table: 'usneuro_full_billing' },
      'production-reimb-dos':       { label: 'Reimbursement — DOS',                     table: 'usneuro_full_billing' },
      'production-reimb-doe':       { label: 'Reimbursement — DOE',                     table: 'usneuro_full_billing' },
      'production-dod-payer':       { label: 'DOD by Payer',                            table: 'usneuro_full_billing' },
      'production-dod-biller':      { label: 'DOD by Biller Entity',                    table: 'usneuro_full_billing' },
      'ar-dos':                     { label: 'AR — Date of Service',                    table: 'usneuro_full_billing' },
      'ar-doe':                     { label: 'AR — Date of Entry',                      table: 'usneuro_full_billing' },
      'ar-insurance':               { label: 'AR by Insurance',                         table: 'usneuro_full_billing' },
      'ar-surgeon':                 { label: 'AR by Surgeon',                           table: 'usneuro_full_billing' },
      'insight-insurance':          { label: 'Insights by Insurance',                   table: 'usneuro_full_billing' },
      'insight-surgeon':            { label: 'Insights by Surgeon',                     table: 'usneuro_full_billing' },
      'insight-reader':             { label: 'Insights by Reader',                      table: 'usneuro_full_billing' },
      'insight-technician':         { label: 'Insights by Technician',                  table: 'usneuro_full_billing' },
      'procedure-deposits':         { label: 'Procedure Deposits',                      table: 'usneuro_full_deposit' },
      'procedure-charges':          { label: 'Procedure Charges',                       table: 'usneuro_full_billing' },
      'procedure-more':             { label: 'Procedure Detail',                        table: 'usneuro_full_billing' },
    },
  },

  ionm: {
    schema: 'iq_ionm',
    charts: {
      'payment-history':            { label: 'Payment History (DOD)',                   table: 'payment_report'           },
      'charges-vs-payments':        { label: 'Charges vs Payments',                     table: 'billing_report_iomhelp'   },
      'ccr-history':                { label: 'CCR History',                             table: 'ccrhistory'               },
      'accounts-receivable':        { label: 'Accounts Receivable',                     table: 'billing_report_iomhelp'   },
      'payment-line':               { label: 'Payment Trend',                           table: 'payment_report'           },
      'deposits-surgeon':           { label: 'Deposits by Surgeon',                     table: 'payment_report'           },
      'deposits-hospital':          { label: 'Deposits by Hospital',                    table: 'payment_report'           },
      'deposits-billing':           { label: 'Deposits by Billing Type',                table: 'payment_report'           },
      'deposits-insurance':         { label: 'Deposits by Insurance',                   table: 'payment_report'           },
      'production-dos':             { label: 'Production — DOS',                        table: 'billing_report_iomhelp'   },
      'production-doe':             { label: 'Production — DOE',                        table: 'billing_report_iomhelp'   },
      'ar-dos':                     { label: 'AR — Date of Service',                    table: 'billing_report_iomhelp'   },
      'ar-doe':                     { label: 'AR — Date of Entry',                      table: 'billing_report_iomhelp'   },
      'ar-insurance':               { label: 'AR by Insurance',                         table: 'billing_report_iomhelp'   },
      'ar-surgeon':                 { label: 'AR by Surgeon',                           table: 'billing_report_iomhelp'   },
      'insight-insurance':          { label: 'Insights by Insurance',                   table: 'billing_report_iomhelp'   },
      'insight-surgeon':            { label: 'Insights by Surgeon',                     table: 'billing_report_iomhelp'   },
      'insight-reader':             { label: 'Insights by Reader',                      table: 'billing_report_iomhelp'   },
      'insight-technician':         { label: 'Insights by Technician',                  table: 'billing_report_iomhelp'   },
      'procedure-deposits':         { label: 'Procedure Deposits',                      table: 'payment_report'           },
      'procedure-charges':          { label: 'Procedure Charges',                       table: 'billing_report_iomhelp'   },
      'procedure-more':             { label: 'Procedure Detail',                        table: 'billing_report_iomhelp'   },
      'idr-payments':               { label: 'IDR Payment Summary',                     table: 'smartsheet'               },
    },
  },

  confidas: {
    schema: 'iq_confidas',
    charts: {
      'payment-history':            { label: 'Payment History (DOD)',                   table: 'deposit_report'       },
      'payment-history-full':       { label: 'All Time Payment History',                table: 'full_deposit_report'  },
      'charges-vs-payments':        { label: 'Charges vs Payments (DOE)',               table: 'doe'                  },
      'accounts-receivable':        { label: 'Accounts Receivable',                     table: 'full_ar'              },
      'ccr-history':                { label: 'CCR History',                             table: 'ccr_history'          },
      'bank-deposits':              { label: 'Bank Deposits',                           table: 'bank'                 },
      'deposits-by-provider':       { label: 'Deposits by Provider',                    table: 'deposit_report'       },
      'production-dos':             { label: 'Production — DOS',                        table: 'dos'                  },
      'production-doe':             { label: 'Production — DOE',                        table: 'doe'                  },
      'facility-dos':               { label: 'Facility Analysis — DOS',                 table: 'dos'                  },
      'facility-doe':               { label: 'Facility Analysis — DOE',                 table: 'doe'                  },
      'ar-bar':                     { label: 'AR by Bucket',                            table: 'full_ar'              },
      'ar-carrier':                 { label: 'AR by Carrier',                           table: 'full_ar'              },
      'ar-financial':               { label: 'AR by Financial Class',                   table: 'full_ar'              },
      'insight-dos':                { label: 'Insights — DOS',                          table: 'dos'                  },
      'insight-doe':                { label: 'Insights — DOE',                          table: 'doe'                  },
    },
  },

  completeneuro: {
    schema: 'iq_completeneuro',
    charts: {
      'payment-history':            { label: 'Payment History',                         table: 'completeneuro_full_deposit' },
      'charges-vs-payments':        { label: 'Charges vs Payments',                     table: 'completeneuro_full_billing' },
      'ccr-history':                { label: 'CCR History',                             table: 'ccr_history'                },
      'accounts-receivable':        { label: 'Accounts Receivable',                     table: 'completeneuro_full_billing' },
      'total-charges':              { label: 'Total Charges',                           table: 'completeneuro_full_billing' },
      'adjustments':                { label: 'Total Adjustments',                       table: 'completeneuro_full_billing' },
      'ar-donut':                   { label: 'AR % >60 Days',                           table: 'completeneuro_full_billing' },
      'payment-line':               { label: 'All Time Payment History',                table: 'completeneuro_full_deposit' },
      'deposits-surgeon':           { label: 'Deposits by Surgeon',                     table: 'completeneuro_full_deposit' },
      'deposits-hospital':          { label: 'Deposits by Hospital',                    table: 'completeneuro_full_deposit' },
      'deposits-billing':           { label: 'Deposits by Billing Type',                table: 'completeneuro_full_deposit' },
      'deposits-insurance':         { label: 'Deposits by Insurance Type',              table: 'completeneuro_full_deposit' },
      'cn-prod-billing':            { label: 'Production Billing Data',                 table: 'completeneuro_full_billing' },
      'cn-prod-deposit':            { label: 'Production Deposit Data',                 table: 'completeneuro_full_deposit' },
      'cn-ar-billing':              { label: 'AR Billing Data',                         table: 'completeneuro_full_billing' },
      'cn-insights-billing':        { label: 'Insights Billing Data',                   table: 'completeneuro_full_billing' },
    },
  },

  synapses: {
    schema: 'iq_synapses',
    charts: {
      'payment-history':            { label: 'Payment History (DOD)',                   table: 'synapses_full_deposit' },
      'charges-vs-payments':        { label: 'Charges vs Payments',                     table: 'synapses_full_billing' },
      'accounts-receivable':        { label: 'Accounts Receivable',                     table: 'synapses_full_billing' },
      'payment-line':               { label: 'Payment Trend',                           table: 'synapses_full_deposit' },
      'deposits-surgeon':           { label: 'Deposits by Surgeon',                     table: 'synapses_full_deposit' },
      'deposits-hospital':          { label: 'Deposits by Hospital',                    table: 'synapses_full_deposit' },
      'deposits-billing':           { label: 'Deposits by Billing Type',                table: 'synapses_full_deposit' },
      'deposits-insurance':         { label: 'Deposits by Insurance',                   table: 'synapses_full_deposit' },
      'production-dos':             { label: 'Production — DOS',                        table: 'synapses_full_billing' },
      'production-doe':             { label: 'Production — DOE',                        table: 'synapses_full_billing' },
      'ar-dos':                     { label: 'AR — Date of Service',                    table: 'synapses_full_billing' },
      'ar-doe':                     { label: 'AR — Date of Entry',                      table: 'synapses_full_billing' },
      'ar-insurance':               { label: 'AR by Insurance',                         table: 'synapses_full_billing' },
      'ar-surgeon':                 { label: 'AR by Surgeon',                           table: 'synapses_full_billing' },
      'insight-insurance':          { label: 'Insights by Insurance',                   table: 'synapses_full_billing' },
      'insight-surgeon':            { label: 'Insights by Surgeon',                     table: 'synapses_full_billing' },
      'insight-reader':             { label: 'Insights by Reader',                      table: 'synapses_full_billing' },
      'insight-technician':         { label: 'Insights by Technician',                  table: 'synapses_full_billing' },
      'procedure-deposits':         { label: 'Procedure Deposits',                      table: 'synapses_full_deposit' },
      'procedure-charges':          { label: 'Procedure Charges',                       table: 'synapses_full_billing' },
      'procedure-more':             { label: 'Procedure Detail',                        table: 'synapses_full_billing' },
      'idr-payments':               { label: 'IDR Payment Summary',                     table: 'smartsheet'            },
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Safe Excel sheet name: max 31 chars, no illegal chars. */
function safeSheetName(raw) {
  return String(raw).replace(/[/\\*?[\]:]/g, '_').slice(0, 31);
}

/**
 * Convert a row object → value array in header order.
 * Objects/arrays → JSON string so SheetJS never enumerates nested props.
 */
function rowToArray(row, headers) {
  return headers.map(function(h) {
    var v = row[h];
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  });
}

/**
 * Query a full source table. Returns rows array (empty on error).
 * Uses pool.exportQuery: dedicated pg.Client, 5-min statement_timeout, no pool slot used.
 * LIMIT 100000 rows keeps each table query fast. Parallel fetch means total time ≈ slowest single table.
 */
async function fetchTable(schema, table) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    logger.error('[Export] Rejected unsafe identifier — schema="' + schema + '" table="' + table + '"');
    return [];
  }
  try {
    logger.info('[Export] SELECT * FROM ' + schema + '."' + table + '" LIMIT 100000 ...');
    const t0     = Date.now();
    const result = await pool.exportQuery(
      'SELECT * FROM ' + schema + '."' + table + '" LIMIT 100000'
    );
    logger.info('[Export] ' + schema + '."' + table + '" -> ' + result.rows.length + ' rows in ' + (Date.now() - t0) + 'ms');
    return result.rows;
  } catch (err) {
    logger.error('[Export] fetchTable FAILED ' + schema + '."' + table + '": ' + err.message);
    return [];
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * GET /api/export/data-source/download
 *
 * DEDUPLICATION LOGIC (critical for performance):
 *   Multiple chart IDs often map to the same source table.
 *   We resolve all requested chart IDs → unique tables, then export each table ONCE.
 *   Sheet name = table name (clear and non-redundant).
 *   Export_Info sheet lists every chart that references each table.
 */
async function downloadDataSource(req, res, next) {
  try {
    const { client, charts } = req.query;

    // 1. Validate client
    if (!client || !CHART_DS_MAP[client]) {
      return res.status(400).json({
        success: false,
        message: 'Unknown client: "' + client + '". Valid: ' + Object.keys(CHART_DS_MAP).join(', '),
      });
    }

    const clientDef    = CHART_DS_MAP[client];
    const schema       = clientDef.schema;
    const clientCharts = clientDef.charts;

    // 2. Resolve chart IDs → list of {id, label, table}
    let chartIds;
    if (!charts || charts === 'all') {
      chartIds = Object.keys(clientCharts);
    } else {
      chartIds = charts.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    }

    const resolvedCharts = chartIds
      .filter(function(id) { return !!clientCharts[id]; })
      .map(function(id) { return { id: id, label: clientCharts[id].label, table: clientCharts[id].table }; });

    if (resolvedCharts.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid chart IDs found.' });
    }

    // 3. DEDUPLICATE: build ordered list of unique tables.
    //    Map each table → the charts that use it (for Export_Info).
    const tableOrder  = [];   // ordered unique table names
    const tableCharts = {};   // table → [chart labels]
    resolvedCharts.forEach(function(c) {
      if (!tableCharts[c.table]) {
        tableCharts[c.table] = [];
        tableOrder.push(c.table);
      }
      tableCharts[c.table].push(c.label);
    });

    const uniqueTableCount = tableOrder.length;
    logger.info('[Export] client=' + client + ' charts=' + resolvedCharts.length + ' unique_tables=' + uniqueTableCount + ' [' + tableOrder.join(', ') + ']');

    // 4. Build workbook
    const wb        = XLSX.utils.book_new();
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const infoRows = [];

    // 5. Fetch ALL unique tables in PARALLEL — drastically faster than sequential
    logger.info('[Export] Fetching ' + tableOrder.length + ' tables in parallel...');
    const fetchStart   = Date.now();
    const tableResults = await Promise.all(
      tableOrder.map(function(tbl) {
        return fetchTable(schema, tbl).then(function(rows) {
          return { tbl: tbl, rows: rows };
        });
      })
    );
    logger.info('[Export] All tables fetched in ' + (Date.now() - fetchStart) + 'ms');

    // 6. Build sheets in tableOrder sequence (order is deterministic)
    tableResults.forEach(function(result) {
      var tbl       = result.tbl;
      var rows      = result.rows;
      var sheetName = safeSheetName(tbl);

      var ws;
      if (rows.length > 0) {
        var headers = Object.keys(rows[0]);
        var aoa = [headers].concat(
          rows.map(function(row) { return rowToArray(row, headers); })
        );
        ws = XLSX.utils.aoa_to_sheet(aoa);
      } else {
        ws = XLSX.utils.aoa_to_sheet([['No data — ' + schema + '."' + tbl + '" returned 0 rows.']]);
      }

      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // One info row per chart that references this table
      var chartLabels = tableCharts[tbl];
      for (var j = 0; j < chartLabels.length; j++) {
        infoRows.push({
          'Client':       client,
          'Schema':       schema,
          'Table':        tbl,
          'Sheet':        sheetName,
          'Chart':        chartLabels[j],
          'Row Count':    rows.length,
          'Exported At':  timestamp,
          'Status':       rows.length > 0 ? 'OK' : 'Empty',
        });
      }
    });

    // 7. Export_Info sheet (first)
    var infoHeaders = ['Client', 'Schema', 'Table', 'Sheet', 'Chart', 'Row Count', 'Exported At', 'Status'];
    var infoAoa = [infoHeaders].concat(
      infoRows.map(function(r) {
        return infoHeaders.map(function(h) { return r[h] != null ? r[h] : ''; });
      })
    );
    var infoWs = XLSX.utils.aoa_to_sheet(infoAoa);
    XLSX.utils.book_append_sheet(wb, infoWs, 'Export_Info');

    // Move Export_Info to front
    var names   = wb.SheetNames;
    var infoIdx = names.indexOf('Export_Info');
    if (infoIdx > 0) { names.splice(infoIdx, 1); names.unshift('Export_Info'); }

    // 8. Produce buffer and send
    var dateTag  = new Date().toISOString().slice(0, 10);
    var fileName = 'DataSource-' + client + '-' + dateTag + '.xlsx';
    var buffer   = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type',        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="' + fileName + '"');
    res.setHeader('Content-Length',      buffer.length);
    res.setHeader('Cache-Control',       'no-cache, no-store, must-revalidate');

    logger.info('[Export] Sending ' + (buffer.length / 1024).toFixed(1) + ' KB -> ' + fileName);
    return res.send(buffer);

  } catch (err) {
    logger.error('[Export] Unhandled error: ' + err.message + '\n' + err.stack);
    // Only send error JSON if headers not yet sent
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Export failed: ' + err.message });
    }
    next(err);
  }
}

module.exports = { downloadDataSource };
