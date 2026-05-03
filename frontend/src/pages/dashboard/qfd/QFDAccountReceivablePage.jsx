/**
 * QFDAccountReceivablePage.jsx — Accounts Receivable tab for QFD Dashboard.
 *
 * GLOBAL FILTER STATE — all four charts share three cross-filters:
 *   selectedBucket   — set by clicking bar chart or bucket pie
 *   selectedCarrier  — set by clicking treemap cell
 *   selectedFinancial— set by clicking financial pie
 * Any filter cross-filters every other chart. Click same item to clear.
 */

import { useState, useCallback } from 'react';
import { useQuery }              from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, Cell,
  PieChart, Pie, Treemap,
  ResponsiveContainer,
} from 'recharts';
import { X }     from 'lucide-react';
import { arApi } from '../../../api/ar.api';

// ── Constants ─────────────────────────────────────────────────────────────────

const TREEMAP_COLORS = [
  '#1e3a8a','#1d4ed8','#2563eb','#3b5f9e','#4f6fba','#6b87cc',
  '#7f9dd4','#96b0dd','#b3c6e8','#ccd9f0','#dde7f5','#eef2fb',
];
const BAR_CARRIER        = '#2DD4BF';
const BAR_PATIENT        = '#1E3A8A';
const BUCKET_PIE_COLORS  = ['#fbbf24','#f97316','#dc2626','#991b1b','#7f1d1d','#450a0a'];
const FIN_COLORS         = ['#0ea5e9','#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316','#64748b','#ec4899','#84cc16','#06b6d4'];

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

// ── Shared tooltip ────────────────────────────────────────────────────────────

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

function ViewBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
        active ? 'bg-red-700 text-white shadow ring-2 ring-white/30' : 'bg-[#991b1b] text-white hover:bg-red-800'
      }`}>
      {children}
    </button>
  );
}

function FilterBadge({ label, value, onClear }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
                     bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400
                     border border-red-200 dark:border-red-500/30">
      {label}: {value.length > 16 ? value.slice(0,15)+'…' : value}
      <button onClick={onClear} className="hover:text-red-800">×</button>
    </span>
  );
}

function Card({ title, action, children, height, highlighted = false }) {
  return (
    <div
      data-export-item
      data-export-label={title}
      data-export-id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
      className={`bg-white dark:bg-zinc-950 rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${
        highlighted ? 'border-red-300 dark:border-red-500/40 ring-1 ring-red-200 dark:ring-red-500/20' : 'border-slate-100 dark:border-zinc-800'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 dark:border-zinc-800">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-zinc-200 truncate pr-2">{title}</h3>
        {action}
      </div>
      <div style={height ? { height } : {}} className="p-3">{children}</div>
    </div>
  );
}

const Skeleton = ({ h = 280 }) => (
  <div className="animate-pulse rounded-xl bg-slate-50 dark:bg-zinc-900" style={{ height: h }} />
);

const BarTopLabel = ({ x, y, value, width }) => {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={9} fontWeight="700" fill="#374151">
      {fmtMoney(value)}
    </text>
  );
};

// ── Treemap custom cell (clickable, with selection highlight) ─────────────────

function TreemapCell(props) {
  const { x, y, width, height, name, ar_pct, depth, index, selectedCarrier, onCarrierClick } = props;
  if (!width || !height || depth === 0) return null;
  const color      = TREEMAP_COLORS[Math.min(index, TREEMAP_COLORS.length - 1)];
  const isSelected = selectedCarrier ? name === selectedCarrier : false;
  const showText   = width > 55 && height > 28;
  const showMetric = height > 48;
  return (
    <g onClick={() => onCarrierClick?.(name)} style={{ cursor: 'pointer' }}>
      <rect
        x={x + 1} y={y + 1} width={width - 2} height={height - 2}
        fill={color}
        stroke={isSelected ? '#ffffff' : 'white'}
        strokeWidth={isSelected ? 3 : 2}
        rx={3}
        opacity={selectedCarrier && !isSelected ? 0.35 : 1}
        style={{ transition: 'opacity 0.2s' }}
      />
      {showText && (
        <text x={x + 7} y={y + 18} fill="white" fontSize={10} fontWeight="700" style={{ pointerEvents: 'none' }}>
          {(name || '').slice(0, Math.floor(width / 7))}
        </text>
      )}
      {showMetric && (
        <text x={x + 7} y={y + 33} fill="#e0e7ff" fontSize={9} style={{ pointerEvents: 'none' }}>
          {`AR%: ${ar_pct}%`}
        </text>
      )}
    </g>
  );
}

