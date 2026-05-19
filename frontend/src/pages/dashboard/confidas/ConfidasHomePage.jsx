/**
 * ConfidasHomePage.jsx — Confidas Orthopedic & Spine PLLC home dashboard.
 *
 * Layout (3-row grid, matches screenshots):
 *  Row 1: Revenue Cycle Metrics (col-7) | Payment History DOD (col-5)
 *  Row 2: Charges vs Payments (col-6)   | CCR History (col-3) | AR Pie (col-3)
 *  Row 3: Total Charges (col-4)         | Total Adjustments (col-4) | AR Donut (col-4)
 *
 * Expand/Compress behaviour mirrors QFD exactly.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,  Line,
  BarChart,   Bar,
  AreaChart,  Area,
  PieChart,   Pie,  Cell,
  ResponsiveContainer,
  XAxis, YAxis, Tooltip, Legend,
  ReferenceLine, Label, LabelList,
} from 'recharts';
import { confidasApi } from '../../../api/confidas.api';
import QFDKpiCard      from '../../../components/qfd/QFDKpiCard';
import QFDChartCard    from '../../../components/qfd/QFDChartCard';

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
  return `$${Number(v).toLocaleString()}`;
};

const fmtPct  = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);
const fmtDays = (v) => (v == null ? '—' : `${Number(v).toFixed(0)}`);

// ── Custom Tooltip ────────────────────────────────────────────────────────────
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

// ── CCR bar label ─────────────────────────────────────────────────────────────
function CcrBarLabel({ x, y, width, height, value }) {
  if (!value || height < 20) return null;
  if (height >= 30) {
    return (
      <text x={x + width / 2} y={y + height / 2 + 4}
        textAnchor="middle" fontSize={8} fill="white" fontWeight="700">
        {`${Number(value).toFixed(0)}%`}
      </text>
    );
  }
  return (
    <text x={x + width / 2} y={y - 4}
      textAnchor="middle" fontSize={8} fill="#dc2626" fontWeight="600">
      {`${Number(value).toFixed(0)}%`}
    </text>
  );
}

// ── Selected filter banner ────────────────────────────────────────────────────
function SelectedDateBanner({ date, onClear }) {
  if (!date) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">
        Highlighted: {fmtShortDate(date)}
      </span>
      <button onClick={onClear} className="text-[10px] text-slate-400 hover:text-red-500">× Clear</button>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ConfidasHomePage({ onNavigate }) {

  // Row expand state
  const [row1Expanded, setRow1Expanded] = useState(null);
  const [row2Expanded, setRow2Expanded] = useState(null);
  const [row3Expanded, setRow3Expanded] = useState(null);

  // Cross-chart filter state
  const [selectedDate,     setSelectedDate]     = useState(null);
  const [selectedArBucket, setSelectedArBucket] = useState(null);

  const toggleDate     = (d) => setSelectedDate(p    => (p === d ? null : d));
  const toggleArBucket = (b) => setSelectedArBucket(p => (p === b ? null : b));

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: kpis,        isLoading: kpiLoad        } = useQuery({ queryKey: ['confidas-kpis'],                      queryFn: () => confidasApi.getKpis().then(r => r.data.data),                staleTime: 300_000 });
  const { data: paymentData, isLoading: payLoad         } = useQuery({ queryKey: ['confidas-payment-history'],           queryFn: () => confidasApi.getPaymentHistory().then(r => r.data.data),       staleTime: 300_000 });
  const { data: paymentFull, isLoading: payFullLoad     } = useQuery({ queryKey: ['confidas-payment-history-full'],      queryFn: () => confidasApi.getPaymentHistoryFull().then(r => r.data.data),   staleTime: 300_000, enabled: row1Expanded === 'payment' });
  const { data: ccrData,     isLoading: ccrLoad         } = useQuery({ queryKey: ['confidas-ccr-history'],               queryFn: () => confidasApi.getCcrHistory().then(r => r.data.data),           staleTime: 300_000 });
  const { data: arPieData,   isLoading: arPieLoad       } = useQuery({ queryKey: ['confidas-ar-pie'],                    queryFn: () => confidasApi.getArPie().then(r => r.data.data),                staleTime: 300_000 });
  const { data: donutData,   isLoading: donutLoad       } = useQuery({ queryKey: ['confidas-ar-donut'],                  queryFn: () => confidasApi.getArDonut().then(r => r.data.data),              staleTime: 300_000 });
  const { data: tcData,      isLoading: tcLoad          } = useQuery({ queryKey: ['confidas-total-charges'],             queryFn: () => confidasApi.getTotalCharges().then(r => r.data.data),         staleTime: 300_000 });
  const { data: tcFull,      isLoading: tcFullLoad      } = useQuery({ queryKey: ['confidas-total-charges-full'],        queryFn: () => confidasApi.getTotalChargesFull().then(r => r.data.data),     staleTime: 300_000, enabled: row3Expanded === 'totalCharges' });
  const { data: adjData,     isLoading: adjLoad         } = useQuery({ queryKey: ['confidas-adjustments'],               queryFn: () => confidasApi.getAdjustments().then(r => r.data.data),          staleTime: 300_000 });
  const { data: adjFull,     isLoading: adjFullLoad     } = useQuery({ queryKey: ['confidas-adjustments-full'],          queryFn: () => confidasApi.getAdjustmentsFull().then(r => r.data.data),      staleTime: 300_000, enabled: row3Expanded === 'adjustments' });
  const { data: chargesData, isLoading: chargesLoad     } = useQuery({ queryKey: ['confidas-charges-vs-payments'],       queryFn: () => confidasApi.getChargesVsPayments().then(r => r.data.data),    staleTime: 300_000 });
  const { data: chargesFull, isLoading: chargesFullLoad } = useQuery({ queryKey: ['confidas-charges-vs-payments-full'],  queryFn: () => confidasApi.getChargesVsPaymentsFull().then(r => r.data.data),staleTime: 300_000, enabled: row2Expanded === 'charges' });

  // ── Active datasets ───────────────────────────────────────────────────────
  const activePayment = row1Expanded === 'payment'      ? (paymentFull  ?? paymentData)  : paymentData;
  const activeCharges = row2Expanded === 'charges'      ? (chargesFull  ?? chargesData)  : chargesData;
  const activeTc      = row3Expanded === 'totalCharges' ? (tcFull       ?? tcData)       : tcData;
  const activeAdj     = row3Expanded === 'adjustments'  ? (adjFull      ?? adjData)      : adjData;

  const donutTotal = (donutData || []).reduce((s, d) => s + (d.total_balance ?? 0), 0);
  const over60Entry = (donutData || []).find(d => d.bucket !== '30-60 & Current') ?? null;
  const over60Pct  = donutTotal > 0 && over60Entry
    ? ((over60Entry.total_balance / donutTotal) * 100).toFixed(1)
    : null;

  // ── Heights ───────────────────────────────────────────────────────────────
  const R1_H = row1Expanded ? 420 : 300;
  const R2_H = row2Expanded ? 400 : 290;
  const R3_H = row3Expanded ? 400 : 270;

  // ── Grid classes ──────────────────────────────────────────────────────────
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

  return (
    <div className="flex flex-col gap-3">

      {/* Cross-filter status bar */}
      {(selectedDate || selectedArBucket) && (
        <div className="flex items-center gap-4 px-2 py-1.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-[10px]">
          <SelectedDateBanner date={selectedDate} onClear={() => setSelectedDate(null)} />
          {selectedArBucket && (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-semibold text-amber-600 dark:text-amber-400">AR Bucket: {selectedArBucket}</span>
              <button onClick={() => setSelectedArBucket(null)} className="text-slate-400 hover:text-red-500">× Clear</button>
            </div>
          )}
          <button
            onClick={() => { setSelectedDate(null); setSelectedArBucket(null); }}
            className="ml-auto font-semibold text-red-500 hover:text-red-700"
          >
            × Clear all
          </button>
        </div>
      )}

      {/* ═══ ROW 1 — Revenue Cycle Metrics + Payment History ═══ */}
      <div className="grid grid-cols-12 gap-2 md:gap-3">

        {/* Revenue Cycle Metrics */}
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
                onClick={() => onNavigate?.('ar')}
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
                value={kpis?.ccr != null ? fmtPct(kpis.ccr) : '—'}
                subLabel="Last Month"
                color="purple"
                loading={kpiLoad}
                onClick={() => onNavigate?.('ccr')}
              />
            </div>
          </div>
        </div>

        {/* Payment History — EXPANDABLE */}
        <div className={`${r1PayClass} transition-all duration-300`}>
          <QFDChartCard
            title={row1Expanded === 'payment'
              ? 'All Time Payment History (DOD)'
              : 'Last 12 Months Payment History (DOD)'}
            onExpand={row1Expanded === null        ? () => setRow1Expanded('payment') : undefined}
            onCompress={row1Expanded === 'payment' ? () => setRow1Expanded(null)      : undefined}
            loading={row1Expanded === 'payment' ? payFullLoad : payLoad}
            height={R1_H}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={activePayment || []}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                style={{ cursor: 'pointer' }}
                onClick={(state) => {
                  if (state?.activePayload?.[0]?.payload?.date)
                    toggleDate(state.activePayload[0].payload.date);
                }}
              >
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={fmtShortDate} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtMoney} width={48} />
                <Tooltip content={<ChartTooltip currencyKeys={['payments']} />} />
                <Line
                  type="monotone"
                  dataKey="payments"
                  name="Payments"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={({ cx, cy, payload }) => {
                    const hi = selectedDate && payload?.date === selectedDate;
                    return (
                      <circle key={payload?.date} cx={cx} cy={cy}
                        r={hi ? 5 : selectedDate ? 2 : 3}
                        fill={hi ? '#b91c1c' : '#dc2626'}
                        opacity={selectedDate && !hi ? 0.4 : 1}
                        stroke={hi ? '#fff' : 'none'}
                        strokeWidth={hi ? 2 : 0}
                      />
                    );
                  }}
                  activeDot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </QFDChartCard>
        </div>

      </div>{/* end Row 1 */}

      {/* ═══ ROW 2 — Charges vs Payments | CCR History | AR Receivable ═══ */}
      <div className="grid grid-cols-12 gap-2 md:gap-3">

        {/* Charges vs Payments — EXPANDABLE */}
        <div className={`${r2Col('charges')} transition-all duration-300`}>
          <QFDChartCard
            title={row2Expanded === 'charges'
              ? 'All Time Charges vs Payments (DOE)'
              : 'Last 12 Months Charges vs Payments (DOE)'}
            onExpand={row2Expanded === null        ? () => setRow2Expanded('charges') : undefined}
            onCompress={row2Expanded === 'charges' ? () => setRow2Expanded(null)      : undefined}
            loading={row2Expanded === 'charges' ? chargesFullLoad : chargesLoad}
            height={R2_H}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activeCharges || []}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                style={{ cursor: 'pointer' }}
                onClick={(state) => { if (state?.activeLabel) toggleDate(state.activeLabel); }}
              >
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={fmtShortDate} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtMoney} width={48} />
                <Tooltip content={<ChartTooltip currencyKeys={['total_charges', 'total_payments']} />} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="total_charges"  name="Total Charge"   fill="#4ade80" radius={[2,2,0,0]} maxBarSize={22}>
                  {(activeCharges || []).map((entry, i) => (
                    <Cell key={i} fill="#4ade80" opacity={selectedDate && entry.date !== selectedDate ? 0.35 : 1} />
                  ))}
                </Bar>
                <Bar dataKey="total_payments" name="Total Payments" fill="#3b82f6" radius={[2,2,0,0]} maxBarSize={22}>
                  {(activeCharges || []).map((entry, i) => (
                    <Cell key={i} fill="#3b82f6" opacity={selectedDate && entry.date !== selectedDate ? 0.35 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </QFDChartCard>
        </div>

        {/* Clean Claim Rate History */}
        <div className={`${r2Col('ccr')} transition-all duration-300`}>
          <QFDChartCard
            title="Clean Claim Rates History"
            loading={ccrLoad}
            height={R2_H}
          >
            {(!ccrData || ccrData.length === 0) ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-slate-400 dark:text-zinc-500">Data coming soon</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ccrData}
                  margin={{ top: 14, right: 8, left: 0, bottom: 0 }}
                  style={{ cursor: 'pointer' }}
                  onClick={(state) => { if (state?.activeLabel) toggleDate(state.activeLabel); }}
                >
                  <XAxis dataKey="month" tick={{ fontSize: 8 }} tickFormatter={fmtShortDate} />
                  <YAxis tick={{ fontSize: 8 }} tickFormatter={v => `${v}%`} domain={[0, 100]} width={30} />
                  <Tooltip formatter={v => `${Number(v).toFixed(1)}%`} labelFormatter={fmtShortDate} />
                  <ReferenceLine
                    y={95}
                    stroke="#dc2626"
                    strokeDasharray="4 3"
                    label={{ value: 'CCR Goal 95%', position: 'insideTopRight', fontSize: 8, fill: '#dc2626' }}
                  />
                  <Bar dataKey="adjusted" name="CCR" radius={[2,2,0,0]} maxBarSize={20}>
                    {(ccrData || []).map((entry, i) => (
                      <Cell key={i} fill="#dc2626" opacity={selectedDate && entry.month !== selectedDate ? 0.35 : 1} />
                    ))}
                    <LabelList content={<CcrBarLabel />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </QFDChartCard>
        </div>

        {/* Accounts Receivable (DOE) — pie */}
        <div className={`${r2Col('arPie')} transition-all duration-300`}>
          <QFDChartCard
            title="Accounts Receivable (DOE)"
            loading={arPieLoad}
            height={R2_H}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={arPieData || []}
                  dataKey="total_balance"
                  nameKey="bucket"
                  cx="50%" cy="45%"
                  outerRadius="52%"
                  onClick={(d) => toggleArBucket(d.bucket)}
                  style={{ cursor: 'pointer' }}
                  label={({ cx, cy, midAngle, outerRadius, name, percent, value }) => {
                    if (!value || percent < 0.04) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = outerRadius + 14;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text x={x} y={y} fill="#6b7280" fontSize={7} fontWeight={600}
                        textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                        {`${name} ${(percent * 100).toFixed(2)}%`}
                      </text>
                    );
                  }}
                  labelLine={{ stroke: '#d1d5db', strokeWidth: 0.8 }}
                  minAngle={3}
                >
                  {(arPieData || []).map((entry, i) => (
                    <Cell key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                      opacity={selectedArBucket && entry.bucket !== selectedArBucket ? 0.35 : 1}
                      stroke={selectedArBucket === entry.bucket ? '#fff' : 'none'}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={v => fmtMoney(v)} />
                <Legend
                  wrapperStyle={{ fontSize: 8, lineHeight: '1.4' }}
                  formatter={(value, entry) => `${value} ${fmtMoney(entry?.payload?.total_balance ?? 0)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </QFDChartCard>
        </div>

      </div>{/* end Row 2 */}

      {/* ═══ ROW 3 — Total Charges | Total Adjustments | AR% >60 Days ═══ */}
      <div className="grid grid-cols-12 gap-2 md:gap-3">

        {/* Total Charges (DOE) — EXPANDABLE step line */}
        <div className={`${r3Col('totalCharges')} transition-all duration-300`}>
          <QFDChartCard
            title={row3Expanded === 'totalCharges' ? 'All Time Total Charges (DOE)' : 'Total Charges (DOE)'}
            onExpand={row3Expanded === null             ? () => setRow3Expanded('totalCharges') : undefined}
            onCompress={row3Expanded === 'totalCharges' ? () => setRow3Expanded(null)           : undefined}
            loading={row3Expanded === 'totalCharges' ? tcFullLoad : tcLoad}
            height={R3_H}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={activeTc || []}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                style={{ cursor: 'pointer' }}
                onClick={(state) => { if (state?.activeLabel) toggleDate(state.activeLabel); }}
              >
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={fmtShortDate} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtMoney} width={48} />
                <Tooltip content={<ChartTooltip currencyKeys={['total_charges']} />} />
                <Line
                  type="stepAfter"
                  dataKey="total_charges"
                  name="Total Charges"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={({ cx, cy, payload }) => {
                    const hi = selectedDate && payload?.date === selectedDate;
                    return (
                      <circle key={payload?.date} cx={cx} cy={cy}
                        r={hi ? 5 : 3}
                        fill="#7c3aed"
                        opacity={selectedDate && !hi ? 0.35 : 1}
                        stroke={hi ? '#fff' : 'none'}
                        strokeWidth={hi ? 2 : 0}
                      />
                    );
                  }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </QFDChartCard>
        </div>

        {/* Total Adjustments — EXPANDABLE area */}
        <div className={`${r3Col('adjustments')} transition-all duration-300`}>
          <QFDChartCard
            title="Total Adjustments"
            onExpand={row3Expanded === null            ? () => setRow3Expanded('adjustments') : undefined}
            onCompress={row3Expanded === 'adjustments' ? () => setRow3Expanded(null)          : undefined}
            loading={row3Expanded === 'adjustments' ? adjFullLoad : adjLoad}
            height={R3_H}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activeAdj || []}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                style={{ cursor: 'pointer' }}
                onClick={(state) => { if (state?.activeLabel) toggleDate(state.activeLabel); }}
              >
                <defs>
                  <linearGradient id="confAdjGrad" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#confAdjGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </QFDChartCard>
        </div>

        {/* AR % > 60+ Days — donut */}
        <div className={`${r3Col('donut')} transition-all duration-300`}>
          <QFDChartCard
            title="AR % > 60+ Days"
            loading={donutLoad}
            height={R3_H}
          >
            {/* Wrapper needed so we can overlay the center label absolutely */}
            <div className="relative w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData || []}
                    dataKey="total_balance"
                    nameKey="bucket"
                    cx="50%" cy="46%"
                    innerRadius="36%"
                    outerRadius="58%"
                    startAngle={90}
                    endAngle={-270}
                    onClick={(d) => toggleArBucket(d.bucket)}
                    style={{ cursor: 'pointer' }}
                  >
                    {(donutData || []).map((entry, i) => (
                      <Cell key={i}
                        fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                        opacity={selectedArBucket && entry.bucket !== selectedArBucket ? 0.35 : 1}
                        stroke={selectedArBucket === entry.bucket ? '#fff' : 'none'}
                        strokeWidth={2}
                      />
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
              {/* Center label — absolute overlay, centred in the donut hole */}
              {donutTotal > 0 && (() => {
                const otherEntry = (donutData || []).find(d => d.bucket === 'Other');
                const pct = otherEntry
                  ? ((otherEntry.total_balance / donutTotal) * 100).toFixed(1)
                  : '0.0';
                return (
                  <div
                    className="absolute pointer-events-none"
                    style={{ top: '46%', left: '50%', transform: 'translate(-50%, -50%)' }}
                  >
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      {pct}%
                    </span>
                  </div>
                );
              })()}
            </div>
          </QFDChartCard>
        </div>

      </div>{/* end Row 3 */}

    </div>
  );
}
