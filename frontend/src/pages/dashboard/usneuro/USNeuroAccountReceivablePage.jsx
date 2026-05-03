/**
 * USNeuroAccountReceivablePage.jsx — Accounts Receivable tab for US Neuro Dashboard.
 *
 * Main view (DOS / DOE toggle):
 *   Left  — "Accounts Receivable (DOS|DOE)" multi-bar chart (Ins + Patient) [Expand]
 *   Right — "Accounts Receivable Percentage" pie chart
 *   Below — "AR by Carrier" treemap [Expand → full-screen treemap]
 *
 * Bar-chart Expand → table views:
 *   Toggle: AR by Insurance | AR by Surgeon
 *   Columns: bucket + Grand Total
 *   Surgeon view has dropdown filter
 *   [Compress] → back to main view
 *
 * Treemap Expand → full-screen treemap with [Compress]
 */

import { useState, useCallback } from 'react';
import { useQuery }              from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, Cell,
  PieChart, Pie, Treemap,
  ResponsiveContainer,
} from 'recharts';
import { usneuroApi } from '../../../api/usneuro.api';

// ── Constants ─────────────────────────────────────────────────────────────────

const BUCKET_ORDER = ['Current', '30-60', '60-90', '90-120', '120-150', '150+'];

const TREEMAP_COLORS = [
  '#0a1931','#1e3a8a','#1d4ed8','#2563eb','#3b5f9e',
  '#4f6fba','#6b87cc','#7f9dd4','#96b0dd','#b3c6e8','#ccd9f0','#dde7f5',
];

const BUCKET_PIE_COLORS = ['#3b82f6','#6366f1','#8b5cf6','#a855f7','#c026d3','#7f1d1d'];

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};
const fmtPct = (v) => `${Number(v || 0).toFixed(1)}%`;

