/**
 * InnervateAccountReceivablePage.jsx — Accounts Receivable tab for Innervate Dashboard.
 *
 * DOS mode: bucket bar chart (Insurance dark-blue / Patient light-blue)
 *           + bucket donut + carrier treemap + category pie
 * DOE mode: same charts but based on billing_date buckets
 *
 * Expand view: pivot tables — AR by Insurance | AR by Surgeon (with Compress)
 *
 * Cross-filtering: clicking a bucket or a treemap carrier filters all charts.
 *
 * Schema: iq_innervate  Table: innervate_full_billing
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar,
  PieChart, Pie, Cell,
  Treemap,
  ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { innervateApi } from '../../../api/innervate.api';

// ── Constants ─────────────────────────────────────────────────────────────────

const BUCKET_ORDER = ['Current', '30-60', '60-90', '90-120', '120-150', '150+'];

// Treemap color palette (darkest → lightest navy/indigo)
const TREEMAP_PALETTE = [
  '#0F172A', '#1E3A5F', '#1E3A8A', '#1D4ED8', '#2563EB',
  '#3B82F6', '#60A5FA', '#475569', '#334155', '#1E293B',
];

// Donut colors per bucket
const BUCKET_COLORS = {
  'Current':  '#0F172A',
  '30-60':    '#1E3A8A',
  '60-90':    '#1D4ED8',
  '90-120':   '#2563EB',
  '120-150':  '#60A5FA',
  '150+':     '#93C5FD',
};

// Category colors
const CAT_COLORS = { Insurance: '#1E3A8A', Patient: '#93C5FD' };

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-slate-700 dark:text-zinc-200 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-medium">
          {p.name}: {fmtMoney(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Toggle button ─────────────────────────────────────────────────────────────

function ViewBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
        active
          ? 'bg-red-700 text-white shadow ring-2 ring-white/30'
          : 'bg-[#991b1b] text-white hover:bg-red-800'
      }`}
    >
      {children}
    </button>
  );
}

// ── Tab button (Insurance / Surgeon inside expand) ────────────────────────────

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
        active
          ? 'bg-red-700 text-white'
          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
      }`}
    >
      {children}
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ height = 280 }) {
  return <div className="animate-pulse bg-slate-50 dark:bg-zinc-900 rounded-xl" style={{ height }} />;
}

// ── Custom Treemap cell ───────────────────────────────────────────────────────

function TreemapCell({ x, y, width, height, name, value, index, activeCarrier, onClick }) {
  const fill = TREEMAP_PALETTE[index % TREEMAP_PALETTE.length];
  const dimmed = activeCarrier && activeCarrier !== name;
  const showLabel = width > 60 && height > 40;
  const showValue = width > 70 && height > 55;
  return (
    <g onClick={() => onClick(name)} style={{ cursor: 'pointer' }}>
      <rect
        x={x + 1} y={y + 1}
        width={width - 2} height={height - 2}
        fill={fill}
        opacity={dimmed ? 0.35 : 1}
        rx={3}
      />
      {showLabel && (
        <text
          x={x + 8} y={y + 18}
          fontSize={Math.min(12, width / 8)}
          fontWeight="700"
          fill="white"
          style={{ pointerEvents: 'none' }}
        >
          {name}
        </text>
      )}
      {showValue && (
        <text
          x={x + 8} y={y + 34}
          fontSize={Math.min(11, width / 9)}
          fill="rgba(255,255,255,0.85)"
          style={{ pointerEvents: 'none' }}
        >
          AR -{fmtMoney(value)}
        </text>
      )}
    </g>
  );
}

// ── Pivot table (expand view) ─────────────────────────────────────────────────

function PivotTable({ data, labelKey, loading }) {
  const [surgeonFilter, setSurgeonFilter] = useState('');

  const filtered = useMemo(() => {
    if (!data?.length) return [];
    if (labelKey !== 'surgeon' || !surgeonFilter) return data;
    return data.filter((r) =>
      String(r[labelKey]).toLowerCase().includes(surgeonFilter.toLowerCase())
    );
  }, [data, labelKey, surgeonFilter]);

  if (loading) return <Skeleton height={320} />;
  if (!filtered.length) return <p className="text-sm text-slate-400 text-center py-10">No data.</p>;

  return (
    <div className="space-y-2">
      {labelKey === 'surgeon' && (
        <input
          type="text"
          placeholder="Filter by surgeon…"
          value={surgeonFilter}
          onChange={(e) => setSurgeonFilter(e.target.value)}
          className="w-64 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-700">
              <th className="sticky left-0 z-10 bg-slate-50 dark:bg-zinc-900 text-left px-4 py-2.5 font-semibold text-slate-600 dark:text-zinc-300 min-w-[200px]">
                {labelKey === 'surgeon' ? 'Surgeon' : 'Insurance Type'}
              </th>
              {BUCKET_ORDER.map((b) => (
                <th key={b} className="px-3 py-2.5 text-center font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap min-w-[90px]">
                  {b}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center font-bold text-slate-700 dark:text-zinc-200 whitespace-nowrap min-w-[100px]">
                Grand Total
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, ri) => (
              <tr
                key={row[labelKey]}
                className={`border-b border-slate-100 dark:border-zinc-800 ${
                  ri % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-slate-50/50 dark:bg-zinc-900/40'
                }`}
              >
                <td className="sticky left-0 z-10 px-4 py-2 font-medium text-slate-700 dark:text-zinc-300 bg-inherit whitespace-nowrap">
                  {row[labelKey]}
                </td>
                {BUCKET_ORDER.map((b) => (
                  <td key={b} className="px-3 py-2 text-center text-slate-600 dark:text-zinc-400 tabular-nums">
                    {row[b] ? fmtMoney(row[b]) : '—'}
                  </td>
                ))}
                <td className="px-3 py-2 text-center font-semibold text-slate-700 dark:text-zinc-200 tabular-nums">
                  {fmtMoney(row.grand_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InnervateAccountReceivablePage() {
  const [view,          setView]          = useState('dos');        // 'dos' | 'doe'
  const [expanded,      setExpanded]      = useState(false);        // expand view open?
  const [expandTab,     setExpandTab]     = useState('insurance');  // 'insurance' | 'surgeon'
  const [activeBucket,  setActiveBucket]  = useState(null);        // cross-filter bucket
  const [activeCarrier, setActiveCarrier] = useState(null);        // cross-filter carrier

  const switchView = (v) => {
    setView(v);
    setExpanded(false);
    setActiveBucket(null);
    setActiveCarrier(null);
  };

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: dosData, isLoading: dosLoad } = useQuery({
    queryKey: ['inv-ar-dos'],
    queryFn:  () => innervateApi.getArDos().then((r) => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dos',
  });

  const { data: doeData, isLoading: doeLoad } = useQuery({
    queryKey: ['inv-ar-doe'],
    queryFn:  () => innervateApi.getArDoe().then((r) => r.data.data),
    staleTime: 300_000,
    enabled: view === 'doe',
  });

  const { data: insData, isLoading: insLoad } = useQuery({
    queryKey: ['inv-ar-insurance', view],
    queryFn:  () => innervateApi.getArInsurance(view).then((r) => r.data.data),
    staleTime: 300_000,
    enabled: expanded && expandTab === 'insurance',
  });

  const { data: surgData, isLoading: surgLoad } = useQuery({
    queryKey: ['inv-ar-surgeon', view],
    queryFn:  () => innervateApi.getArSurgeon(view).then((r) => r.data.data),
    staleTime: 300_000,
    enabled: expanded && expandTab === 'surgeon',
  });

  // ── Derived data with cross-filtering ────────────────────────────────────

  const raw     = view === 'doe' ? doeData : dosData;
  const loading = view === 'doe' ? doeLoad : dosLoad;
  const modeLabel = view.toUpperCase();

  // Filtered byCarrier rows
  const filteredByCarrier = useMemo(() => {
    const rows = raw?.byCarrier || [];
    if (!activeBucket) return rows;
    return rows.filter((r) => r.bucket === activeBucket);
  }, [raw, activeBucket]);

  // Treemap — aggregate carrier totals (filtered by bucket if set)
  const treemapData = useMemo(() => {
    const totals = {};
    filteredByCarrier.forEach((r) => {
      if (!totals[r.insurance_type]) totals[r.insurance_type] = 0;
      totals[r.insurance_type] += r.total_balance;
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredByCarrier]);

  // Bar chart buckets — filtered by carrier if set
  const barData = useMemo(() => {
    if (!activeCarrier) return raw?.buckets || [];
    const byCarrier = (raw?.byCarrier || []).filter((r) => r.insurance_type === activeCarrier);
    return BUCKET_ORDER.map((b) => {
      const row = byCarrier.find((r) => r.bucket === b);
      return { bucket: b, insurance_ar: row?.total_balance || 0, patient_ar: 0, total_ar: row?.total_balance || 0 };
    }).filter((r) => r.total_ar > 0);
  }, [raw, activeCarrier]);

  // Bucket donut — same filter
  const donutData = useMemo(() => {
    if (!activeCarrier) return (raw?.buckets || []).map((r) => ({ name: r.bucket, value: r.total_ar }));
    const byCarrier = (raw?.byCarrier || []).filter((r) => r.insurance_type === activeCarrier);
    const totals = {};
    byCarrier.forEach((r) => { totals[r.bucket] = (totals[r.bucket] || 0) + r.total_balance; });
    return BUCKET_ORDER.map((b) => ({ name: b, value: totals[b] || 0 })).filter((r) => r.value > 0);
  }, [raw, activeCarrier]);

  // Category pie — filtered
  const catData = useMemo(() => {
    if (!activeBucket && !activeCarrier) return raw?.category || [];
    const rows = filteredByCarrier.filter((r) => !activeCarrier || r.insurance_type === activeCarrier);
    const totals = { Insurance: 0, Patient: 0 };
    rows.forEach((r) => {
      const isPatient = r.insurance_type.toLowerCase() === 'self pay' || r.insurance_type.toLowerCase() === 'patient';
      if (isPatient) totals.Patient += r.total_balance;
      else totals.Insurance += r.total_balance;
    });
    return Object.entries(totals).map(([category, total_balance]) => ({ category, total_balance }));
  }, [filteredByCarrier, activeBucket, activeCarrier, raw]);

  // Handlers
  const handleBucketClick = (data) => {
    if (!data) return;
    const b = data.activeLabel || data.bucket;
    setActiveBucket((prev) => (prev === b ? null : b));
    setActiveCarrier(null);
  };

  const handleCarrierClick = (name) => {
    setActiveCarrier((prev) => (prev === name ? null : name));
    setActiveBucket(null);
  };

  const clearFilters = () => { setActiveBucket(null); setActiveCarrier(null); };

  // ── Expand view ───────────────────────────────────────────────────────────

  if (expanded) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                Accounts Receivable
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                AR by {expandTab === 'insurance' ? 'Insurance' : 'Surgeon'} ({modeLabel})
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <TabBtn active={expandTab === 'insurance'} onClick={() => setExpandTab('insurance')}>
                AR by Insurance
              </TabBtn>
              <TabBtn active={expandTab === 'surgeon'} onClick={() => setExpandTab('surgeon')}>
                AR by Surgeon
              </TabBtn>
              <button
                onClick={() => setExpanded(false)}
                className="ml-2 px-4 py-1.5 rounded-md text-sm font-bold bg-red-700 text-white hover:bg-red-800 transition-colors"
              >
                Compress
              </button>
            </div>
          </div>
          <div className="px-2 md:px-4 pb-4">
            {expandTab === 'insurance' ? (
              <PivotTable data={insData} labelKey="insurance_type" loading={insLoad} />
            ) : (
              <PivotTable data={surgData} labelKey="surgeon" loading={surgLoad} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Card: Bar chart + Bucket donut ── */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
              Accounts Receivable ({modeLabel})
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              All Time Stats
              {(activeBucket || activeCarrier) && (
                <button
                  onClick={clearFilters}
                  className="ml-3 text-red-500 hover:text-red-700 font-semibold"
                >
                  ✕ Clear filter
                </button>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <ViewBtn active={view === 'dos'} onClick={() => switchView('dos')}>DOS</ViewBtn>
            <ViewBtn active={view === 'doe'} onClick={() => switchView('doe')}>DOE</ViewBtn>
          </div>
        </div>

        {/* Two charts side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 px-4 pb-2">

          {/* ── Bar chart: Insurance vs Patient by bucket ── */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-1 px-1">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                Accounts Receivable ({modeLabel})
                {activeBucket && <span className="ml-1 text-red-500">— {activeBucket}</span>}
              </p>
              <button
                onClick={() => setExpanded(true)}
                className="px-3 py-1 rounded-lg bg-red-700 text-white text-xs font-bold hover:bg-red-800"
              >
                Expand
              </button>
            </div>
            <div style={{ minHeight: 280, height: 280 }}>
              {loading ? <Skeleton height={280} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{ top: 24, right: 16, left: 8, bottom: 8 }}
                    onClick={handleBucketClick}
                    style={{ cursor: 'pointer' }}
                  >
                    <XAxis
                      dataKey="bucket"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={fmtMoney}
                      width={56}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                    />
                    <Bar
                      dataKey="insurance_ar"
                      name="Insurance AR"
                      fill="#1E3A8A"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={60}
                      opacity={activeBucket ? (d) => d.bucket === activeBucket ? 1 : 0.4 : 1}
                    />
                    <Bar
                      dataKey="patient_ar"
                      name="Patient AR"
                      fill="#93C5FD"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={60}
                      opacity={activeBucket ? (d) => d.bucket === activeBucket ? 1 : 0.4 : 1}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Bucket donut ── */}
          <div className="lg:col-span-2">
            <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
              Accounts Receivable Percentage ({modeLabel})
            </p>
            <div style={{ minHeight: 280, height: 280 }}>
              {loading ? <Skeleton height={280} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                      onClick={(d) => handleBucketClick({ activeLabel: d.name })}
                      style={{ cursor: 'pointer' }}
                    >
                      {donutData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={BUCKET_COLORS[entry.name] || TREEMAP_PALETTE[i % TREEMAP_PALETTE.length]}
                          opacity={activeBucket && activeBucket !== entry.name ? 0.3 : 1}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, name) => [fmtMoney(v), name]}
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Bucket legend */}
            {!loading && donutData.length > 0 && (
              <div className="px-4 pb-2 space-y-0.5">
                {donutData.map((d) => {
                  const total = donutData.reduce((s, r) => s + r.value, 0);
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={d.name} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: BUCKET_COLORS[d.name] || '#64748b' }}
                        />
                        <span className="text-slate-600 dark:text-zinc-400 font-medium">{d.name}</span>
                      </div>
                      <span className="text-slate-500 dark:text-zinc-500 tabular-nums">
                        {fmtMoney(d.value)} · {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Treemap + Category Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Treemap: AR by Carrier ── */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
              AR by Carrier
              {activeCarrier && <span className="ml-1 text-red-500">— {activeCarrier}</span>}
            </p>
            <button
              onClick={() => setExpanded(true)}
              className="px-3 py-1 rounded-lg bg-red-700 text-white text-xs font-bold hover:bg-red-800"
            >
              Expand
            </button>
          </div>
          <div className="px-2 md:px-4 pb-4" style={{ minHeight: 320, height: 320 }}>
            {loading ? <Skeleton height={320} /> : treemapData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">No data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData}
                  dataKey="value"
                  nameKey="name"
                  aspectRatio={4 / 3}
                  content={(props) => (
                    <TreemapCell
                      {...props}
                      activeCarrier={activeCarrier}
                      onClick={handleCarrierClick}
                    />
                  )}
                >
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg px-3 py-2 text-xs">
                          <p className="font-semibold text-slate-700 dark:text-zinc-200">{d.name}</p>
                          <p className="text-slate-500">Total Balance: {fmtMoney(d.value)}</p>
                        </div>
                      );
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Category Pie: Patient vs Insurance ── */}
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
              AR by Category ({modeLabel})
            </p>
          </div>
          <div className="px-2 md:px-4 pb-2" style={{ minHeight: 240, height: 240 }}>
            {loading ? <Skeleton height={240} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={catData}
                    dataKey="total_balance"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {catData.map((entry) => (
                      <Cell key={entry.category} fill={CAT_COLORS[entry.category] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [fmtMoney(v), name]}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Category values */}
          {!loading && catData.length > 0 && (() => {
            const total = catData.reduce((s, r) => s + r.total_balance, 0);
            return (
              <div className="px-5 pb-4 space-y-1.5">
                {catData.map((d) => {
                  const pct = total > 0 ? ((d.total_balance / total) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={d.category} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: CAT_COLORS[d.category] || '#64748b' }}
                        />
                        <span className="font-semibold text-slate-700 dark:text-zinc-300">{d.category}</span>
                      </div>
                      <span className="text-slate-500 dark:text-zinc-500 tabular-nums">
                        {fmtMoney(d.total_balance)} · {pct}%
                      </span>
                    </div>
                  );
                })}
                <div className="pt-1 border-t border-slate-100 dark:border-zinc-800 flex justify-between text-[10px] font-bold text-slate-700 dark:text-zinc-200">
                  <span>Total AR</span>
                  <span className="tabular-nums">{fmtMoney(total)}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

    </div>
  );
}
