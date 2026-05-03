/**
 * ConfidasArPage.jsx — Accounts Receivable page for Confidas Dashboard.
 *
 * DOS / DOE toggle (top-right).
 * Four cross-filtered charts:
 *   1. Bar chart   — AR balance by age bucket (carrier + patient)
 *   2. Pie chart   — AR % share by age bucket
 *   3. Treemap     — AR by Carrier  (expand / compress)
 *   4. Pie chart   — AR by Financial Category
 *
 * Clicking any chart element filters ALL charts to that segment.
 * Clicking the same element again removes the filter.
 */

import { useState, useCallback } from 'react';
import { useQuery }              from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  PieChart, Pie, Treemap,
} from 'recharts';
import { confidasApi } from '../../../api/confidas.api';

// ── Palette ───────────────────────────────────────────────────────────────────
const BAR_CARRIER  = '#2dd4bf';   // teal
const BAR_PATIENT  = '#163d5c';   // dark navy

const BUCKET_COLORS = {
  'Current':  '#c4a882',
  '30-60':    '#a07b60',
  '60-90':    '#8b5e45',
  '90-120':   '#74402c',
  '120-150':  '#c4752a',   // amber — distinct from the rest
  '150+':     '#5c1c1c',   // very dark maroon
};

const TREEMAP_BLUES = [
  '#0d2b52', '#162f62', '#1e3972', '#2d4f8c',
  '#3a65a4', '#4a7bb8', '#6092cc', '#80aadc',
];

const FINANCIAL_PALETTE = [
  '#1565c0', '#00838f', '#2e7d32', '#4a148c',
  '#6a994e', '#607d8b', '#bf360c', '#e65100',
  '#880e4f', '#f57f17',
];

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtYAxis = (v) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` :
  v >= 1_000     ? `${(v / 1_000).toFixed(0)}K`     : `${v}`;

// ── React Query defaults ──────────────────────────────────────────────────────
const Q = {
  staleTime:            0,
  retry:                3,
  retryDelay:           (a) => Math.min(1500 * 2 ** a, 15_000),
  refetchOnMount:       true,
  refetchOnWindowFocus: true,
};

// ── Sub-components ────────────────────────────────────────────────────────────
function ModeBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${
        active
          ? 'bg-red-700 text-white shadow'
          : 'bg-red-900 text-white hover:bg-red-800'
      }`}
    >
      {children}
    </button>
  );
}

function FilterBadge({ filter, onClear }) {
  if (!filter) return null;
  const label =
    filter.type === 'bucket'    ? `Bucket: ${filter.value}`   :
    filter.type === 'carrier'   ? `Carrier: ${filter.value}`  :
                                  `Category: ${filter.value}`;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-semibold">
        {label}
      </span>
      <button
        onClick={onClear}
        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-bold text-sm"
        title="Remove filter"
      >
        ✕
      </button>
    </div>
  );
}