// ── Pie label ─────────────────────────────────────────────────────────────────

function PieLabel({ cx, cy, midAngle, outerRadius, name, pct_of_total, ar_pct, totalbalance }) {
  const RADIAN     = Math.PI / 180;
  const displayPct = pct_of_total;
  if (!name || displayPct < 4) return null;
  const isLarge  = displayPct >= 10;
  const radius   = outerRadius + (isLarge ? 30 : 22);
  const x        = cx + radius * Math.cos(-midAngle * RADIAN);
  const y        = cy + radius * Math.sin(-midAngle * RADIAN);
  const anchor   = x > cx ? 'start' : 'end';
  const shortName = name.length > 14 ? name.slice(0, 13) + '…' : name;
  if (isLarge) {
    return (
      <g>
        <text x={x} y={y - 6}  textAnchor={anchor} fill="#374151" fontSize={9} fontWeight="700">{shortName}</text>
        <text x={x} y={y + 5}  textAnchor={anchor} fill="#dc2626" fontSize={9} fontWeight="700">{`${displayPct}%`}</text>
        <text x={x} y={y + 15} textAnchor={anchor} fill="#64748b" fontSize={8}>{fmtMoney(totalbalance)}</text>
      </g>
    );
  }
  return (
    <text x={x} y={y} textAnchor={anchor} fill="#374151" fontSize={8.5} fontWeight="600">
      {`${shortName} ${displayPct}%`}
    </text>
  );
}

// ── Treemap expand modal ──────────────────────────────────────────────────────

