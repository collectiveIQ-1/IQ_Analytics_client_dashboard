/**
 * ConfidasFacilityPage.jsx — Facility Analysis tab for Confidas Dashboard.
 *
 * Tabs: DOS | DOE | DOD  (bottom-right toggle buttons)
 *
 * Each tab shows two side-by-side cards:
 *   Left  — "Facility Analysis Last 12 Months" with a month-selector dropdown
 *   Right — "Facility Analysis Last Month" (fixed to previous calendar month)
 *
 * Table → date-col mapping:
 *   DOS → iq_confidas.dos   (begindos)
 *   DOE → iq_confidas.doe   (doe)
 *   DOD → iq_confidas.doe   (doe)  — same source as DOE per spec
 *
 * Colors (matched to screenshots):
 *   DOS: navy charge  | green payments | teal adjustments
 *   DOE: green charge | blue payments  | light-blue adjustments
 *   DOD: green charge | blue payments  | amber adjustments
 */

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { confidasApi } from '../../../api/confidas.api';

// ── Color palettes per mode ───────────────────────────────────────────────────
const COLORS = {
  dos: { charge: '#163d5c', payments: '#a3d977', adjustments: '#3dd5c0' },
  doe: { charge: '#6ee7a0', payments: '#3b82f6', adjustments: '#93c5fd' },
  dod: { charge: '#6ee7a0', payments: '#3b82f6', adjustments: '#f59e0b' },
};

// Label for the adjustments row changes by mode (matches screenshot)
const ADJ_LABEL = {
  dos: 'C_Total ADJ (DOS)',
  doe: 'Total Adjustments',
  dod: 'Total Adjustments',
};

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtCount = (v) => Number(v || 0).toLocaleString('en-US');

const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtPct = (v) => `${Number(v || 0).toFixed(0)}%`;

