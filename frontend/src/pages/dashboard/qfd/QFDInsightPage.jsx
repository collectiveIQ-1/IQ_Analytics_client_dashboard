/**
 * QFDInsightPage.jsx — Insight Analysis page for QFD Dashboard.
 *
 * Top-right tabs : DOS | DOE | DOD
 * Bottom buttons : Provider | Payer | Procedure | Referring Provider
 *
 * Each view shows two side-by-side chart cards:
 *   Left  — "X Analysis Last 12 Months"
 *   Right — "X Analysis Last Month"
 *
 * Fixes applied (same as Facility page):
 *   • staleTime: 0 — never serve a stale cached empty response
 *   • retry: 3 with exponential back-off — auto-recovers when DB starts up
 *   • Error state with Retry button — clear UX for DB unavailable vs no data
 */

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { insightApi }        from '../../../api/insight.api';

// ── Color palettes ────────────────────────────────────────────────────────────
const COLORS = {
  dos: { charge: '#163d5c', payments: '#a3d977', adjustments: '#3dd5c0' },
  doe: { charge: '#6ee7a0', payments: '#3b82f6', adjustments: '#93c5fd' },
  dod: { charge: '#581c1c', payments: '#d97706', adjustments: '#92400e' },
};

// ── Button configs ────────────────────────────────────────────────────────────
const GROUPS = [
  { id: 'provider',          label: 'Provider',           filterLabel: null },
  { id: 'carrier',           label: 'Payer',              filterLabel: 'Payer' },
  { id: 'procedure',         label: 'Procedure',          filterLabel: 'Procedure' },
  { id: 'referringprovider', label: 'Referring Provider', filterLabel: 'Referring..' },
];

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtCount = (v) => Number(v || 0).toLocaleString('en-US');

const fmtMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtPct = (v) => `${Number(v || 0).toFixed(0)}%`;

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
  const isBar = barVal != null && barVal > 0;
  const pct   = isBar ? Math.min((barVal / maxVal) * 100, 100) : 0;

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

