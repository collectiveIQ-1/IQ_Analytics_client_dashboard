/**
 * InnervateInsightsPage.jsx — Insights tab for Innervate Dashboard.
 *
 * Toggle: Insurance (default) | Surgeon | Reader | Technician
 * Table:  entity × month columns, 6 metrics per entity row
 *
 * % Total Payments = SUM(collected) / monthly total × 100  (window function on backend)
 *
 * Schema: iq_innervate  Table: innervate_full_billing
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { innervateApi } from '../../../api/innervate.api';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtK = (v) => {
  const n = Number(v || 0);
  if (n === 0) return '';
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(n) >= 1_000)     return '$' + (n / 1_000).toFixed(2) + 'K';
  return '$' + n.toFixed(2);
};
const fmtPct = (v) => { const n = Number(v || 0); return n === 0 ? '' : n.toFixed(2) + '%'; };
const fmtMonth = (m) => {
  if (!m) return '';
  const [y, mo] = m.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return (months[parseInt(mo, 10) - 1] || mo) + ' ' + y;
};

// ── Metric row definitions ────────────────────────────────────────────────────

const METRICS = [
  { key: 'visit_count',        label: 'Visit Count',         fmt: (v) => { const n = Number(v||0); return n === 0 ? '' : '$' + (n/1000).toFixed(2) + 'K'; } },
  { key: 'total_charge',       label: 'Total Charge',        fmt: fmtK   },
  { key: 'total_payments',     label: 'Total Payments',      fmt: fmtK   },
  { key: 'pct_total_payments', label: '% of Total Payments', fmt: fmtPct },
  { key: 'refund',             label: 'Refund',              fmt: fmtK   },
  { key: 'total_adjustments',  label: 'Total Adjustments',   fmt: fmtK   },
];

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ h = 200 }) {
  return <div className="animate-pulse bg-slate-100 dark:bg-zinc-800 rounded-lg" style={{ height: h }} />;
}

// ── Toggle button ─────────────────────────────────────────────────────────────

function ViewBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
        active ? 'bg-red-700 text-white shadow ring-2 ring-white/30'
               : 'bg-[#991b1b] text-white hover:bg-red-800'
      }`}
    >
      {children}
    </button>
  );
}

// ── Insights table ────────────────────────────────────────────────────────────

function InsightsTable({ data, loading, entityLabel }) {
  const { months, entities } = useMemo(() => {
    if (!data?.length) return { months: [], entities: {} };
    const monthSet = new Set();
    const map = {};
    data.forEach((r) => {
      monthSet.add(r.month);
      if (!map[r.entity]) map[r.entity] = {};
      map[r.entity][r.month] = r;
    });
    return { months: [...monthSet].sort(), entities: map };
  }, [data]);

  if (loading) return <Skeleton h={300} />;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">
            <th className="sticky left-0 z-10 bg-slate-50 dark:bg-zinc-800 px-3 py-2.5 text-left font-semibold text-slate-600 dark:text-zinc-300 min-w-[130px]">
              {entityLabel}
            </th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-500 dark:text-zinc-400 min-w-[130px]" />
            {months.map((m) => (
              <th key={m} className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-zinc-300 whitespace-nowrap min-w-[100px]">
                {fmtMonth(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(entities).map(([entity, monthMap], eIdx) =>
            METRICS.map((row, rowIdx) => {
              const isFirst = rowIdx === 0;
              const isLast  = rowIdx === METRICS.length - 1;
              const odd     = eIdx % 2 === 0;
              const bg      = odd ? 'bg-white dark:bg-zinc-900' : 'bg-slate-50/50 dark:bg-zinc-800/40';
              const stickyBg = odd ? 'bg-white dark:bg-zinc-900' : 'bg-slate-50 dark:bg-zinc-800/40';
              return (
                <tr
                  key={`${entity}-${row.key}`}
                  className={`${bg} ${isLast ? 'border-b-2 border-slate-200 dark:border-zinc-700' : ''}`}
                >
                  <td className={`sticky left-0 z-10 ${stickyBg} px-3 py-1 font-semibold text-slate-700 dark:text-zinc-200 align-top border-r border-slate-100 dark:border-zinc-700`}>
                    {isFirst ? entity : ''}
                  </td>
                  <td className="px-3 py-1 text-slate-500 dark:text-zinc-400 whitespace-nowrap font-medium">
                    {row.label}
                  </td>
                  {months.map((m) => {
                    const cell = monthMap[m];
                    const val  = cell ? cell[row.key] : 0;
                    return (
                      <td key={m} className="px-3 py-1 text-right tabular-nums text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                        {row.fmt(val)}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
          {!Object.keys(entities).length && (
            <tr>
              <td colSpan={months.length + 2} className="px-4 py-10 text-center text-slate-400">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InnervateInsightsPage() {
  const [view,   setView]   = useState('insurance'); // insurance|surgeon|reader|technician
  const [filter, setFilter] = useState('');

  const switchView = (v) => { setView(v); setFilter(''); };

  // Data queries
  const { data: insuranceData, isLoading: insLoad } = useQuery({
    queryKey: ['inv-insights-insurance'],
    queryFn:  () => innervateApi.getInsightsInsurance().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 5 * 60_000,
    enabled: view === 'insurance',
  });
  const { data: surgeonData, isLoading: surLoad } = useQuery({
    queryKey: ['inv-insights-surgeon', filter],
    queryFn:  () => innervateApi.getInsightsSurgeon(filter).then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 5 * 60_000,
    enabled: view === 'surgeon',
  });
  const { data: readerData, isLoading: rdLoad } = useQuery({
    queryKey: ['inv-insights-reader', filter],
    queryFn:  () => innervateApi.getInsightsReader(filter).then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 5 * 60_000,
    enabled: view === 'reader',
  });
  const { data: techData, isLoading: techLoad } = useQuery({
    queryKey: ['inv-insights-technician', filter],
    queryFn:  () => innervateApi.getInsightsTechnician(filter).then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 5 * 60_000,
    enabled: view === 'technician',
  });

  // Dropdown lists
  const { data: surgeonList = [] } = useQuery({
    queryKey: ['inv-insights-surgeon-list'],
    queryFn:  () => innervateApi.getInsightsSurgeonList().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 30 * 60_000,
    enabled: view === 'surgeon',
  });
  const { data: readerList = [] } = useQuery({
    queryKey: ['inv-insights-reader-list'],
    queryFn:  () => innervateApi.getInsightsReaderList().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 30 * 60_000,
    enabled: view === 'reader',
  });
  const { data: techList = [] } = useQuery({
    queryKey: ['inv-insights-tech-list'],
    queryFn:  () => innervateApi.getInsightsTechList().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 30 * 60_000,
    enabled: view === 'technician',
  });

  const activeData  = view === 'insurance'  ? insuranceData
                    : view === 'surgeon'    ? surgeonData
                    : view === 'reader'     ? readerData
                    : techData;
  const activeLoad  = view === 'insurance'  ? insLoad
                    : view === 'surgeon'    ? surLoad
                    : view === 'reader'     ? rdLoad
                    : techLoad;
  const activeList  = view === 'surgeon'    ? surgeonList
                    : view === 'reader'     ? readerList
                    : view === 'technician' ? techList
                    : [];
  const entityLabel = view === 'insurance'  ? 'Insurance Type'
                    : view === 'surgeon'    ? 'Surgeon'
                    : view === 'reader'     ? 'Reader'
                    : 'Technician';
  const title       = view === 'insurance'  ? 'Insurance Wise Analysis'
                    : view === 'surgeon'    ? 'Surgeon Wise Analysis'
                    : view === 'reader'     ? 'Reader Wise Analysis'
                    : 'Technician Wise Analysis';
  const dropLabel   = view === 'surgeon'    ? 'Surgeon'
                    : view === 'reader'     ? 'Reader'
                    : view === 'technician' ? 'Technician'
                    : null;

  return (
    <div className="space-y-4">
      {/* Toggle row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div />
        <div className="flex gap-1.5 flex-wrap">
          <ViewBtn active={view === 'technician'} onClick={() => switchView('technician')}>Technician</ViewBtn>
          <ViewBtn active={view === 'reader'}     onClick={() => switchView('reader')}>Reader</ViewBtn>
          <ViewBtn active={view === 'insurance'}  onClick={() => switchView('insurance')}>Insurance</ViewBtn>
          <ViewBtn active={view === 'surgeon'}    onClick={() => switchView('surgeon')}>Surgeon</ViewBtn>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-[13px] font-semibold text-slate-700 dark:text-zinc-200">{title}</h3>
          {dropLabel && activeList.length > 0 && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="">({dropLabel}: All)</option>
              {activeList.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}
        </div>
        <InsightsTable
          data={activeData ?? []}
          loading={activeLoad}
          entityLabel={entityLabel}
        />
      </div>
    </div>
  );
}
