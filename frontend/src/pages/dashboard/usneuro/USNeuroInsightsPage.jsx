/**
 * USNeuroInsightsPage.jsx — Insights Analysis for US Neuro Dashboard.
 *
 * Header: "US Neuro" / "Last 12 Months Stats"
 * Top-right toggle: Insurance (default) | Surgeon
 *
 * Insurance view — "Insurance Wise Analysis"
 *   Rows    = insurance_type
 *   Columns = billing_date months (last 12 months, minus 2 most recent)
 *   Metrics = Visit Count | Total Charge | Total Payments |
 *             % Total Payments | Refund | Total Adjustments
 *
 * Surgeon view — "Surgeon Wise Analysis"
 *   Same layout + Surgeon dropdown filter
 *
 * % Total Payments = each entity's collected / total collected for that month
 *   (percent-of-table-across calculation)
 */

import { useState, useMemo } from 'react';
import { useQuery }          from '@tanstack/react-query';
import { usneuroApi }        from '../../../api/usneuro.api';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtCount = (v) => Number(v || 0).toLocaleString('en-US');

const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtPct = (v) => {
  const n = Number(v || 0);
  return n === 0 ? '' : `${n.toFixed(2)}%`;
};

const fmtShortMonth = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// ── Toggle button ─────────────────────────────────────────────────────────────

function ViewBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
        active ? 'bg-red-700 text-white shadow ring-2 ring-white/30'
               : 'bg-[#991b1b] text-white hover:bg-red-800'
      }`}>
      {children}
    </button>
  );
}

// ── Metric row definitions ────────────────────────────────────────────────────

const METRIC_ROWS = [
  { key: 'visit_count',        label: 'Visit Count',        fmt: fmtCount,  bold: false },
  { key: 'total_charge',       label: 'Total Charge',       fmt: fmtMoney,  bold: false },
  { key: 'total_payments',     label: 'Total Payments',     fmt: fmtMoney,  bold: false },
  { key: 'pct_total_payments', label: '% Total Payments',   fmt: fmtPct,    bold: false },
  { key: 'refund',             label: 'Refund',             fmt: fmtMoney,  bold: false },
  { key: 'total_adjustments',  label: 'Total Adjustments',  fmt: fmtMoney,  bold: false },
];

// ── Pivot transform ───────────────────────────────────────────────────────────

/**
 * Transform flat rows [{entity, month, visit_count, ...}]
 * into { months: [...], entities: [{ name, data: { month: {...metrics} } }] }
 */
function pivotData(rows) {
  if (!rows?.length) return { months: [], entities: [] };

  const monthSet = new Set();
  const entityMap = {};

  rows.forEach(r => {
    const monthKey = r.month instanceof Date
      ? r.month.toISOString()
      : String(r.month);
    monthSet.add(monthKey);
    if (!entityMap[r.entity]) entityMap[r.entity] = { name: r.entity, data: {} };
    entityMap[r.entity].data[monthKey] = r;
  });

  // Sort months ascending
  const months = Array.from(monthSet).sort((a, b) => new Date(a) - new Date(b));
  const entities = Object.values(entityMap).sort((a, b) => a.name.localeCompare(b.name));

  return { months, entities };
}

// ── Table skeleton ────────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="space-y-2 p-4">
    {[1,2,3,4].map(i => (
      <div key={i} className="h-[150px] animate-pulse rounded-xl bg-slate-50 dark:bg-zinc-900" />
    ))}
  </div>
);

// ── Main pivot table ──────────────────────────────────────────────────────────

function InsightTable({ rows, entityLabel, loading }) {
  const { months, entities } = useMemo(() => pivotData(rows), [rows]);

  if (loading) return <Skeleton />;
  if (!rows?.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-slate-400 dark:text-zinc-500">No data available.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr className="bg-slate-50 dark:bg-zinc-900">
            <th className="sticky left-0 z-20 bg-slate-50 dark:bg-zinc-900 text-left px-4 py-2.5
                           font-semibold text-slate-600 dark:text-zinc-300 min-w-[200px]
                           border-b border-slate-200 dark:border-zinc-700">
              {entityLabel}
            </th>
            <th className="sticky left-[200px] z-20 bg-slate-50 dark:bg-zinc-900 text-left px-3 py-2.5
                           font-semibold text-slate-500 dark:text-zinc-400 min-w-[140px]
                           border-b border-slate-200 dark:border-zinc-700">
              Metric
            </th>
            {months.map(m => (
              <th key={m} className="px-3 py-2.5 text-right font-semibold text-indigo-700
                                     dark:text-indigo-300 whitespace-nowrap min-w-[100px]
                                     border-b border-slate-200 dark:border-zinc-700">
                {fmtShortMonth(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entities.map((entity, ei) =>
            METRIC_ROWS.map((metric, mi) => {
              const isFirst   = mi === 0;
              const isLast    = mi === METRIC_ROWS.length - 1;
              const isEvenEnt = ei % 2 === 0;
              const rowBg = isEvenEnt ? 'bg-white dark:bg-zinc-950' : 'bg-slate-50/60 dark:bg-zinc-900/40';
              return (
                <tr key={`${ei}-${mi}`} className={rowBg}>

                  {/* Entity name (first metric row only, spanning all metric rows visually) */}
                  {isFirst ? (
                    <td
                      rowSpan={METRIC_ROWS.length}
                      className={`sticky left-0 z-10 bg-inherit px-4 py-2 font-bold
                                  text-slate-800 dark:text-zinc-100 align-top pt-3
                                  whitespace-nowrap min-w-[200px]
                                  ${isLast ? '' : 'border-b border-slate-100 dark:border-zinc-800/40'}`}
                    >
                      {entity.name}
                    </td>
                  ) : null}

                  {/* Metric label */}
                  <td className={`sticky left-[200px] z-10 bg-inherit px-3 py-1.5 text-slate-500
                                  dark:text-zinc-400 whitespace-nowrap min-w-[140px]
                                  ${isLast ? 'border-b border-slate-200 dark:border-zinc-700 pb-2.5'
                                           : 'border-b border-slate-100/60 dark:border-zinc-800/30'}`}>
                    {metric.label}
                  </td>

                  {/* Month values */}
                  {months.map(m => {
                    const d = entity.data[m];
                    const val = d ? d[metric.key] : null;
                    return (
                      <td key={m}
                        className={`px-3 py-1.5 text-right tabular-nums text-slate-600
                                    dark:text-zinc-400
                                    ${isLast
                                      ? 'border-b border-slate-200 dark:border-zinc-700 pb-2.5'
                                      : 'border-b border-slate-100/60 dark:border-zinc-800/30'}`}>
                        {val != null && val !== 0 ? metric.fmt(val) : (
                          <span className="text-slate-300 dark:text-zinc-600">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function USNeuroInsightsPage() {
  const [view,    setView]    = useState('insurance'); // 'insurance' | 'surgeon'
  const [surgeon, setSurgeon] = useState('All');

  const isInsurance = view === 'insurance';

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: insRows,  isLoading: insLoad  } = useQuery({
    queryKey: ['usneuro-insights-insurance'],
    queryFn:  () => usneuroApi.getInsightsByInsurance().then(r => r.data.data),
    staleTime: 300_000,
    enabled: isInsurance,
  });

  const { data: surgRows, isLoading: surgLoad } = useQuery({
    queryKey: ['usneuro-insights-surgeon', surgeon],
    queryFn:  () => usneuroApi.getInsightsBySurgeon(surgeon).then(r => r.data.data),
    staleTime: 300_000,
    enabled: !isInsurance,
  });

  const { data: surgeons } = useQuery({
    queryKey: ['usneuro-insights-surgeons'],
    queryFn:  () => usneuroApi.getInsightsSurgeons().then(r => r.data.data),
    staleTime: 600_000,
    enabled: !isInsurance,
  });

  // ── Render ────────────────────────────────────────────────────────────────

  const tableTitle    = isInsurance ? 'Insurance Wise Analysis' : 'Surgeon Wise Analysis';
  const entityLabel   = isInsurance ? 'Insurance Type' : 'Surgeon';
  const activeRows    = isInsurance ? insRows : surgRows;
  const activeLoading = isInsurance ? insLoad : surgLoad;

  return (
    <div className="space-y-4">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div />
        <div className="flex items-center gap-2 flex-wrap">
          {!isInsurance && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">Surgeon</span>
              <select
                value={surgeon}
                onChange={e => setSurgeon(e.target.value)}
                className="text-xs border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1.5
                           bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200
                           focus:outline-none focus:ring-1 focus:ring-red-400 min-w-[180px]"
              >
                <option value="All">(All)</option>
                {(surgeons || []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <ViewBtn active={isInsurance} onClick={() => setView('insurance')}>Insurance</ViewBtn>
          <ViewBtn active={!isInsurance} onClick={() => setView('surgeon')}>Surgeon</ViewBtn>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100
                      dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b border-slate-50 dark:border-zinc-800">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-zinc-200">{tableTitle}</h3>
        </div>
        <InsightTable
          rows={activeRows}
          entityLabel={entityLabel}
          loading={activeLoading}
        />
      </div>

    </div>
  );
}
