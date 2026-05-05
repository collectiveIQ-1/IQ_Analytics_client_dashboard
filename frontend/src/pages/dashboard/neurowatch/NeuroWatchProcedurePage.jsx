/**
 * NeuroWatchProcedurePage.jsx — Procedure tab for Neuro Watch Dashboard.
 *
 * Views (DOS / DOE / DOD buttons top-right):
 *   DOS — Two side-by-side horizontal bar charts
 *         Left:  Deposits by Procedure Type  (neurowatch_full_deposit / billing_type / date_collected)
 *         Right: Charges by Procedure Type   (neurowatch_full_billing / procedure_type / dos)
 *         More Deposits → DOD detail table
 *         More Charges  → Charges detail table (inner DOS/DOE toggle, defaults to DOS)
 *   DOE — Same, Charges use billing_date; More Charges defaults to DOE
 *   DOD — Same side-by-side, only Deposits card has More → DOD detail table
 *
 * Schema: iq_neurowatch
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar,
  ResponsiveContainer,
  XAxis, YAxis, Tooltip, LabelList,
} from 'recharts';
import { neurowatchApi } from '../../../api/neurowatch.api';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtK = (v) => {
  const n = Number(v || 0);
  if (n === 0) return '';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtKAxis = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtPct = (v) => {
  const n = Number(v || 0);
  return n === 0 ? '' : `${n.toFixed(2)}%`;
};

const fmtMonth = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ChartSkeleton({ height = 280 }) {
  return (
    <div className="animate-pulse bg-slate-100 dark:bg-zinc-800 rounded-lg" style={{ height }} />
  );
}

// ── Toggle button ─────────────────────────────────────────────────────────────

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

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-zinc-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {fmtK(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── H-bar label ───────────────────────────────────────────────────────────────

const HBarLabel = ({ x, y, width, height, value }) => {
  if (!value || width < 30) return null;
  return (
    <text
      x={x + width + 4}
      y={y + height / 2 + 1}
      textAnchor="start"
      fontSize={9}
      fontWeight="600"
      fill="#334155"
      dominantBaseline="middle"
    >
      {fmtK(value)}
    </text>
  );
};

// ── Build h-bar data ──────────────────────────────────────────────────────────

function buildHBarData(rows, groupKey, valueKey) {
  if (!rows?.length) return [];
  const sorted = [...rows].sort((a, b) => {
    const md = a.month < b.month ? -1 : a.month > b.month ? 1 : 0;
    if (md !== 0) return md;
    return Number(b[valueKey] || 0) - Number(a[valueKey] || 0);
  });
  return sorted.map((r) => ({
    label: `${fmtMonth(r.month)} – ${r[groupKey]}`,
    month: fmtMonth(r.month),
    group: r[groupKey],
    value: Number(r[valueKey] || 0),
  }));
}

// ── Horizontal bar chart card ─────────────────────────────────────────────────

function HBarCard({ title, data, loading, color, onMore }) {
  const barHeight = Math.max((data?.length || 0) * 22, 200);
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 flex flex-col">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-slate-700 dark:text-zinc-200">{title}</p>
      </div>
      <div className="flex-1 px-2 pb-2 overflow-y-auto" style={{ maxHeight: 360 }}>
        {loading ? (
          <ChartSkeleton height={280} />
        ) : !data?.length ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={barHeight}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
              barSize={14}
            >
              <XAxis
                type="number"
                tickFormatter={fmtKAxis}
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="label"
                type="category"
                width={170}
                tick={{ fontSize: 9, fill: '#334155', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Amount" fill={color} radius={[0, 3, 3, 0]}>
                <LabelList dataKey="value" content={HBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {onMore && (
        <div className="flex justify-end px-4 pb-4 pt-1">
          <button
            onClick={onMore}
            className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors"
          >
            More
          </button>
        </div>
      )}
    </div>
  );
}

// ── DOD Deposit More table ────────────────────────────────────────────────────

const DOD_METRIC_ROWS = [
  { key: 'claim_seq_count', label: 'Claim Sequence', fmt: (v) => (Number(v || 0) === 0 ? '' : String(Number(v))) },
  { key: 'charges',         label: 'Charges',        fmt: fmtK },
  { key: 'payments',        label: 'Payments',       fmt: fmtK },
];

function DepositMoreTable({ data, loading, onGoBack }) {
  const { months, groups } = useMemo(() => {
    if (!data?.length) return { months: [], groups: {} };
    const monthSet = new Set();
    const map = {};
    data.forEach((r) => {
      const bt = r.billing_type;
      const mo = r.month;
      monthSet.add(mo);
      if (!map[bt]) map[bt] = {};
      map[bt][mo] = r;
    });
    return { months: [...monthSet].sort(), groups: map };
  }, [data]);

  const grandTotals = useMemo(() => {
    const gt = {};
    data?.forEach((r) => {
      const bt = r.billing_type;
      if (!gt[bt]) gt[bt] = { claim_seq_count: 0, charges: 0, payments: 0 };
      gt[bt].claim_seq_count += Number(r.claim_seq_count || 0);
      gt[bt].charges         += Number(r.charges || 0);
      gt[bt].payments        += Number(r.payments || 0);
    });
    return gt;
  }, [data]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-zinc-200">
          Deposit by Procedure Type
        </h3>
      </div>
      {loading ? (
        <ChartSkeleton height={300} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800">
                <th className="sticky left-0 bg-slate-50 dark:bg-zinc-800 px-3 py-2 text-left font-semibold text-slate-600 dark:text-zinc-300 min-w-[140px] border-b border-slate-200 dark:border-zinc-700">
                  Procedure Type
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-zinc-300 border-b border-slate-200 dark:border-zinc-700 min-w-[120px]" />
                {months.map((m) => (
                  <th key={m} className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-zinc-300 border-b border-slate-200 dark:border-zinc-700 whitespace-nowrap min-w-[90px]">
                    {fmtMonth(m)}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-zinc-300 border-b border-slate-200 dark:border-zinc-700 whitespace-nowrap min-w-[90px]">
                  Grand Total
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groups).map(([bt, monthMap], btIdx) =>
                DOD_METRIC_ROWS.map((row, rowIdx) => {
                  const isFirst = rowIdx === 0;
                  const isLast  = rowIdx === DOD_METRIC_ROWS.length - 1;
                  const gtVal   = grandTotals[bt]?.[row.key] ?? 0;
                  const oddRow  = btIdx % 2 === 0;
                  return (
                    <tr
                      key={`${bt}-${row.key}`}
                      className={`${oddRow ? 'bg-white dark:bg-zinc-900' : 'bg-slate-50/60 dark:bg-zinc-800/40'} ${isLast ? 'border-b-2 border-slate-200 dark:border-zinc-700' : ''}`}
                    >
                      <td className={`sticky left-0 ${oddRow ? 'bg-white dark:bg-zinc-900' : 'bg-slate-50/60 dark:bg-zinc-800/40'} px-3 py-1.5 font-semibold text-slate-700 dark:text-zinc-200 align-top border-r border-slate-100 dark:border-zinc-700`}>
                        {isFirst ? bt : ''}
                      </td>
                      <td className="px-3 py-1.5 text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                        {row.label}
                      </td>
                      {months.map((m) => {
                        const val = monthMap[m] ? monthMap[m][row.key] : 0;
                        return (
                          <td key={m} className="px-3 py-1.5 text-right text-slate-600 dark:text-zinc-300 tabular-nums whitespace-nowrap">
                            {row.fmt(val)}
                          </td>
                        );
                      })}
                      <td className="px-3 py-1.5 text-right font-semibold text-slate-700 dark:text-zinc-200 tabular-nums whitespace-nowrap border-l border-slate-100 dark:border-zinc-700">
                        {row.fmt(gtVal)}
                      </td>
                    </tr>
                  );
                })
              )}
              {!Object.keys(groups).length && (
                <tr>
                  <td colSpan={months.length + 3} className="px-4 py-8 text-center text-slate-400 text-sm">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end pt-4">
        <button onClick={onGoBack} className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors">
          Go Back
        </button>
      </div>
    </div>
  );
}

// ── Charges More table (DOS / DOE inner toggle) ───────────────────────────────

const PROC_METRIC_ROWS = [
  { key: 'total_charge',          label: 'Total Charge',            fmt: fmtK,   indent: false },
  { key: 'total_payments',        label: 'Total Payments',          fmt: fmtK,   indent: false },
  { key: 'insurance_payment',     label: 'Insurance Payment',       fmt: fmtK,   indent: true  },
  { key: 'patient_payment',       label: 'Patient Payment',         fmt: fmtK,   indent: true  },
  { key: 'total_adjustments',     label: 'Total Adjustments',       fmt: fmtK,   indent: false },
  { key: 'insurance_adjustments', label: 'Insurance Adjustments',   fmt: fmtK,   indent: true  },
  { key: 'patient_adjustments',   label: 'Patient Adjustments',     fmt: fmtK,   indent: true  },
  { key: 'gcr_pct',               label: 'GCR %',                  fmt: fmtPct, indent: false },
  { key: 'ncr_pct',               label: 'NCR% (DOS)',             fmt: fmtPct, indent: false },
  { key: 'gcr_fully_paid',        label: 'GCR based on Fully Paid Claims', fmt: fmtPct, indent: false },
];

function ChargesMoreTable({ dosData, doeData, dosLoading, doeLoading, initialMode, onGoBack }) {
  const [moreMode, setMoreMode] = useState(initialMode || 'dos');

  const data    = moreMode === 'doe' ? doeData    : dosData;
  const loading = moreMode === 'doe' ? doeLoading : dosLoading;

  const { months, procedures } = useMemo(() => {
    if (!data?.length) return { months: [], procedures: {} };
    const monthSet = new Set();
    const map = {};
    data.forEach((r) => {
      const pt = r.procedure_type;
      const mo = r.month;
      monthSet.add(mo);
      if (!map[pt]) map[pt] = {};
      map[pt][mo] = r;
    });
    return { months: [...monthSet].sort(), procedures: map };
  }, [data]);

  const grandTotals = useMemo(() => {
    const gt = {};
    data?.forEach((r) => {
      const pt = r.procedure_type;
      if (!gt[pt]) {
        gt[pt] = {
          total_charge: 0, total_payments: 0, insurance_payment: 0,
          patient_payment: 0, total_adjustments: 0, insurance_adjustments: 0,
          patient_adjustments: 0, _gcr_charged: 0, _gcr_collected: 0,
        };
      }
      gt[pt].total_charge          += Number(r.total_charge || 0);
      gt[pt].total_payments        += Number(r.total_payments || 0);
      gt[pt].insurance_payment     += Number(r.insurance_payment || 0);
      gt[pt].patient_payment       += Number(r.patient_payment || 0);
      gt[pt].total_adjustments     += Number(r.total_adjustments || 0);
      gt[pt].insurance_adjustments += Number(r.insurance_adjustments || 0);
      gt[pt].patient_adjustments   += Number(r.patient_adjustments || 0);
      gt[pt]._gcr_charged          += Number(r.total_charge || 0);
      gt[pt]._gcr_collected        += Number(r.total_payments || 0);
    });
    Object.keys(gt).forEach((pt) => {
      const g = gt[pt];
      const gcr = g._gcr_charged > 0 ? (g._gcr_collected / g._gcr_charged * 100) : 0;
      g.gcr_pct       = gcr;
      g.ncr_pct       = gcr;
      g.gcr_fully_paid = gcr;
    });
    return gt;
  }, [data]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-zinc-200">
          Charges by Procedure Type
        </h3>
        <div className="flex gap-1.5">
          <ViewBtn active={moreMode === 'dos'} onClick={() => setMoreMode('dos')}>DOS</ViewBtn>
          <ViewBtn active={moreMode === 'doe'} onClick={() => setMoreMode('doe')}>DOE</ViewBtn>
        </div>
      </div>

      {loading ? (
        <ChartSkeleton height={300} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800">
                <th className="sticky left-0 bg-slate-50 dark:bg-zinc-800 px-3 py-2 text-left font-semibold text-slate-600 dark:text-zinc-300 min-w-[160px] border-b border-slate-200 dark:border-zinc-700">
                  Procedure
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-zinc-300 border-b border-slate-200 dark:border-zinc-700 min-w-[100px]" />
                {months.map((m) => (
                  <th key={m} className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-zinc-300 border-b border-slate-200 dark:border-zinc-700 whitespace-nowrap min-w-[90px]">
                    {fmtMonth(m)}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-semibold text-slate-600 dark:text-zinc-300 border-b border-slate-200 dark:border-zinc-700 whitespace-nowrap min-w-[90px]">
                  Grand Total
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(procedures).map(([pt, monthMap], ptIdx) =>
                PROC_METRIC_ROWS.map((row, rowIdx) => {
                  const isFirst = rowIdx === 0;
                  const isLast  = rowIdx === PROC_METRIC_ROWS.length - 1;
                  const gtVal   = grandTotals[pt]?.[row.key] ?? 0;
                  const oddRow  = ptIdx % 2 === 0;
                  return (
                    <tr
                      key={`${pt}-${row.key}`}
                      className={`${oddRow ? 'bg-white dark:bg-zinc-900' : 'bg-slate-50/60 dark:bg-zinc-800/40'} ${isLast ? 'border-b-2 border-slate-200 dark:border-zinc-700' : ''}`}
                    >
                      <td className={`sticky left-0 ${oddRow ? 'bg-white dark:bg-zinc-900' : 'bg-slate-50/60 dark:bg-zinc-800/40'} px-3 py-1.5 font-semibold text-slate-700 dark:text-zinc-200 align-top border-r border-slate-100 dark:border-zinc-700`}>
                        {isFirst ? pt : ''}
                      </td>
                      <td className={`px-3 py-1.5 text-slate-500 dark:text-zinc-400 whitespace-nowrap ${row.indent ? 'pl-6' : ''}`}>
                        {row.label}
                      </td>
                      {months.map((m) => {
                        const val = monthMap[m] ? monthMap[m][row.key] : 0;
                        return (
                          <td key={m} className="px-3 py-1.5 text-right text-slate-600 dark:text-zinc-300 tabular-nums whitespace-nowrap">
                            {row.fmt(val)}
                          </td>
                        );
                      })}
                      <td className="px-3 py-1.5 text-right font-semibold text-slate-700 dark:text-zinc-200 tabular-nums whitespace-nowrap border-l border-slate-100 dark:border-zinc-700">
                        {row.fmt(gtVal)}
                      </td>
                    </tr>
                  );
                })
              )}
              {!Object.keys(procedures).length && (
                <tr>
                  <td colSpan={months.length + 3} className="px-4 py-8 text-center text-slate-400 text-sm">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button onClick={onGoBack} className="px-5 py-2 rounded-lg bg-red-700 text-white text-sm font-bold hover:bg-red-800 transition-colors">
          Go Back
        </button>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function NeuroWatchProcedurePage() {
  const [view,     setView]     = useState('dos');   // 'dos' | 'doe' | 'dod'
  const [showMore, setShowMore] = useState(null);    // null | 'charges' | 'deposits'

  // ── Data fetches ───────────────────────────────────────────────────────────

  const { data: depositsRaw, isLoading: depLoad } = useQuery({
    queryKey:  ['nw-proc-deposits'],
    queryFn:   () => neurowatchApi.getProcedureDeposits().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 5 * 60_000,
    retry:     false,
  });

  // Charges chart — mode = dos | doe (DOD uses same DOS data for the chart panel)
  const chargesMode = view === 'dod' ? 'dos' : view;
  const { data: chargesRaw, isLoading: chrLoad } = useQuery({
    queryKey:  ['nw-proc-charges', chargesMode],
    queryFn:   () => neurowatchApi.getProcedureCharges(chargesMode).then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 5 * 60_000,
    retry:     false,
  });

  // Pre-fetch DOS and DOE more data when charges more is open
  const { data: dosMoreRaw, isLoading: dosMoreLoad } = useQuery({
    queryKey:  ['nw-proc-more', 'dos'],
    queryFn:   () => neurowatchApi.getProcedureMore('dos').then((r) => r.data?.data ?? r.data ?? []),
    enabled:   showMore === 'charges',
    staleTime: 5 * 60_000,
    retry:     false,
  });
  const { data: doeMoreRaw, isLoading: doeMoreLoad } = useQuery({
    queryKey:  ['nw-proc-more', 'doe'],
    queryFn:   () => neurowatchApi.getProcedureMore('doe').then((r) => r.data?.data ?? r.data ?? []),
    enabled:   showMore === 'charges',
    staleTime: 5 * 60_000,
    retry:     false,
  });

  // DOD deposit more data
  const { data: dodMoreRaw, isLoading: dodMoreLoad } = useQuery({
    queryKey:  ['nw-proc-dod-more'],
    queryFn:   () => neurowatchApi.getProcedureDodMore().then((r) => r.data?.data ?? r.data ?? []),
    enabled:   showMore === 'deposits',
    staleTime: 5 * 60_000,
    retry:     false,
  });

  // ── Transform chart data ───────────────────────────────────────────────────

  const depositsChartData = useMemo(
    () => buildHBarData(depositsRaw ?? [], 'billing_type', 'payments'),
    [depositsRaw]
  );
  const chargesChartData = useMemo(
    () => buildHBarData(chargesRaw ?? [], 'procedure_type', 'charges'),
    [chargesRaw]
  );

  // ── Switch view ────────────────────────────────────────────────────────────

  const switchView = (v) => { setView(v); setShowMore(null); };

  // In DOD mode only deposits More is available; in DOS/DOE only charges More is available
  const handleMoreDeposits = () => setShowMore('deposits');
  const handleMoreCharges  = () => setShowMore('charges');

  const chargesTitle = view === 'doe'
    ? 'Charges by Procedure Type (DOE)'
    : 'Charges by Procedure Type (DOS)';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Header — DOS / DOE / DOD toggle */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex gap-1.5">
          <ViewBtn active={view === 'dos'} onClick={() => switchView('dos')}>DOS</ViewBtn>
          <ViewBtn active={view === 'doe'} onClick={() => switchView('doe')}>DOE</ViewBtn>
          <ViewBtn active={view === 'dod'} onClick={() => switchView('dod')}>DOD</ViewBtn>
        </div>
      </div>

      {/* ══ Main chart view ═════════════════════════════════════════════════ */}
      {!showMore && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Left: Deposits by Procedure Type */}
          <HBarCard
            title="Deposits by Procedure Type"
            data={depositsChartData}
            loading={depLoad}
            color="#2dd4bf"
            onMore={handleMoreDeposits}
          />

          {/* Right: Charges by Procedure Type (DOS / DOE) */}
          <HBarCard
            title={chargesTitle}
            data={chargesChartData}
            loading={chrLoad}
            color="#f59e0b"
            onMore={view !== 'dod' ? handleMoreCharges : null}
          />
        </div>
      )}

      {/* ══ Deposit More (DOD) table ════════════════════════════════════════ */}
      {showMore === 'deposits' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-4">
          <DepositMoreTable
            data={dodMoreRaw ?? []}
            loading={dodMoreLoad}
            onGoBack={() => setShowMore(null)}
          />
        </div>
      )}

      {/* ══ Charges More (DOS / DOE inner toggle) ══════════════════════════ */}
      {showMore === 'charges' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-4">
          <ChargesMoreTable
            dosData={dosMoreRaw ?? []}
            doeData={doeMoreRaw ?? []}
            dosLoading={dosMoreLoad}
            doeLoading={doeMoreLoad}
            initialMode={view === 'doe' ? 'doe' : 'dos'}
            onGoBack={() => setShowMore(null)}
          />
        </div>
      )}

    </div>
  );
}
