/**
 * SynapsesHomePage.jsx — IOM Help Dashboard Home tab.
 *
 * Layout:
 *  Row 1: [Revenue Cycle Metrics: col-7] [Payment History: col-5]
 *  Row 2: [Charges vs Payments: col-6] [CCR History: col-3] [AR Pie: col-3]
 *  Row 3: [Total Charges: col-4] [Total Adjustments: col-4] [AR% >60 Days: col-4]
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend,
  ReferenceLine, LabelList,
} from 'recharts';
import { synapsesApi } from '../../../api/synapses.api';
import QFDKpiCard     from '../../../components/qfd/QFDKpiCard';
import QFDChartCard   from '../../../components/qfd/QFDChartCard';

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

const fmtPct  = (v) => v == null ? '—' : `${Number(v).toFixed(1)}%`;
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


// ── No-data fallback ─────────────────────────────────────────────────────────

function NoData({ message = 'No data available' }) {
  return (
    <div className="flex items-center justify-center h-full text-slate-400 dark:text-zinc-600 text-xs font-medium">
      {message}
    </div>
  );
}

// ── hasData helpers ───────────────────────────────────────────────────────────

const hasRows     = (d) => Array.isArray(d) && d.length > 0;
const hasNonZero  = (d, key) => hasRows(d) && d.some((r) => (r[key] ?? 0) !== 0);

// ── CCR bar label ─────────────────────────────────────────────────────────────

function CcrBarLabel({ x, y, width, value }) {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 3} textAnchor="middle" fontSize={8} fill="#dc2626" fontWeight="600">
      {`${Number(value).toFixed(0)}%`}
    </text>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SynapsesHomePage({ onNavigate }) {
  const [row1Expanded, setRow1Expanded] = useState(null);
  const [row2Expanded, setRow2Expanded] = useState(null);
  const [row3Expanded, setRow3Expanded] = useState(null);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: kpis,        isLoading: kpiLoad        } = useQuery({ queryKey: ['synm-kpis'],                  queryFn: () => synapsesApi.getKpis().then(r => r.data.data),                staleTime: 300_000 });
  const { data: paymentData, isLoading: payLoad         } = useQuery({ queryKey: ['synm-payment-history'],       queryFn: () => synapsesApi.getPaymentHistory().then(r => r.data.data),       staleTime: 300_000 });
  const { data: paymentFull, isLoading: payFullLoad     } = useQuery({ queryKey: ['synm-payment-history-full'],  queryFn: () => synapsesApi.getPaymentHistoryFull().then(r => r.data.data),   staleTime: 300_000, enabled: row1Expanded === 'payment' });
  // CCR not available for Synapses — stub returns []
  const ccrData = [];
  const ccrLoad = false;
  const { data: arPieData,   isLoading: arPieLoad       } = useQuery({ queryKey: ['synm-ar-pie'],                queryFn: () => synapsesApi.getArPie().then(r => r.data.data),                staleTime: 300_000 });
  const { data: donutData,   isLoading: donutLoad       } = useQuery({ queryKey: ['synm-ar-donut'],              queryFn: () => synapsesApi.getArDonut().then(r => r.data.data),              staleTime: 300_000 });
  const { data: tcData,      isLoading: tcLoad          } = useQuery({ queryKey: ['synm-total-charges'],         queryFn: () => synapsesApi.getTotalCharges().then(r => r.data.data),         staleTime: 300_000 });
  const { data: tcFull,      isLoading: tcFullLoad      } = useQuery({ queryKey: ['synm-total-charges-full'],    queryFn: () => synapsesApi.getTotalChargesFull().then(r => r.data.data),     staleTime: 300_000, enabled: row3Expanded === 'totalCharges' });
  const { data: adjData,     isLoading: adjLoad         } = useQuery({ queryKey: ['synm-adjustments'],           queryFn: () => synapsesApi.getAdjustments().then(r => r.data.data),          staleTime: 300_000 });
  const { data: adjFull,     isLoading: adjFullLoad     } = useQuery({ queryKey: ['synm-adjustments-full'],      queryFn: () => synapsesApi.getAdjustmentsFull().then(r => r.data.data),      staleTime: 300_000, enabled: row3Expanded === 'adjustments' });
  const { data: chargesData, isLoading: chargesLoad     } = useQuery({ queryKey: ['synm-charges-vs-payments'],   queryFn: () => synapsesApi.getChargesVsPayments().then(r => r.data.data),    staleTime: 300_000 });
  const { data: chargesFull, isLoading: chargesFullLoad } = useQuery({ queryKey: ['synm-charges-vs-payments-full'], queryFn: () => synapsesApi.getChargesVsPaymentsFull().then(r => r.data.data), staleTime: 300_000, enabled: row2Expanded === 'charges' });

  // ── Active data (expanded vs normal) ─────────────────────────────────────────

  const activePayment = row1Expanded === 'payment'      ? (paymentFull ?? paymentData) : paymentData;
  const activeCharges = row2Expanded === 'charges'      ? (chargesFull ?? chargesData) : chargesData;
  const activeTc      = row3Expanded === 'totalCharges' ? (tcFull      ?? tcData)      : tcData;
  const activeAdj     = row3Expanded === 'adjustments'  ? (adjFull     ?? adjData)     : adjData;

  const donutTotal = (donutData || []).reduce((s, d) => s + (d.total_balance ?? 0), 0);

  // ── Chart heights ─────────────────────────────────────────────────────────────

  const R1_H = row1Expanded ? 340 : 260;
  const R2_H = row2Expanded ? 360 : 220;
  const R3_H = row3Expanded ? 340 : 200;

  // ── Grid class helpers ────────────────────────────────────────────────────────

  const r1MetricsClass = row1Expanded === 'payment' ? 'hidden' : 'col-span-12 lg:col-span-7';
  const r1PayClass     = row1Expanded === 'payment' ? 'col-span-12' : 'col-span-12 lg:col-span-5';

  const r2Col = (key) => {
    if (row2Expanded === key) return 'col-span-12';
    if (row2Expanded)         return 'hidden';
    if (key === 'charges')    return 'col-span-12 lg:col-span-6';
    if (key === 'ccr')        return 'col-span-12 lg:col-span-3';
    return 'col-span-12 lg:col-span-3';
  };

  const r3Col = (key) => {
    if (row3Expanded === key) return 'col-span-12';
    if (row3Expanded)         return 'hidden';
    return 'col-span-12 lg:col-span-4';
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">

      {/* ══ ROW 1 — Revenue Cycle Metrics + Payment History ══ */}
      <div className="grid grid-cols-12 gap-3">

        {/* Revenue Cycle Metrics */}
        <div className={`${r1MetricsClass} transition-all duration-300`}>
          <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm h-full">
            <div className="px-4 py-3 border-b border-slate-50 dark:border-zinc-800/60">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                Revenue Cycle Metrics
              </h3>
            </div>
            <div className="p-3 grid grid-cols-2 gap-3 h-[calc(100%-44px)]">
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
              <QFDKpiCard
                label="Clean Claim Rate"
                value="—"
                subLabel="Not Available"
                color="purple"
                loading={false}
              />
            </div>
          </div>
        </div>

        {/* Recent Months Payment History (DOD) — EXPANDABLE */}
        <div className={`${r1PayClass} transition-all duration-300`}>
          <QFDChartCard
            title={row1Expanded === 'payment' ? 'All Time Payment History (DOD)' : 'Recent Months Payment History (DOD)'}
            onExpand={row1Expanded === null        ? () => setRow1Expanded('payment') : undefined}
            onCompress={row1Expanded === 'payment' ? () => setRow1Expanded(null)     : undefined}
            loading={row1Expanded === 'payment' ? payFullLoad : payLoad}
            height={R1_H}
          >
            {!hasRows(activePayment) ? <NoData /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activePayment} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={fmtShortDate} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtMoney} width={48} />
                <Tooltip content={<ChartTooltip currencyKeys={['payments']} />} />
                <Line
                  type="monotone"
                  dataKey="payments"
                  name="Payments"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
            )}
          </QFDChartCard>
        </div>
      </div>

      {/* ══ ROW 2 — Charges vs Payments | CCR History | AR Pie ══ */}
      <div className="grid grid-cols-12 gap-3">

        {/* Last 12 Months Charges vs Payments (DOE) — EXPANDABLE */}
        <div className={`${r2Col('charges')} transition-all duration-300`}>
          <QFDChartCard
            title={row2Expanded === 'charges' ? 'All Time Charges vs Payments (DOE)' : 'Last 12 Months Charges vs Payments (DOE)'}
            onExpand={row2Expanded === null       ? () => setRow2Expanded('charges') : undefined}
            onCompress={row2Expanded === 'charges' ? () => setRow2Expanded(null)    : undefined}
            loading={row2Expanded === 'charges' ? chargesFullLoad : chargesLoad}
            height={R2_H}
          >
            {!hasRows(activeCharges) ? <NoData /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeCharges} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={fmtShortDate} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtMoney} width={48} />
                <Tooltip content={<ChartTooltip currencyKeys={['total_charges', 'total_payments']} />} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="total_charges"  name="Total Charge"   fill="#1e3a5f" radius={[2,2,0,0]} maxBarSize={22} />
                <Bar dataKey="total_payments" name="Total Payments" fill="#3b82f6" radius={[2,2,0,0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </QFDChartCard>
        </div>

        {/* Clean Claim Rates History — not available for Synapses */}
        <div className={`${r2Col('ccr')} transition-all duration-300`}>
          <QFDChartCard title="Clean Claim Rates History" loading={false} height={R2_H}>
            <div className="flex items-center justify-center h-full text-slate-400 dark:text-zinc-600 text-xs font-medium">
              No CCR data available
            </div>
          </QFDChartCard>
        </div>

        {/* Accounts Receivable (DOE) — pie */}
        <div className={`${r2Col('arPie')} transition-all duration-300`}>
          <QFDChartCard title="Accounts Receivable (DOE)" loading={arPieLoad} height={R2_H}>
            {!hasNonZero(arPieData, 'total_balance') ? <NoData /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={arPieData}
                  dataKey="total_balance"
                  nameKey="bucket"
                  cx="50%" cy="42%"
                  outerRadius="55%"
                  label={false}
                  labelLine={false}
                  minAngle={3}
                >
                  {(arPieData || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [fmtMoney(v), name]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 9, lineHeight: '16px', paddingTop: 2 }}
                  formatter={(value, entry) => {
                    const pct = (() => {
                      const total = (arPieData||[]).reduce((s,r)=>s+(r.total_balance||0),0);
                      const v = entry?.payload?.total_balance || 0;
                      return total > 0 ? ` ${(v/total*100).toFixed(1)}%` : '';
                    })();
                    const v = entry?.payload?.total_balance || 0;
                    return `${value} ${fmtMoney(v)}${pct}`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            )}
          </QFDChartCard>
        </div>
      </div>

      {/* ══ ROW 3 — Total Charges | Total Adjustments | AR% >60 Days ══ */}
      <div className="grid grid-cols-12 gap-3">

        {/* Total Charges (DOE) — step line, purple — EXPANDABLE */}
        <div className={`${r3Col('totalCharges')} transition-all duration-300`}>
          <QFDChartCard
            title="Total Charges (DOE)"
            onExpand={row3Expanded === null             ? () => setRow3Expanded('totalCharges') : undefined}
            onCompress={row3Expanded === 'totalCharges' ? () => setRow3Expanded(null)           : undefined}
            loading={row3Expanded === 'totalCharges' ? tcFullLoad : tcLoad}
            height={R3_H}
          >
            {!hasRows(activeTc) ? <NoData /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeTc} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={fmtShortDate} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtMoney} width={48} />
                <Tooltip content={<ChartTooltip currencyKeys={['total_charges']} />} />
                <Line
                  type="stepAfter"
                  dataKey="total_charges"
                  name="Total Charges"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            )}
          </QFDChartCard>
        </div>

        {/* Total Adjustments (write_off) — area, yellow — EXPANDABLE */}
        <div className={`${r3Col('adjustments')} transition-all duration-300`}>
          <QFDChartCard
            title="Total Adjustments"
            onExpand={row3Expanded === null            ? () => setRow3Expanded('adjustments') : undefined}
            onCompress={row3Expanded === 'adjustments' ? () => setRow3Expanded(null)          : undefined}
            loading={row3Expanded === 'adjustments' ? adjFullLoad : adjLoad}
            height={R3_H}
          >
            {!hasRows(activeAdj) ? <NoData /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeAdj} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="synapsesAdjGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#eab308" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={fmtShortDate} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtMoney} width={48} />
                <Tooltip content={<ChartTooltip currencyKeys={['adjustments']} />} />
                <Area
                  type="monotone"
                  dataKey="adjustments"
                  name="Adjustments"
                  stroke="#ca8a04"
                  strokeWidth={2}
                  fill="url(#synapsesAdjGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </QFDChartCard>
        </div>

        {/* AR % > 60+ Days (DOE) — donut, red */}
        <div className={`${r3Col('donut')} transition-all duration-300`}>
          <QFDChartCard title="AR % > 60+ Days" loading={donutLoad} height={R3_H}>
            {!hasNonZero(donutData, 'total_balance') ? <NoData /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
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
            )}
          </QFDChartCard>
        </div>
      </div>

    </div>
  );
}