// ── Group block ───────────────────────────────────────────────────────────────
function GroupBlock({ row, maxVal, colors, isLast }) {
  const metrics = [
    { label: 'Procedure Count',    value: fmtCount(row.procedure_count),   bar: false },
    { label: 'Procedure %',        value: fmtPct(row.procedure_pct),       bar: false },
    { label: 'Total Charge',       value: fmtMoney(row.total_charge),      bar: true, barVal: Number(row.total_charge),      barColor: colors.charge },
    { label: 'Total Payments',     value: fmtMoney(row.total_payments),    bar: true, barVal: Number(row.total_payments),    barColor: colors.payments },
    { label: 'Total Payment %',    value: fmtPct(row.payment_pct),         bar: false },
    { label: 'Total Adjustments',  value: fmtMoney(row.total_adjustments), bar: true, barVal: Number(row.total_adjustments), barColor: colors.adjustments },
    { label: 'GCR %',              value: fmtPct(row.gcr_pct),             bar: false },
    { label: 'NCR%',               value: fmtPct(row.ncr_pct),             bar: false },
  ];

  return (
    <div className={`flex ${!isLast ? 'border-b border-slate-200 dark:border-zinc-700' : ''}`}>
      <div className="flex-none w-[130px] py-2 pr-2 flex items-start">
        <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 leading-tight uppercase break-words">
          {row.grp_name}
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

// ── Insight chart component ───────────────────────────────────────────────────
function InsightChart({ data, colors, loading, error, onRetry }) {
  const LABEL_W = 130 + 140;

  const maxVal = useMemo(() => {
    if (!data?.length) return 100_000;
    const allBars = data.flatMap((r) => [
      Number(r.total_charge || 0),
      Number(r.total_payments || 0),
      Number(r.total_adjustments || 0),
    ]);
    return niceMax(Math.max(...allBars, 1));
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {[1,2,3].map((i) => (
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
          Unable to reach the database.<br/>
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
          <button
            onClick={onRetry}
            className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
          >
            ↺ Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-[420px]">
      {data.map((row, i) => (
        <GroupBlock
          key={row.grp_name + i}
          row={row}
          maxVal={maxVal}
          colors={colors}
          isLast={i === data.length - 1}
        />
      ))}
      <XAxisRuler maxVal={maxVal} labelW={LABEL_W} />
    </div>
  );
}

// ── Chart card wrapper ────────────────────────────────────────────────────────
// Uses flex-col so the scrollable content area fills the fixed card height.
function ChartCard({ title, filterLabel, filterValue, filterOptions, onFilterChange, children }) {
  const hasFilter = filterLabel != null && filterOptions != null;
  return (
    <div
      data-export-item
      data-export-label={title}
      data-export-id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
      className="bg-white dark:bg-zinc-950 rounded-2xl
                    border border-slate-100 dark:border-zinc-800
                    shadow-sm overflow-hidden transition-colors duration-200 flex-1 min-w-0
                    flex flex-col"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-3 flex-wrap flex-none">
        <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-100 leading-tight">
          {title}
        </h3>
        {hasFilter && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">
              {filterLabel}
            </span>
            <select
              value={filterValue || 'all'}
              onChange={(e) => onFilterChange(e.target.value === 'all' ? null : e.target.value)}
              className="rounded-md border border-slate-200 dark:border-zinc-700
                         bg-white dark:bg-zinc-900
                         text-[10px] font-medium text-slate-700 dark:text-zinc-200
                         px-2 py-1 pr-6 shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer
                         max-w-[160px]"
            >
              <option value="all">(All)</option>
              {(filterOptions || []).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {/* Fixed-height scrollable content — cards stay same size */}
      <div className="px-4 pb-4 flex-1 overflow-y-auto" style={{ minHeight: 520, maxHeight: 560 }}>
        {children}
      </div>
    </div>
  );
}

// ── View / tab buttons ────────────────────────────────────────────────────────
function ModeBtn({ active, onClick, children }) {
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

function GroupBtn({ active, onClick, children }) {
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



// ── Shared React Query options ────────────────────────────────────────────────
const Q = {
  staleTime:            0,
  retry:                3,
  retryDelay:           (attempt) => Math.min(1500 * 2 ** attempt, 15_000),
  refetchOnMount:       true,
  refetchOnWindowFocus: true,
};

// ── Main component ────────────────────────────────────────────────────────────
export default function QFDInsightPage() {
  const [mode,    setMode]    = useState('dos');
  const [groupId, setGroupId] = useState('provider');
  const [filter,  setFilter]  = useState(null);

  const queryClient = useQueryClient();

  const handleGroupChange = (id) => { setGroupId(id); setFilter(null); };
  const handleModeChange  = (m)  => { setMode(m);     setFilter(null); };

  const isDos     = mode === 'dos';
  const isDod     = mode === 'dod';
  const colors    = COLORS[isDos ? 'dos' : isDod ? 'dod' : 'doe'];
  const grpConf   = GROUPS.find((g) => g.id === groupId) || GROUPS[0];
  const modeLabel = isDos ? 'DOS' : isDod ? 'DOD' : 'DOE';
  const groupTitle = grpConf.label;
  const needsFilter = grpConf.filterLabel != null;

  // ── Filter options ────────────────────────────────────────────────────────
  const { data: dosFiltersRaw } = useQuery({
    ...Q,
    queryKey:  ['insight-dos-filters', groupId],
    queryFn:   () => insightApi.getDosFilters(groupId).then((r) => r.data.data?.values || []),
    staleTime: 5 * 60_000,   // filter lists can be cached longer
    enabled:   needsFilter && isDos && mode !== 'dod',
  });

  const { data: doeFiltersRaw } = useQuery({
    ...Q,
    queryKey:  ['insight-doe-filters', groupId],
    queryFn:   () => insightApi.getDoeFilters(groupId).then((r) => r.data.data?.values || []),
    staleTime: 5 * 60_000,
    enabled:   needsFilter && !isDos && mode === 'doe',
  });

  const { data: dodFiltersRaw } = useQuery({
    ...Q,
    queryKey:  ['insight-dod-filters', groupId],
    queryFn:   () => insightApi.getDodFilters(groupId).then((r) => r.data.data?.values || []),
    staleTime: 5 * 60_000,
    enabled:   needsFilter && mode === 'dod',
  });

  const filterOptions = isDos ? (dosFiltersRaw || []) : isDod ? (dodFiltersRaw || []) : (doeFiltersRaw || []);

  // ── DOS data ──────────────────────────────────────────────────────────────
  const { data: dosL12Raw, isLoading: dosL12Load, error: dosL12Err } = useQuery({
    ...Q,
    queryKey: ['insight-dos-last12', groupId, filter],
    queryFn:  () => insightApi.getDosLast12(groupId, filter).then((r) => r.data.data?.rows || []),
    enabled:  mode === 'dos',
  });

  const { data: dosLMRaw, isLoading: dosLMLoad, error: dosLMErr } = useQuery({
    ...Q,
    queryKey: ['insight-dos-lastmonth', groupId, filter],
    queryFn:  () => insightApi.getDosLastMonth(groupId, filter).then((r) => r.data.data?.rows || []),
    enabled:  mode === 'dos',
  });

  // ── DOE data ──────────────────────────────────────────────────────────────
  const { data: doeL12Raw, isLoading: doeL12Load, error: doeL12Err } = useQuery({
    ...Q,
    queryKey: ['insight-doe-last12', groupId, filter],
    queryFn:  () => insightApi.getDoeLast12(groupId, filter).then((r) => r.data.data?.rows || []),
    enabled:  mode === 'doe',
  });

  const { data: doeLMRaw, isLoading: doeLMLoad, error: doeLMErr } = useQuery({
    ...Q,
    queryKey: ['insight-doe-lastmonth', groupId, filter],
    queryFn:  () => insightApi.getDoeLastMonth(groupId, filter).then((r) => r.data.data?.rows || []),
    enabled:  mode === 'doe',
  });

  // ── DOD data ──────────────────────────────────────────────────────────────
  const { data: dodL12Raw, isLoading: dodL12Load, error: dodL12Err } = useQuery({
    ...Q,
    queryKey: ['insight-dod-last12', groupId, filter],
    queryFn:  () => insightApi.getDodLast12(groupId, filter).then((r) => r.data.data?.rows || []),
    enabled:  mode === 'dod',
  });

  const { data: dodLMRaw, isLoading: dodLMLoad, error: dodLMErr } = useQuery({
    ...Q,
    queryKey: ['insight-dod-lastmonth', groupId, filter],
    queryFn:  () => insightApi.getDodLastMonth(groupId, filter).then((r) => r.data.data?.rows || []),
    enabled:  mode === 'dod',
  });

  // ── Active data ───────────────────────────────────────────────────────────
  const l12Data    = isDos ? (dosL12Raw || []) : isDod ? (dodL12Raw || []) : (doeL12Raw || []);
  const lmData     = isDos ? (dosLMRaw  || []) : isDod ? (dodLMRaw  || []) : (doeLMRaw  || []);
  const l12Loading = isDos ? dosL12Load : isDod ? dodL12Load : doeL12Load;
  const lmLoading  = isDos ? dosLMLoad  : isDod ? dodLMLoad  : doeLMLoad;
  const l12Error   = isDos ? dosL12Err  : isDod ? dodL12Err  : doeL12Err;
  const lmError    = isDos ? dosLMErr   : isDod ? dodLMErr   : doeLMErr;

  // ── Retry helpers ─────────────────────────────────────────────────────────
  const retryL12 = () => queryClient.invalidateQueries({
    queryKey: isDos
      ? ['insight-dos-last12', groupId, filter]
      : isDod
        ? ['insight-dod-last12', groupId, filter]
        : ['insight-doe-last12', groupId, filter],
  });
  const retryLM = () => queryClient.invalidateQueries({
    queryKey: isDos
      ? ['insight-dos-lastmonth', groupId, filter]
      : isDod
        ? ['insight-dod-lastmonth', groupId, filter]
        : ['insight-doe-lastmonth', groupId, filter],
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      <div className="flex gap-4 items-stretch">

          {/* Left: Last 12 Months */}
          <ChartCard
            title={`${groupTitle} Analysis Last 12 Months (${modeLabel})`}
            filterLabel={needsFilter ? grpConf.filterLabel : null}
            filterValue={filter}
            filterOptions={needsFilter ? filterOptions : null}
            onFilterChange={setFilter}
          >
            <InsightChart
              data={l12Data}
              colors={colors}
              loading={l12Loading}
              error={l12Error}
              onRetry={retryL12}
            />
          </ChartCard>

          {/* Right: Last Month */}
          <ChartCard
            title={`${groupTitle} Analysis Last Month (${modeLabel})`}
            filterLabel={needsFilter ? grpConf.filterLabel : null}
            filterValue={filter}
            filterOptions={needsFilter ? filterOptions : null}
            onFilterChange={setFilter}
          >
            <InsightChart
              data={lmData}
              colors={colors}
              loading={lmLoading}
              error={lmError}
              onRetry={retryLM}
            />
          </ChartCard>

        </div>

      {/* ── Bottom row: group buttons (left) + mode buttons (right) ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">

        <div className="flex gap-2 flex-wrap">
          {GROUPS.map((g) => (
            <GroupBtn
              key={g.id}
              active={groupId === g.id}
              onClick={() => handleGroupChange(g.id)}
            >
              {g.label}
            </GroupBtn>
          ))}
        </div>

        <div className="flex gap-2">
          <ModeBtn active={mode === 'dos'} onClick={() => handleModeChange('dos')}>DOS</ModeBtn>
          <ModeBtn active={mode === 'doe'} onClick={() => handleModeChange('doe')}>DOE</ModeBtn>
          <ModeBtn active={mode === 'dod'} onClick={() => handleModeChange('dod')}>DOD</ModeBtn>
        </div>

      </div>

    </div>
  );
}
