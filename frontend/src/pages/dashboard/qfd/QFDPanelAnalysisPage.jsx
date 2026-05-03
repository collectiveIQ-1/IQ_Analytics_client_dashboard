/**
 * QFDPanelAnalysisPage.jsx — Panel Analysis dashboard page.
 *
 * Tabs     : DOS (default) | DOE | DOD
 * Groups   : Payor | Panel | Provider | Referring Provider
 * Panel Type filter: All | Urine | Oral Swab | Other
 *
 * Word-file suggestions applied:
 *   ✔ "BeginDOS" → "Begin DOS" everywhere
 *   ✔ Total Charges shown prominently in KPI cards and tooltips
 *   ✔ "Go back" → "More Info" button label
 *   ✔ Charges added to hover tooltip on all bar rows
 *   ✔ GCR removed from DOE tab
 *   ✔ DOS is the default/main tab
 *   ✔ "Month of entry" → "DOD" label
 *   ✔ Total Charges shown in DOD chart
 *   ✔ Oral Swab panels separated via panel-type filter
 *   ✔ Referring Provider analysis included as a group button
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient }        from '@tanstack/react-query';
import { panelApi }                         from '../../../api/panel.api';

// ── Color palettes per tab ────────────────────────────────────────────────────
const COLORS = {
  dos: { charge: '#163d5c', payment: '#a3d977', balance: '#f97316', trend: '#3dd5c0' },
  doe: { charge: '#1e4d6b', payment: '#6ee7a0', balance: '#fb923c', trend: '#60a5fa' },
  dod: { charge: '#1a3a52', payment: '#3b82f6', balance: '#f59e0b', trend: '#a78bfa' },
};

// ── React Query shared options ────────────────────────────────────────────────
const Q = {
  staleTime:            0,
  retry:                3,
  retryDelay:           (attempt) => Math.min(1500 * 2 ** attempt, 15_000),
  refetchOnMount:       true,
  refetchOnWindowFocus: true,
};

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtCount  = (v) => Number(v || 0).toLocaleString('en-US');
const fmtPct    = (v) => `${Number(v || 0).toFixed(1)}%`;
const fmtMoney  = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};
const fmtMoneyFull = (v) =>
  `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fmtMonthLabel(m) {
  if (!m || m === 'all') return 'All Months';
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

// ── Charges Vs Payments Vertical Bar Chart ────────────────────────────────────
// Matches the "Charges Vs Payments - Payor" and "Charges Vs Payments by Panel"
// charts shown in the Excel screenshots. Dark-blue bars = Charges, Orange = Payments.
const CHART_CHARGE_COLOR  = '#163d5c';
const CHART_PAYMENT_COLOR = '#e07b39';

function ChargesVsPaymentsChart({ data, loading, error, onRetry }) {
  const rows = data || [];

  const maxVal = useMemo(() => {
    if (!rows.length) return 1_000_000;
    return niceMax(Math.max(...rows.map((r) => Number(r.total_charge || 0)), 1));
  }, [rows]);

  // Y-axis grid lines (6 steps from 0 to maxVal)
  const yTicks = useMemo(() => {
    const steps = 5;
    return Array.from({ length: steps + 1 }, (_, i) => (maxVal / steps) * i);
  }, [maxVal]);

  if (loading) {
    return <div className="h-56 animate-pulse rounded-xl bg-slate-50 dark:bg-zinc-900" />;
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-56 gap-3">
        <p className="text-sm text-slate-400 dark:text-zinc-500">Unable to reach database</p>
        <button
          onClick={onRetry}
          className="text-xs px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
        >
          ↺ Retry
        </button>
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-400 dark:text-zinc-500">
        No data available
      </div>
    );
  }

  const CHART_H    = 220;   // px — chart area height (reduced to limit page scroll)
  const BAR_GAP    = 6;     // px between charge/payment bars in a group
  const GROUP_PAD  = 10;    // px between groups
  const LABEL_AREA = 72;    // px — bottom label area height
  const Y_AXIS_W   = 80;    // px — left axis width
  const RIGHT_PAD  = 16;
  const LABEL_FONT = 9;

  // Compute bar width from number of groups
  const n           = rows.length;
  // We'll calculate widths dynamically in the SVG via viewBox

  const INNER_W     = Math.max(n * 70, 500);
  const SVG_W       = Y_AXIS_W + INNER_W + RIGHT_PAD;
  const SVG_H       = CHART_H + LABEL_AREA;
  const groupW      = INNER_W / n;
  const barW        = Math.max((groupW - GROUP_PAD - BAR_GAP) / 2, 6);

  const yScale = (v) => CHART_H - (Number(v || 0) / maxVal) * CHART_H;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: '100%', minWidth: Math.max(SVG_W, 480), height: 'auto' }}
        className="font-sans"
      >
        {/* ── Y-axis labels only (no grid lines) ── */}
        {yTicks.map((tick) => {
          const y = yScale(tick);
          return (
            <text
              key={tick}
              x={Y_AXIS_W - 4} y={y + 3}
              textAnchor="end" fontSize={LABEL_FONT} fill="#94a3b8"
            >
              {tick >= 1_000_000
                ? `$${(tick / 1_000_000).toFixed(1)}M`
                : tick >= 1_000
                ? `$${(tick / 1_000).toFixed(0)}K`
                : `$${tick}`}
            </text>
          );
        })}

        {/* ── Baseline ── */}
        <line
          x1={Y_AXIS_W} y1={CHART_H} x2={SVG_W - RIGHT_PAD} y2={CHART_H}
          stroke="#cbd5e1" strokeWidth="1"
        />

        {/* ── Bars per group ── */}
        {rows.map((row, i) => {
          const groupX   = Y_AXIS_W + i * groupW + GROUP_PAD / 2;
          const chargeH  = (Number(row.total_charge  || 0) / maxVal) * CHART_H;
          const paymentH = (Number(row.total_payment || 0) / maxVal) * CHART_H;
          const cx       = groupX + barW / 2;              // charge bar center-x
          const px       = cx + barW + BAR_GAP;            // payment bar center-x

          const chargeY  = CHART_H - chargeH;
          const paymentY = CHART_H - paymentH;

          // Short label for x-axis (truncate at ~12 chars)
          const xLabel = row.grp_name?.length > 14
            ? row.grp_name.slice(0, 13) + '…'
            : (row.grp_name || '—');

          return (
            <g key={row.grp_name} className="group">
              {/* Charge bar */}
              <rect
                x={groupX}
                y={chargeY}
                width={barW}
                height={Math.max(chargeH, 1)}
                fill={CHART_CHARGE_COLOR}
                rx="1"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <title>{`${row.grp_name}\nCharges: ${fmtMoneyFull(row.total_charge)}\nPayment: ${fmtMoneyFull(row.total_payment)}\nGCR: ${fmtPct(row.gcr_pct)}`}</title>
              </rect>

              {/* Charge label above bar */}
              {chargeH > 6 && (
                <text
                  x={cx} y={chargeY - 3}
                  textAnchor="middle" fontSize={LABEL_FONT - 1} fill="#475569"
                >
                  {fmtMoney(row.total_charge)}
                </text>
              )}

              {/* Payment bar */}
              <rect
                x={groupX + barW + BAR_GAP}
                y={paymentY}
                width={barW}
                height={Math.max(paymentH, 1)}
                fill={CHART_PAYMENT_COLOR}
                rx="1"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <title>{`${row.grp_name}\nCharges: ${fmtMoneyFull(row.total_charge)}\nPayment: ${fmtMoneyFull(row.total_payment)}\nGCR: ${fmtPct(row.gcr_pct)}`}</title>
              </rect>

              {/* Payment label above bar */}
              {paymentH > 6 && (
                <text
                  x={px} y={paymentY - 3}
                  textAnchor="middle" fontSize={LABEL_FONT - 1} fill="#9a3412"
                >
                  {fmtMoney(row.total_payment)}
                </text>
              )}

              {/* X-axis label — rotated */}
              <text
                x={groupX + barW + BAR_GAP / 2}
                y={CHART_H + 12}
                textAnchor="end"
                fontSize={LABEL_FONT}
                fill="#64748b"
                transform={`rotate(-40, ${groupX + barW + BAR_GAP / 2}, ${CHART_H + 12})`}
              >
                {xLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex gap-5 mt-1 px-2 pb-1">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-400">
          <span className="w-3 h-3 rounded-sm flex-none" style={{ backgroundColor: CHART_CHARGE_COLOR }} />
          Total Charges
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-400">
          <span className="w-3 h-3 rounded-sm flex-none" style={{ backgroundColor: CHART_PAYMENT_COLOR }} />
          Total Payments
        </div>
      </div>
    </div>
  );
}

// ── X-Axis Ruler ──────────────────────────────────────────────────────────────
function XAxisRuler({ maxVal, labelW }) {
  const ticks = useMemo(() => {
    const step = maxVal / 7;
    return Array.from({ length: 8 }, (_, i) => Math.round(i * step));
  }, [maxVal]);

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

// ── Metric Row ────────────────────────────────────────────────────────────────
function MetricRow({ label, value, barVal, maxVal, barColor }) {
  const isBar = barVal != null && barVal > 0;
  const pct   = isBar ? Math.min((barVal / maxVal) * 100, 100) : 0;

  return (
    <div className="flex items-center h-[26px] text-[10px] border-b border-slate-100 dark:border-zinc-800/60 last:border-b-0">
      <div className="flex-none w-[130px] text-slate-500 dark:text-zinc-400 pl-1 leading-tight">
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

// ── Group Row (one entity block: one payor/panel/provider) ────────────────────
function GroupRow({ row, maxVal, colors, isLast, showGcr, isInfoExpanded, onToggleInfo }) {
  const metrics = [
    { label: '# of Visits',          value: fmtCount(row.visit_count),         bar: false },
    { label: '# of Panels',          value: fmtCount(row.panel_count),         bar: false },
    { label: '# of Paid Panels',     value: fmtCount(row.paid_panel_count),    bar: false },
    { label: 'Total Charges',         value: fmtMoney(row.total_charge),        bar: true, barVal: Number(row.total_charge   || 0), barColor: colors.charge },
    { label: 'Total Payment',         value: fmtMoney(row.total_payment),       bar: true, barVal: Number(row.total_payment  || 0), barColor: colors.payment },
    { label: 'Total Balance',         value: fmtMoney(row.total_balance),       bar: true, barVal: Number(row.total_balance  || 0), barColor: colors.balance },
    ...(showGcr ? [{ label: 'GCR %', value: fmtPct(row.gcr_pct),              bar: false }] : []),
    { label: 'Avg Charge / Visit',    value: fmtMoney(row.avg_charge_per_visit), bar: false },
    { label: 'Avg Payment / Visit',   value: fmtMoney(row.avg_payment_per_visit), bar: false },
  ];

  const expanded = isInfoExpanded;

  return (
    <div className={`group/row ${!isLast ? 'border-b border-slate-200 dark:border-zinc-700' : ''}`}>
      <div className="flex">
        {/* Name column */}
        <div className="flex-none w-[120px] py-2 pr-2 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-700 dark:text-zinc-300 leading-tight uppercase break-words">
            {row.grp_name}
          </span>
          {/* "More Info" button — replaces "Go back" per Word suggestion */}
          <button
            onClick={onToggleInfo}
            className="mt-1 text-[9px] px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors self-start"
          >
            {expanded ? 'Less' : 'More Info'}
          </button>
        </div>

        {/* Metrics */}
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

      {/* Expanded "More Info" panel */}
      {expanded && (
        <div className="mx-2 mb-2 p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 text-[10px] space-y-1">
          <div className="font-bold text-slate-600 dark:text-zinc-300 text-[11px] mb-2">
            Detailed Breakdown — {row.grp_name}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div><span className="text-slate-400">Total Charges:</span> <strong>{fmtMoneyFull(row.total_charge)}</strong></div>
            <div><span className="text-slate-400">Total Payment:</span> <strong>{fmtMoneyFull(row.total_payment)}</strong></div>
            <div><span className="text-slate-400">Total Balance:</span> <strong>{fmtMoneyFull(row.total_balance)}</strong></div>
            {showGcr && <div><span className="text-slate-400">GCR %:</span> <strong>{fmtPct(row.gcr_pct)}</strong></div>}
            <div><span className="text-slate-400">Visits:</span> <strong>{fmtCount(row.visit_count)}</strong></div>
            <div><span className="text-slate-400">Panels Ordered:</span> <strong>{fmtCount(row.panel_count)}</strong></div>
            <div><span className="text-slate-400">Paid Panels:</span> <strong>{fmtCount(row.paid_panel_count)}</strong></div>
            <div>
              <span className="text-slate-400">Paid Panel Rate:</span>{' '}
              <strong>
                {row.panel_count > 0
                  ? fmtPct((row.paid_panel_count / row.panel_count) * 100)
                  : '—'}
              </strong>
            </div>
            <div><span className="text-slate-400">Avg Charge / Visit:</span> <strong>{fmtMoneyFull(row.avg_charge_per_visit)}</strong></div>
            <div><span className="text-slate-400">Avg Payment / Visit:</span> <strong>{fmtMoneyFull(row.avg_payment_per_visit)}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel Chart Component ─────────────────────────────────────────────────────
function PanelChart({ data, colors, loading, error, onRetry, showGcr }) {
  const LABEL_W = 120 + 130; // name col + metric label col

  const [expandedRows, setExpandedRows] = useState({});
  const toggleRow = useCallback((name) => {
    setExpandedRows((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const maxVal = useMemo(() => {
    if (!data?.length) return 100_000;
    const vals = data.flatMap((r) => [
      Number(r.total_charge   || 0),
      Number(r.total_payment  || 0),
      Number(r.total_balance  || 0),
    ]);
    return niceMax(Math.max(...vals, 1));
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[200px] animate-pulse rounded-xl bg-slate-50 dark:bg-zinc-900" />
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
        <p className="text-sm text-slate-500 dark:text-zinc-400">Unable to reach database</p>
        <button
          onClick={onRetry}
          className="text-xs px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
        >
          ↺ Retry
        </button>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="py-8 text-center text-sm text-slate-400 dark:text-zinc-500">
        No data available
      </div>
    );
  }

  return (
    <div>
      <XAxisRuler maxVal={maxVal} labelW={LABEL_W} />
      <div className="mt-1 divide-y-0">
        {data.map((row, i) => (
          <GroupRow
            key={row.grp_name}
            row={row}
            maxVal={maxVal}
            colors={colors}
            isLast={i === data.length - 1}
            showGcr={showGcr}
            isInfoExpanded={!!expandedRows[row.grp_name]}
            onToggleInfo={() => toggleRow(row.grp_name)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Chart Card Wrapper ────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }) {
  return (
    <div
      data-export-item
      data-export-label={title}
      data-export-id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
      className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 overflow-hidden flex flex-col"
    >
      <div className="px-5 py-3 border-b border-slate-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-200">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {/* max-h capped at 360px so the page doesn't require excessive scrolling */}
      <div className="px-4 py-2 flex-1 overflow-y-auto max-h-[360px]">
        {children}
      </div>
    </div>
  );
}

// ── Month Selector ────────────────────────────────────────────────────────────
function MonthSelector({ months, value, onChange }) {
  return (
    <select
      value={value || 'all'}
      onChange={(e) => onChange(e.target.value)}
      className="text-[11px] rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                 text-slate-600 dark:text-zinc-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-500/30"
    >
      <option value="all">All Months</option>
      {months.map((m) => (
        <option key={m} value={m}>{fmtMonthLabel(m)}</option>
      ))}
    </select>
  );
}

// ── Panel Type Filter Buttons ─────────────────────────────────────────────────
const PANEL_TYPES = [
  { id: 'all',   label: 'All Panels' },
  { id: 'urine', label: 'Urine' },
  { id: 'oral',  label: 'Oral Swab' },
  { id: 'other', label: 'Other' },
];

function PanelTypeFilter({ value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {PANEL_TYPES.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
            value === id
              ? 'bg-slate-700 dark:bg-zinc-200 text-white dark:text-zinc-900 border-slate-700 dark:border-zinc-200'
              : 'bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-slate-400'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Group Buttons ─────────────────────────────────────────────────────────────
const GROUPS = [
  { id: 'payor',             label: 'Payor'              },
  { id: 'panel',             label: 'Panel'              },
  { id: 'provider',          label: 'Provider'           },
  { id: 'referringprovider', label: 'Referring Provider' },
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function QFDPanelAnalysisPage() {
  // Tab state — DOS is default (Word file: "DOS should be the main tab")
  const [tab,        setTab]        = useState('dos');
  const [groupBy,    setGroupBy]    = useState('payor');
  const [panelType,  setPanelType]  = useState('all');
  const [monthL12,   setMonthL12]   = useState('all');

  const qc = useQueryClient();

  const colors    = COLORS[tab] || COLORS.dos;
  // Word file: "Remove GCR / NCR info" from DOE tab
  const showGcr   = tab !== 'doe';

  // ── Charges vs Payments — Payor chart (always payor grouping, full L12) ──────
  const payorChartQ = useQuery({
    queryKey: ['panel', tab, 'cvp-payor'],
    queryFn: () => {
      const fn = tab === 'dos' ? panelApi.getDosLast12 : tab === 'doe' ? panelApi.getDoeLast12 : panelApi.getDodLast12;
      return fn('payor', null, null, null).then((r) => r.data?.data?.rows || []);
    },
    ...Q,
  });

  // ── Charges vs Payments — Panel chart (always panel grouping, full L12) ──────
  const panelChartQ = useQuery({
    queryKey: ['panel', tab, 'cvp-panel'],
    queryFn: () => {
      const fn = tab === 'dos' ? panelApi.getDosLast12 : tab === 'doe' ? panelApi.getDoeLast12 : panelApi.getDodLast12;
      return fn('panel', null, null, null).then((r) => r.data?.data?.rows || []);
    },
    ...Q,
  });

  // ── Last-12 query ──────────────────────────────────────────────────────────
  const last12Key = ['panel', tab, 'last12', groupBy, monthL12, panelType];
  const last12Q   = useQuery({
    queryKey: last12Key,
    queryFn: () => {
      const fn =
        tab === 'dos' ? panelApi.getDosLast12  :
        tab === 'doe' ? panelApi.getDoeLast12  :
                        panelApi.getDodLast12;
      return fn(groupBy, null, monthL12 === 'all' ? null : monthL12, panelType === 'all' ? null : panelType)
        .then((r) => r.data?.data || { rows: [], months: [] });
    },
    ...Q,
  });

  // ── Last-month query ───────────────────────────────────────────────────────
  const lastMonthKey = ['panel', tab, 'lastmonth', groupBy, panelType];
  const lastMonthQ   = useQuery({
    queryKey: lastMonthKey,
    queryFn: () => {
      const fn =
        tab === 'dos' ? panelApi.getDosLastMonth  :
        tab === 'doe' ? panelApi.getDoeLastMonth  :
                        panelApi.getDodLastMonth;
      return fn(groupBy, null, panelType === 'all' ? null : panelType)
        .then((r) => r.data?.data || { rows: [] });
    },
    ...Q,
  });

  const availMonths = last12Q.data?.months || [];
  const rowsL12     = last12Q.data?.rows   || [];
  const rowsLM      = lastMonthQ.data?.rows || [];

  // ── Retry helper ───────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['panel'] });
  }, [qc]);

  // ── Tab labels ─────────────────────────────────────────────────────────────
  // Word file: "BeginDOS" → "Begin DOS"; "Month of entry" → "DOD"
  const TAB_LABELS = { dos: 'DOS', doe: 'DOE', dod: 'DOD' };
  const TAB_SUBTITLES = {
    dos: 'By Begin DOS',
    doe: 'By Date of Entry',
    dod: 'By DOD (End DOS)',   // Word: "Month of entry → DOD"
  };

  const tabTitle = (suffix) => {
    const group = GROUPS.find((g) => g.id === groupBy)?.label || 'Payor';
    const tabLbl = TAB_LABELS[tab];
    return `${group} Analysis — ${tabLbl} ${suffix}`;
  };

  return (
    <div className="flex flex-col gap-6 p-6 min-h-full bg-slate-50 dark:bg-zinc-950">

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-zinc-100">Panel Analysis</h1>
          <p className="text-[12px] text-slate-400 dark:text-zinc-500 mt-0.5">
            {TAB_SUBTITLES[tab]} — {GROUPS.find((g) => g.id === groupBy)?.label}
          </p>
        </div>

        {/* Tab buttons — DOS | DOE | DOD */}
        <div className="flex gap-1.5 bg-white dark:bg-zinc-900 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-zinc-800">
          {(['dos', 'doe', 'dod']).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setMonthL12('all'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === t
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Charges Vs Payments Charts ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Chart 1: Charges Vs Payments — Payor */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-200">
              Charges Vs Payments — Payor
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
              Last 12 months · {TAB_LABELS[tab]} · Hover bar for full detail
            </p>
          </div>
          <div className="px-4 py-4">
            <ChargesVsPaymentsChart
              data={payorChartQ.data}
              loading={payorChartQ.isFetching}
              error={payorChartQ.isError}
              onRetry={handleRetry}
            />
          </div>
        </div>

        {/* Chart 2: Charges Vs Payments — Panel */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-200">
              Charges Vs Payments by Panel
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
              Last 12 months · {TAB_LABELS[tab]} · Hover bar for full detail
            </p>
          </div>
          <div className="px-4 py-4">
            <ChargesVsPaymentsChart
              data={panelChartQ.data}
              loading={panelChartQ.isFetching}
              error={panelChartQ.isError}
              onRetry={handleRetry}
            />
          </div>
        </div>

      </div>

      {/* ── Group Buttons + Panel Type Filter ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Group buttons */}
        <div className="flex gap-2 flex-wrap">
          {GROUPS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setGroupBy(id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                groupBy === id
                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-red-300 dark:hover:border-red-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="sm:ml-auto">
          {/* Word: "Oral swabs should be separated. Let's not include Urine." */}
          <PanelTypeFilter value={panelType} onChange={setPanelType} />
        </div>
      </div>

      {/* ── Two-Card Layout: Last 12 Months | Last Month ───────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Left: Last 12 Months */}
        <ChartCard
          title={tabTitle('— Last 12 Months')}
          subtitle={
            <span className="flex items-center gap-2 flex-wrap">
              {TAB_SUBTITLES[tab]}
              {' • '}
              {/* Word: "BeginDOS" → "Begin DOS" */}
              {tab === 'dos' ? 'Begin DOS' : tab === 'doe' ? 'Date of Entry' : 'DOD'}
              {availMonths.length > 0 && (
                <MonthSelector
                  months={availMonths}
                  value={monthL12}
                  onChange={setMonthL12}
                />
              )}
            </span>
          }
        >
          <PanelChart
            data={rowsL12}
            colors={colors}
            loading={last12Q.isFetching}
            error={last12Q.isError}
            onRetry={handleRetry}
            showGcr={showGcr}
          />
        </ChartCard>

        {/* Right: Last Month */}
        <ChartCard
          title={tabTitle('— Last Month')}
          subtitle={TAB_SUBTITLES[tab]}
        >
          <PanelChart
            data={rowsLM}
            colors={colors}
            loading={lastMonthQ.isFetching}
            error={lastMonthQ.isError}
            onRetry={handleRetry}
            showGcr={showGcr}
          />
        </ChartCard>
      </div>

      {/* ── Summary Table (collapsible) ─────────────────────────────────────── */}
      <SummaryTable
        rows={rowsL12}
        tab={tab}
        showGcr={showGcr}
        loading={last12Q.isFetching}
        monthLabel={monthL12 === 'all' ? 'Last 12 Months' : fmtMonthLabel(monthL12)}
      />
    </div>
  );
}

// ── Summary Data Table (collapsible, max-h capped) ───────────────────────────
function SummaryTable({ rows, tab, showGcr, loading, monthLabel }) {
  const [open,    setOpen]    = useState(false);   // collapsed by default
  const [sortCol, setSortCol] = useState('total_charge');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    if (!rows?.length) return [];
    return [...rows].sort((a, b) => {
      const av = Number(a[sortCol] || 0);
      const bv = Number(b[sortCol] || 0);
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [rows, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => (
    <span className="ml-1 text-[9px]">
      {sortCol === col ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'}
    </span>
  );

  const cols = [
    { key: 'grp_name',             label: 'Name',                  money: false },
    { key: 'visit_count',          label: '# Visits',              money: false },
    { key: 'panel_count',          label: '# Panels',              money: false },
    { key: 'paid_panel_count',     label: '# Paid Panels',         money: false },
    { key: 'total_charge',         label: 'Total Charges',         money: true  },
    { key: 'total_payment',        label: 'Total Payment',         money: true  },
    { key: 'total_balance',        label: 'Total Balance',         money: true  },
    ...(showGcr ? [{ key: 'gcr_pct', label: 'GCR %',             money: false, pct: true }] : []),
    { key: 'avg_charge_per_visit', label: 'Avg Chg/Visit',         money: true  },
    { key: 'avg_payment_per_visit',label: 'Avg Pay/Visit',         money: true  },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
      >
        <div className="text-left">
          <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-200">
            Data Table — {monthLabel}
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
            {open ? 'Click to collapse · Sort by column header' : 'Click to expand'}
          </p>
        </div>
        <span className="text-slate-400 dark:text-zinc-500 text-lg leading-none ml-4">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Table body — only rendered when expanded */}
      {open && <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-800/60">
              {cols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => c.key !== 'grp_name' && handleSort(c.key)}
                  className={`px-3 py-2.5 text-left font-semibold text-slate-500 dark:text-zinc-400 whitespace-nowrap
                    ${c.key !== 'grp_name' ? 'cursor-pointer hover:text-slate-700 dark:hover:text-zinc-200' : ''}
                    ${sortCol === c.key ? 'text-red-600 dark:text-red-400' : ''}`}
                >
                  {c.label}
                  {c.key !== 'grp_name' && <SortIcon col={c.key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-zinc-800">
                  {cols.map((c) => (
                    <td key={c.key} className="px-3 py-2">
                      <div className="h-3 rounded bg-slate-100 dark:bg-zinc-800 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="px-3 py-8 text-center text-slate-400 dark:text-zinc-500">
                  No data available
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={i}
                  className="border-t border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors group"
                >
                  {cols.map((c) => {
                    const v = row[c.key];
                    let display;
                    if (c.key === 'grp_name') display = v || '—';
                    else if (c.pct) display = fmtPct(v);
                    else if (c.money) display = fmtMoneyFull(v);
                    else display = fmtCount(v);

                    return (
                      <td
                        key={c.key}
                        className={`px-3 py-2 whitespace-nowrap ${
                          c.key === 'grp_name'
                            ? 'font-semibold text-slate-700 dark:text-zinc-200 max-w-[200px] truncate'
                            : 'text-slate-600 dark:text-zinc-300'
                        } ${sortCol === c.key ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}
                        title={c.key === 'grp_name' ? (v || '—') : undefined}
                      >
                        {/* Word: "Add charges to hoverover info" — title attr on money cells */}
                        {c.money ? (
                          <span title={`${c.label}: ${fmtMoneyFull(v)} | Charges: ${fmtMoneyFull(row.total_charge)}`}>
                            {display}
                          </span>
                        ) : display}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
          {/* Totals row */}
          {sorted.length > 0 && !loading && (
            <tfoot>
              <tr className="border-t-2 border-slate-300 dark:border-zinc-600 bg-slate-50 dark:bg-zinc-800/60 font-bold">
                {cols.map((c) => {
                  if (c.key === 'grp_name') return <td key={c.key} className="px-3 py-2.5 text-slate-600 dark:text-zinc-300">TOTAL</td>;
                  const total = sorted.reduce((acc, r) => acc + Number(r[c.key] || 0), 0);
                  let display;
                  if (c.key === 'gcr_pct') {
                    // Recalculate GCR from totals
                    const tc = sorted.reduce((a, r) => a + Number(r.total_charge  || 0), 0);
                    const tp = sorted.reduce((a, r) => a + Number(r.total_payment || 0), 0);
                    display = tc > 0 ? fmtPct((tp / tc) * 100) : '0.0%';
                  } else if (c.pct) {
                    display = '—';
                  } else if (c.money) {
                    display = fmtMoneyFull(total);
                  } else {
                    display = fmtCount(total);
                  }
                  return (
                    <td key={c.key} className="px-3 py-2.5 text-slate-700 dark:text-zinc-200 whitespace-nowrap">
                      {display}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>}
    </div>
  );
}
