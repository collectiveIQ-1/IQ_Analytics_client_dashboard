/**
 * InnervatePaymentsPage.jsx — Payments tab for Innervate Dashboard.
 *
 * Layout mirrors IOM Help Payments Page exactly.
 *
 * Section 1: All Time Months Payment History (line chart)
 * Section 2: Deposits by [Category] — Surgeon Wise | Hospital Wise | Billing Type | Insurance Type
 *
 * Interactivity:
 *  - Click a line chart point → filters bar chart to that month
 *  - Click a bar → keeps selection active, state maintained
 *  - Clear button resets selection
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList,
  ReferenceLine,
} from 'recharts';
import { innervateApi } from '../../../api/innervate.api';
import { useTheme }     from '../../../contexts/ThemeContext';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtShortDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

// Match a date string to the same month as a full date value
const isSameMonth = (dateStr, selected) => {
  if (!dateStr || !selected) return false;
  const a = new Date(dateStr);
  const b = new Date(selected);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
};

// ── Chart sub-tabs ────────────────────────────────────────────────────────────

const CHART_TABS = [
  { id: 'surgeon',      label: 'Surgeon Wise' },
  { id: 'hospital',     label: 'Hospital Wise' },
  { id: 'billing_type', label: 'Billing Type' },
  { id: 'insurance',    label: 'Insurance Type' },
];

// ── Toggle button ─────────────────────────────────────────────────────────────

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
        active
          ? 'bg-red-700 text-white shadow ring-2 ring-white/20'
          : 'bg-[#991b1b] text-white hover:bg-red-800'
      }`}
    >
      {children}
    </button>
  );
}

// ── Tooltips ──────────────────────────────────────────────────────────────────

function LineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-700 dark:text-zinc-200">{fmtShortDate(label)}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmtMoney(p.value)}
        </p>
      ))}
    </div>
  );
}

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-slate-700 dark:text-zinc-200 mb-1">
        {p.payload?.label || p.payload?.[Object.keys(p.payload)[0]]}
      </p>
      <p style={{ color: p.color }} className="font-semibold">
        Payment Collected: {fmtMoney(p.value)}
      </p>
    </div>
  );
}

// ── Chart card wrapper ────────────────────────────────────────────────────────

function ChartCard({ title, actions, height = 340, loading, children }) {
  return (
    <div
      data-export-item
      data-export-label={title}
      data-export-id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
      className="overflow-hidden rounded-2xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-slate-50 dark:border-zinc-800/60">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-100">{title}</h3>
        {actions && <div className="flex gap-1.5 flex-wrap">{actions}</div>}
      </div>
      <div className="px-4 pb-4 pt-2" style={{ height }}>
        {loading
          ? <div className="h-full animate-pulse rounded-xl bg-slate-50 dark:bg-zinc-900" />
          : children}
      </div>
    </div>
  );
}

// ── Line label on chart points ────────────────────────────────────────────────

function LinePointLabel({ x, y, value, index }) {
  if (value == null) return null;
  const dy = index % 2 === 0 ? -12 : 16;
  return (
    <text x={x} y={y + dy} textAnchor="middle" fontSize={10} fontWeight="700" fill="#dc2626">
      {fmtMoney(value)}
    </text>
  );
}

// ── Horizontal bar label ──────────────────────────────────────────────────────

function HBarLabel({ x, y, width, height: h, value }) {
  if (!value) return null;
  return (
    <text x={x + width + 6} y={y + h / 2 + 4} fontSize={10} fontWeight="700" fill="#374151">
      {fmtMoney(value)}
    </text>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InnervatePaymentsPage() {
  const [chartTab,       setChartTab]       = useState('surgeon');
  const [selectedMonth,  setSelectedMonth]  = useState(null);
  const [selectedBar,    setSelectedBar]    = useState(null);

  const { theme } = useTheme();
  const isDark    = theme === 'dark';
  const axisFill  = isDark ? '#94a3b8' : '#334155';

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: lineData,        isLoading: lineLoad        } = useQuery({ queryKey: ['innervate-pay-line'],          queryFn: () => innervateApi.getPaymentLineChart().then(r => r.data.data),    staleTime: 300_000 });
  const { data: surgeonData,     isLoading: surgeonLoad     } = useQuery({ queryKey: ['innervate-pay-surgeon'],       queryFn: () => innervateApi.getDepositsBySurgeon().then(r => r.data.data),   staleTime: 300_000, enabled: chartTab === 'surgeon' });
  const { data: hospitalData,    isLoading: hospitalLoad    } = useQuery({ queryKey: ['innervate-pay-hospital'],      queryFn: () => innervateApi.getDepositsByHospital().then(r => r.data.data),  staleTime: 300_000, enabled: chartTab === 'hospital' });
  const { data: billingTypeData, isLoading: billingTypeLoad } = useQuery({ queryKey: ['innervate-pay-billing-type'],  queryFn: () => innervateApi.getDepositsByBillingType().then(r => r.data.data),staleTime: 300_000, enabled: chartTab === 'billing_type' });
  const { data: insuranceData,   isLoading: insuranceLoad   } = useQuery({ queryKey: ['innervate-pay-insurance'],     queryFn: () => innervateApi.getDepositsByInsurance().then(r => r.data.data),  staleTime: 300_000, enabled: chartTab === 'insurance' });

  // ── Active bar chart data ─────────────────────────────────────────────────

  const barConfig = {
    surgeon:      { data: surgeonData,     key: 'surgeon',       loading: surgeonLoad,     color: '#1e2d5a' },
    hospital:     { data: hospitalData,    key: 'hospital',      loading: hospitalLoad,    color: '#5f8ea0' },
    billing_type: { data: billingTypeData, key: 'billing_type',  loading: billingTypeLoad, color: '#9b3060' },
    insurance:    { data: insuranceData,   key: 'insurance_type',loading: insuranceLoad,   color: '#8a8a2c' },
  };

  const active    = barConfig[chartTab];
  const barData   = (active.data || []).map(r => ({ ...r, label: r[active.key] }));
  const barHeight  = Math.max(300, barData.length * 36);
  const leftMargin = chartTab === 'hospital' ? 200 : chartTab === 'insurance' ? 180 : 160;

  // ── Line chart click handler ──────────────────────────────────────────────

  const handleLineClick = (data) => {
    if (!data || !data.activePayload?.length) return;
    const clickedDate = data.activePayload[0]?.payload?.date;
    setSelectedMonth(prev => (prev === clickedDate ? null : clickedDate));
    setSelectedBar(null);
  };

  const handleBarClick = (data) => {
    if (!data) return;
    const key = data[active.key];
    setSelectedBar(prev => (prev === key ? null : key));
  };

  const clearSelection = () => {
    setSelectedMonth(null);
    setSelectedBar(null);
  };

  // Highlight selected month on line chart
  const lineDataHighlighted = (lineData || []).map(r => ({
    ...r,
    highlight: selectedMonth && isSameMonth(r.date, selectedMonth) ? r.payments : null,
  }));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Clear selection banner ── */}
      {(selectedMonth || selectedBar) && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl">
          <span className="text-xs font-semibold text-red-700 dark:text-red-400">
            {selectedMonth && `Filtered: ${fmtShortDate(selectedMonth)}`}
            {selectedMonth && selectedBar && ' · '}
            {selectedBar && `Selected: ${selectedBar}`}
          </span>
          <button
            onClick={clearSelection}
            className="ml-auto text-xs font-bold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Section 1: All Time Months Payment History ── */}
      <ChartCard
        title="All Time Months Payment History"
        loading={lineLoad}
        height={340}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={lineDataHighlighted}
            margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            onClick={handleLineClick}
            style={{ cursor: 'pointer' }}
          >
            <XAxis
              dataKey="date"
              tickFormatter={fmtShortDate}
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtMoney}
              tick={{ fontSize: 10, fill: '#64748b' }}
              width={56}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<LineTooltip />} />
            {selectedMonth && (
              <ReferenceLine
                x={selectedMonth}
                stroke="#dc2626"
                strokeDasharray="4 3"
                strokeWidth={2}
              />
            )}
            <Line
              type="monotone"
              dataKey="payments"
              name="Payment Collected"
              stroke="#dc2626"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#dc2626', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#b91c1c', stroke: '#fff', strokeWidth: 2 }}
              label={<LinePointLabel />}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Section 2: Deposits bar chart with sub-tabs ── */}
      <ChartCard
        title={`Deposits by ${CHART_TABS.find(t => t.id === chartTab)?.label}${selectedMonth ? ` — ${fmtShortDate(selectedMonth)}` : ''}`}
        loading={active.loading}
        height={barHeight + 60}
        actions={[
          ...CHART_TABS.map(t => (
            <ToggleBtn key={t.id} active={chartTab === t.id} onClick={() => { setChartTab(t.id); setSelectedBar(null); }}>
              {t.label}
            </ToggleBtn>
          )),
        ]}
      >
        <div style={{ height: barHeight, overflowY: 'auto' }}>
          <ResponsiveContainer width="100%" height={barHeight}>
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 4, right: 90, left: leftMargin, bottom: 4 }}
              onClick={handleBarClick}
              style={{ cursor: 'pointer' }}
            >
              <XAxis
                type="number"
                tickFormatter={fmtMoney}
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="label"
                type="category"
                width={leftMargin - 10}
                tick={{ fontSize: 10, fill: axisFill, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<BarTooltip />} />
              <Bar
                dataKey="payments"
                name="Payment Collected"
                fill={active.color}
                radius={[0, 3, 3, 0]}
                maxBarSize={28}
              >
                <LabelList dataKey="payments" content={HBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

    </div>
  );
}