function fmtMonthLabel(m) {
  if (!m || m === 'all') return '(All)';
  const [y, mo] = m.split('-');
  return new Date(+y, +mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ── Nice axis scale ───────────────────────────────────────────────────────────
function niceMax(val) {
  if (!val || val <= 0) return 100_000;
  const mag  = Math.pow(10, Math.floor(Math.log10(val)));
  const norm = val / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 3 ? 3
             : norm <= 5 ? 5 : norm <= 7 ? 7 : norm <= 8 ? 8 : 10;
  return nice * mag;
}

function axisTicks(max, count = 8) {
  const step = max / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(i * step));
}

// ── X-axis ruler ──────────────────────────────────────────────────────────────
function XAxisRuler({ maxVal, labelW }) {
  const ticks = axisTicks(maxVal);
  return (
    <div className="flex mt-1">
      <div style={{ width: labelW }} className="flex-none" />
      <div className="relative flex-1 h-5">
        {ticks.map((t) => {
          const pct = (t / maxVal) * 100;
          return (
            <span
              key={t}
              className="absolute top-0 text-[9px] text-slate-400 dark:text-zinc-500 -translate-x-1/2"
              style={{ left: `${pct}%` }}
            >
              {fmtMoney(t)}
            </span>
          );
        })}
        <div className="absolute top-4 left-0 right-0 h-px bg-slate-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}

// ── Single metric row ─────────────────────────────────────────────────────────
function MetricRow({ label, value, barVal, maxVal, barColor }) {
  const isBar = barVal != null && Number(barVal) > 0;
  const pct   = isBar ? Math.min((Number(barVal) / maxVal) * 100, 100) : 0;

  return (
    <div className="flex items-center h-[26px] text-[10px]">
      <div className="flex-none w-[140px] text-slate-500 dark:text-zinc-400 pl-1 leading-tight">
        {label}
      </div>
      {isBar ? (
        <div className="relative flex-1 h-[18px] mr-2">
          <div
            className="absolute top-0 left-0 h-full rounded-sm"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
          <span
            className="absolute top-0 h-full flex items-center font-bold text-slate-700 dark:text-zinc-200 text-[10px] whitespace-nowrap"
            style={{ left: `calc(${pct}% + 4px)` }}
          >
            {value}
          </span>
        </div>
      ) : (
        <div className="flex-1 pl-1 font-semibold text-slate-700 dark:text-zinc-200">
          {value}
        </div>
      )}
    </div>
  );
}

// ── Facility group block ──────────────────────────────────────────────────────
function FacilityGroup({ row, maxVal, colors, mode, isLast }) {
  const metrics = [
    { label: 'Procedure Count',   value: fmtCount(row.procedure_count),   bar: false },
    { label: 'Procedure %',       value: fmtPct(row.procedure_pct),       bar: false },
    { label: 'Total Charge',      value: fmtMoney(row.total_charge),      bar: true, barVal: Number(row.total_charge),      barColor: colors.charge      },
    { label: 'Total Payments',    value: fmtMoney(row.total_payments),    bar: true, barVal: Number(row.total_payments),    barColor: colors.payments    },
    { label: 'Total Payment %',   value: fmtPct(row.payment_pct),         bar: false },
    { label: ADJ_LABEL[mode],     value: fmtMoney(row.total_adjustments), bar: true, barVal: Number(row.total_adjustments), barColor: colors.adjustments },
    { label: 'GCR %',             value: fmtPct(row.gcr_pct),             bar: false },
    { label: 'NCR %',             value: fmtPct(row.ncr_pct),             bar: false },
  ];

  return (
    <div className={`flex ${!isLast ? 'border-b border-slate-200 dark:border-zinc-700' : ''}`}>
      <div className="flex-none w-[130px] py-2 pr-2 flex items-start">
        <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 leading-tight uppercase">
          {row.facility}
        </span>
      </div>
      <div className="flex-1">
        {metrics.map((m, i) => (
          <MetricRow
            key={i}
            label={m.label}
            value={m.value}
            barVal={m.bar ? m.barVal : null}
            maxVal={maxVal}
            barColor={m.barColor}
          />
        ))}
      </div>
    </div>
  );
}

// ── Facility chart (full chart area) ─────────────────────────────────────────
function FacilityChart({ data, colors, mode, loading, error, onRetry }) {
  const LABEL_W = 130 + 140;

  const maxVal = useMemo(() => {
    if (!data?.length) return 100_000;
    const allBars = data.flatMap((r) => [
      Number(r.total_charge      || 0),
      Number(r.total_payments    || 0),
      Number(r.total_adjustments || 0),
    ]);
    return niceMax(Math.max(...allBars, 1));
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[208px] animate-pulse rounded-xl bg-slate-50 dark:bg-zinc-900" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className="text-sm text-slate-500 dark:text-zinc-400 text-center">
          Unable to load facility data.<br/>
          <span className="text-xs text-slate-400 dark:text-zinc-500">The server may still be starting up.</span>
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-1 px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
          >
            ↺ Retry
          </button>
        )}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <p className="text-sm text-slate-400 dark:text-zinc-500 text-center">No data available.</p>
        {onRetry && (
          <button onClick={onRetry} className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline">
            ↺ Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-[420px]">
      {data.map((row, i) => (
        <FacilityGroup
          key={row.facility}
          row={row}
          maxVal={maxVal}
          colors={colors}
          mode={mode}
          isLast={i === data.length - 1}
        />
      ))}
      <XAxisRuler maxVal={maxVal} labelW={LABEL_W} />
    </div>
  );
}

// ── Chart card wrapper ────────────────────────────────────────────────────────
function ChartCard({ title, tag, month, months, onMonthChange, children }) {
  return (
    <div
      data-export-item
      data-export-label={title}
      className="bg-white dark:bg-zinc-950 rounded-2xl
                 border border-slate-100 dark:border-zinc-800
                 shadow-sm overflow-hidden flex-1 min-w-0 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-3 flex-none">
        <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-100 leading-tight">
          {title}
        </h3>
        {months != null && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">
              {tag}
            </span>
            <select
              value={month || 'all'}
              onChange={(e) => onMonthChange(e.target.value === 'all' ? null : e.target.value)}
              className="rounded-md border border-slate-200 dark:border-zinc-700
                         bg-white dark:bg-zinc-900
                         text-[10px] font-medium text-slate-700 dark:text-zinc-200
                         px-2 py-1 pr-6 shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer"
            >
              {tag === 'DOE' || tag === 'DOD'
                ? <option value="all">(All)</option>
                : null
              }
              {months.map((m) => (
                <option key={m} value={m}>{fmtMonthLabel(m)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Scrollable content area — fixed height so both cards stay the same size */}
      <div className="px-4 pb-4 flex-1 overflow-y-auto" style={{ minHeight: 540, maxHeight: 560 }}>
        {children}
      </div>
    </div>
  );
}

// ── View-mode button ──────────────────────────────────────────────────────────
function ViewBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
        active
          ? 'bg-red-700 text-white shadow ring-2 ring-white/20'
          : 'bg-[#991b1b] text-white hover:bg-red-800'
      }`}
    >
      {children}
    </button>
  );
}

// ── React Query shared options ────────────────────────────────────────────────
const Q = {
  staleTime:            0,
  retry:                3,
  retryDelay:           (attempt) => Math.min(1500 * 2 ** attempt, 15_000),
  refetchOnMount:       true,
  refetchOnWindowFocus: true,
};

// ── Main component ────────────────────────────────────────────────────────────
export default function ConfidasFacilityPage() {
  const [mode,     setMode]     = useState('dos');
  const [dosMonth, setDosMonth] = useState(null);
  const [doeMonth, setDoeMonth] = useState(null);
  const [dodMonth, setDodMonth] = useState(null);

  const queryClient = useQueryClient();

  // ── DOS queries ──────────────────────────────────────────────────────────
  const { data: dosL12Raw, isLoading: dosL12Load, error: dosL12Err } = useQuery({
    ...Q,
    queryKey: ['conf-facility-dos-l12', dosMonth],
    queryFn:  () => confidasApi.getFacilityDosLast12(dosMonth).then((r) => r.data.data),
    enabled:  mode === 'dos',
  });
  const { data: dosLMRaw, isLoading: dosLMLoad, error: dosLMErr } = useQuery({
    ...Q,
    queryKey: ['conf-facility-dos-lm'],
    queryFn:  () => confidasApi.getFacilityDosLastMonth().then((r) => r.data.data),
    enabled:  mode === 'dos',
  });

  // ── DOE queries ──────────────────────────────────────────────────────────
  const { data: doeL12Raw, isLoading: doeL12Load, error: doeL12Err } = useQuery({
    ...Q,
    queryKey: ['conf-facility-doe-l12', doeMonth],
    queryFn:  () => confidasApi.getFacilityDoeLast12(doeMonth).then((r) => r.data.data),
    enabled:  mode === 'doe',
  });
  const { data: doeLMRaw, isLoading: doeLMLoad, error: doeLMErr } = useQuery({
    ...Q,
    queryKey: ['conf-facility-doe-lm'],
    queryFn:  () => confidasApi.getFacilityDoeLastMonth().then((r) => r.data.data),
    enabled:  mode === 'doe',
  });

  // ── DOD queries ──────────────────────────────────────────────────────────
  const { data: dodL12Raw, isLoading: dodL12Load, error: dodL12Err } = useQuery({
    ...Q,
    queryKey: ['conf-facility-dod-l12', dodMonth],
    queryFn:  () => confidasApi.getFacilityDodLast12(dodMonth).then((r) => r.data.data),
    enabled:  mode === 'dod',
  });
  const { data: dodLMRaw, isLoading: dodLMLoad, error: dodLMErr } = useQuery({
    ...Q,
    queryKey: ['conf-facility-dod-lm'],
    queryFn:  () => confidasApi.getFacilityDodLastMonth().then((r) => r.data.data),
    enabled:  mode === 'dod',
  });

  // ── Derived active-mode data ──────────────────────────────────────────────
  const isDos     = mode === 'dos';
  const isDoe     = mode === 'doe';
  const isDod     = mode === 'dod';
  const colors    = COLORS[mode];
  const modeLabel = isDos ? 'DOS' : isDod ? 'DOD' : 'DOE';

  const l12Data    = isDos ? (dosL12Raw?.rows || []) : isDod ? (dodL12Raw?.rows || []) : (doeL12Raw?.rows || []);
  const l12Months  = isDos ? (dosL12Raw?.months || []) : isDod ? (dodL12Raw?.months || []) : (doeL12Raw?.months || []);
  const l12SelMon  = isDos ? dosL12Raw?.selectedMonth : isDod ? dodL12Raw?.selectedMonth : doeL12Raw?.selectedMonth;
  const lmData     = isDos ? (dosLMRaw?.rows || []) : isDod ? (dodLMRaw?.rows || []) : (doeLMRaw?.rows || []);
  const l12Loading = isDos ? dosL12Load : isDod ? dodL12Load : doeL12Load;
  const lmLoading  = isDos ? dosLMLoad  : isDod ? dodLMLoad  : doeLMLoad;
  const l12Error   = isDos ? dosL12Err  : isDod ? dodL12Err  : doeL12Err;
  const lmError    = isDos ? dosLMErr   : isDod ? dodLMErr   : doeLMErr;

  const retryL12 = () => queryClient.invalidateQueries({
    queryKey: isDos
      ? ['conf-facility-dos-l12', dosMonth]
      : isDod
        ? ['conf-facility-dod-l12', dodMonth]
        : ['conf-facility-doe-l12', doeMonth],
  });
  const retryLM = () => queryClient.invalidateQueries({
    queryKey: isDos
      ? ['conf-facility-dos-lm']
      : isDod
        ? ['conf-facility-dod-lm']
        : ['conf-facility-doe-lm'],
  });

  const handleMode = (m) => {
    setMode(m);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Two side-by-side chart cards */}
      <div className="flex gap-4 items-stretch">

        {/* Left — Last 12 Months */}
        <ChartCard
          title={`Facility Analysis Last 12 Months (${modeLabel})`}
          tag={modeLabel}
          month={l12SelMon}
          months={l12Months}
          onMonthChange={isDos ? setDosMonth : isDod ? setDodMonth : setDoeMonth}
        >
          <FacilityChart
            data={l12Data}
            colors={colors}
            mode={mode}
            loading={l12Loading}
            error={l12Error}
            onRetry={retryL12}
          />
        </ChartCard>

        {/* Right — Last Month */}
        <ChartCard
          title={`Facility Analysis Last Month (${modeLabel})`}
          tag={null}
          month={null}
          months={null}
        >
          <FacilityChart
            data={lmData}
            colors={colors}
            mode={mode}
            loading={lmLoading}
            error={lmError}
            onRetry={retryLM}
          />
        </ChartCard>

      </div>

      {/* Bottom tab-mode buttons */}
      <div className="flex items-center justify-end gap-2">
        <ViewBtn active={isDoe} onClick={() => handleMode('doe')}>DOE</ViewBtn>
        <ViewBtn active={isDos} onClick={() => handleMode('dos')}>DOS</ViewBtn>
        <ViewBtn active={isDod} onClick={() => handleMode('dod')}>DOD</ViewBtn>
      </div>

    </div>
  );
}