function ChartCard({ title, className = '', headerRight, children }) {
  return (
    <div
      className={`bg-white dark:bg-zinc-950 rounded-2xl
                  border border-slate-100 dark:border-zinc-800
                  shadow-sm overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2 gap-2">
        <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-200 truncate">
          {title}
        </h3>
        {headerRight && <div className="flex-shrink-0">{headerRight}</div>}
      </div>
      <div className="px-3 pb-4">{children}</div>
    </div>
  );
}

function Skeleton({ h = 280 }) {
  return (
    <div
      className="animate-pulse rounded-xl bg-slate-50 dark:bg-zinc-900"
      style={{ height: h }}
    />
  );
}

// ── Treemap custom cell ───────────────────────────────────────────────────────
function renderTreemapCell(handleCarrierFilter, activeCarrier) {
  return function TreemapCell(props) {
    const { x, y, width, height, depth, index, carrier_name, total_balance } = props;
    if (depth !== 1 || width < 4 || height < 4) return <g key={`tm-r-${index}`} />;

    const color    = TREEMAP_BLUES[Math.min(index, TREEMAP_BLUES.length - 1)];
    const selected = activeCarrier === carrier_name;
    const dimmed   = activeCarrier && !selected;
    const charW    = Math.max(1, Math.floor(width / 7.5));
    const truncName = carrier_name
      ? (carrier_name.length > charW ? carrier_name.substring(0, charW) + '…' : carrier_name)
      : '';

    return (
      <g
        key={`tm-${carrier_name}-${index}`}
        onClick={() => handleCarrierFilter(carrier_name)}
        style={{ cursor: 'pointer' }}
      >
        <rect
          x={x} y={y} width={width} height={height}
          fill={selected ? '#c0392b' : color}
          fillOpacity={dimmed ? 0.45 : 1}
          stroke="white"
          strokeWidth={selected ? 2 : 1.5}
          rx={3}
        />
        {width > 55 && height > 30 && (
          <text
            x={x + 8} y={y + 17}
            fill="white"
            fontSize={Math.min(11, width / 10)}
            fontWeight="bold"
          >
            {truncName}
          </text>
        )}
        {width > 55 && height > 48 && (
          <text
            x={x + 8} y={y + 32}
            fill="rgba(255,255,255,0.75)"
            fontSize={9}
          >
            {`Total Balance: ${fmtMoney(total_balance)}`}
          </text>
        )}
      </g>
    );
  };
}

// ── Bucket pie custom label ───────────────────────────────────────────────────
const RADIAN = Math.PI / 180;

function BucketPieLabel(props) {
  const { cx, cy, midAngle, outerRadius, bucket, pct } = props;
  if (!pct || pct < 0.5) return null;
  const r   = outerRadius + 30;
  const x   = cx + r * Math.cos(-midAngle * RADIAN);
  const y   = cy + r * Math.sin(-midAngle * RADIAN);
  const anc = x > cx ? 'start' : 'end';
  return (
    <text x={x} y={y} textAnchor={anc} fontSize={10} fill="#64748b">
      <tspan x={x} dy="0">{bucket}</tspan>
      <tspan x={x} dy="13" fontWeight="bold" fill="#475569">
        {`${Number(pct).toFixed(2)}%`}
      </tspan>
    </text>
  );
}

// ── Financial pie custom label ────────────────────────────────────────────────
function FinancialPieLabel(props) {
  const { cx, cy, midAngle, outerRadius, financial_name, ar_pct, total_balance } = props;
  if (!ar_pct || ar_pct < 1) return null;
  const r   = outerRadius + 28;
  const x   = cx + r * Math.cos(-midAngle * RADIAN);
  const y   = cy + r * Math.sin(-midAngle * RADIAN);
  const anc = x > cx ? 'start' : 'end';
  const name = financial_name && financial_name.length > 18
    ? financial_name.substring(0, 17) + '…'
    : (financial_name || '');
  return (
    <text x={x} y={y} textAnchor={anc} fontSize={9}>
      <tspan x={x} dy="0" fontWeight="bold" fill="#334155">{name}</tspan>
      <tspan x={x} dy="12" fill="#dc2626">{`${Number(ar_pct).toFixed(0)}%`}</tspan>
      <tspan x={x} dy="11" fill="#64748b">{fmtMoney(total_balance)}</tspan>
    </text>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ConfidasArPage() {
  const [mode,         setMode]         = useState('dos');
  const [activeFilter, setActiveFilter] = useState(null); // { type, value }
  const [expanded,     setExpanded]     = useState(false);

  const fb = activeFilter?.type === 'bucket'    ? activeFilter.value : null;
  const fc = activeFilter?.type === 'carrier'   ? activeFilter.value : null;
  const ff = activeFilter?.type === 'financial' ? activeFilter.value : null;

  const handleFilter = useCallback((type, value) => {
    setActiveFilter((prev) =>
      prev?.type === type && prev?.value === value ? null : { type, value }
    );
  }, []);

  const handleModeChange = (m) => { setMode(m); setActiveFilter(null); };

  // ── Queries ─────────────────────────────────────────────────────────────────
  const qKey = [mode, fb, fc, ff];

  const { data: barData = [], isLoading: barLoad } = useQuery({
    ...Q,
    queryKey: ['conf-ar-bar', ...qKey],
    queryFn:  () => confidasApi.getArBar(mode, fb, fc, ff).then((r) => r.data.data || []),
  });

  const { data: pieData = [], isLoading: pieLoad } = useQuery({
    ...Q,
    queryKey: ['conf-ar-pie', ...qKey],
    queryFn:  () => confidasApi.getArPieChart(mode, fb, fc, ff).then((r) => r.data.data || []),
  });

  const { data: carrierData = [], isLoading: carrierLoad } = useQuery({
    ...Q,
    queryKey: ['conf-ar-carrier', ...qKey],
    queryFn:  () => confidasApi.getArCarrier(mode, fb, fc, ff).then((r) => r.data.data || []),
  });

  const { data: financialData = [], isLoading: financialLoad } = useQuery({
    ...Q,
    queryKey: ['conf-ar-financial', ...qKey],
    queryFn:  () => confidasApi.getArFinancial(mode, fb, fc, ff).then((r) => r.data.data || []),
  });

  // Treemap shape
  const treemapData = carrierData.map((d) => ({
    name:          d.carrier_name,
    size:          Math.max(d.total_balance, 0),
    carrier_name:  d.carrier_name,
    total_balance: d.total_balance,
    ar_pct:        d.ar_pct,
  }));

  const modeLabel = mode === 'dos' ? 'DOS' : 'DOE';

  // ── Expand view — full-width treemap ─────────────────────────────────────────
  if (expanded) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <FilterBadge filter={activeFilter} onClear={() => setActiveFilter(null)} />
          <div className="flex gap-2 ml-auto">
            <ModeBtn active={mode === 'dos'} onClick={() => handleModeChange('dos')}>DOS</ModeBtn>
            <ModeBtn active={mode === 'doe'} onClick={() => handleModeChange('doe')}>DOE</ModeBtn>
          </div>
        </div>
        <ChartCard
          title="AR by Carrier"
          headerRight={
            <button
              onClick={() => setExpanded(false)}
              className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
            >
              Compress
            </button>
          }
        >
          {carrierLoad ? <Skeleton h={520} /> : (
            <ResponsiveContainer width="100%" height={530}>
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4 / 3}
                content={renderTreemapCell(
                  (v) => handleFilter('carrier', v),
                  fc,
                )}
              />
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    );
  }

  // ── Normal view ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <FilterBadge filter={activeFilter} onClear={() => setActiveFilter(null)} />
        <div className="flex gap-2 ml-auto">
          <ModeBtn active={mode === 'dos'} onClick={() => handleModeChange('dos')}>DOS</ModeBtn>
          <ModeBtn active={mode === 'doe'} onClick={() => handleModeChange('doe')}>DOE</ModeBtn>
        </div>
      </div>

      {/* Row 1: Bar chart + Bucket pie */}
      <div className="flex gap-3 items-stretch">

        {/* Bar chart */}
        <ChartCard
          title={`Accounts Receivable (${modeLabel})`}
          className="flex-[3]"
        >
          {/* Legend */}
          <div className="flex gap-5 text-[10px] text-slate-500 dark:text-zinc-400 mb-2">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: BAR_CARRIER }} />
              Carrier Balance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: BAR_PATIENT }} />
              Patient Balance
            </span>
          </div>
          {barLoad ? <Skeleton h={260} /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={barData}
                barCategoryGap="28%"
                barGap={3}
                onClick={(e) => {
                  if (e?.activePayload?.[0]?.payload?.bucket) {
                    handleFilter('bucket', e.activePayload[0].payload.bucket);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtYAxis}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip
                  formatter={(v, name) => [fmtMoney(v), name]}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
                <Bar dataKey="carrier_balance" name="Carrier Balance" radius={[3, 3, 0, 0]}>
                  {barData.map((entry) => (
                    <Cell
                      key={`cb-${entry.bucket}`}
                      fill={BAR_CARRIER}
                      fillOpacity={fb && fb !== entry.bucket ? 0.35 : 1}
                    />
                  ))}
                  <LabelList
                    dataKey="carrier_balance"
                    position="top"
                    formatter={fmtMoney}
                    style={{ fontSize: 9, fill: '#64748b' }}
                  />
                </Bar>
                <Bar dataKey="patient_balance" name="Patient Balance" radius={[3, 3, 0, 0]}>
                  {barData.map((entry) => (
                    <Cell
                      key={`pb-${entry.bucket}`}
                      fill={BAR_PATIENT}
                      fillOpacity={fb && fb !== entry.bucket ? 0.35 : 1}
                    />
                  ))}
                  <LabelList
                    dataKey="patient_balance"
                    position="top"
                    formatter={fmtMoney}
                    style={{ fontSize: 9, fill: '#64748b' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Bucket pie */}
        <ChartCard
          title={`Accounts Receivable Percentage (${modeLabel})`}
          className="flex-[2]"
        >
          {pieLoad ? <Skeleton h={280} /> : (
            <ResponsiveContainer width="100%" height={290}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="total_balance"
                  nameKey="bucket"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  labelLine
                  label={BucketPieLabel}
                  onClick={(entry) => handleFilter('bucket', entry.bucket)}
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={`bpie-${entry.bucket}`}
                      fill={BUCKET_COLORS[entry.bucket] || '#888'}
                      fillOpacity={fb && fb !== entry.bucket ? 0.35 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, n) => [fmtMoney(v), n]}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

      </div>

      {/* Row 2: Treemap + Financial pie */}
      <div className="flex gap-3 items-stretch">

        {/* Treemap */}
        <ChartCard
          title="AR by Carrier"
          className="flex-[3]"
          headerRight={
            <button
              onClick={() => setExpanded(true)}
              className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
            >
              Expand
            </button>
          }
        >
          {carrierLoad ? <Skeleton h={330} /> : treemapData.length === 0 ? (
            <div className="flex items-center justify-center h-[330px] text-sm text-slate-400 dark:text-zinc-500">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={330}>
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4 / 3}
                content={renderTreemapCell(
                  (v) => handleFilter('carrier', v),
                  fc,
                )}
              />
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Financial category pie */}
        <ChartCard
          title="AR by Financial Category"
          className="flex-[2]"
        >
          {financialLoad ? <Skeleton h={330} /> : (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={financialData}
                  dataKey="ar_pct"
                  nameKey="financial_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  labelLine
                  label={FinancialPieLabel}
                  onClick={(entry) => handleFilter('financial', entry.financial_name)}
                  style={{ cursor: 'pointer' }}
                >
                  {financialData.map((entry, i) => (
                    <Cell
                      key={`fpie-${entry.financial_name}`}
                      fill={FINANCIAL_PALETTE[i % FINANCIAL_PALETTE.length]}
                      fillOpacity={ff && ff !== entry.financial_name ? 0.35 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, n) => [`${Number(v).toFixed(1)}%`, n]}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

      </div>

    </div>
  );
}
