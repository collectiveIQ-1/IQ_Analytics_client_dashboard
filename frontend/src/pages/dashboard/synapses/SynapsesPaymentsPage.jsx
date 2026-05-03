/**
 * SynapsesPaymentsPage.jsx — Synapses Payments tab with Tableau-style cross-filtering.
 *
 * Layout:
 *   Row 1: All-Time Payment History line chart (clickable months)
 *   Row 2: [Category toggle buttons] + [Selected filter badge + Clear]
 *   Row 3: Deposits by [Category] horizontal bar chart (scrollable, clickable)
 *
 * Cross-filtering:
 *   Click month on line  → filters bar chart to that month
 *   Click bar           → filters line chart to that category value
 *   Clear Filters       → resets both
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip, Legend,
  LabelList,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { synapsesApi } from '../../../api/synapses.api';
import QFDChartCard   from '../../../components/qfd/QFDChartCard';

// ── Palette ───────────────────────────────────────────────────────────────────

const BAR_DEFAULT  = '#dc2626';
const BAR_SELECTED = '#7c3aed';
const BAR_DIM      = '#fca5a5';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtMoney = (v) => {
  if (v == null || isNaN(Number(v))) return '$0';
  const n = Number(v);
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtShortDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } catch { return String(d); }
};

// ── Custom tooltips ───────────────────────────────────────────────────────────

function LineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-zinc-200 mb-1">{fmtShortDate(label)}</p>
      <p className="font-medium text-red-600">Payments: {fmtMoney(payload[0]?.value)}</p>
    </div>
  );
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-zinc-200 mb-1 max-w-[200px] truncate">{label}</p>
      <p className="font-medium text-red-600">Payments: {fmtMoney(payload[0]?.value)}</p>
    </div>
  );
}

// ── Custom line dot (highlights selected month) ───────────────────────────────

function CustomLineDot({ cx, cy, payload, selectedDate, onClick }) {
  const isSelected = payload?.date === selectedDate;
  return (
    <circle
      cx={cx} cy={cy}
      r={isSelected ? 5 : 3}
      fill={isSelected ? '#7c3aed' : '#dc2626'}
      stroke={isSelected ? '#7c3aed' : '#dc2626'}
      strokeWidth={isSelected ? 2 : 0}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick && onClick(payload)}
    />
  );
}

// ── Chart config ──────────────────────────────────────────────────────────────

const CHART_CONFIG = {
  surgeon:        { key: 'surgeon',        label: 'Surgeon Wise',   btn: 'Surgeon Wise' },
  hospital:       { key: 'hospital',       label: 'Hospital Wise',  btn: 'Hospital Wise' },
  billing_type:   { key: 'billing_type',   label: 'Billing Type',   btn: 'Billing Type' },
  insurance_type: { key: 'insurance_type', label: 'Insurance Type', btn: 'Insurance Type' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SynapsesPaymentsPage() {
  const [chartType,    setChartType]    = useState('surgeon');
  const [selectedDate, setSelectedDate] = useState(null);   // end-of-month date string from line chart
  const [selectedBar,  setSelectedBar]  = useState(null);   // { value, type }

  const hasFilters = selectedDate || selectedBar;

  // ── Filter objects ────────────────────────────────────────────────────────

  // Line chart: filtered by bar selection (if any)
  const lineFilters = useMemo(() => {
    if (!selectedBar) return {};
    return { [selectedBar.type]: selectedBar.value };
  }, [selectedBar]);

  // Bar chart: filtered by selected month (if any) — exclude own type from bar's filter
  const barFilters = useMemo(() => {
    if (!selectedDate) return {};
    return { month: selectedDate };
  }, [selectedDate]);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: lineData, isLoading: lineLoad } = useQuery({
    queryKey: ['synm-pay-line', lineFilters],
    queryFn:  () => synapsesApi.getPaymentsLine(lineFilters).then(r => r.data.data),
    staleTime: 300_000,
  });

  const { data: barData, isLoading: barLoad } = useQuery({
    queryKey: ['synm-pay-bar', chartType, barFilters],
    queryFn: () => {
      const f = barFilters;
      if (chartType === 'surgeon')        return synapsesApi.getPaymentsBySurgeon(f).then(r => r.data.data);
      if (chartType === 'hospital')       return synapsesApi.getPaymentsByHospital(f).then(r => r.data.data);
      if (chartType === 'billing_type')   return synapsesApi.getPaymentsByBillingType(f).then(r => r.data.data);
      return synapsesApi.getPaymentsByInsuranceType(f).then(r => r.data.data);
    },
    staleTime: 300_000,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLineDotClick = (payload) => {
    const date = payload?.date;
    if (!date) return;
    setSelectedDate(prev => prev === date ? null : date);
  };

  const handleLineClick = (chartData) => {
    if (!chartData?.activePayload?.[0]) return;
    const date = chartData.activePayload[0]?.payload?.date;
    if (!date) return;
    setSelectedDate(prev => prev === date ? null : date);
  };

  const handleBarClick = (data) => {
    const key   = CHART_CONFIG[chartType].key;
    const value = data?.[key];
    if (!value) return;
    const isSame = selectedBar?.value === value && selectedBar?.type === chartType;
    setSelectedBar(isSame ? null : { value, type: chartType });
  };

  const clearFilters = () => { setSelectedDate(null); setSelectedBar(null); };

  const handleChartTypeChange = (type) => {
    setChartType(type);
    // Keep month filter but clear bar selection since category changed
    setSelectedBar(null);
  };

  // ── Computed ──────────────────────────────────────────────────────────────

  const barKey = CHART_CONFIG[chartType].key;
  const barRows = barData ?? [];
  const barH    = Math.max(260, barRows.length * 28 + 40);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* ── Filter status bar ── */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedDate && (
            <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium px-2 py-1 rounded-full">
              Month: {fmtShortDate(selectedDate)}
              <button onClick={() => setSelectedDate(null)} className="ml-1 hover:text-purple-900 dark:hover:text-purple-100">✕</button>
            </span>
          )}
          {selectedBar && (
            <span className="inline-flex items-center gap-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium px-2 py-1 rounded-full max-w-xs">
              <span className="truncate">{CHART_CONFIG[selectedBar.type]?.label}: {selectedBar.value}</span>
              <button onClick={() => setSelectedBar(null)} className="ml-1 hover:text-violet-900 dark:hover:text-violet-100 flex-shrink-0">✕</button>
            </span>
          )}
          <button
            onClick={clearFilters}
            className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-full px-3 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* ── Row 1: All-Time Payment History line chart ── */}
      <QFDChartCard
        title={selectedBar
          ? `All Time Payment History — ${CHART_CONFIG[selectedBar.type]?.label}: ${selectedBar.value}`
          : 'All Time Months Payment History'}
        loading={lineLoad}
        height={280}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={lineData || []}
            margin={{ top: 20, right: 16, left: 0, bottom: 0 }}
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
          >
            <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={fmtShortDate} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtMoney} width={52} />
            <Tooltip content={<LineTooltip />} />
            {selectedDate && (
              <ReferenceLine
                x={selectedDate}
                stroke="#7c3aed"
                strokeDasharray="4 3"
                strokeWidth={2}
              />
            )}
            <Line
              type="monotone"
              dataKey="payments"
              name="Payments"
              stroke="#dc2626"
              strokeWidth={2}
              dot={(props) => (
                <CustomLineDot
                  {...props}
                  selectedDate={selectedDate}
                  onClick={handleLineDotClick}
                />
              )}
              activeDot={{ r: 5, fill: '#dc2626' }}
            >
              <LabelList
                dataKey="payments"
                position="top"
                formatter={fmtMoney}
                style={{ fontSize: 7, fill: '#64748b', fontWeight: 500 }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </QFDChartCard>

      {/* ── Row 2: Category toggle ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(CHART_CONFIG).map(([type, cfg]) => (
          <button
            key={type}
            onClick={() => handleChartTypeChange(type)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
              chartType === type
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-700',
            ].join(' ')}
          >
            {cfg.btn}
          </button>
        ))}
      </div>

      {/* ── Row 3: Bar chart ── */}
      <QFDChartCard
        title={
          selectedDate
            ? `Deposits by ${CHART_CONFIG[chartType].label} — ${fmtShortDate(selectedDate)}`
            : `Deposits by ${CHART_CONFIG[chartType].label}`
        }
        loading={barLoad}
        height={Math.min(barH + 48, 520)}
      >
        {barRows.length === 0 && !barLoad ? (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-zinc-600 text-xs font-medium">
            No data for current filters
          </div>
        ) : (
          <div style={{ height: Math.min(barH, 460), overflowY: 'auto' }}>
            <ResponsiveContainer width="100%" height={barH}>
              <BarChart
                layout="vertical"
                data={barRows}
                margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
                onClick={(e) => {
                  if (e?.activePayload?.[0]) handleBarClick(e.activePayload[0].payload);
                }}
                style={{ cursor: 'pointer' }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 9 }}
                  tickFormatter={fmtMoney}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey={barKey}
                  width={140}
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(220,38,38,0.05)' }} />
                <Bar
                  dataKey="payments"
                  name="Payments"
                  radius={[0, 3, 3, 0]}
                  maxBarSize={20}
                  isAnimationActive={true}
                >
                  {barRows.map((row, i) => {
                    const val   = row[barKey];
                    const isSel = selectedBar?.value === val && selectedBar?.type === chartType;
                    const color = selectedBar
                      ? (isSel ? BAR_SELECTED : BAR_DIM)
                      : BAR_DEFAULT;
                    return <Cell key={i} fill={color} />;
                  })}
                  <LabelList
                    dataKey="payments"
                    position="right"
                    formatter={fmtMoney}
                    style={{ fontSize: 8, fill: '#64748b', fontWeight: 500 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </QFDChartCard>

    </div>
  );
}
