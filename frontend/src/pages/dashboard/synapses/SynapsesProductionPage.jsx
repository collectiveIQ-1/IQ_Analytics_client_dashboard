/**
 * SynapsesProductionPage.jsx — Productions tab for Synapses Dashboard.
 *
 * Views (toggled by DOE / DOS / DOD buttons top-right):
 *   DOS — Grouped bar chart: Total Charges (purple) vs Payments (amber) + GCR% label
 *         More → Reimbursement Analysis table (grouped by DOS month)
 *   DOE — Single blue bar chart: Total Charges by billing_date
 *         More → Reimbursement Analysis table (grouped by DOE month)
 *   DOD — 2×2 grid:
 *         Top-left:  All Time Adjustment History (area — synapses_full_billing / write_off by date_collected)
 *         Top-right: Deposit by Payer (h-bar — synapses_full_deposit / payer)
 *         Bot-left:  Last 12 Months Payments History (line — synapses_full_deposit)
 *         Bot-right: Deposit by Billing Entity (pie — synapses_full_deposit / billing_entity)
 *
 * Schema: iq_synapses
 * Tables:
 *   synapses_full_billing → DOS / DOE charts + More tables + DOD All Time Adjustments
 *   synapses_full_deposit → DOD Payments History, Payer, Billing Entity charts
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar,
  AreaChart, Area,
  LineChart, Line,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  XAxis, YAxis, Tooltip, LabelList, Legend,
} from 'recharts';
import { synapsesApi } from '../../../api/synapses.api';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtDollar = (v) => `$${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const fmtCount  = (v) => Number(v || 0).toLocaleString('en-US');
const fmtPct1   = (v) => `${Number(v || 0).toFixed(1)}%`;
const fmtPct2   = (v) => `${Number(v || 0).toFixed(2)}%`;

const fmtShortDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d)
    : dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// ── Pie chart colour palette ──────────────────────────────────────────────────
const PIE_COLORS = [
  '#7C3AED', '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#EC4899', '#14B8A6', '#F97316', '#8B5CF6', '#06B6D4',
];

// ── Reimbursement row definitions ─────────────────────────────────────────────

const REIMB_ROWS_DOS = [
  { key: 'visit_count',            label: 'Visit Count',                    fmt: fmtCount,  indent: 0 },
  { key: 'total_charge',           label: 'Total Charge',                   fmt: fmtMoney,  indent: 0 },
  { key: 'total_payments',         label: 'Total Payments',                 fmt: fmtMoney,  indent: 0 },
  { key: 'insurance_payments',     label: 'Insurance Payment',              fmt: fmtMoney,  indent: 1 },
  { key: 'patient_payment',        label: 'Patient Payment',                fmt: fmtMoney,  indent: 1 },
  { key: 'total_adjustments',      label: 'Total Adjustments',              fmt: fmtMoney,  indent: 0 },
  { key: 'insurance_adjustments',  label: 'Insurance Adjustments',          fmt: fmtMoney,  indent: 1 },
  { key: 'patient_adjustments',    label: 'Patient Adjustments',            fmt: fmtMoney,  indent: 1 },
  { key: 'total_balance',          label: 'Total Balance',                  fmt: fmtMoney,  indent: 0 },
  { key: 'insurance_balance',      label: 'Insurancebalance',               fmt: fmtMoney,  indent: 1 },
  { key: 'patient_balance',        label: 'Patientbalance',                 fmt: fmtMoney,  indent: 1 },
  { key: 'avg_chrg_per_visit',     label: 'Average Charge per visit',       fmt: fmtDollar, indent: 0 },
  { key: 'avg_pmt_per_visit',      label: 'Average Payment per Visit',      fmt: fmtDollar, indent: 0 },
  { key: 'gcr_pct',                label: 'GCR %',                          fmt: fmtPct2,   indent: 0 },
  { key: 'gcr_without_pt_balance', label: 'GCR without PT Balance',         fmt: fmtPct1,   indent: 0 },
  { key: 'gcr_fully_paid',         label: 'GCR based on Fully Paid Cl..',   fmt: fmtPct1,   indent: 0 },
  { key: 'ncr_pct',                label: 'NCR% (DOS)',                     fmt: fmtPct2,   indent: 0 },
];

const REIMB_ROWS_DOE = [
  { key: 'visit_count',            label: 'Visit Count',                        fmt: fmtCount,  indent: 0 },
  { key: 'total_charge',           label: 'Total Charge',                       fmt: fmtMoney,  indent: 0 },
  { key: 'total_payments',         label: 'Total Payments',                     fmt: fmtMoney,  indent: 0 },
  { key: 'insurance_payments',     label: 'Insurance Payment',                  fmt: fmtMoney,  indent: 1 },
  { key: 'patient_payment',        label: 'Patient Payment',                    fmt: fmtMoney,  indent: 1 },
  { key: 'total_adjustments',      label: 'Total Adjustments',                  fmt: fmtMoney,  indent: 0 },
  { key: 'insurance_adjustments',  label: 'Insurance Adjustments',              fmt: fmtMoney,  indent: 1 },
  { key: 'patient_adjustments',    label: 'Patient Adjustments',                fmt: fmtMoney,  indent: 1 },
  { key: 'total_balance',          label: 'Total Balance',                      fmt: fmtMoney,  indent: 0 },
  { key: 'insurance_balance',      label: 'Insurancebalance',                   fmt: fmtMoney,  indent: 1 },
  { key: 'patient_balance',        label: 'Patientbalance',                     fmt: fmtMoney,  indent: 1 },
  { key: 'avg_chrg_per_visit',     label: 'Average Charge per visit',           fmt: fmtDollar, indent: 0 },
  { key: 'avg_pmt_per_visit',      label: 'Average Payment per Visit',          fmt: fmtDollar, indent: 0 },
  { key: 'gcr_pct',                label: 'GCR (DOE) %',                        fmt: fmtPct2,   indent: 0 },
  { key: 'gcr_without_pt_balance', label: 'GCR Without Patient Balances (DOE)', fmt: fmtPct1,   indent: 0 },
  { key: 'gcr_fully_paid',         label: 'GCR based on Fully Paid Claims (DOE)', fmt: fmtPct1, indent: 0 },
  { key: 'ncr_pct',                label: 'NCR % (DOE)',                        fmt: fmtPct2,   indent: 0 },
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

// ── DOS bar label — top of purple bar ────────────────────────────────────────

const DosTopLabel = ({ x, y, value }) => {
  if (!value) return null;
  return (
    <text x={x} y={y - 4} textAnchor="middle" fontSize={10} fontWeight="700" fill="#312e81">
      {fmtMoney(value)}
    </text>
  );
};

// ── DOS inner label (payments + GCR) rotated inside bar ──────────────────────

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
          {`GCR %:${row.gcr_pct}%`}
        </text>
      </g>
    );
  };
}

// ── Horizontal bar label ──────────────────────────────────────────────────────

const HBarLabel = ({ x, y, width, height: h, value }) => {
  if (!value) return null;
  return (
    <text x={x + width + 6} y={y + h / 2 + 4} fontSize={10} fontWeight="700" fill="#374151">
      {fmtMoney(value)}
    </text>
  );
};

// ── Area label ────────────────────────────────────────────────────────────────

const AdjLabel = ({ x, y, value }) => {
  if (!value) return null;
  return (
    <text x={x} y={y - 5} textAnchor="middle" fontSize={10} fontWeight="700" fill="#92400E">
      {fmtMoney(value)}
    </text>
  );
};

// ── Line label ────────────────────────────────────────────────────────────────

const LineLabel = ({ x, y, value, index }) => {
  if (value == null) return null;
  const dy = index % 2 === 0 ? -10 : 14;
  return (
    <text x={x} y={y + dy} textAnchor="middle" fontSize={10} fontWeight="700" fill="#374151">
      {fmtMoney(value)}
    </text>
  );
};

// ── Reimbursement pivot table ─────────────────────────────────────────────────

function ReimbursementTable({ data, loading, rows: rowDefs }) {
  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-zinc-800" />;
  }
  if (!data?.length) {
    return <p className="text-sm text-slate-400 text-center py-10">No data available.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900">
            <th className="sticky left-0 z-10 bg-slate-50 dark:bg-zinc-900 text-left px-4 py-2.5 font-semibold text-slate-600 dark:text-zinc-300 min-w-[240px]">
              Metric
            </th>
            {data.map((row, i) => (
              <th key={i} className="px-3 py-2.5 text-center font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap min-w-[90px]">
                {fmtShortDate(row.month)}
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
                style={{ paddingLeft: `${16 + def.indent * 18}px` }}
              >
                {def.indent > 0 && (
                  <span className="text-slate-300 dark:text-zinc-600 mr-1 text-[10px]">└</span>
                )}
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

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ChartSkeleton({ height = 380 }) {
  return <div className="animate-pulse bg-slate-50 dark:bg-zinc-900 rounded-xl" style={{ height }} />;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SynapsesProductionPage() {
  const [view,     setView]     = useState('dos');
  const [showMore, setShowMore] = useState(false);

  const switchView = (v) => { setView(v); setShowMore(false); };

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: dosChart,   isLoading: dosLoad      } = useQuery({
    queryKey: ['synm-prod-dos-chart'],
    queryFn:  () => synapsesApi.getProductionDosChart().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dos' && !showMore,
  });

  const { data: doeChart,   isLoading: doeLoad      } = useQuery({
    queryKey: ['synm-prod-doe-chart'],
    queryFn:  () => synapsesApi.getProductionDoeChart().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'doe' && !showMore,
  });

  const { data: dosTable,   isLoading: dosTblLoad   } = useQuery({
    queryKey: ['synm-prod-dos-reimb'],
    queryFn:  () => synapsesApi.getProductionDosReimb().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dos' && showMore,
  });

  const { data: doeTable,   isLoading: doeTblLoad   } = useQuery({
    queryKey: ['synm-prod-doe-reimb'],
    queryFn:  () => synapsesApi.getProductionDoeReimb().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'doe' && showMore,
  });

  // DOD — all-time adjustments (write_off) from synapses_full_billing by date_collected
  const { data: adjData,    isLoading: adjLoad      } = useQuery({
    queryKey: ['synm-prod-dod-adjustments'],
    queryFn:  () => synapsesApi.getDodAdjustmentsAllTime().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dod',
  });

  // DOD — Last 12 Months Payments History line (date_collected, no filters)
  const { data: pmtData,    isLoading: pmtLoad      } = useQuery({
    queryKey: ['synm-prod-dod-pmt-history'],
    queryFn:  () => synapsesApi.getPaymentsLine().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dod',
  });

  const { data: payerData,  isLoading: payerLoad    } = useQuery({
    queryKey: ['synm-prod-dod-payer'],
    queryFn:  () => synapsesApi.getProductionDodByPayer().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dod',
  });

  const { data: billerData, isLoading: billerLoad   } = useQuery({
    queryKey: ['synm-prod-dod-biller'],
    queryFn:  () => synapsesApi.getProductionDodByBiller().then(r => r.data.data),
    staleTime: 300_000,
    enabled: view === 'dod',
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const DosInnerLabel = makeDosInnerLabel(dosChart);
  const activeTable   = view === 'dos' ? dosTable  : doeTable;
  const tableFetching = view === 'dos' ? dosTblLoad : doeTblLoad;
  const activeRows    = view === 'dos' ? REIMB_ROWS_DOS : REIMB_ROWS_DOE;

  const subtitle = showMore
    ? `Reimbursement Analysis (${view.toUpperCase()})`
    : view === 'dos' ? 'Last 12 Months Total Charges vs Payments (DOS)'
    : view === 'doe' ? 'Last 12 Months Total Charges (DOE)'
    : 'Date of Deposit';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">

        {/* ── Header: title + toggle buttons ── */}
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

        {/* ══ DOS view — grouped bar chart ══════════════════════════════════ */}
        {view === 'dos' && !showMore && (
          <>
            <div className="px-2 md:px-4 pb-2" style={{ minHeight: 380, height: 380 }}>
              {dosLoad ? <ChartSkeleton height={380} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dosChart || []}
                    margin={{ top: 30, right: 20, left: 10, bottom: 30 }}
                    barCategoryGap="25%"
                    barGap={2}
                  >
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtShortDate}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Month of Dos [2025]', position: 'insideBottom', offset: -15, fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis
                      tickFormatter={fmtMoney}
                      width={58}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Total Charge and Payments', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#64748b' }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total_charges" name="Total Charge" fill="#4338CA" radius={[3,3,0,0]} maxBarSize={60}>
                      <LabelList dataKey="total_charges" position="top"  content={DosTopLabel} />
                      <LabelList dataKey="total_charges"                 content={DosInnerLabel} />
                    </Bar>
                    <Bar dataKey="total_payments" name="Payments" fill="#F59E0B" radius={[3,3,0,0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button
                onClick={() => setShowMore(true)}
                className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors"
              >
                More
              </button>
            </div>
          </>
        )}

        {/* ══ DOE view — single blue bar chart ══════════════════════════════ */}
        {view === 'doe' && !showMore && (
          <>
            <div className="px-2 md:px-4 pb-2" style={{ minHeight: 380, height: 380 }}>
              {doeLoad ? <ChartSkeleton height={380} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={doeChart || []} margin={{ top: 30, right: 20, left: 10, bottom: 10 }}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtShortDate}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={fmtMoney}
                      width={58}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total_charges" name="Total Charges" fill="#1E3A8A" radius={[3,3,0,0]} maxBarSize={80}>
                      <LabelList
                        dataKey="total_charges"
                        position="insideBottom"
                        offset={12}
                        angle={-90}
                        fontSize={10}
                        fontWeight="700"
                        fill="white"
                        formatter={fmtMoney}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button
                onClick={() => setShowMore(true)}
                className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors"
              >
                More
              </button>
            </div>
          </>
        )}

        {/* ══ DOS / DOE — Reimbursement Analysis table ══════════════════════ */}
        {(view === 'dos' || view === 'doe') && showMore && (
          <>
            <div className="px-2 md:px-4 pb-2">
              <ReimbursementTable
                data={activeTable}
                loading={tableFetching}
                rows={activeRows}
              />
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button
                onClick={() => setShowMore(false)}
                className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors"
              >
                Go Back
              </button>
            </div>
          </>
        )}

        {/* ══ DOD view — 2×2 grid ═══════════════════════════════════════════ */}
        {view === 'dod' && (
          <div className="px-4 pb-4 space-y-4">

            {/* Row 1: Adjustments + Payments by Payer */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Adjustment History — area chart (billing_report_iomhelp / write_off) */}
              <div>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
                  All Time Adjustment History
                </p>
                <div style={{ minHeight: 240, height: 240 }}>
                  {adjLoad ? <ChartSkeleton height={310} /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={adjData || []} margin={{ top: 28, right: 20, left: 10, bottom: 10 }}>
                        <defs>
                          <linearGradient id="synmAdjProdGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#eab308" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="#eab308" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          tickFormatter={fmtShortDate}
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={fmtMoney}
                          width={52}
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="adjustments"
                          name="Adjustments"
                          stroke="#D97706"
                          strokeWidth={2}
                          fill="url(#synmAdjProdGrad)"
                          dot={false}
                        >
                          <LabelList dataKey="adjustments" content={AdjLabel} />
                        </Area>
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Payments by Payer Wise — horizontal bar (payment_report / insurance_type) */}
              <div>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
                  Deposit by Payer
                </p>
                <div style={{ minHeight: 240, height: 240 }}>
                  {payerLoad ? <ChartSkeleton height={310} /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={payerData || []}
                        layout="vertical"
                        margin={{ top: 5, right: 90, left: 10, bottom: 5 }}
                      >
                        <XAxis
                          type="number"
                          tickFormatter={fmtMoney}
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          dataKey="payer"
                          type="category"
                          width={140}
                          tick={{ fontSize: 9, fill: '#334155', fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="payments" name="Payments" fill="#22a95f" radius={[0,3,3,0]}>
                          <LabelList dataKey="payments" content={HBarLabel} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Payments History + Payments by Biller Entity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Payments History — line chart (payment_report) */}
              <div>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
                  Last 12 Months Payments History
                </p>
                <div style={{ minHeight: 240, height: 240 }}>
                  {pmtLoad ? <ChartSkeleton height={310} /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pmtData || []} margin={{ top: 28, right: 20, left: 10, bottom: 10 }}>
                        <XAxis
                          dataKey="date"
                          tickFormatter={fmtShortDate}
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={fmtMoney}
                          width={52}
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="payments"
                          name="Payments"
                          stroke="#EF4444"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: '#EF4444', strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                        >
                          <LabelList dataKey="payments" content={LineLabel} />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Deposit by Billing Entity — pie chart */}
              <div>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mb-1 px-1">
                  Deposit by Billing Entity
                </p>
                <div style={{ minHeight: 240, height: 240 }}>
                  {billerLoad ? <ChartSkeleton height={310} /> : !billerData?.length ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">No data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Pie
                          data={billerData}
                          dataKey="payments"
                          nameKey="billing_entity"
                          cx="50%"
                          cy="45%"
                          outerRadius={80}
                          label={({ name, percent, value }) => {
                            if (percent < 0.04) return '';
                            const v = value >= 1000000 ? `$${(value/1000000).toFixed(1)}M`
                                    : value >= 1000    ? `$${(value/1000).toFixed(0)}K`
                                    : `$${value}`;
                            return `${v}`;
                          }}
                          labelLine={true}
                        >
                          {billerData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [fmtDollar(value), name]}
                          contentStyle={{
                            fontSize: 11,
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            background: '#fff',
                          }}
                        />
                        <Legend
                          iconSize={8}
                          wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
                          formatter={(value) =>
                            value.length > 22 ? value.slice(0, 22) + '…' : value
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