function TreemapModal({ data, title, onClose, selectedCarrier, onCarrierClick }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl w-[90vw] h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-zinc-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
            <X size={16} className="text-slate-500 dark:text-zinc-400" />
          </button>
        </div>
        <div className="flex-1 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap data={data} dataKey="totalbalance"
              content={(props) => (
                <TreemapCell {...props} selectedCarrier={selectedCarrier} onCarrierClick={onCarrierClick} />
              )}
            />
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QFDAccountReceivablePage() {
  const [dateMode,          setDateMode]          = useState('dos');
  const [selectedBucket,    setSelectedBucket]    = useState(null);
  const [selectedCarrier,   setSelectedCarrier]   = useState(null);
  const [selectedFinancial, setSelectedFinancial] = useState(null);
  const [expanded,          setExpanded]          = useState(false);

  const toggleBucket    = useCallback((b) => setSelectedBucket(p    => p === b ? null : b), []);
  const toggleCarrier   = useCallback((c) => setSelectedCarrier(p   => p === c ? null : c), []);
  const toggleFinancial = useCallback((f) => setSelectedFinancial(p => p === f ? null : f), []);

  const clearAll   = () => { setSelectedBucket(null); setSelectedCarrier(null); setSelectedFinancial(null); };
  const switchMode = (mode) => { setDateMode(mode); clearAll(); };

  const hasFilter = selectedBucket || selectedCarrier || selectedFinancial;

  // ── All four queries share the three filter states ────────────────────────

  const { data: buckets, isLoading: buckLoad } = useQuery({
    queryKey: ['ar-buckets', dateMode, selectedCarrier, selectedFinancial],
    queryFn:  () => (dateMode === 'dos'
      ? arApi.getDos(selectedCarrier, selectedFinancial)
      : arApi.getDoe(selectedCarrier, selectedFinancial)
    ).then(r => r.data.data),
    staleTime: 300_000,
  });

  const { data: carriers, isLoading: carrLoad } = useQuery({
    queryKey: ['ar-carrier', dateMode, selectedBucket, selectedFinancial],
    queryFn:  () => arApi.getCarrier(dateMode, selectedBucket, selectedFinancial).then(r => r.data.data),
    staleTime: 300_000,
  });

  const { data: financials, isLoading: finLoad } = useQuery({
    queryKey: ['ar-financial', dateMode, selectedBucket, selectedCarrier],
    queryFn:  () => arApi.getFinancial(dateMode, selectedBucket, selectedCarrier).then(r => r.data.data),
    staleTime: 300_000,
  });

  // ── Derived data ──────────────────────────────────────────────────────────

  const totalBal = (buckets || []).reduce((s, r) => s + r.totalbalance, 0);

  const bucketPieData = (buckets || []).map((r) => ({
    name:         r.bucket,
    value:        r.totalbalance,
    pct_of_total: totalBal > 0 ? Math.round(r.totalbalance / totalBal * 1000) / 10 : 0,
    ar_pct:       r.totalcharge > 0 ? Math.round(r.totalbalance / r.totalcharge * 1000) / 10 : 0,
    totalbalance: r.totalbalance,
  }));

  const treemapData = (carriers || []).map((r, i) => ({
    name:         r.carrier,
    totalbalance: r.totalbalance || 1,
    ar_pct:       r.ar_pct,
    index:        i,
  }));

  const finPieData = (financials || []).map((r) => ({
    name:         r.financial_class,
    value:        r.totalbalance,
    pct_of_total: r.pct_of_total,
    ar_pct:       r.ar_pct,
    totalbalance: r.totalbalance,
  }));

  const modeLabel = dateMode.toUpperCase();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Accounts Receivable</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">{modeLabel} View</p>
            <FilterBadge label="Bucket"  value={selectedBucket}    onClear={() => setSelectedBucket(null)} />
            <FilterBadge label="Carrier" value={selectedCarrier}   onClear={() => setSelectedCarrier(null)} />
            <FilterBadge label="Class"   value={selectedFinancial} onClear={() => setSelectedFinancial(null)} />
            {hasFilter && (
              <button onClick={clearAll} className="text-[10px] text-red-500 hover:text-red-700 font-semibold">
                × Clear all
              </button>
            )}
          </div>
          {!hasFilter && (
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 italic mt-0.5">
              Click any chart element to cross-filter all charts. Click again to clear.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <ViewBtn active={dateMode === 'dos'} onClick={() => switchMode('dos')}>DOS</ViewBtn>
          <ViewBtn active={dateMode === 'doe'} onClick={() => switchMode('doe')}>DOE</ViewBtn>
        </div>
      </div>

      {/* ── Main 2-column grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">

        {/* ── LEFT column ── */}
        <div className="xl:col-span-3 space-y-3">

          {/* Bar chart — age buckets */}
          <Card title={`Accounts Receivable (${modeLabel})`} height={300} highlighted={!!selectedBucket}>
            {buckLoad ? <Skeleton h={260} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={buckets || []}
                  margin={{ top: 22, right: 20, left: 10, bottom: 5 }}
                  onClick={(s) => { if (s?.activeLabel) toggleBucket(s.activeLabel); }}
                  style={{ cursor: 'pointer' }}
                >
                  <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtMoney} width={55} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="carrierbalance" name="Carrier Balance" fill={BAR_CARRIER} radius={[3,3,0,0]} maxBarSize={50}>
                    <LabelList dataKey="carrierbalance" content={BarTopLabel} />
                    {(buckets || []).map((entry, i) => (
                      <Cell key={i} opacity={!selectedBucket || entry.bucket === selectedBucket ? 1 : 0.35} fill={BAR_CARRIER} />
                    ))}
                  </Bar>
                  <Bar dataKey="patientbalance" name="Patient Balance" fill={BAR_PATIENT} radius={[3,3,0,0]} maxBarSize={50}>
                    <LabelList dataKey="patientbalance" content={BarTopLabel} />
                    {(buckets || []).map((entry, i) => (
                      <Cell key={i} opacity={!selectedBucket || entry.bucket === selectedBucket ? 1 : 0.35} fill={BAR_PATIENT} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Treemap — by carrier */}
          <Card
            title={`AR by Carrier (${modeLabel})${hasFilter ? ' · Filtered' : ''}`}
            height={310}
            highlighted={!!selectedCarrier}
            action={
              <button onClick={() => setExpanded(true)}
                className="px-3 py-1 rounded-md text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-colors">
                Expand
              </button>
            }
          >
            {carrLoad ? <Skeleton h={270} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treemapData}
                  dataKey="totalbalance"
                  content={(props) => (
                    <TreemapCell {...props} selectedCarrier={selectedCarrier} onCarrierClick={toggleCarrier} />
                  )}
                />
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* ── RIGHT column ── */}
        <div className="xl:col-span-2 space-y-3">

          {/* Bucket percentage pie */}
          <Card title={`Accounts Receivable Percentage (${modeLabel})`} height={300} highlighted={!!selectedBucket}>
            {buckLoad ? <Skeleton h={260} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bucketPieData}
                    dataKey="value"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    labelLine={false}
                    label={(props) => <PieLabel {...props} />}
                    onClick={(d) => toggleBucket(d.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    {bucketPieData.map((d, i) => (
                      <Cell key={i}
                        fill={BUCKET_PIE_COLORS[Math.min(i, BUCKET_PIE_COLORS.length - 1)]}
                        opacity={!selectedBucket || d.name === selectedBucket ? 1 : 0.35}
                        stroke={d.name === selectedBucket ? '#fff' : 'none'}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow px-3 py-2 text-xs">
                          <p className="font-semibold text-slate-700 dark:text-zinc-200">{d.name}</p>
                          <p className="text-slate-500">{fmtMoney(d.totalbalance)}</p>
                          <p className="text-red-500 font-semibold">{d.pct_of_total}%</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Financial category pie */}
          <Card
            title={`AR by Financial Category (${modeLabel})${hasFilter ? ' · Filtered' : ''}`}
            height={310}
            highlighted={!!selectedFinancial}
          >
            {finLoad ? <Skeleton h={270} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={finPieData}
                    dataKey="value"
                    cx="50%" cy="52%"
                    outerRadius={75}
                    labelLine={{ stroke: '#cbd5e1', strokeWidth: 0.8 }}
                    label={(props) => <PieLabel {...props} />}
                    onClick={(d) => toggleFinancial(d.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    {finPieData.map((d, i) => (
                      <Cell key={i}
                        fill={FIN_COLORS[i % FIN_COLORS.length]}
                        opacity={!selectedFinancial || d.name === selectedFinancial ? 1 : 0.35}
                        stroke={d.name === selectedFinancial ? '#fff' : 'none'}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow px-3 py-2 text-xs">
                          <p className="font-semibold text-slate-700 dark:text-zinc-200">{d.name}</p>
                          <p className="text-slate-500">{fmtMoney(d.totalbalance)}</p>
                          <p className="text-red-500 font-semibold">AR%: {d.ar_pct}%</p>
                          <p className="text-slate-400">{d.pct_of_total}% of total</p>
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

      {/* ── Treemap expand modal ── */}
      {expanded && (
        <TreemapModal
          data={treemapData}
          title={`AR by Carrier (${modeLabel})${hasFilter ? ' · Filtered' : ''}`}
          onClose={() => setExpanded(false)}
          selectedCarrier={selectedCarrier}
          onCarrierClick={toggleCarrier}
        />
      )}
    </div>
  );
}
