/**
 * ConfidasPaymentsPage.jsx — Payments tab for Confidas dashboard.
 *
 * Layout:
 *   1) Last 12 Months Posted Payment History (DOD)
 *      • Toggle: [Bank Deposits] [Payment Posted]
 *      • Payment Posted (default): deposit_report → date / SUM(payment)
 *      • Bank Deposits:            bank            → monthend / SUM(bank_deposit_amount)
 *      • Clicking a data point cross-filters chart 2
 *
 *   2) Deposits by Referring Provider (DOD)
 *      • Horizontal bar, blue, deposit_report → provider / SUM(payment)
 *      • Updates dynamically when a month is selected in chart 1
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line,
  BarChart,  Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LabelList, Cell,
} from 'recharts';
import { confidasApi } from '../../../api/confidas.api';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtShortDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } catch { return String(d); }
};

const fmtMoney = (v) => {
  if (v == null) return '$0';
  const a = Math.abs(Number(v));
  if (a >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
};

const fmtMoneyAxis = (v) => {
  if (v == null) return '0K';
  const a = Math.abs(Number(v));
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `${Math.round(v / 1_000)}K`;
  return `${Math.round(v)}`;
};

// ── Custom dot that dims non-selected months ──────────────────────────────────
function ActiveDot({ cx, cy, payload, selectedMonth, color }) {
  const isSelected = selectedMonth && payload?.date === selectedMonth;
  const isDimmed   = selectedMonth && payload?.date !== selectedMonth;
  return (
    <circle
      cx={cx} cy={cy}
      r={isSelected ? 6 : 4}
      fill={isSelected ? color : color}
      stroke={isSelected ? '#fff' : 'none'}
      strokeWidth={isSelected ? 2 : 0}
      opacity={isDimmed ? 0.35 : 1}
    />
  );
}

// ── Data-point label on line ──────────────────────────────────────────────────
function LineLabel({ x, y, value, selectedMonth, payload }) {
  if (value == null) return null;
  return (
    <text
      x={x} y={y - 10}
      textAnchor="middle"
      fontSize={10}
      fontWeight="600"
      fill="#374151"
    >
      {fmtMoney(value)}
    </text>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-zinc-200 mb-1">{fmtShortDate(label)}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.stroke || p.fill }} className="font-medium">
          {p.name}: {fmtMoney(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Toggle Button ─────────────────────────────────────────────────────────────
function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-1.5 text-xs font-bold rounded transition-all duration-150',
        active
          ? 'bg-red-700 text-white shadow'
          : 'bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 hover:border-red-300 hover:text-red-600',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ConfidasPaymentsPage() {
  const [chartMode,     setChartMode]     = useState('posted'); // 'posted' | 'bank'
  const [selectedMonth, setSelectedMonth] = useState(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: postedData, isLoading: postedLoad } = useQuery({
    queryKey: ['confidas-payment-posted'],
    queryFn:  () => confidasApi.getPaymentHistory().then(r => r.data.data),
    staleTime: 300_000,
  });

  const { data: bankData, isLoading: bankLoad } = useQuery({
    queryKey: ['confidas-bank-deposits'],
    queryFn:  () => confidasApi.getBankDeposits().then(r => r.data.data),
    staleTime: 300_000,
  });

  const { data: providerData, isLoading: providerLoad } = useQuery({
    queryKey: ['confidas-deposits-by-provider', selectedMonth],
    queryFn:  () => confidasApi.getDepositsByProvider(selectedMonth).then(r => r.data.data),
    staleTime: 300_000,
    keepPreviousData: true,
  });

  // ── Active line chart data ────────────────────────────────────────────────
  const activeLineData = chartMode === 'posted' ? (postedData || []) : (bankData || []);
  const lineLoading    = chartMode === 'posted' ? postedLoad : bankLoad;

  const lineColor   = chartMode === 'posted' ? '#dc2626' : '#dc2626';
  const lineName    = chartMode === 'posted' ? 'Payment Posted' : 'Bank Deposits';

  // ── Provider bar max (for axis domain) ───────────────────────────────────
  const maxProvider = Math.max(...(providerData || []).map(r => r.payments || 0), 0);

  const handleLineClick = (state) => {
    const date = state?.activePayload?.[0]?.payload?.date;
    if (!date) return;
    setSelectedMonth(prev => (prev === date ? null : date));
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ═══ Chart 1 — Payment History Line Chart ═══ */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 dark:border-zinc-800/60 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
              Last 12 Months Posted Payment History DOD
            </h3>
            {selectedMonth && (
              <p className="text-[10px] text-red-500 font-medium mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse" />
                Filtered: {fmtShortDate(selectedMonth)}
                <button
                  onClick={() => setSelectedMonth(null)}
                  className="ml-1 text-slate-400 hover:text-red-600"
                >× Clear</button>
              </p>
            )}
          </div>
          {/* Toggle buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ToggleBtn
              active={chartMode === 'bank'}
              onClick={() => { setChartMode('bank'); setSelectedMonth(null); }}
            >
              Bank Deposits
            </ToggleBtn>
            <ToggleBtn
              active={chartMode === 'posted'}
              onClick={() => { setChartMode('posted'); setSelectedMonth(null); }}
            >
              Payment Posted
            </ToggleBtn>
          </div>
        </div>

        <div style={{ minHeight: 300, height: 300 }} className="p-4">
          {lineLoading ? (
            <div className="h-full bg-slate-50 dark:bg-zinc-900 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={activeLineData}
                margin={{ top: 24, right: 24, left: 0, bottom: 0 }}
                style={{ cursor: 'pointer' }}
                onClick={handleLineClick}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={fmtShortDate}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={fmtMoneyAxis}
                  width={44}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="linear"
                  dataKey="payments"
                  name={lineName}
                  stroke={lineColor}
                  strokeWidth={2.5}
                  dot={(props) => (
                    <ActiveDot
                      key={props.payload?.date}
                      {...props}
                      selectedMonth={selectedMonth}
                      color={lineColor}
                    />
                  )}
                  activeDot={{ r: 5, fill: lineColor }}
                >
                  <LabelList
                    dataKey="payments"
                    position="top"
                    formatter={fmtMoney}
                    style={{ fontSize: 10, fontWeight: 600, fill: '#374151' }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ═══ Chart 2 — Deposits by Referring Provider ═══ */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 dark:border-zinc-800/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
              Deposits by Referring Provider (DOD)
            </h3>
            {selectedMonth && (
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                Showing data for {fmtShortDate(selectedMonth)}
              </p>
            )}
          </div>
          {selectedMonth && (
            <button
              onClick={() => setSelectedMonth(null)}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              × Clear filter
            </button>
          )}
        </div>

        <div
          style={{
            height: Math.max(200, (providerData?.length || 1) * 52 + 40),
            minHeight: 200,
          }}
          className="p-4"
        >
          {providerLoad ? (
            <div className="h-full bg-slate-50 dark:bg-zinc-900 rounded-xl animate-pulse" />
          ) : !providerData || providerData.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-slate-400 dark:text-zinc-500">No provider data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={providerData}
                margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={fmtMoneyAxis}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, maxProvider * 1.15 || 'auto']}
                />
                <YAxis
                  type="category"
                  dataKey="provider_name"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  width={160}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [fmtMoney(v), 'Payments']}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar
                  dataKey="payments"
                  name="Payments"
                  fill="#1e3a5f"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={44}
                >
                  <LabelList
                    dataKey="payments"
                    position="right"
                    formatter={fmtMoney}
                    style={{ fontSize: 10, fontWeight: 700, fill: '#1e3a5f' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}