// ── Shared tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700
                    rounded-xl shadow-lg px-3 py-2 text-xs">
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
    <button onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
        active ? 'bg-red-700 text-white shadow ring-2 ring-white/30'
               : 'bg-[#991b1b] text-white hover:bg-red-800'
      }`}>
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function Card({ title, action, children, height, noPad }) {
  return (
    <div
      data-export-item
      data-export-label={title}
      data-export-id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
      className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100
                    dark:border-zinc-800 shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b
                      border-slate-50 dark:border-zinc-800">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-zinc-200">{title}</h3>
        {action}
      </div>
      <div style={height ? { height } : {}} className={noPad ? '' : 'p-3'}>
        {children}
      </div>
    </div>
  );
}

const Skeleton = ({ h = 260 }) => (
  <div className="animate-pulse rounded-xl bg-slate-50 dark:bg-zinc-900" style={{ height: h }} />
);

// ── Bar top labels ────────────────────────────────────────────────────────────

const BarTopLabel = ({ x, y, value, width }) => {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={9} fontWeight="700" fill="#1e40af">
      {fmtMoney(value)}
    </text>
  );
};

// ── Treemap cell ──────────────────────────────────────────────────────────────

function TreemapCell(props) {
  const { x, y, width, height, name, total_balance, depth, index } = props;
  if (!width || !height || depth === 0) return null;
  const color   = TREEMAP_COLORS[Math.min(index || 0, TREEMAP_COLORS.length - 1)];
  const showLbl = width > 50 && height > 24;
  const showVal = height > 44;
  return (
    <g>
      <rect x={x+1} y={y+1} width={width-2} height={height-2}
        fill={color} stroke="white" strokeWidth={2} rx={3} style={{ cursor:'pointer' }} />
      {showLbl && (
        <text x={x+7} y={y+17} fill="white" fontSize={10} fontWeight="700">
          {(name||'').slice(0, Math.floor(width/7))}
        </text>
      )}
      {showVal && (
        <text x={x+7} y={y+31} fill="#bfdbfe" fontSize={9}>
          AR - {fmtMoney(total_balance)}
        </text>
      )}
    </g>
  );
}

// ── Treemap tooltip ───────────────────────────────────────────────────────────

function TreemapTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700
                    rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-zinc-200">Insurance Type: {d.insurance_type || d.name}</p>
      <p className="text-slate-500 dark:text-zinc-400">Total Balance: {fmtMoney(d.total_balance)}</p>
    </div>
  );
}

// ── Pie label ─────────────────────────────────────────────────────────────────

function PieLabel({ cx, cy, midAngle, outerRadius, name, value, pct }) {
  if (!name || pct < 1) return null;
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 25;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  const anchor = x > cx ? 'start' : 'end';
  return (
    <g>
      <text x={x} y={y-5} textAnchor={anchor} fill="#374151" fontSize={10} fontWeight="700">{name}</text>
      <text x={x} y={y+7} textAnchor={anchor} fill="#dc2626" fontSize={10} fontWeight="700">{fmtPct(pct)}</text>
      <text x={x} y={y+18} textAnchor={anchor} fill="#64748b" fontSize={9}>{fmtMoney(value)}</text>
    </g>
  );
}

// ── Expand button ─────────────────────────────────────────────────────────────

const ExpandBtn = ({ onClick, label = 'Expand' }) => (
  <button onClick={onClick}
    className="px-3 py-1 rounded-md text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors">
    {label}
  </button>
);

// ── Pivot table (expand view) ─────────────────────────────────────────────────

function PivotTable({ rows, entityKey, entityLabel, loading }) {
  if (loading) return <Skeleton h={400} />;
  if (!rows?.length) return <p className="text-sm text-slate-400 text-center py-12">No data available.</p>;

  // Determine which bucket columns actually have data
  const activeBuckets = BUCKET_ORDER.filter(b => rows.some(r => r[b] > 0));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-separate border-spacing-0">
        <thead>
          <tr className="bg-slate-50 dark:bg-zinc-900">
            <th className="sticky left-0 z-10 bg-slate-50 dark:bg-zinc-900 text-left px-4 py-2.5
                           font-semibold text-slate-600 dark:text-zinc-300 min-w-[200px] border-b
                           border-slate-200 dark:border-zinc-700">
              {entityLabel}
            </th>
            {activeBuckets.map(b => (
              <th key={b} className="px-3 py-2.5 text-right font-semibold text-indigo-700
                                     dark:text-indigo-300 whitespace-nowrap min-w-[90px] border-b
                                     border-slate-200 dark:border-zinc-700">
                {b}
              </th>
            ))}
            <th className="px-3 py-2.5 text-right font-bold text-slate-700 dark:text-zinc-200
                           whitespace-nowrap min-w-[100px] border-b border-slate-200 dark:border-zinc-700">
              Grand Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0
              ? 'bg-white dark:bg-zinc-950'
              : 'bg-slate-50/60 dark:bg-zinc-900/40'}>
              <td className="sticky left-0 z-10 bg-inherit px-4 py-2 font-medium
                             text-slate-700 dark:text-zinc-300 whitespace-nowrap
                             border-b border-slate-100 dark:border-zinc-800">
                {row[entityKey]}
              </td>
              {activeBuckets.map(b => (
                <td key={b} className="px-3 py-2 text-right tabular-nums text-slate-600
                                       dark:text-zinc-400 border-b border-slate-100 dark:border-zinc-800">
                  {row[b] > 0 ? fmtMoney(row[b]) : '—'}
                </td>
              ))}
              <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-700
                             dark:text-zinc-200 border-b border-slate-100 dark:border-zinc-800">
                {fmtMoney(row.grand_total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function USNeuroAccountReceivablePage() {
  const [dateMode,    setDateMode]    = useState('dos');   // 'dos' | 'doe'
  const [expandView,  setExpandView]  = useState(null);    // null | 'table' | 'treemap'
  const [tableTab,    setTableTab]    = useState('insurance'); // 'insurance' | 'surgeon'
  const [surgeon,     setSurgeon]     = useState('All');

  const modeLabel = dateMode.toUpperCase();

  const switchMode = (m) => { setDateMode(m); };

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: buckets,   isLoading: buckLoad } = useQuery({
    queryKey: ['usneuro-ar-buckets', dateMode],
    queryFn:  () => (dateMode === 'dos'
      ? usneuroApi.getArDos()
      : usneuroApi.getArDoe()
    ).then(r => r.data.data),
    staleTime: 300_000,
  });

  const { data: treemapData, isLoading: treemapLoad } = useQuery({
    queryKey: ['usneuro-ar-treemap', dateMode],
    queryFn:  () => usneuroApi.getArTreemap(dateMode).then(r => r.data.data),
    staleTime: 300_000,
  });

  const { data: insData, isLoading: insLoad } = useQuery({
    queryKey: ['usneuro-ar-insurance', dateMode],
    queryFn:  () => usneuroApi.getArByInsurance(dateMode).then(r => r.data.data),
    staleTime: 300_000,
    enabled: expandView === 'table' && tableTab === 'insurance',
  });

  const { data: surgData, isLoading: surgLoad } = useQuery({
    queryKey: ['usneuro-ar-surgeon', dateMode, surgeon],
    queryFn:  () => usneuroApi.getArBySurgeon(dateMode, surgeon).then(r => r.data.data),
    staleTime: 300_000,
    enabled: expandView === 'table' && tableTab === 'surgeon',
  });

  const { data: surgeons } = useQuery({
    queryKey: ['usneuro-ar-surgeons'],
    queryFn:  () => usneuroApi.getArSurgeons().then(r => r.data.data),
    staleTime: 600_000,
    enabled: expandView === 'table' && tableTab === 'surgeon',
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const totalBal = (buckets || []).reduce((s, r) => s + r.total_balance, 0);
  const pieBuckets = (buckets || []).map((r, i) => ({
    name:  r.bucket,
    value: r.total_balance,
    pct:   totalBal > 0 ? r.total_balance / totalBal * 100 : 0,
  }));

  const treemapNodes = (treemapData || []).map((r, i) => ({
    name:           r.insurance_type,
    insurance_type: r.insurance_type,
    total_balance:  r.total_balance || 1,
    index:          i,
  }));

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderExpandTableHeader = () => (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div className="flex gap-2">
        <ViewBtn active={tableTab === 'insurance'} onClick={() => setTableTab('insurance')}>
          AR by Insurance
        </ViewBtn>
        <ViewBtn active={tableTab === 'surgeon'} onClick={() => setTableTab('surgeon')}>
          AR by Surgeon
        </ViewBtn>
      </div>
      <div className="flex items-center gap-3">
        {tableTab === 'surgeon' && (
          <select
            value={surgeon}
            onChange={e => setSurgeon(e.target.value)}
            className="text-xs border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1.5
                       bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 focus:outline-none"
          >
            <option value="All">(All)</option>
            {(surgeons || []).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <ExpandBtn label="Compress" onClick={() => setExpandView(null)} />
      </div>
    </div>
  );

  // ── ═══════════════════════════════════════════════════════════════════════
  // EXPAND — TABLE VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  if (expandView === 'table') {
    const tableTitle = tableTab === 'insurance'
      ? `AR by Insurance (${modeLabel})`
      : `AR by Surgeon (${modeLabel})`;
    return (
      <div className="space-y-3">
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100
                        dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 dark:border-zinc-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">{tableTitle}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <ViewBtn active={tableTab === 'insurance'} onClick={() => setTableTab('insurance')}>
                  AR by Insurance
                </ViewBtn>
                <ViewBtn active={tableTab === 'surgeon'} onClick={() => setTableTab('surgeon')}>
                  AR by Surgeon
                </ViewBtn>
                {tableTab === 'surgeon' && (
                  <select
                    value={surgeon}
                    onChange={e => setSurgeon(e.target.value)}
                    className="text-xs border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1.5
                               bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="All">(All)</option>
                    {(surgeons || []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
                <ExpandBtn label="Compress" onClick={() => setExpandView(null)} />
              </div>
            </div>
          </div>
          <div className="p-3">
            {tableTab === 'insurance' ? (
              <PivotTable
                rows={insData}
                entityKey="insurance_type"
                entityLabel="Insurance Type"
                loading={insLoad}
              />
            ) : (
              <PivotTable
                rows={surgData}
                entityKey="surgeon"
                entityLabel="Surgeon"
                loading={surgLoad}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── ═══════════════════════════════════════════════════════════════════════
  // EXPAND — TREEMAP VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  if (expandView === 'treemap') {
    return (
      <div className="space-y-3">
        <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100
                        dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
              AR by Carrier ({modeLabel})
            </h3>
            <ExpandBtn label="Compress" onClick={() => setExpandView(null)} />
          </div>
          <div style={{ height: 'calc(100vh - 200px)', minHeight: 500 }} className="p-3">
            {treemapLoad ? <Skeleton h={500} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapNodes}
                  dataKey="total_balance"
                  content={<TreemapCell />}
                >
                  <Tooltip content={<TreemapTooltip />} />
                </Treemap>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── ═══════════════════════════════════════════════════════════════════════
  // MAIN VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Accounts Receivable</h2>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">All Time Stats</p>
        </div>
        <div className="flex gap-2">
          <ViewBtn active={dateMode === 'dos'} onClick={() => switchMode('dos')}>DOS</ViewBtn>
          <ViewBtn active={dateMode === 'doe'} onClick={() => switchMode('doe')}>DOE</ViewBtn>
        </div>
      </div>

      {/* ── Top row: bar chart + pie chart ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Bar chart */}
        <div className="xl:col-span-3">
          <Card
            title={`Accounts Receivable (${modeLabel})`}
            height={320}
            action={<ExpandBtn onClick={() => setExpandView('table')} />}
          >
            {buckLoad ? <Skeleton h={280} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={buckets || []}
                  margin={{ top: 24, right: 16, left: 8, bottom: 5 }}
                  barCategoryGap="30%"
                  barGap={2}
                >
                  <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtMoney} width={56}
                    tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="ins_balance" name="Insurance" fill="#1e3a8a"
                    radius={[3,3,0,0]} maxBarSize={60}>
                    <LabelList dataKey="ins_balance" content={BarTopLabel} />
                  </Bar>
                  <Bar dataKey="patient_balance" name="Patient" fill="#60a5fa"
                    radius={[3,3,0,0]} maxBarSize={60}>
                    <LabelList dataKey="patient_balance" content={BarTopLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Pie chart */}
        <div className="xl:col-span-2">
          <Card title={`Accounts Receivable Percentage (${modeLabel})`} height={320}>
            {buckLoad ? <Skeleton h={280} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieBuckets}
                    dataKey="value"
                    cx="50%" cy="50%"
                    outerRadius={90}
                    labelLine={false}
                    label={(props) => <PieLabel {...props} />}
                  >
                    {pieBuckets.map((_, i) => (
                      <Cell key={i}
                        fill={BUCKET_PIE_COLORS[Math.min(i, BUCKET_PIE_COLORS.length - 1)]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700
                                        rounded-xl shadow px-3 py-2 text-xs">
                          <p className="font-semibold text-slate-700 dark:text-zinc-200">{d.name}</p>
                          <p className="text-slate-500">{fmtMoney(d.value)}</p>
                          <p className="text-red-500 font-semibold">{fmtPct(d.pct)}</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>

      {/* ── Treemap ── */}
      <Card
        title={`AR by Carrier (${modeLabel})`}
        height={380}
        action={<ExpandBtn onClick={() => setExpandView('treemap')} />}
      >
        {treemapLoad ? <Skeleton h={340} /> : (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapNodes}
              dataKey="total_balance"
              content={<TreemapCell />}
            >
              <Tooltip content={<TreemapTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        )}
      </Card>

    </div>
  );
}
