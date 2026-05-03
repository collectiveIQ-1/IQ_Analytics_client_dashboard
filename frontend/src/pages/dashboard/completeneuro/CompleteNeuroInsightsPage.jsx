/**
 * CompleteNeuroInsightsPage.jsx
 * Pivot table: entity × last-12-months columns, 6 sub-metric rows per entity.
 * Views: Insurance | Surgeon | Reader | Technician
 */

import { useState, useMemo } from 'react';
import { useQuery }          from '@tanstack/react-query';
import { completeneuroApi }  from '../../../api/completeneuro.api';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt  = (v) => (v == null ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
const fmtN = (v) => (v == null ? '—' : Number(v).toLocaleString());
const fmtP = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);

const VIEWS = [
  { id: 'insurance',   label: 'Insurance Type' },
  { id: 'surgeon',     label: 'Surgeon Wise' },
  { id: 'reader',      label: 'Reader Wise' },
  { id: 'technician',  label: 'Technician Wise' },
];

const METRIC_DEFS = [
  { key: 'visit_count',        label: 'Visits',             fmt: fmtN },
  { key: 'total_charge',       label: 'Total Charge',       fmt: fmt  },
  { key: 'total_payments',     label: 'Total Payments',     fmt: fmt  },
  { key: 'pct_total_payments', label: '% Total Payments',   fmt: fmtP },
  { key: 'refund',             label: 'Refund',             fmt: fmt  },
  { key: 'total_adjustments',  label: 'Adjustments',        fmt: fmt  },
];

const API_FN = {
  insurance:   () => completeneuroApi.getInsightsInsurance(),
  surgeon:     () => completeneuroApi.getInsightsSurgeon(),
  reader:      () => completeneuroApi.getInsightsReader(),
  technician:  () => completeneuroApi.getInsightsTechnician(),
};

// Build sorted list of last-12 YYYY-MM strings (oldest → newest)
function buildMonthKeys(rows) {
  const set = new Set(rows.map((r) => r.month));
  return Array.from(set).sort();
}

// Group rows by entity → { [entity]: { [month]: rowData } }
function pivot(rows) {
  const map = {};
  for (const r of rows) {
    if (!map[r.entity]) map[r.entity] = {};
    map[r.entity][r.month] = r;
  }
  return map;
}

// Grand-total row across all entities for each month
function buildTotals(rows, months) {
  const tot = {};
  for (const m of months) {
    const slice = rows.filter((r) => r.month === m);
    tot[m] = {
      visit_count:        slice.reduce((s, r) => s + (r.visit_count || 0), 0),
      total_charge:       slice.reduce((s, r) => s + (r.total_charge || 0), 0),
      total_payments:     slice.reduce((s, r) => s + (r.total_payments || 0), 0),
      pct_total_payments: null, // meaningless to sum
      refund:             slice.reduce((s, r) => s + (r.refund || 0), 0),
      total_adjustments:  slice.reduce((s, r) => s + (r.total_adjustments || 0), 0),
    };
  }
  return tot;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64 text-slate-400 dark:text-zinc-500 text-sm">
      Loading insights…
    </div>
  );
}

function ErrorMsg({ msg }) {
  return (
    <div className="flex items-center justify-center h-40 text-red-500 text-sm">{msg}</div>
  );
}

// ─── main pivot table ─────────────────────────────────────────────────────────

