/**
 * CompleteNeuroProductionPage.jsx — Productions tab for Complete Neuro Dashboard.
 *
 * Views (toggled by DOE / DOS / DOD buttons):
 *   DOS — Grouped bar: Total Charges (purple) vs Collected (amber) + GCR% labels
 *   DOE — Single blue bar: Total Charges by billing_date
 *   DOD — Area (Adjustments) + Line (Payments) + H-Bar (by Payer) + H-Bar (by Biller)
 *
 * "More"    → pivot table (DOS/DOE: 9-row reimbursement; DOD: 5-row)
 * "Go Back" → returns to chart view
 *
 * Data source: iq_completeneuro schema
 *   DOS/DOE → completeneuro_full_billing
 *   DOD     → completeneuro_full_deposit + completeneuro_full_billing
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar,
  AreaChart, Area,
  LineChart, Line,
  ResponsiveContainer,
  XAxis, YAxis, Tooltip, LabelList,
} from 'recharts';
import { completeneuroApi } from '../../../api/completeneuro.api';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtDollar = (v) =>
  `$${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const fmtCount  = (v) => Number(v || 0).toLocaleString('en-US');
const fmtPct1   = (v) => `${Number(v || 0).toFixed(1)}%`;

const fmtShortDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt) ? String(d)
    : dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const fmtLongDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt) ? String(d)
    : dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// ── Reimbursement row definitions ─────────────────────────────────────────────

const REIMB_ROWS = [
  { key: 'claim_count',       label: 'Claim Count',        fmt: fmtCount,  indent: 0 },
  { key: 'total_charged',     label: 'Total Charges',      fmt: fmtMoney,  indent: 0 },
  { key: 'total_collected',   label: 'Total Payments',     fmt: fmtMoney,  indent: 0 },
  { key: 'total_writeoff',    label: 'Total Write-offs',   fmt: fmtMoney,  indent: 0 },
  { key: 'total_balance',     label: 'Total Balance',      fmt: fmtMoney,  indent: 0 },
  { key: 'avg_chrg_per_visit',label: 'AVG CHRG per Claim', fmt: fmtDollar, indent: 0 },
  { key: 'avg_pmt_per_visit', label: 'AVG PMT per Claim',  fmt: fmtDollar, indent: 0 },
  { key: 'gcr_pct',           label: 'GCR %',              fmt: fmtPct1,   indent: 0 },
  { key: 'ncr_pct',           label: 'NCR %',              fmt: fmtPct1,   indent: 0 },
];

const DOD_REIMB_ROWS = [
  { key: 'claim_count',   label: 'Claim Count',       fmt: fmtCount, indent: 0 },
  { key: 'total_charged', label: 'Total Charges',     fmt: fmtMoney, indent: 0 },
  { key: 'total_payments',label: 'Total Payments',    fmt: fmtMoney, indent: 0 },
  { key: 'total_writeoff',label: 'Total Adjustments', fmt: fmtMoney, indent: 0 },
];

// ── Shared tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-zinc-200 mb-1">{fmtShortDate(label)}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {fmtMoney(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Toggle view button ────────────────────────────────────────────────────────

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

// ── DOS bar labels ────────────────────────────────────────────────────────────

const DosTopLabel = ({ x, y, value }) => {
  if (!value) return null;
  return (
    <text x={x} y={y - 4} textAnchor="middle" fontSize={10} fontWeight="700" fill="#312e81">
      {fmtMoney(value)}
    </text>
  );
};

function makeDosInnerLabel(chartData) {
  return function DosInnerLabel({ x, y, width, height, index }) {
    const row = chartData?.[index];
    if (!row || height < 50 || width < 14) return null;
    const cx = x + width / 2;
    const cy = y + height / 2;
    return (
      <g transform={`rotate(-90, ${cx}, ${cy})`}>
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize={9} fontWeight="700" fill="white">
          {`Collected:${fmtMoney(row.total_payments)}`}
        </text>
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={9} fontWeight="700" fill="#FDE68A">
          {`GCR%:${row.gcr_pct}%`}
        </text>
      </g>
    );
  };
}

// ── Line / area / h-bar labels ────────────────────────────────────────────────

const LineLabel = ({ x, y, value, index }) => {
  if (value == null) return null;
  const dy = index % 2 === 0 ? -10 : 14;
  return (
    <text x={x} y={y + dy} textAnchor="middle" fontSize={10} fontWeight="700" fill="#374151">
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
  const rowDefs      = activeView === 'dod' ? DOD_REIMB_ROWS : REIMB_ROWS;
  const dateFmt      = activeView === 'dod' ? fmtLongDate : fmtShortDate;

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-zinc-800" />;
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
              <th key={i} className="px-3 py-2.5 text-center font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap min-w-[100px]">
                {dateFmt(row.month)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowDefs.map((def, ri) => (
            <tr
              key={def.key}
              className={`border-b border-slate-100 dark:border-zinc-800 ${
                ri % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-slate-50/50 dark:bg-zinc-900/40'
              }`}
            >
              <td
                className="sticky left-0 z-10 py-2 font-medium text-slate-700 dark:text-zinc-300 bg-inherit whitespace-nowrap"
                style={{ paddingLeft: `${16 + (def.indent || 0) * 18}px` }}
              >
                {def.label}
              </td>
              {data.map((row, ci) => (
                <td key={ci} className="px-3 py-2 text-center text-slate-600 dark:text-zinc-400 tabular-nums">
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

// ── Chart skeleton ────────────────────────────────────────────────────────────

function ChartSkeleton({ height = 380 }) {
  return <div className="animate-pulse bg-slate-50 dark:bg-zinc-900 rounded-xl" style={{ height }} />;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CompleteNeuroProductionPage() {
  const [view,     setView]     = useState('dos');
  const [showMore, setShowMore] = useState(false);

  const switchView = (v) => { setView(v); setShowMore(false); };

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: dosChart, isLoading: dosLoad } = useQuery({
    queryKey: ['cn-prod-dos-chart'],
    queryFn:  () => completeneuroApi.getProductionDosChart().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dos' && !showMore,
  });

  const { data: doeChart, isLoading: doeLoad } = useQuery({
    queryKey: ['cn-prod-doe-chart'],
    queryFn:  () => completeneuroApi.getProductionDoeChart().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'doe' && !showMore,
  });

  const { data: adjData, isLoading: adjLoad } = useQuery({
    queryKey: ['cn-prod-dod-adj'],
    queryFn:  () => completeneuroApi.getProductionDodAdjustments().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dod' && !showMore,
  });

  const { data: pmtData, isLoading: pmtLoad } = useQuery({
    queryKey: ['cn-prod-dod-pmt'],
    queryFn:  () => completeneuroApi.getProductionDodPayments().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dod' && !showMore,
  });

  const { data: payerData, isLoading: payerLoad } = useQuery({
    queryKey: ['cn-prod-dod-payer'],
    queryFn:  () => completeneuroApi.getProductionDodByPayer().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dod' && !showMore,
  });

  const { data: billerData, isLoading: billerLoad } = useQuery({
    queryKey: ['cn-prod-dod-biller'],
    queryFn:  () => completeneuroApi.getProductionDodByBiller().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dod' && !showMore,
  });

  const { data: dosTable, isLoading: dosTblLoad } = useQuery({
    queryKey: ['cn-prod-dos-reimb'],
    queryFn:  () => completeneuroApi.getProductionDosReimbursement().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dos' && showMore,
  });

  const { data: doeTable, isLoading: doeTblLoad } = useQuery({
    queryKey: ['cn-prod-doe-reimb'],
    queryFn:  () => completeneuroApi.getProductionDoeReimbursement().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'doe' && showMore,
  });

  const { data: dodTable, isLoading: dodTblLoad } = useQuery({
    queryKey: ['cn-prod-dod-reimb'],
    queryFn:  () => completeneuroApi.getProductionDodReimbursement().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dod' && showMore,
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const DosInnerLabel = makeDosInnerLabel(dosChart);

  const subtitle = showMore
    ? view === 'dod' ? 'Reimbursement (DOD)' : `Reimbursement Analysis (${view.toUpperCase()})`
    : view === 'dos' ? 'Last 12 Months Total Charges vs Collected (DOS)'
    : view === 'doe' ? 'Last 12 Months Total Charges (DOE)'
    : 'Date of Deposit';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden w-full">

        {/* ── Header: title + toggle buttons ─────────────────────────────── */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Productions</h2>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <ViewBtn active={view === 'doe'} onClick={() => switchView('doe')}>DOE</ViewBtn>
            <ViewBtn active={view === 'dos'} onClick={() => switchView('dos')}>DOS</ViewBtn>
            <ViewBtn active={view === 'dod'} onClick={() => switchView('dod')}>DOD</ViewBtn>
          </div>
        </div>

        {/* ══ DOS — Grouped bar chart ════════════════════════════════════════ */}
        {view === 'dos' && !showMore && (
          <>
            <div className="px-4 pb-2" style={{ height: 500 }}>
              {dosLoad ? <ChartSkeleton height={380} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dosChart || []}
                    margin={{ top: 30, right: 20, left: 10, bottom: 10 }}
                    barCategoryGap="25%"
                    barGap={2}
                  >
                    <XAxis dataKey="date" tickFormatter={fmtShortDate}
                      tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtMoney} width={58}
                      tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total_charges" name="Total Charges" fill="#4338CA" radius={[3,3,0,0]} maxBarSize={60}>
                      <LabelList dataKey="total_charges" position="top" content={DosTopLabel} />
                      <LabelList dataKey="total_charges" content={DosInnerLabel} />
                    </Bar>
                    <Bar dataKey="total_payments" name="Collected" fill="#F59E0B" radius={[3,3,0,0]} maxBarSize={60} />
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

        {/* ══ DOS — Reimbursement table ══════════════════════════════════════ */}
        {view === 'dos' && showMore && (
          <>
            <div className="px-4 pb-2">
              <ReimbursementTable data={dosTable} loading={dosTblLoad} activeView="dos" />
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button onClick={() => setShowMore(false)}
                className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors">
                Go Back
              </button>
            </div>
          </>
        )}

        {/* ══ DOE — Single blue bar chart ════════════════════════════════════ */}
        {view === 'doe' && !showMore && (
          <>
            <div className="px-4 pb-2" style={{ height: 500 }}>
              {doeLoad ? <ChartSkeleton height={380} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={doeChart || []} margin={{ top: 30, right: 20, left: 10, bottom: 10 }}>
                    <XAxis dataKey="date" tickFormatter={fmtShortDate}
                      tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtMoney} width={58}
                      tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total_charges" name="Total Charges" fill="#1E3A8A" radius={[3,3,0,0]} maxBarSize={80}>
                      <LabelList
                        dataKey="total_charges"
                        content={({ x, y, width, height, value }) => {
                          if (!value || height < 36) return null;
                          const cx = x + width / 2;
                          const cy = y + height / 2;
                          return (
                            <text
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

        {/* ══ DOE — Reimbursement table ══════════════════════════════════════ */}
        {view === 'doe' && showMore && (
          <>
            <div className="px-4 pb-2">
              <ReimbursementTable data={doeTable} loading={doeTblLoad} activeView="doe" />
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button onClick={() => setShowMore(false)}
                className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors">
                Go Back
              </button>
            </div>
          </>
        )}

        {/* ══ DOD — 4 charts ════════════════════════════════════════════════ */}
        {view === 'dod' && !showMore && (
          <>
            {/* Adjustment History — full-width area chart */}
            <div className="px-4 pb-0">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
                Adjustment History (Write-offs by Date Collected)
              </p>
              <div style={{ height: 260 }}>
                {adjLoad ? <ChartSkeleton height={260} /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={adjData || []} margin={{ top: 28, right: 20, left: 10, bottom: 10 }}>
                      <XAxis dataKey="date" tickFormatter={fmtShortDate}
                        tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtMoney} width={58}
                        tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="adjustments" name="Adjustments"
                        stroke="#D97706" strokeWidth={2} fill="#FEF3C7" dot={false}>
                        <LabelList dataKey="adjustments" content={AdjLabel} />
                      </Area>
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Payments History — full-width line chart */}
            <div className="px-4 mt-4">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
                Payments History (Payment Collected by Date Collected)
              </p>
              <div style={{ height: 260 }}>
                {pmtLoad ? <ChartSkeleton height={260} /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pmtData || []} margin={{ top: 28, right: 20, left: 10, bottom: 10 }}>
                      <XAxis dataKey="date" tickFormatter={fmtShortDate}
                        tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtMoney} width={58}
                        tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line type="monotone" dataKey="payments" name="Payments"
                        stroke="#EF4444" strokeWidth={2.5}
                        dot={{ r: 3, fill: '#EF4444', strokeWidth: 0 }} activeDot={{ r: 5 }}>
                        <LabelList dataKey="payments" content={LineLabel} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Payments by Payer + Payments by Biller — 2-column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-4 pb-4 mt-4">

              {/* By Payer */}
              <div>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
                  Payments by Payer (Insurance Type)
                </p>
                <div style={{ height: 280 }}>
                  {payerLoad ? <ChartSkeleton height={280} /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={payerData || []}
                        layout="vertical"
                        margin={{ top: 5, right: 90, left: 10, bottom: 5 }}
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

              {/* By Biller Entity */}
              <div>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
                  Payments by Biller Entity
                </p>
                <div style={{ height: 280 }}>
                  {billerLoad ? <ChartSkeleton height={280} /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={billerData || []}
                        layout="vertical"
                        margin={{ top: 5, right: 90, left: 10, bottom: 5 }}
                      >
                        <XAxis type="number" tickFormatter={fmtMoney}
                          tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="payment_method" type="category" width={100}
                          tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                          axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="payments" name="Payments" fill="#0891B2" radius={[0,3,3,0]}>
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

        {/* ══ DOD — Reimbursement table ══════════════════════════════════════ */}
        {view === 'dod' && showMore && (
          <>
            <div className="px-4 pb-2">
              <ReimbursementTable data={dodTable} loading={dodTblLoad} activeView="dod" />
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
