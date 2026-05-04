/**
 * QFDPaymentsPage.jsx — Payments tab for QFD Dashboard.
 *
 * Cross-chart interaction:
 *   • Click month on top chart  → filters provider + facility charts to that month
 *   • Click provider bar        → filters facility chart to that provider
 *   • Click facility bar        → filters provider chart to that facility
 *   • Click same item again     → clears that filter
 *   • Bank Deposits / Payment Posted toggle preserved
 */

import { useMemo, useState } from 'react';
import { useQuery }          from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, LabelList,
} from 'recharts';
import { qfdApi }   from '../../../api/qfd.api';
import { useTheme } from '../../../contexts/ThemeContext';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtShortDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const fmtLongDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ToggleButton({ active, children, onClick }) {
  return (
    <button onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-red-600 text-white shadow-sm' : 'bg-red-900 text-white'
      }`}>
      {children}
    </button>
  );
}

function MonthBadge({ date }) {
  if (!date) return null;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full
                     bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400
                     border border-red-200 dark:border-red-500/20">
      {fmtShortDate(date)}
    </span>
  );
}

function CrossFilterBadge({ label, value, onClear }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full
                     bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400
                     border border-amber-200 dark:border-amber-500/30">
      ↳ {label}: {value.length > 16 ? value.slice(0,15)+'…' : value}
      <button onClick={onClear} className="hover:opacity-70 ml-0.5">×</button>
    </span>
  );
}

function PaymentTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-700
                    bg-white dark:bg-zinc-900 px-4 py-3 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-700 dark:text-zinc-200">{fmtShortDate(label)}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmtMoney(p.value)}
        </p>
      ))}
    </div>
  );
}

function ChartCard({ title, actions, height = 200, loading, children, highlight = false }) {
  return (
    <div
      data-export-item
      data-export-label={title}
      data-export-id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
      className={`overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 ${
        highlight
          ? 'border-red-200 dark:border-red-500/30 bg-white dark:bg-zinc-950'
          : 'border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-100">{title}</h3>
        {actions}
      </div>
      <div className="px-4 pb-4" style={{ height }}>
        {loading
          ? <div className="h-full animate-pulse rounded-xl bg-slate-50 dark:bg-zinc-900" />
          : children}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QFDPaymentsPage() {
  const [mode,             setMode]             = useState('payment');
  const [selectedMonth,    setSelectedMonth]    = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setSelectedMonth(null);
    setSelectedProvider(null);
    setSelectedFacility(null);
  };

  const toggleProvider = (name) => {
    setSelectedProvider(p => p === name ? null : name);
    setSelectedFacility(null); // mutual exclusion
  };

  const toggleFacility = (name) => {
    setSelectedFacility(p => p === name ? null : name);
    setSelectedProvider(null); // mutual exclusion
  };

  const { theme } = useTheme();
  const isDark    = theme === 'dark';
  const labelFill = isDark ? '#e2e8f0' : '#111827';
  const axisFill  = isDark ? '#94a3b8' : '#334155';

  // ── Label renderers ────────────────────────────────────────────────────────

  const lineLabel = ({ x, y, value, index }) => {
    if (value == null) return null;
    const dy = index % 2 === 0 ? -10 : 16;
    return (
      <text x={x} y={y + dy} textAnchor="middle" fontSize={10} fontWeight={700} fill={labelFill}>
        {fmtMoney(value)}
      </text>
    );
  };

  const hBarLabel = ({ x, y, width, height: h, value }) => {
    if (value == null) return null;
    return (
      <text x={x + width + 6} y={y + h / 2 + 4} fontSize={10} fontWeight={700} fill={labelFill}>
        {fmtMoney(value)}
      </text>
    );
  };

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: paymentHistory, isLoading: paymentLoading } = useQuery({
    queryKey: ['qfd-payment-history'],
    queryFn:  () => qfdApi.getPaymentHistory().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: bankHistory, isLoading: bankLoading } = useQuery({
    queryKey: ['qfd-bank-history'],
    queryFn:  () => qfdApi.getBankDepositHistory().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const activeHistory = mode === 'payment' ? paymentHistory : bankHistory;
  const activeLoading = mode === 'payment' ? paymentLoading : bankLoading;

  const effectiveMonth = selectedMonth
    || activeHistory?.[activeHistory.length - 1]?.date
    || null;

  // Provider — filtered by selectedFacility if set
  const { data: providerData, isLoading: providerLoading } = useQuery({
    queryKey: ['qfd-provider-deposits', mode, effectiveMonth, selectedFacility],
    queryFn:  () => qfdApi.getDepositsByReferringProvider(effectiveMonth, selectedFacility).then((r) => r.data.data),
    enabled:  !!effectiveMonth,
    staleTime: 5 * 60_000,
  });

  // Facility — filtered by selectedProvider if set
  const { data: facilityData, isLoading: facilityLoading } = useQuery({
    queryKey: ['qfd-facility-deposits', mode, effectiveMonth, selectedProvider],
    queryFn:  () => qfdApi.getDepositsByFacility(effectiveMonth, selectedProvider).then((r) => r.data.data),
    enabled:  !!effectiveMonth,
    staleTime: 5 * 60_000,
  });

  const topLineData = useMemo(() => activeHistory || [], [activeHistory]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">

      {/* ── Top line chart ── */}
      <ChartCard
        title={
          mode === 'payment'
            ? 'Last 12 Months Posted Payment History DOD'
            : 'Last 12 Months Bank Deposits Payment History DOD'
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ToggleButton active={mode === 'bank'}    onClick={() => handleModeChange('bank')}>Bank Deposits</ToggleButton>
            <ToggleButton active={mode === 'payment'} onClick={() => handleModeChange('payment')}>Payment Posted</ToggleButton>
          </div>
        }
        height={270}
        loading={activeLoading}
      >
        <div className="flex items-center gap-2 pb-1 px-1 flex-wrap">
          <span className="text-[11px] text-slate-400 dark:text-zinc-500">Showing below for:</span>
          <MonthBadge date={effectiveMonth} />
          {selectedMonth && (
            <button onClick={() => setSelectedMonth(null)}
              className="text-[10px] text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400">
              ✕ Reset month
            </button>
          )}
          <span className="text-[10px] text-slate-300 dark:text-zinc-600 italic hidden sm:inline">
            — click any point to filter below
          </span>
        </div>

        <ResponsiveContainer width="100%" height="88%">
          <LineChart
            data={topLineData}
            margin={{ top: 18, right: 30, left: 10, bottom: 10 }}
            style={{ cursor: 'pointer' }}
            onClick={(state) => {
              if (state?.activePayload?.[0]?.payload?.date)
                setSelectedMonth(state.activePayload[0].payload.date);
            }}
          >
            <XAxis dataKey="date" tickFormatter={fmtShortDate}
              tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtMoney}
              tick={{ fontSize: 11, fill: '#64748b' }} width={55} axisLine={false} tickLine={false} />
            <Tooltip content={<PaymentTooltip />} />
            <Line
              type="monotone"
              dataKey={mode === 'payment' ? 'payments' : 'bank_deposit_amount'}
              name={mode === 'payment' ? 'Payments Posted' : 'Bank Deposits'}
              stroke="#ef4444" strokeWidth={3}
              dot={({ cx, cy, payload }) => {
                const isSelected = payload?.date === effectiveMonth;
                return (
                  <circle key={payload?.date} cx={cx} cy={cy}
                    r={isSelected ? 7 : 3}
                    fill={isSelected ? '#b91c1c' : '#dc2626'}
                    stroke={isSelected ? '#fff' : 'none'}
                    strokeWidth={isSelected ? 2.5 : 0}
                    style={{ filter: isSelected ? 'drop-shadow(0 0 4px #ef4444)' : 'none' }}
                  />
                );
              }}
              activeDot={{ r: 7, fill: '#b91c1c', stroke: '#fff', strokeWidth: 2 }}
              label={lineLabel}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Sync / filter banner ── */}
      {effectiveMonth && (
        <div className="flex items-center gap-3 px-1 flex-wrap">
          <div className="h-px flex-1 bg-red-100 dark:bg-red-500/20" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full
                          bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">
              Synced to {fmtLongDate(effectiveMonth)}
            </span>
          </div>
          {selectedProvider && (
            <CrossFilterBadge label="Provider" value={selectedProvider} onClear={() => setSelectedProvider(null)} />
          )}
          {selectedFacility && (
            <CrossFilterBadge label="Facility" value={selectedFacility} onClear={() => setSelectedFacility(null)} />
          )}
          <div className="h-px flex-1 bg-red-100 dark:bg-red-500/20" />
        </div>
      )}

      {effectiveMonth && !selectedProvider && !selectedFacility && (
        <p className="text-[10px] text-slate-400 dark:text-zinc-500 italic px-2">
          Click a provider or facility bar to cross-filter the other chart.
        </p>
      )}

      {/* ── Bottom row: Provider + Facility ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">

        {/* Provider chart */}
        <ChartCard
          title="Deposits by Referring Provider (DOD)"
          actions={
            <div className="flex items-center gap-1.5 flex-wrap">
              <MonthBadge date={effectiveMonth} />
              {selectedFacility && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 font-semibold">
                  Fac: {selectedFacility.length > 12 ? selectedFacility.slice(0,11)+'…' : selectedFacility}
                </span>
              )}
            </div>
          }
          height={320}
          loading={providerLoading}
          highlight={!!selectedProvider || !!selectedFacility}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={providerData || []}
              layout="vertical"
              margin={{ top: 5, right: 70, left: 110, bottom: 5 }}
              onClick={(state) => {
                const rp = state?.activePayload?.[0]?.payload?.referring_provider;
                if (rp) toggleProvider(rp);
              }}
              style={{ cursor: 'pointer' }}
            >
              <XAxis type="number" tickFormatter={fmtMoney}
                tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="referring_provider" type="category" width={140}
                tick={{ fontSize: 9, fill: axisFill, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip content={<PaymentTooltip />} />
              <Bar dataKey="payments" name="Payments" radius={[0, 3, 3, 0]}>
                {(providerData || []).map((entry, i) => {
                  const isSelected = selectedProvider === entry.referring_provider;
                  return (
                    <Cell
                      key={i}
                      fill={isSelected ? '#1d4ed8' : '#4f83b5'}
                      opacity={selectedProvider && !isSelected ? 0.4 : 1}
                    />
                  );
                })}
                <LabelList dataKey="payments" content={hBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Facility chart */}
        <ChartCard
          title="Deposit by Facility"
          actions={
            <div className="flex items-center gap-1.5 flex-wrap">
              <MonthBadge date={effectiveMonth} />
              {selectedProvider && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 font-semibold">
                  Prov: {selectedProvider.length > 12 ? selectedProvider.slice(0,11)+'…' : selectedProvider}
                </span>
              )}
            </div>
          }
          height={320}
          loading={facilityLoading}
          highlight={!!selectedProvider || !!selectedFacility}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={facilityData || []}
              layout="vertical"
              margin={{ top: 5, right: 70, left: 110, bottom: 5 }}
              onClick={(state) => {
                const fac = state?.activePayload?.[0]?.payload?.facility;
                if (fac) toggleFacility(fac);
              }}
              style={{ cursor: 'pointer' }}
            >
              <XAxis type="number" tickFormatter={fmtMoney}
                tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="facility" type="category" width={160}
                tick={{ fontSize: 9, fill: axisFill, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip content={<PaymentTooltip />} />
              <Bar dataKey="payments" name="Payments" radius={[0, 3, 3, 0]}>
                {(facilityData || []).map((entry, i) => {
                  const isSelected = selectedFacility === entry.facility;
                  return (
                    <Cell
                      key={i}
                      fill={isSelected ? '#d97706' : '#f59e0b'}
                      opacity={selectedFacility && !isSelected ? 0.4 : 1}
                    />
                  );
                })}
                <LabelList dataKey="payments" content={hBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
}
