/**
 * ConfidasProductionsPage.jsx — Productions tab.
 *
 * Views toggled by [DOE] [DOS] [DOD] buttons (top-right):
 *   DOS (default) — grouped bar: Total Charges (purple) + Payments (amber/orange)
 *                   More → Reimbursement Analysis (DOS) pivot table
 *   DOE           — single blue bar: Total Charges by DOE
 *                   More → Reimbursement Analysis (DOE) pivot table
 *   DOD           — Adjustment area + Payments line + Payment Method h-bar
 *                   More → DOD Reimbursement pivot table
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, Cell,
  AreaChart, Area,
  LineChart, Line,
  ResponsiveContainer,
  XAxis, YAxis, Tooltip, LabelList,
} from 'recharts';
import { confidasApi } from '../../../api/confidas.api';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};
const fmtDollar = (v) => `$${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const fmtCount  = (v) => Number(v || 0).toLocaleString('en-US');
const fmtPct1   = (v) => `${Number(v || 0).toFixed(1)}%`;
const fmtPct0   = (v) => `${Number(v || 0).toFixed(0)}%`;

const fmtShortDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d)
    : dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const fmtLongDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d)
    : dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// ── Reimbursement row definitions ─────────────────────────────────────────────
const REIMB_ROWS = [
  { key: 'patient_count',          label: 'Patient Count',                  fmt: fmtCount,  indent: 0 },
  { key: 'visit_count',            label: 'Visit Count',                    fmt: fmtCount,  indent: 0 },
  { key: 'total_charge',           label: 'Total Charge',                   fmt: fmtMoney,  indent: 0 },
  { key: 'total_payments',         label: 'Total Payments',                 fmt: fmtMoney,  indent: 0 },
  { key: 'insurance_payments',     label: 'Insurance Payment',              fmt: fmtMoney,  indent: 1 },
  { key: 'patient_payment',        label: 'Patient Payment',                fmt: fmtMoney,  indent: 1 },
  { key: 'total_adjustments',      label: 'Total Adjustments',              fmt: fmtMoney,  indent: 0 },
  { key: 'insurance_adjustments',  label: 'Insurance Adjustments',          fmt: fmtMoney,  indent: 1 },
  { key: 'patient_adjustments',    label: 'Patient Adjustments',            fmt: fmtMoney,  indent: 1 },
  { key: 'total_balance',          label: 'Total Balance',                  fmt: fmtMoney,  indent: 0 },
  { key: 'insurance_balance',      label: 'Insurance Balance',              fmt: fmtMoney,  indent: 1 },
  { key: 'patient_balance',        label: 'Patient Balance',                fmt: fmtMoney,  indent: 1 },
  { key: 'avg_chrg_per_visit',     label: 'AVG CHRG per Visit',             fmt: fmtDollar, indent: 0 },
  { key: 'avg_pmt_per_visit',      label: 'AVG PMT per Visit',              fmt: fmtDollar, indent: 0 },
  { key: 'gcr_pct',                label: 'GCR %',                          fmt: fmtPct1,   indent: 0 },
  { key: 'gcr_without_pt_balance', label: 'GCR without PT Balance',         fmt: fmtPct0,   indent: 0 },
  { key: 'gcr_fully_paid',         label: 'GCR based on Fully Paid Claims', fmt: fmtPct0,   indent: 0 },
  { key: 'ncr_pct',                label: 'NCR%',                           fmt: fmtPct0,   indent: 0 },
];

const DOD_REIMB_ROWS = [
  { key: 'visit_count',       label: 'Visit Count',       fmt: fmtCount, indent: 0 },
  { key: 'procedure_count',   label: 'Procedure Count',   fmt: fmtCount, indent: 0 },
  { key: 'total_charge',      label: 'Total Charges',     fmt: fmtMoney, indent: 0 },
  { key: 'total_payments',    label: 'Total Payments',    fmt: fmtMoney, indent: 0 },
  { key: 'total_adjustments', label: 'Total Adjustments', fmt: fmtMoney, indent: 0 },
];

// ── Shared tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-zinc-200 mb-1">{fmtShortDate(label)}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-medium">
          {p.name}: {fmtMoney(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── View toggle button ────────────────────────────────────────────────────────
function ViewBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
        active
          ? 'bg-red-700 text-white shadow ring-2 ring-white/30'
          : 'bg-[#991b1b] text-white hover:bg-red-800'
      }`}
    >
      {children}
    </button>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function ChartSkeleton({ height = 300 }) {
  return <div style={{ height }} className="animate-pulse rounded-xl bg-slate-100 dark:bg-zinc-800 w-full" />;
}

// ── DOS inner bar label (rotated) ─────────────────────────────────────────────
function makeDosInnerLabel(chartData) {
  return function DosInnerLabel({ x, y, width, height, index }) {
    const row = chartData?.[index];
    if (!row || height < 50 || width < 14) return null;
    const cx = x + width / 2;
    const cy = y + height / 2;
    return (
      <g transform={`rotate(-90, ${cx}, ${cy})`}>
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize={9} fontWeight="700" fill="white">
          {`Payments:${fmtMoney(row.total_payments)}`}
        </text>
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={9} fontWeight="700" fill="#FDE68A">
          {`GCR % DOS:${row.gcr_pct}%`}
        </text>
      </g>
    );
  };
}

// ── Other chart labels ────────────────────────────────────────────────────────
const TopLabel = ({ x, y, value }) => {
  if (!value) return null;
  return (
    <text x={x} y={y - 5} textAnchor="middle" fontSize={10} fontWeight="700" fill="#312e81">
      {fmtMoney(value)}
    </text>
  );
};

const LineLabel = ({ x, y, value, index }) => {
  if (value == null) return null;
  return (
    <text x={x} y={y + (index % 2 === 0 ? -10 : 14)} textAnchor="middle" fontSize={10} fontWeight="700" fill="#374151">
      {fmtMoney(value)}
    </text>
  );
};

const AdjLabel = ({ x, y, value }) => {
  if (!value) return null;
  return (
    <text x={x} y={y - 5} textAnchor="middle" fontSize={10} fontWeight="700" fill="#92400E">
      {fmtMoney(value)}
    </text>
  );
};

const HBarLabel = ({ x, y, width, height, value }) => {
  if (!value) return null;
  return (
    <text x={x + width + 6} y={y + height / 2 + 4} fontSize={10} fontWeight="700" fill="#374151">
      {fmtMoney(value)}
    </text>
  );
};

// ── Reimbursement pivot table ─────────────────────────────────────────────────
function ReimbursementTable({ data, loading, activeView }) {
  const rowDefs = activeView === 'dod' ? DOD_REIMB_ROWS : REIMB_ROWS;
  const dateFmt = activeView === 'dod' ? fmtLongDate : fmtShortDate;

  if (loading) return <ChartSkeleton height={320} />;
  if (!data?.length) return <p className="text-sm text-slate-400 text-center py-10">No data available.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900">
            <th className="sticky left-0 z-10 bg-slate-50 dark:bg-zinc-900 text-left px-4 py-2.5 font-semibold text-slate-600 dark:text-zinc-300 min-w-[210px]">
              Metric
            </th>
            {data.map((row, i) => (
              <th key={i} className="px-3 py-2.5 text-right font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap min-w-[90px]">
                {dateFmt(row.month)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowDefs.map((def, ri) => (
            <tr key={def.key} className={ri % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-slate-50/60 dark:bg-zinc-900/40'}>
              <td className={`sticky left-0 z-10 px-4 py-2.5 font-semibold text-slate-700 dark:text-zinc-200 whitespace-nowrap
                ${def.indent === 1 ? 'pl-8 text-slate-500 dark:text-zinc-400 font-normal' : ''}
                ${ri % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-slate-50/60 dark:bg-zinc-900/40'}`}>
                {def.label}
              </td>
              {data.map((row, ci) => (
                <td key={ci} className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-zinc-200">
                  {def.fmt(row[def.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ConfidasProductionsPage() {
  const [view,     setView]     = useState('dos'); // 'dos' | 'doe' | 'dod'
  const [showMore, setShowMore] = useState(false);

  const handleView = (v) => { setView(v); setShowMore(false); };

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: dosChart,  isLoading: dosLoad    } = useQuery({ queryKey: ['conf-prod-dos-chart'],    queryFn: () => confidasApi.getProductionDosChart().then(r => r.data.data),          staleTime: 300_000 });
  const { data: dosTbl,    isLoading: dosTblLoad  } = useQuery({ queryKey: ['conf-prod-dos-reimb'],    queryFn: () => confidasApi.getProductionDosReimbursement().then(r => r.data.data),   staleTime: 300_000, enabled: view === 'dos' && showMore });
  const { data: doeChart,  isLoading: doeLoad    } = useQuery({ queryKey: ['conf-prod-doe-chart'],    queryFn: () => confidasApi.getProductionDoeChart().then(r => r.data.data),          staleTime: 300_000 });
  const { data: doeTbl,    isLoading: doeTblLoad  } = useQuery({ queryKey: ['conf-prod-doe-reimb'],    queryFn: () => confidasApi.getProductionDoeReimbursement().then(r => r.data.data),   staleTime: 300_000, enabled: view === 'doe' && showMore });
  const { data: adjData,   isLoading: adjLoad    } = useQuery({ queryKey: ['confidas-adjustments'],   queryFn: () => confidasApi.getAdjustments().then(r => r.data.data),                 staleTime: 300_000 });
  const { data: pmtData,   isLoading: pmtLoad    } = useQuery({ queryKey: ['confidas-payment-posted'],queryFn: () => confidasApi.getPaymentHistory().then(r => r.data.data),              staleTime: 300_000 });
  const { data: methodData,isLoading: methodLoad } = useQuery({ queryKey: ['conf-prod-dod-method'],   queryFn: () => confidasApi.getProductionDodPaymentMethod().then(r => r.data.data),  staleTime: 300_000 });
  const { data: dodTbl,    isLoading: dodTblLoad  } = useQuery({ queryKey: ['conf-prod-dod-reimb'],    queryFn: () => confidasApi.getProductionDodReimbursement().then(r => r.data.data),   staleTime: 300_000, enabled: view === 'dod' && showMore });

  const DosInnerLabel = makeDosInnerLabel(dosChart);

  const viewTitle = {
    dos: showMore ? 'Reimbursement Analysis (DOS)' : 'Last 12 Months Total Charges vs Payments (DOS)',
    doe: showMore ? 'Reimbursement Analysis (DOE)' : 'Last 12 Months Total Charges (DOE)',
    dod: showMore ? 'Reimbursement (DOD)' : 'Last 12 Months Adjustment History',
  }[view];

  return (
    <div className="flex flex-col gap-0">

      {/* Card wrapper */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-50 dark:border-zinc-800/60 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100">Productions</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{viewTitle}</p>
          </div>
          {/* DOE / DOS / DOD toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ViewBtn active={view === 'doe'} onClick={() => handleView('doe')}>DOE</ViewBtn>
            <ViewBtn active={view === 'dos'} onClick={() => handleView('dos')}>DOS</ViewBtn>
            <ViewBtn active={view === 'dod'} onClick={() => handleView('dod')}>DOD</ViewBtn>
          </div>
        </div>

        {/* ══ DOS — grouped bar chart ═══════════════════════════════════════ */}
        {view === 'dos' && !showMore && (
          <>
            <div className="px-4 pb-2" style={{ height: 520 }}>
              {dosLoad ? <ChartSkeleton height={460} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dosChart || []}
                    margin={{ top: 30, right: 20, left: 10, bottom: 30 }}
                    barGap={2}
                  >
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtShortDate}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false} tickLine={false}
                      label={{ value: 'Month of DOS', position: 'insideBottom', offset: -18, fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      tickFormatter={fmtMoney}
                      width={58}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false} tickLine={false}
                      label={{ value: 'Total Charge & Payments', angle: -90, position: 'insideLeft', offset: 12, fontSize: 10, fill: '#64748b' }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    {/* Charges bar (purple) */}
                    <Bar dataKey="total_charges" name="Total Charges" fill="#4C1D95" radius={[3,3,0,0]} maxBarSize={60}>
                      <LabelList dataKey="total_charges" content={TopLabel} />
                      <LabelList dataKey="total_charges" content={DosInnerLabel} />
                    </Bar>
                    {/* Payments bar (amber/orange) */}
                    <Bar dataKey="total_payments" name="Total Payments" fill="#F59E0B" radius={[3,3,0,0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button onClick={() => setShowMore(true)}
                className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors">
                More
              </button>
            </div>
          </>
        )}

        {/* ══ DOS — Reimbursement table ═════════════════════════════════════ */}
        {view === 'dos' && showMore && (
          <>
            <div className="px-4 py-4">
              <ReimbursementTable data={dosTbl} loading={dosTblLoad} activeView="dos" />
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button onClick={() => setShowMore(false)}
                className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors">
                Go Back
              </button>
            </div>
          </>
        )}

        {/* ══ DOE — single blue bar chart ══════════════════════════════════ */}
        {view === 'doe' && !showMore && (
          <>
            <div className="px-4 pb-2" style={{ height: 520 }}>
              {doeLoad ? <ChartSkeleton height={460} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={doeChart || []} margin={{ top: 30, right: 20, left: 10, bottom: 10 }}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtShortDate}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tickFormatter={fmtMoney}
                      width={58}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total_charges" name="Total Charges" radius={[3,3,0,0]} maxBarSize={80}>
                      {(doeChart || []).map((entry, i) => {
                        const maxVal = Math.max(...(doeChart || []).map(d => d.total_charges || 0), 1);
                        const ratio  = (entry?.total_charges || 0) / maxVal;
                        // Blue gradient: darker for taller bars, lighter for shorter ones
                        const fill   = ratio >= 0.8 ? '#1D4ED8' : ratio >= 0.5 ? '#2563EB' : '#3B82F6';
                        return <Cell key={`doe-cell-${i}`} fill={fill} />;
                      })}
                      <LabelList
                        dataKey="total_charges"
                        content={({ x, y, width, height, value }) => {
                          if (!value || height < 36) return null;
                          const cx = x + width / 2;
                          const cy = y + height / 2;
                          return (
                            <text
                              key={`doe-${x}`}
                              transform={`rotate(-90, ${cx}, ${cy})`}
                              x={cx} y={cy}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={10} fontWeight="700" fill="white"
                            >
                              {fmtMoney(value)}
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button onClick={() => setShowMore(true)}
                className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors">
                More
              </button>
            </div>
          </>
        )}

        {/* ══ DOE — Reimbursement table ═════════════════════════════════════ */}
        {view === 'doe' && showMore && (
          <>
            <div className="px-4 py-4">
              <ReimbursementTable data={doeTbl} loading={doeTblLoad} activeView="doe" />
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button onClick={() => setShowMore(false)}
                className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors">
                Go Back
              </button>
            </div>
          </>
        )}

        {/* ══ DOD — 3 charts ════════════════════════════════════════════════ */}
        {view === 'dod' && !showMore && (
          <>
            {/* Adjustment History area chart */}
            <div className="px-4 pt-4 pb-0">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
                Last 12 Months Adjustment History
              </p>
              <div style={{ height: 280 }}>
                {adjLoad ? <ChartSkeleton height={280} /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={adjData || []} margin={{ top: 28, right: 20, left: 10, bottom: 10 }}>
                      <defs>
                        <linearGradient id="prodAdjGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#eab308" stopOpacity={0.7} />
                          <stop offset="95%" stopColor="#eab308" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickFormatter={fmtShortDate}
                        tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtMoney} width={58}
                        tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="adjustments" name="Adjustments"
                        stroke="#D97706" strokeWidth={2} fill="url(#prodAdjGrad)" dot={false}>
                        <LabelList dataKey="adjustments" content={AdjLabel} />
                      </Area>
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Payment History + Payment Method — 2-col grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 pb-4 mt-4">

              {/* Payments History */}
              <div>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
                  Last 12 Months Payments History
                </p>
                <div style={{ height: 260 }}>
                  {pmtLoad ? <ChartSkeleton height={320} /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pmtData || []} margin={{ top: 28, right: 20, left: 10, bottom: 10 }}>
                        <XAxis dataKey="date" tickFormatter={fmtShortDate}
                          tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={fmtMoney} width={58}
                          tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line type="monotone" dataKey="payments" name="Payments"
                          stroke="#EF4444" strokeWidth={2.5}
                          dot={{ r: 3, fill: '#EF4444', strokeWidth: 0 }}
                          activeDot={{ r: 5 }}>
                          <LabelList dataKey="payments" content={LineLabel} />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Payment by Method */}
              <div>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
                  Last 12 Months Payments by Payment Method
                </p>
                <div style={{ height: 260 }}>
                  {methodLoad ? <ChartSkeleton height={320} /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={methodData || []}
                        layout="vertical"
                        margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
                      >
                        <XAxis type="number" tickFormatter={fmtMoney}
                          tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="payment_method" type="category" width={100}
                          tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                          axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="payments" name="Payments" fill="#7C3AED" radius={[0,3,3,0]}>
                          <LabelList dataKey="payments" content={HBarLabel} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>

            <div className="flex justify-end px-4 pb-4">
              <button onClick={() => setShowMore(true)}
                className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors">
                More
              </button>
            </div>
          </>
        )}

        {/* ══ DOD — Reimbursement table ═════════════════════════════════════ */}
        {view === 'dod' && showMore && (
          <>
            <div className="px-4 py-4">
              <ReimbursementTable data={dodTbl} loading={dodTblLoad} activeView="dod" />
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button onClick={() => setShowMore(false)}
                className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors">
                Go Back
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
