/**
 * InnervateHomePage.jsx — Innervate Dashboard Home tab.
 *
 * Row 1: [Revenue Cycle Metrics: col-7] [Payment History (DOD): col-5]
 * Row 2: [Charges vs Payments: col-6] [CCR History: col-3] [AR Pie: col-3]
 * Row 3: [Total Charges: col-4] [Total Adjustments: col-4] [AR % >60 Days: col-4]
 *
 * NO CCR — CCR KPI card shows "—" (no value). CCR History shows empty state.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend, Label,
} from 'recharts';
import { innervateApi } from '../../../api/innervate.api';
import QFDKpiCard   from '../../../components/qfd/QFDKpiCard';
import QFDChartCard from '../../../components/qfd/QFDChartCard';

// ── Palette ───────────────────────────────────────────────────────────────────

const PIE_COLORS   = ['#581c1c','#7c2d12','#92400e','#b45309','#d97706','#f59e0b'];
const DONUT_COLORS = ['#dc2626', '#94a3b8'];

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtShortDate = (d) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } catch { return String(d); }
};

const fmtMoney = (v) => {
  if (v == null) return '$0';
  const a = Math.abs(Number(v));
  if (a >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

const fmtMillions = (v) => {
  if (v == null) return '$0';
  const a = Math.abs(Number(v));
  if (a >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v}`;
};

const fmtDays = (v) => v == null ? '—' : `${Number(v).toFixed(0)}`;

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, currencyKeys = [] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-zinc-200 mb-1">
        {fmtShortDate(label) || label}
      </p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {currencyKeys.includes(p.dataKey) ? fmtMoney(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ── AR Pie custom legend ──────────────────────────────────────────────────────

function ArPieLegend({ data = [] }) {
  const total = data.reduce((s, d) => s + (d.total_balance ?? 0), 0);
  return (
    <div className="flex flex-col gap-1 px-2 pb-1">
      {data.map((d, i) => {
        const pct = total > 0 ? ((d.total_balance / total) * 100).toFixed(1) : '0.0';
        return (
          <div key={d.bucket} className="flex items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="text-slate-600 dark:text-zinc-400 truncate font-medium">{d.bucket}</span>
            </div>
            <span className="tabular-nums text-slate-500 dark:text-zinc-500 flex-shrink-0">
              {fmtMoney(d.total_balance)} <span className="text-slate-400">({pct}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── CCR KPI placeholder card (styled like real KPI, no value) ─────────────────

function CcrKpiPlaceholder() {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 flex flex-col justify-between h-full">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
          Clean Claim Rate
        </p>
        <p className="text-[10px] text-slate-300 dark:text-zinc-600 mt-0.5">Last 12 Months</p>
      </div>
      <div className="mt-2">
        <p className="text-2xl font-black text-slate-300 dark:text-zinc-600 tracking-tight">—</p>
        <p className="text-[9px] text-slate-300 dark:text-zinc-700 mt-1 leading-tight">
          CCR not configured
        </p>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InnervateHomePage({ onNavigate }) {
  const [row1Expanded, setRow1Expanded] = useState(null);
  const [row2Expanded, setRow2Expanded] = useState(null);
  const [row3Expanded, setRow3Expanded] = useState(null);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: kpis,        isLoading: kpiLoad        } = useQuery({ queryKey: ['innervate-kpis'],                     queryFn: () => innervateApi.getKpis().then(r => r.data.data),                   staleTime: 300_000 });
  const { data: paymentData, isLoading: payLoad         } = useQuery({ queryKey: ['innervate-payment-history'],          queryFn: () => innervateApi.getPaymentHistory().then(r => r.data.data),          staleTime: 300_000 });
  const { data: paymentFull, isLoading: payFullLoad     } = useQuery({ queryKey: ['innervate-payment-history-full'],     queryFn: () => innervateApi.getPaymentHistoryFull().then(r => r.data.data),      staleTime: 300_000, enabled: row1Expanded === 'payment' });
  const { data: arPieData,   isLoading: arPieLoad       } = useQuery({ queryKey: ['innervate-ar-pie'],                   queryFn: () => innervateApi.getArPie().then(r => r.data.data),                   staleTime: 300_000 });
  const { data: donutData,   isLoading: donutLoad       } = useQuery({ queryKey: ['innervate-ar-donut'],                 queryFn: () => innervateApi.getArDonut().then(r => r.data.data),                 staleTime: 300_000 });
  const { data: tcData,      isLoading: tcLoad          } = useQuery({ queryKey: ['innervate-total-charges'],            queryFn: () => innervateApi.getTotalCharges().then(r => r.data.data),            staleTime: 300_000 });
  const { data: tcFull,      isLoading: tcFullLoad      } = useQuery({ queryKey: ['innervate-total-charges-full'],       queryFn: () => innervateApi.getTotalChargesFull().then(r => r.data.data),        staleTime: 300_000, enabled: row3Expanded === 'totalCharges' });
  const { data: adjData,     isLoading: adjLoad         } = useQuery({ queryKey: ['innervate-adjustments'],              queryFn: () => innervateApi.getAdjustments().then(r => r.data.data),             staleTime: 300_000 });
  const { data: adjFull,     isLoading: adjFullLoad     } = useQuery({ queryKey: ['innervate-adjustments-full'],         queryFn: () => innervateApi.getAdjustmentsFull().then(r => r.data.data),         staleTime: 300_000, enabled: row3Expanded === 'adjustments' });
  const { data: chargesData, isLoading: chargesLoad     } = useQuery({ queryKey: ['innervate-charges-vs-payments'],      queryFn: () => innervateApi.getChargesVsPayments().then(r => r.data.data),       staleTime: 300_000 });
  const { data: chargesFull, isLoading: chargesFullLoad } = useQuery({ queryKey: ['innervate-charges-vs-payments-full'], queryFn: () => innervateApi.getChargesVsPaymentsFull().then(r => r.data.data),   staleTime: 300_000, enabled: row2Expanded === 'charges' });

  // ── Active data ───────────────────────────────────────────────────────────

  const activePayment = row1Expanded === 'payment'      ? (paymentFull ?? paymentData) : paymentData;
  const activeCharges = row2Expanded === 'charges'      ? (chargesFull ?? chargesData) : chargesData;
  const activeTc      = row3Expanded === 'totalCharges' ? (tcFull      ?? tcData)      : tcData;
  const activeAdj     = row3Expanded === 'adjustments'  ? (adjFull     ?? adjData)     : adjData;

  const donutTotal  = (donutData || []).reduce((s, d) => s + (d.total_balance ?? 0), 0);
  const over60Entry = (donutData || [])[0] ?? null;
  const over60Pct   = donutTotal > 0 && over60Entry
    ? ((over60Entry.total_balance / donutTotal) * 100).toFixed(1)
    : null;

  // ── Chart heights ─────────────────────────────────────────────────────────

  const R1_H = row1Expanded ? 420 : 300;
  const R2_H = row2Expanded ? 400 : 290;
  const R3_H = row3Expanded ? 400 : 270;

  // ── Grid class helpers ────────────────────────────────────────────────────

  const r1MetricsClass = row1Expanded === 'payment' ? 'hidden' : 'col-span-12 lg:col-span-7';
  const r1PayClass     = row1Expanded === 'payment' ? 'col-span-12' : 'col-span-12 lg:col-span-5';

  const r2Col = (key) => {
    if (row2Expanded === key) return 'col-span-12';
    if (row2Expanded)         return 'hidden';
    if (key === 'charges')    return 'col-span-12 lg:col-span-6';
    return 'col-span-12 lg:col-span-3';
  };

  const r3Col = (key) => {
    if (row3Expanded === key) return 'col-span-12';
    if (row3Expanded)         return 'hidden';
    return 'col-span-12 lg:col-span-4';
  };

  // ── Pie chart split height ────────────────────────────────────────────────
  // Reserve space for custom legend below the pie
  const pieChartH = Math.max(R2_H - 90, 160);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">

      {/* ══ ROW 1 — Revenue Cycle Metrics + Payment History ══ */}
      <div className="grid grid-cols-12 gap-2 md:gap-3">

        {/* Revenue Cycle Metrics — 2×2 KPI grid */}
        <div className={`${r1MetricsClass} transition-all duration-300`}>
          <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm h-full">
            <div className="px-4 py-3 border-b border-slate-50 dark:border-zinc-800/60">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                Revenue Cycle Metrics
              </h3>
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 h-[calc(100%-44px)]">
              <QFDKpiCard
                label="Total Payments"
                value={fmtMillions(kpis?.total_payments)}
                subLabel="Last 12 Months"
                color="pink"
                loading={kpiLoad}
                onClick={() => onNavigate?.('payments')}
              />
              <QFDKpiCard
                label="Total Charges"
                value={fmtMillions(kpis?.total_charges)}
                subLabel="Last 12 Months"
                color="amber"
                loading={kpiLoad}
              />
              <QFDKpiCard
                label="AVG Days DOS to DOE"
                value={fmtDays(kpis?.avg_days)}
                subLabel="Last 12 Months"
                color="green"
                loading={kpiLoad}
              />
              {/* CCR KPI — no data, styled consistently */}
              <CcrKpiPlaceholder />
            </div>
          </div>
        </div>

        {/* Payment History (DOD) — expandable line chart */}
        <div className={`${r1PayClass} transition-all duration-300`}>
          <QFDChartCard
            title={row1Expanded === 'payment' ? 'All Time Payment History (DOD)' : 'Recent Months Payment History (DOD)'}
            onExpand={row1Expanded === null        ? () => setRow1Expanded('payment') : undefined}
            onCompress={row1Expanded === 'payment' ? () => setRow1Expanded(null)      : undefined}
            loading={row1Expanded === 'payment' ? payFullLoad : payLoad}
            height={R1_H}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activePayment || []} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={fmtShortDate} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtMoney} width={48} />
                <Tooltip content={<ChartTooltip currencyKeys={['payments']} />} />
                <Line type="monotone" dataKey="payments" name="Payments" stroke="#dc2626" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </QFDChartCard>
        </div>
      </div>

      {/* ══ ROW 2 — Charges vs Payments | CCR History | AR Pie ══ */}
      {/* NOTE: CCR History is now position 2, AR Pie is position 3 (swapped) */}
      <div className="grid grid-cols-12 gap-2 md:gap-3">

        {/* Charges vs Payments (DOE) — expandable bar chart */}
        <div className={`${r2Col('charges')} transition-all duration-300`}>
          <QFDChartCard
            title={row2Expanded === 'charges' ? 'All Time Charges vs Payments (DOE)' : 'Last 12 Months Charges vs Payments (DOE)'}
            onExpand={row2Expanded === null        ? () => setRow2Expanded('charges') : undefined}
            onCompress={row2Expanded === 'charges' ? () => setRow2Expanded(null)      : undefined}
            loading={row2Expanded === 'charges' ? chargesFullLoad : chargesLoad}
            height={R2_H}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeCharges || []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={fmtShortDate} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtMoney} width={48} />
                <Tooltip content={<ChartTooltip currencyKeys={['total_charges', 'total_payments']} />} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="total_charges"  name="Total Charge"   fill="#4ade80" radius={[2,2,0,0]} maxBarSize={22} />
                <Bar dataKey="total_payments" name="Total Payments" fill="#3b82f6" radius={[2,2,0,0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </QFDChartCard>
        </div>

        {/* CCR History — empty state (position 2, swapped from before) */}
        <div className={`${r2Col('ccr')} transition-all duration-300`}>
          <QFDChartCard title="Clean Claim Rates History" height={R2_H}>
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" /><path d="M18 9l-5 5-4-4-3 3" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500">No CCR Data Available</p>
              <p className="text-[10px] text-slate-300 dark:text-zinc-600 text-center max-w-[140px] leading-relaxed">
                Clean Claim Rate tracking is not configured for Innervate.
              </p>
            </div>
          </QFDChartCard>
        </div>

        {/* Accounts Receivable (DOE) — pie, position 3 (swapped from before) */}
        {/* Labels removed from pie slices; custom legend shows bucket + value + % below */}
        <div className={`${r2Col('arPie')} transition-all duration-300`}>
          <QFDChartCard title="Accounts Receivable (DOE)" loading={arPieLoad} height={R2_H}>
            <div className="flex flex-col h-full">
              {/* Pie itself — smaller so labels aren't needed */}
              <div style={{ height: pieChartH, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <Pie
                      data={arPieData || []}
                      dataKey="total_balance"
                      nameKey="bucket"
                      cx="50%" cy="50%"
                      outerRadius="75%"
                      paddingAngle={1}
                      minAngle={3}
                    >
                      {(arPieData || []).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => fmtMoney(v)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom legend — visible, not clipped */}
              <div className="flex-1 overflow-y-auto mt-1">
                <ArPieLegend data={arPieData || []} />
              </div>
            </div>
          </QFDChartCard>
        </div>
      </div>

      {/* ══ ROW 3 — Total Charges | Total Adjustments | AR % >60 Days ══ */}
      <div className="grid grid-cols-12 gap-2 md:gap-3">

        {/* Total Charges (DOE) — step line, purple — expandable */}
        <div className={`${r3Col('totalCharges')} transition-all duration-300`}>
          <QFDChartCard
            title="Total Charges (DOE)"
            onExpand={row3Expanded === null             ? () => setRow3Expanded('totalCharges') : undefined}
            onCompress={row3Expanded === 'totalCharges' ? () => setRow3Expanded(null)           : undefined}
            loading={row3Expanded === 'totalCharges' ? tcFullLoad : tcLoad}
            height={R3_H}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeTc || []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={fmtShortDate} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtMoney} width={48} />
                <Tooltip content={<ChartTooltip currencyKeys={['total_charges']} />} />
                <Line type="stepAfter" dataKey="total_charges" name="Total Charges" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </QFDChartCard>
        </div>

        {/* Total Adjustments — area, yellow — expandable */}
        <div className={`${r3Col('adjustments')} transition-all duration-300`}>
          <QFDChartCard
            title="Total Adjustments"
            onExpand={row3Expanded === null            ? () => setRow3Expanded('adjustments') : undefined}
            onCompress={row3Expanded === 'adjustments' ? () => setRow3Expanded(null)          : undefined}
            loading={row3Expanded === 'adjustments' ? adjFullLoad : adjLoad}
            height={R3_H}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeAdj || []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="innervateAdjGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#eab308" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={fmtShortDate} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtMoney} width={48} />
                <Tooltip content={<ChartTooltip currencyKeys={['adjustments']} />} />
                <Area type="monotone" dataKey="adjustments" name="Adjustments" stroke="#ca8a04" strokeWidth={2} fill="url(#innervateAdjGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </QFDChartCard>
        </div>

        {/* AR % > 60+ Days — donut, red */}
        <div className={`${r3Col('donut')} transition-all duration-300`}>
          <QFDChartCard title="AR % > 60+ Days" loading={donutLoad} height={R3_H}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData || []}
                  dataKey="total_balance"
                  nameKey="bucket"
                  cx="50%" cy="50%"
                  innerRadius="40%"
                  outerRadius="65%"
                  startAngle={90}
                  endAngle={-270}
                >
                  {(donutData || []).map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                  <Label
                    position="center"
                    content={({ viewBox }) => {
                      if (!viewBox || !over60Pct) return null;
                      const { cx, cy } = viewBox;
                      return (
                        <text textAnchor="middle" dominantBaseline="central">
                          <tspan x={cx} y={cy - 7} fontSize={15} fontWeight="800" fill="#dc2626">
                            {over60Pct}%
                          </tspan>
                          <tspan x={cx} dy={14} fontSize={8} fontWeight="500" fill="#94a3b8">
                            &gt;60 Days
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
                <Tooltip formatter={v => fmtMoney(v)} />
                <Legend
                  wrapperStyle={{ fontSize: 9 }}
                  formatter={(value, entry) => {
                    const pct = donutTotal > 0
                      ? ((entry.payload.total_balance / donutTotal) * 100).toFixed(1)
                      : '0.0';
                    return `${value} (${pct}%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </QFDChartCard>
        </div>
      </div>

    </div>
  );
}
