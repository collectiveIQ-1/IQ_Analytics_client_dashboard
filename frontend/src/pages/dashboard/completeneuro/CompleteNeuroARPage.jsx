/**
 * CompleteNeuroARPage.jsx — Accounts Receivable tab for Complete Neuro Dashboard.
 *
 * Layout matches IOM Help AR page:
 *   Main view:
 *     Top-right:  [AR by Insurance] [AR by Surgeon]  DOS | DOE
 *     Row 1:      Bar chart (buckets × Insurance/Patient balance)  |  Donut (% by bucket)
 *     Row 2:      Treemap (AR by Carrier/Insurance type) + [Expand]
 *     Row 3:      [More] button → shows both pivot tables inline
 *
 *   expandView = 'treemap'   → full-width treemap + [Compress]
 *   expandView = 'insurance' → pivot table: Insurance Type × buckets + Grand Total
 *   expandView = 'surgeon'   → pivot table: Surgeon × buckets + Grand Total
 *   expandView = 'more'      → both pivot tables stacked + [Go Back]
 *
 * Bucket order: Current | 30-60 | 60-90 | 90-120 | 120-150 | 150+
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, LabelList,
  PieChart, Pie, Cell,
  Treemap,
  ResponsiveContainer,
} from 'recharts';
import { completeneuroApi } from '../../../api/completeneuro.api';

// ── Constants ─────────────────────────────────────────────────────────────────

const BUCKETS = ['Current', '30-60', '60-90', '90-120', '120-150', '150+'];
const BUCKET_COLORS = {
  'Current':  '#16a34a',
  '30-60':    '#2563EB',
  '60-90':    '#7C3AED',
  '90-120':   '#DB2777',
  '120-150':  '#EA580C',
  '150+':     '#991B1B',
};
const TREEMAP_COLORS = [
  '#1e3a8a','#1e40af','#1d4ed8','#2563eb',
  '#3b82f6','#60a5fa','#7c3aed','#6d28d9',
  '#4c1d95','#5b21b6','#7e22ce','#93c5fd',
];

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};
const fmtDollar = (v) =>
  `$${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

// ── Red toggle/action button ──────────────────────────────────────────────────

function RedBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${
        active
          ? 'bg-red-700 text-white shadow ring-2 ring-white/30'
          : 'bg-[#991b1b] text-white hover:bg-red-800'
      }`}
    >
      {children}
    </button>
  );
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-700 dark:text-zinc-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {fmtMoney(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ h = 300 }) {
  return <div className="animate-pulse bg-slate-100 dark:bg-zinc-800 rounded-xl" style={{ height: h }} />;
}

// ── Bar top labels ────────────────────────────────────────────────────────────

const InsLabel = ({ x, y, value }) => {
  if (!value) return null;
  return <text x={x} y={y - 4} textAnchor="middle" fontSize={9} fontWeight="700" fill="#1D4ED8">{fmtMoney(value)}</text>;
};
const PatLabel = ({ x, y, value }) => {
  if (!value) return null;
  return <text x={x} y={y - 4} textAnchor="middle" fontSize={9} fontWeight="700" fill="#B45309">{fmtMoney(value)}</text>;
};

// ── Treemap custom cell ───────────────────────────────────────────────────────

function TreemapCell({ x, y, width, height, name, value, colorIndex }) {
  if (!width || !height) return null;
  const bg = TREEMAP_COLORS[(colorIndex ?? 0) % TREEMAP_COLORS.length];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={bg} stroke="white" strokeWidth={1.5} rx={2} />
      {width > 50 && height > 28 && (
        <text x={x + 6} y={y + 16} fontSize={10} fontWeight="700" fill="white">
          {`AR -${fmtMoney(value)}`}
        </text>
      )}
      {width > 50 && height > 42 && (
        <text x={x + 6} y={y + 30} fontSize={10} fill="rgba(255,255,255,0.85)">{name}</text>
      )}
    </g>
  );
}

// ── Pivot table ───────────────────────────────────────────────────────────────

function PivotTable({ data, title, loading }) {
  if (loading) return <Skeleton h={280} />;
  if (!data?.length) return <p className="text-sm text-slate-400 text-center py-8">No data available.</p>;

  const activeBuckets = BUCKETS.filter((b) => data.some((r) => (r[b] || 0) !== 0));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-700">
            <th className="sticky left-0 z-10 bg-slate-50 dark:bg-zinc-900 text-left px-4 py-3 font-semibold text-slate-600 dark:text-zinc-300 min-w-[180px]">
              {title}
            </th>
            {activeBuckets.map((b) => (
              <th key={b} className="px-4 py-3 text-right font-semibold min-w-[110px]"
                style={{ color: BUCKET_COLORS[b] || '#374151' }}>
                {b}
              </th>
            ))}
            <th className="px-4 py-3 text-right font-semibold text-indigo-700 dark:text-indigo-300 min-w-[120px]">
              Grand Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri}
              className={`border-b border-slate-100 dark:border-zinc-800 ${
                ri % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-slate-50/40 dark:bg-zinc-900/40'
              }`}
            >
              <td className="sticky left-0 z-10 px-4 py-2 font-semibold text-slate-700 dark:text-zinc-200 bg-inherit whitespace-nowrap">
                {row.name}
              </td>
              {activeBuckets.map((b) => (
                <td key={b} className="px-4 py-2 text-right tabular-nums text-slate-600 dark:text-zinc-400">
                  {(row[b] || 0) !== 0 ? fmtDollar(row[b]) : '—'}
                </td>
              ))}
              <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-zinc-100 tabular-nums">
                {fmtDollar(row.grand_total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 dark:bg-zinc-800 border-t-2 border-slate-300 dark:border-zinc-600">
            <td className="sticky left-0 z-10 px-4 py-2.5 font-bold text-slate-800 dark:text-zinc-100 bg-slate-100 dark:bg-zinc-800">
              Total
            </td>
            {activeBuckets.map((b) => (
              <td key={b} className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-800 dark:text-zinc-100">
                {fmtDollar(data.reduce((s, r) => s + (r[b] || 0), 0))}
              </td>
            ))}
            <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-800 dark:text-zinc-100">
              {fmtDollar(data.reduce((s, r) => s + (r.grand_total || 0), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CompleteNeuroARPage() {
  const [view,       setView]       = useState('dos');
  const [expandView, setExpandView] = useState(null); // null | 'treemap' | 'insurance' | 'surgeon' | 'more'

  const switchView = (v) => { setView(v); setExpandView(null); };

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: dosChart, isLoading: dosLoad } = useQuery({
    queryKey: ['cn-ar-dos'],
    queryFn:  () => completeneuroApi.getArDos().then((r) => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dos',
  });

  const { data: doeChart, isLoading: doeLoad } = useQuery({
    queryKey: ['cn-ar-doe'],
    queryFn:  () => completeneuroApi.getArDoe().then((r) => r.data.data),
    staleTime: 300_000,
    enabled: view === 'doe',
  });

  const { data: insData, isLoading: insLoad } = useQuery({
    queryKey: ['cn-ar-insurance', view],
    queryFn:  () => completeneuroApi.getArByInsurance(view).then((r) => r.data.data),
    staleTime: 300_000,
    enabled: expandView === 'insurance' || expandView === 'treemap' || expandView === null || expandView === 'more',
  });

  const { data: surgData, isLoading: surgLoad } = useQuery({
    queryKey: ['cn-ar-surgeon', view],
    queryFn:  () => completeneuroApi.getArBySurgeon(view).then((r) => r.data.data),
    staleTime: 300_000,
    enabled: expandView === 'surgeon' || expandView === 'more',
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const chartData = view === 'doe' ? doeChart : dosChart;
  const chartLoad = view === 'doe' ? doeLoad  : dosLoad;
  const vLabel    = view.toUpperCase();

  const donutData = useMemo(() => {
    if (!chartData?.length) return [];
    const total = chartData.reduce((s, r) => s + (r.insurance_balance || 0) + (r.patient_balance || 0), 0);
    return chartData
      .map((r) => ({
        name:  r.bucket,
        value: r.insurance_balance + r.patient_balance,
        pct:   total > 0 ? ((r.insurance_balance + r.patient_balance) / total * 100).toFixed(1) : 0,
        fill:  BUCKET_COLORS[r.bucket] || '#6B7280',
      }))
      .filter((d) => d.value > 0);
  }, [chartData]);

  const treemapData = useMemo(() =>
    insData
      ?.filter((r) => (r.grand_total || 0) > 0)
      .map((r, i) => ({ name: r.name, size: r.grand_total, colorIndex: i }))
    ?? [],
  [insData]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ══ SINGLE-TABLE PIVOT (Insurance or Surgeon via header buttons) ══ */}
      {(expandView === 'insurance' || expandView === 'surgeon') && (
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 gap-3 flex-wrap">
            <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
              {expandView === 'insurance' ? `AR by Insurance (${vLabel})` : `AR by Surgeon (${vLabel})`}
            </h2>
            <div className="flex gap-2 flex-wrap justify-end">
              <RedBtn active={expandView === 'insurance'} onClick={() => setExpandView('insurance')}>AR by Insurance</RedBtn>
              <RedBtn active={expandView === 'surgeon'}   onClick={() => setExpandView('surgeon')}>AR by Surgeon</RedBtn>
              <button onClick={() => setExpandView(null)}
                className="px-4 py-1.5 rounded-md text-sm font-bold bg-red-700 text-white hover:bg-red-800 transition-colors">
                Compress
              </button>
            </div>
          </div>
          <div className="px-2 md:px-4 pb-4">
            {expandView === 'insurance' && <PivotTable data={insData}  loading={insLoad}  title="Insurance Type" />}
            {expandView === 'surgeon'   && <PivotTable data={surgData} loading={surgLoad} title="Surgeon" />}
          </div>
        </div>
      )}

      {/* ══ TREEMAP EXPAND ════════════════════════════════════════════════ */}
      {expandView === 'treemap' && (
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-100">AR by Carrier ({vLabel})</h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Total balance by insurance type</p>
            </div>
            <button onClick={() => setExpandView(null)}
              className="px-4 py-1.5 rounded-md text-sm font-bold bg-red-700 text-white hover:bg-red-800 transition-colors">
              Compress
            </button>
          </div>
          <div className="px-2 md:px-4 pb-4" style={{ minHeight: 520, height: 520 }}>
            {insLoad ? <Skeleton h={500} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap data={treemapData} dataKey="size" nameKey="name" aspectRatio={4/3}
                  content={(props) => <TreemapCell {...props} colorIndex={props.colorIndex ?? 0} />} />
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ══ MORE VIEW: both pivot tables ══════════════════════════════════ */}
      {expandView === 'more' && (
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-4 pb-3 gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Accounts Receivable Detail</h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                AR by Insurance & Surgeon — {vLabel}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <RedBtn active={view === 'dos'} onClick={() => setView('dos')}>DOS</RedBtn>
              <RedBtn active={view === 'doe'} onClick={() => setView('doe')}>DOE</RedBtn>
            </div>
          </div>

          {/* AR by Insurance table */}
          <div className="px-4 pb-5">
            <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 mb-2">
              AR by Insurance ({vLabel})
            </p>
            <PivotTable data={insData} loading={insLoad} title="Insurance Type" />
          </div>

          {/* AR by Surgeon table */}
          <div className="px-4 pb-5">
            <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 mb-2">
              AR by Surgeon ({vLabel})
            </p>
            <PivotTable data={surgData} loading={surgLoad} title="Surgeon" />
          </div>

          {/* Go Back */}
          <div className="flex justify-end px-4 pb-4">
            <button onClick={() => setExpandView(null)}
              className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors">
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* ══ MAIN VIEW ═════════════════════════════════════════════════════ */}
      {expandView === null && (
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">

          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-4 pb-3 gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Accounts Receivable</h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                All Time Stats · {view === 'dos' ? 'Date of Service' : 'Date of Entry'}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <RedBtn active={view === 'dos'} onClick={() => switchView('dos')}>DOS</RedBtn>
              <RedBtn active={view === 'doe'} onClick={() => switchView('doe')}>DOE</RedBtn>
            </div>
          </div>

          {/* Row 1: Bar chart (2/3) + Donut (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 px-4 pb-2">

            {/* Bar chart */}
            <div className="lg:col-span-2">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
                Accounts Receivable ({vLabel})
              </p>
              <div style={{ minHeight: 300, height: 300 }}>
                {chartLoad ? <Skeleton h={280} /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData || []}
                      margin={{ top: 24, right: 16, left: 8, bottom: 5 }}
                      barCategoryGap="28%" barGap={2}>
                      <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                        axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtMoney} width={58}
                        tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="insurance_balance" name="Insurance Balance" fill="#1D4ED8" radius={[4,4,0,0]} maxBarSize={60}>
                        <LabelList dataKey="insurance_balance" position="top" content={InsLabel} />
                      </Bar>
                      <Bar dataKey="patient_balance" name="Patient Balance" fill="#F59E0B" radius={[4,4,0,0]} maxBarSize={60}>
                        <LabelList dataKey="patient_balance" position="top" content={PatLabel} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Donut */}
            <div>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
                Accounts Receivable Percentage ({vLabel})
              </p>
              <div style={{ minHeight: 300, height: 300 }}>
                {chartLoad ? <Skeleton h={280} /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" innerRadius={55} outerRadius={100}
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, name, pct }) => {
                          if (Number(pct) < 4) return null;
                          const R = Math.PI / 180;
                          const r = innerRadius + (outerRadius - innerRadius) * 0.55;
                          const x = cx + r * Math.cos(-midAngle * R);
                          const y = cy + r * Math.sin(-midAngle * R);
                          return (
                            <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                              fontSize={9} fontWeight="700" fill="white">
                              {`${name}: ${pct}%`}
                            </text>
                          );
                        }}
                      >
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v, name) => [fmtMoney(v), name]}
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* More button — between bar chart and treemap */}
          <div className="flex justify-end px-4 pb-3">
            <button onClick={() => setExpandView('more')}
              className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors">
              More
            </button>
          </div>

          {/* Row 2: Treemap */}
          <div className="px-2 md:px-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 px-1">AR by Carrier</p>
              <button onClick={() => setExpandView('treemap')}
                className="px-3 py-1 rounded-md text-xs font-bold bg-red-700 text-white hover:bg-red-800 transition-colors">
                Expand
              </button>
            </div>
            <div style={{ minHeight: 320, height: 320 }}>
              {insLoad ? <Skeleton h={300} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap data={treemapData} dataKey="size" nameKey="name" aspectRatio={4/3}
                    content={(props) => <TreemapCell {...props} colorIndex={props.colorIndex ?? 0} />} />
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