function InsightsPivotTable({ rows, search }) {
  const months   = useMemo(() => buildMonthKeys(rows), [rows]);
  const pivoted  = useMemo(() => pivot(rows), [rows]);
  const totals   = useMemo(() => buildTotals(rows, months), [rows, months]);

  const entities = useMemo(() => {
    const all = Object.keys(pivoted).sort((a, b) => a.localeCompare(b));
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((e) => e.toLowerCase().includes(q));
  }, [pivoted, search]);

  if (months.length === 0) {
    return <div className="text-center text-slate-400 dark:text-zinc-500 py-16 text-sm">No data available.</div>;
  }

  // short month label: "Jan 24"
  const monthLabel = (m) => {
    const [yr, mo] = m.split('-');
    const d = new Date(Number(yr), Number(mo) - 1, 1);
    return d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700">
      <table className="min-w-max w-full text-xs border-collapse">
        <thead>
          {/* Month header row */}
          <tr className="bg-slate-100 dark:bg-zinc-800">
            <th
              className="sticky left-0 z-10 bg-slate-100 dark:bg-zinc-800 text-left px-3 py-2 font-semibold text-slate-600 dark:text-zinc-300 border-b border-r border-slate-200 dark:border-zinc-700 min-w-[150px]"
              rowSpan={2}
            >
              Entity
            </th>
            <th
              className="sticky left-[150px] z-10 bg-slate-100 dark:bg-zinc-800 text-left px-3 py-2 font-semibold text-slate-600 dark:text-zinc-300 border-b border-r border-slate-200 dark:border-zinc-700 min-w-[130px]"
              rowSpan={2}
            >
              Metric
            </th>
            {months.map((m) => (
              <th
                key={m}
                className="px-3 py-2 text-center font-semibold text-slate-600 dark:text-zinc-300 border-b border-r border-slate-200 dark:border-zinc-700 whitespace-nowrap min-w-[90px]"
              >
                {monthLabel(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entities.map((entity, eIdx) => {
            const eData  = pivoted[entity] || {};
            const isEven = eIdx % 2 === 0;
            const rowBg  = isEven
              ? 'bg-white dark:bg-zinc-900'
              : 'bg-slate-50 dark:bg-zinc-800/50';

            return METRIC_DEFS.map((metric, mIdx) => (
              <tr
                key={`${entity}-${metric.key}`}
                className={`${rowBg} hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors`}
              >
                {/* Entity cell — only for first metric row */}
                {mIdx === 0 && (
                  <td
                    rowSpan={METRIC_DEFS.length}
                    className={`sticky left-0 z-10 ${rowBg} px-3 py-1.5 font-semibold text-slate-700 dark:text-zinc-200 border-b border-r border-slate-200 dark:border-zinc-700 align-middle min-w-[150px] text-xs leading-snug`}
                  >
                    {entity}
                  </td>
                )}

                {/* Metric label */}
                <td
                  className={`sticky left-[150px] z-10 ${rowBg} px-3 py-1.5 text-slate-500 dark:text-zinc-400 border-b border-r border-slate-200 dark:border-zinc-700 whitespace-nowrap min-w-[130px]`}
                >
                  {metric.label}
                </td>

                {/* Month cells */}
                {months.map((m) => {
                  const cell = eData[m];
                  const val  = cell ? cell[metric.key] : null;
                  return (
                    <td
                      key={m}
                      className="px-3 py-1.5 text-right text-slate-600 dark:text-zinc-300 border-b border-r border-slate-200 dark:border-zinc-700 tabular-nums whitespace-nowrap"
                    >
                      {metric.fmt(val)}
                    </td>
                  );
                })}
              </tr>
            ));
          })}

          {/* Grand Total rows */}
          {METRIC_DEFS.map((metric, mIdx) => (
            <tr
              key={`total-${metric.key}`}
              className="bg-red-50 dark:bg-red-900/20 font-semibold"
            >
              {mIdx === 0 && (
                <td
                  rowSpan={METRIC_DEFS.length}
                  className="sticky left-0 z-10 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-red-700 dark:text-red-300 border-t-2 border-b border-r border-red-200 dark:border-red-800 align-middle font-bold min-w-[150px] text-xs"
                >
                  Grand Total
                </td>
              )}
              <td className="sticky left-[150px] z-10 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-red-600 dark:text-red-400 border-b border-r border-red-200 dark:border-red-800 whitespace-nowrap min-w-[130px]">
                {metric.label}
              </td>
              {months.map((m) => {
                const val = totals[m] ? totals[m][metric.key] : null;
                return (
                  <td
                    key={m}
                    className="px-3 py-1.5 text-right text-red-700 dark:text-red-300 border-b border-r border-red-200 dark:border-red-800 tabular-nums whitespace-nowrap"
                  >
                    {metric.fmt(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── page component ───────────────────────────────────────────────────────────

export default function CompleteNeuroInsightsPage() {
  const [activeView, setActiveView] = useState('insurance');
  const [search,     setSearch]     = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey:  ['cn-insights', activeView],
    queryFn:   () => API_FN[activeView]().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 300_000,
  });

  const rows = data ?? [];

  const handleViewChange = (v) => {
    setActiveView(v);
    setSearch('');
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Toggle buttons */}
        <div className="flex gap-2 flex-wrap">
          {VIEWS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleViewChange(id)}
              className={[
                'px-5 py-2 rounded-md text-sm font-bold transition-all duration-150 shadow-sm',
                activeView === id
                  ? 'bg-red-800 text-white hover:bg-red-900'
                  : 'bg-red-700 text-white hover:bg-red-800',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder={`Search ${VIEWS.find((v) => v.id === activeView)?.label ?? ''}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-400 w-52"
        />
      </div>

      {/* Summary chips */}
      {!isLoading && !isError && rows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Entities',      val: new Set(rows.map((r) => r.entity)).size },
            { label: 'Months',        val: new Set(rows.map((r) => r.month)).size },
            { label: 'Total Visits',  val: fmtN(rows.reduce((s, r) => s + (r.visit_count || 0), 0)) },
            { label: 'Total Charges', val: fmt(rows.reduce((s, r)  => s + (r.total_charge || 0), 0)) },
            { label: 'Total Payments',val: fmt(rows.reduce((s, r)  => s + (r.total_payments || 0), 0)) },
          ].map(({ label, val }) => (
            <div key={label} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-xs">
              <span className="text-slate-500 dark:text-zinc-400">{label}: </span>
              <span className="font-semibold text-slate-700 dark:text-zinc-200">{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading && <LoadingSpinner />}
      {isError   && <ErrorMsg msg={error?.message ?? 'Failed to load insights data.'} />}
      {!isLoading && !isError && (
        <InsightsPivotTable rows={rows} search={search} />
      )}
    </div>
  );
}
