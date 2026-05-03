/**
 * QFDClinicalAnalysisPage.jsx — Clinical Analysis dashboard page.
 *
 * Data source  : iq_qfd.pipeline table
 * Sub-tabs     :
 *   1. Weekly Overview  — weekly PCR + TOX volume trend + active clinic counts
 *   2. Clinic Breakdown — per-clinic ranked bars, PCR vs TOX split, top-10 trend
 *   3. Clinical Detail  — provider volume, panel distribution, specimen type, technician
 *
 * Charts use inline SVG (no external library) for full control + performance.
 * Same dark-mode / color conventions as other QFD pages.
 */

import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clinicalApi } from '../../../api/clinical.api';

// ── React Query shared options ────────────────────────────────────────────────
const Q = {
  staleTime:            0,
  retry:                3,
  retryDelay:           (a) => Math.min(1500 * 2 ** a, 15_000),
  refetchOnMount:       true,
  refetchOnWindowFocus: true,
};

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  pcr:     '#2563eb',   // blue-600 (higher contrast on white cards)
  tox:     '#f59e0b',   // amber
  total:   '#6366f1',   // indigo
  clinics: '#10b981',   // emerald
  newClin: '#f97316',   // orange
  charge:  '#163d5c',
  payment: '#e07b39',
};

const TAB_COLORS = [
  '#3b82f6','#f59e0b','#10b981','#f97316','#6366f1','#ec4899',
  '#14b8a6','#ef4444','#a855f7','#06b6d4','#84cc16','#8b5cf6',
];

// ── Formatters ─────────────────────────────────────────────────────────────────
const fmtNum = (v) => Number(v || 0).toLocaleString('en-US');
const fmtShort = (v) => {
  const n = Number(v || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};
const fmtPct = (num, denom) =>
  denom > 0 ? `${((num / denom) * 100).toFixed(1)}%` : '0%';

function fmtWeek(w) {
  if (!w) return '';
  const d = new Date(w);
  return isNaN(d) ? w : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── nice Y-axis ceiling ───────────────────────────────────────────────────────
function niceMax(v) {
  if (!v || v <= 0) return 10;
  const mag  = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  const n    = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 3 ? 3
             : norm <= 5 ? 5 : norm <= 7 ? 7 : 10;
  return n * mag;
}

// ── Small KPI card ────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-100 dark:border-zinc-800 px-5 py-4 flex flex-col gap-1">
      <div className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-zinc-500 font-medium">
        {label}
      </div>
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-400 dark:text-zinc-500">{sub}</div>}
    </div>
  );
}

// ── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, subtitle, children }) {
  return (
    <div
      data-export-item
      data-export-label={title}
      data-export-id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
      className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-200">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-4 py-4">
        {children}
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function Skeleton({ h = 240 }) {
  return <div className="animate-pulse rounded-xl bg-slate-50 dark:bg-zinc-800" style={{ height: h }} />;
}

// ── Error state ───────────────────────────────────────────────────────────────
function ErrorState({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <p className="text-sm text-slate-500 dark:text-zinc-400">Unable to reach database</p>
      <button
        onClick={onRetry}
        className="text-xs px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
      >
        ↺ Retry
      </button>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function Empty() {
  return (
    <div className="py-10 text-center text-sm text-slate-400 dark:text-zinc-500">
      No data available
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Line Chart (multi-series) — with hover tooltip overlay
// series: [{ key, label, color, data: [{x, y}] }]
// ─────────────────────────────────────────────────────────────────────────────
function LineChart({ series, xLabels, height = 220, loading, error, onRetry }) {
  const [hovered, setHovered] = useState(null); // { idx, pctX }
  const svgRef = useRef(null);

  if (loading) return <Skeleton h={height} />;
  if (error)   return <ErrorState onRetry={onRetry} />;
  if (!series?.length || !xLabels?.length) return <Empty />;

  const allY = series.flatMap((s) => s.data.map((d) => d.y || 0));
  const maxY = niceMax(Math.max(...allY, 1));
  const ySteps = 5;
  const yTicks = Array.from({ length: ySteps + 1 }, (_, i) => (maxY / ySteps) * i);

  const PAD_L = 54, PAD_R = 16, PAD_T = 14, PAD_B = 40;
  const W = 900, H = height;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const xScale = (i) => PAD_L + (i / (xLabels.length - 1 || 1)) * chartW;
  const yScale = (v) => PAD_T + chartH - (v / maxY) * chartH;

  // Smooth cubic-bezier path (Catmull-Rom → cubic bezier approximation)
  const pathFor = (data) => {
    if (!data.length) return '';
    const pts = data.map((d, i) => [xScale(i), yScale(d.y || 0)]);
    if (pts.length === 1) return `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const tension = 0.35;
      const cp1x = x0 + (x1 - x0) * tension;
      const cp2x = x1 - (x1 - x0) * tension;
      d += ` C ${cp1x.toFixed(1)} ${y0.toFixed(1)}, ${cp2x.toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
    return d;
  };

  // Mouse move → find nearest data point index
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const svgX = (relX / rect.width) * W;
    const rawIdx = (svgX - PAD_L) / chartW * (xLabels.length - 1);
    const idx = Math.max(0, Math.min(xLabels.length - 1, Math.round(rawIdx)));
    const pctX = (xScale(idx) / W) * 100;
    setHovered({ idx, pctX });
  };

  // Show ~8 x-axis labels
  const xStep = Math.max(1, Math.floor(xLabels.length / 8));

  return (
    <div className="relative" onMouseLeave={() => setHovered(null)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', cursor: 'crosshair', display: 'block' }}
        className="font-sans"
        onMouseMove={handleMouseMove}
      >
        {/* Y-axis labels only — no grid lines */}
        {yTicks.map((t) => {
          const y = yScale(t);
          return (
            <text key={t} x={PAD_L - 4} y={y + 3.5} textAnchor="end" fontSize={9} fill="#94a3b8">
              {fmtShort(t)}
            </text>
          );
        })}

        {/* X-axis baseline */}
        <line x1={PAD_L} y1={PAD_T + chartH} x2={W - PAD_R} y2={PAD_T + chartH} stroke="#cbd5e1" strokeWidth="1" />

        {/* X-axis labels */}
        {xLabels.map((lbl, i) => {
          if (i % xStep !== 0 && i !== xLabels.length - 1) return null;
          return (
            <text
              key={i}
              x={xScale(i)} y={PAD_T + chartH + 14}
              textAnchor="middle" fontSize={8.5} fill="#64748b"
            >
              {fmtWeek(lbl)}
            </text>
          );
        })}

        {/* Series lines */}
        {series.map((s) => (
          <g key={s.key}>
            <path
              d={pathFor(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.data.map((d, i) => (
              <circle key={i} cx={xScale(i)} cy={yScale(d.y || 0)} r="2.5" fill={s.color} />
            ))}
          </g>
        ))}

        {/* Hover: vertical guide line */}
        {hovered && (
          <line
            x1={xScale(hovered.idx)} y1={PAD_T}
            x2={xScale(hovered.idx)} y2={PAD_T + chartH}
            stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Hover: enlarged dots per series */}
        {hovered && series.map((s) => (
          <circle
            key={s.key}
            cx={xScale(hovered.idx)}
            cy={yScale(s.data[hovered.idx]?.y || 0)}
            r="4.5"
            fill={s.color}
            stroke="white"
            strokeWidth="2"
            style={{ pointerEvents: 'none' }}
          />
        ))}
      </svg>

      {/* Tooltip overlay */}
      {hovered && (
        <div
          className="absolute pointer-events-none z-20 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl px-3 py-2.5 min-w-[120px]"
          style={{
            top: '6px',
            left: `${hovered.pctX}%`,
            transform: hovered.pctX > 68 ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
          }}
        >
          <div className="text-[10px] font-bold text-slate-600 dark:text-zinc-300 mb-1.5 border-b border-slate-100 dark:border-zinc-700 pb-1">
            {fmtWeek(xLabels[hovered.idx])}
          </div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3 py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: s.color }} />
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">{s.label}</span>
              </div>
              <span className="text-[10px] font-bold" style={{ color: s.color }}>
                {fmtNum(s.data[hovered.idx]?.y || 0)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-1 px-1">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-400">
            <span className="w-5 h-0.5 flex-none inline-block" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal Bar Chart
// rows: [{ label, value, value2? }]
// ─────────────────────────────────────────────────────────────────────────────
function HBarChart({ rows, color1, color2, label1, label2, loading, error, onRetry, maxRows = 20 }) {
  if (loading) return <Skeleton h={260} />;
  if (error)   return <ErrorState onRetry={onRetry} />;
  if (!rows?.length) return <Empty />;

  const displayRows = rows.slice(0, maxRows);
  const maxVal = Math.max(...displayRows.map((r) => Math.max(Number(r.value || 0), Number(r.value2 || 0))), 1);

  return (
    <div className="space-y-0 overflow-y-auto" style={{ maxHeight: 340 }}>
      {displayRows.map((row, i) => {
        const v1  = Number(row.value  || 0);
        const v2  = Number(row.value2 || 0);
        const pct1 = Math.min((v1 / maxVal) * 100, 100);
        const pct2 = color2 ? Math.min((v2 / maxVal) * 100, 100) : 0;

        return (
          <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-50 dark:border-zinc-800/50 last:border-b-0">
            {/* Rank */}
            <span className="text-[9px] text-slate-300 dark:text-zinc-600 w-4 text-right flex-none">{i + 1}</span>
            {/* Label */}
            <span
              className="text-[10px] text-slate-600 dark:text-zinc-300 font-medium flex-none truncate"
              style={{ width: 130 }}
              title={row.label}
            >
              {row.label}
            </span>
            {/* Bars */}
            <div className="flex-1 flex flex-col gap-0.5">
              {/* Primary bar */}
              <div className="relative h-[10px] bg-slate-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{ width: `${pct1}%`, backgroundColor: color1 }}
                />
              </div>
              {/* Secondary bar (if provided) */}
              {color2 && (
                <div className="relative h-[10px] bg-slate-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full"
                    style={{ width: `${pct2}%`, backgroundColor: color2 }}
                  />
                </div>
              )}
            </div>
            {/* Value(s) */}
            <div className="flex-none text-right" style={{ width: 60 }}>
              <span className="text-[10px] font-bold" style={{ color: color1 }}>{fmtShort(v1)}</span>
              {color2 && (
                <span className="text-[10px] font-bold ml-1" style={{ color: color2 }}>{fmtShort(v2)}</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      {color2 && (
        <div className="flex gap-4 pt-2 px-1">
          <div className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-zinc-500">
            <span className="w-3 h-2 rounded-sm flex-none" style={{ backgroundColor: color1 }} />
            {label1}
          </div>
          <div className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-zinc-500">
            <span className="w-3 h-2 rounded-sm flex-none" style={{ backgroundColor: color2 }} />
            {label2}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Donut Chart (SVG)
// slices: [{ label, value, color }]
// ─────────────────────────────────────────────────────────────────────────────
function DonutChart({ slices, loading, error, onRetry }) {
  if (loading) return <Skeleton h={200} />;
  if (error)   return <ErrorState onRetry={onRetry} />;
  if (!slices?.length) return <Empty />;

  const total = slices.reduce((s, r) => s + Number(r.value || 0), 0);
  if (!total) return <Empty />;

  const R  = 80,  cx = 110, cy = 100;
  const r2 = 45;  // inner radius (donut hole)

  let angle = -Math.PI / 2;
  const paths = slices.slice(0, 12).map((slice) => {
    const val  = Number(slice.value || 0);
    const pct  = val / total;
    const span = pct * 2 * Math.PI;
    const x1   = cx + R * Math.cos(angle);
    const y1   = cy + R * Math.sin(angle);
    angle      += span;
    const x2   = cx + R * Math.cos(angle);
    const y2   = cy + R * Math.sin(angle);
    const xi1  = cx + r2 * Math.cos(angle);
    const yi1  = cy + r2 * Math.sin(angle);
    angle      -= span;
    const xi2  = cx + r2 * Math.cos(angle);
    const yi2  = cy + r2 * Math.sin(angle);
    angle      += span;

    const large = span > Math.PI ? 1 : 0;
    const d = [
      `M ${x1} ${y1}`,
      `A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,
      `L ${xi1} ${yi1}`,
      `A ${r2} ${r2} 0 ${large} 0 ${xi2} ${yi2}`,
      'Z',
    ].join(' ');

    return { d, color: slice.color, label: slice.label, pct, val };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      {/* SVG donut */}
      <svg viewBox="0 0 220 200" style={{ width: 180, height: 'auto', flexShrink: 0 }}>
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="1">
            <title>{`${p.label}: ${fmtNum(p.val)} (${(p.pct * 100).toFixed(1)}%)`}</title>
          </path>
        ))}
        {/* Center label */}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={10} fill="#64748b" fontWeight="600">Total</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize={13} fill="#1e293b" fontWeight="bold">{fmtShort(total)}</text>
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: 200 }}>
        {paths.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ backgroundColor: p.color }} />
            <span className="text-slate-600 dark:text-zinc-300 truncate flex-1" title={p.label}>{p.label}</span>
            <span className="font-bold text-slate-700 dark:text-zinc-200 flex-none">{fmtShort(p.val)}</span>
            <span className="text-slate-400 dark:text-zinc-500 flex-none">({(p.pct * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — Weekly Overview
// ─────────────────────────────────────────────────────────────────────────────
function WeeklyOverviewTab({ onRetry }) {
  const volumeQ   = useQuery({ queryKey: ['clinical-weekly-volume'],   queryFn: () => clinicalApi.getWeeklyVolume().then((r) => r.data?.data || []),   ...Q });
  const accountsQ = useQuery({ queryKey: ['clinical-weekly-accounts'], queryFn: () => clinicalApi.getWeeklyAccounts().then((r) => r.data?.data || []), ...Q });

  // Volume chart series
  const xLabels = useMemo(() => (volumeQ.data || []).map((r) => r.week), [volumeQ.data]);

  const volumeSeries = useMemo(() => [
    { key: 'tox',   label: 'TOX',        color: C.tox,   data: (volumeQ.data || []).map((r) => ({ y: Number(r.tox_count   || 0) })) },
    { key: 'pcr',   label: 'PCR',        color: C.pcr,   data: (volumeQ.data || []).map((r) => ({ y: Number(r.pcr_count   || 0) })) },
    { key: 'total', label: 'Total',      color: C.total, data: (volumeQ.data || []).map((r) => ({ y: Number(r.total_count || 0) })) },
  ], [volumeQ.data]);

  const accountsSeries = useMemo(() => [
    { key: 'active', label: 'Active Clinics', color: C.clinics, data: (accountsQ.data || []).map((r) => ({ y: Number(r.active_clinics || 0) })) },
    { key: 'new',    label: 'New Clinics',    color: C.newClin, data: (accountsQ.data || []).map((r) => ({ y: Number(r.new_clinics    || 0) })) },
  ], [accountsQ.data]);

  const accountXLabels = useMemo(() => (accountsQ.data || []).map((r) => r.week), [accountsQ.data]);

  // Summary stats from volume data
  const summary = useMemo(() => {
    const rows = volumeQ.data || [];
    const totTox = rows.reduce((s, r) => s + Number(r.tox_count   || 0), 0);
    const totPcr = rows.reduce((s, r) => s + Number(r.pcr_count   || 0), 0);
    const totAll = rows.reduce((s, r) => s + Number(r.total_count || 0), 0);
    const maxAct = Math.max(...rows.map((r) => Number(r.active_clinics || 0)), 0);
    return { totTox, totPcr, totAll, maxAct };
  }, [volumeQ.data]);

  return (
    <div className="space-y-5">

      {/* Weekly volume line chart */}
      <Card title="Weekly Volume — TOX / PCR / Total" subtitle="Distinct accessions per week">
        <LineChart
          series={volumeSeries}
          xLabels={xLabels}
          height={220}
          loading={volumeQ.isFetching}
          error={volumeQ.isError}
          onRetry={onRetry}
        />
      </Card>

      {/* Weekly active + new clinics */}
      <Card title="Weekly Accounts — Active & New Clinics" subtitle="Clinics submitting at least 1 accession per week">
        <LineChart
          series={accountsSeries}
          xLabels={accountXLabels}
          height={200}
          loading={accountsQ.isFetching}
          error={accountsQ.isError}
          onRetry={onRetry}
        />
      </Card>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Stacked Area Chart — Top 10 Clinics
// series: [{ key, label, color, data: [{y}] }]
// Features: clinic toggle buttons, hover tooltip, smooth bezier fills
// ─────────────────────────────────────────────────────────────────────────────
function StackedAreaChart({ series, xLabels, height = 220, loading, error, onRetry }) {
  const [focusClinic, setFocusClinic] = useState(null); // null = all visible
  const [hovered, setHovered] = useState(null);         // { idx, pctX }
  const svgRef = useRef(null);

  if (loading) return <Skeleton h={height} />;
  if (error)   return <ErrorState onRetry={onRetry} />;
  if (!series?.length || !xLabels?.length) return <Empty />;

  const PAD_L = 48, PAD_R = 16, PAD_T = 12, PAD_B = 36;
  const W = 900, H = height;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const n = xLabels.length;

  // Build stacked totals: for each x-point, cumulative sum per series
  const stackedData = [];
  const totals = Array(n).fill(0);

  series.forEach((s) => {
    const layer = s.data.map((d, i) => {
      const y0 = totals[i];
      const y1 = y0 + Number(d.y || 0);
      totals[i] = y1;
      return { y0, y1 };
    });
    stackedData.push(layer);
  });

  const maxY = niceMax(Math.max(...totals, 1));
  const yTicks = Array.from({ length: 5 }, (_, i) => (maxY / 4) * i);

  const xScale = (i) => PAD_L + (i / Math.max(n - 1, 1)) * chartW;
  const yScale = (v) => PAD_T + chartH - (v / maxY) * chartH;

  // Build area path
  const areaPath = (layer) => {
    const top = layer.map((p, i) => [xScale(i), yScale(p.y1)]);
    const bot = layer.map((p, i) => [xScale(i), yScale(p.y0)]);
    let d = `M ${top[0][0].toFixed(1)} ${top[0][1].toFixed(1)}`;
    for (let i = 1; i < top.length; i++) {
      const [x0, y0] = top[i - 1];
      const [x1, y1] = top[i];
      const t = 0.3;
      d += ` C ${(x0 + (x1-x0)*t).toFixed(1)} ${y0.toFixed(1)}, ${(x1 - (x1-x0)*t).toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
    for (let i = bot.length - 1; i >= 0; i--) {
      d += ` L ${bot[i][0].toFixed(1)} ${bot[i][1].toFixed(1)}`;
    }
    return d + ' Z';
  };

  // Mouse hover → nearest index
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const rawIdx = (svgX - PAD_L) / chartW * (n - 1);
    const idx = Math.max(0, Math.min(n - 1, Math.round(rawIdx)));
    setHovered({ idx, pctX: (xScale(idx) / W) * 100 });
  };

  const xStep = Math.max(1, Math.floor(n / 8));

  // When a clinic is focused, build an isolated single-series stacked view
  // showing only that clinic's data for a clean single-area view
  const focusedSeries = focusClinic ? series.filter((s) => s.key === focusClinic) : null;
  const focusedLayer = focusClinic
    ? series.map((s, si) => ({ s, si })).find(({ s }) => s.key === focusClinic)
    : null;

  return (
    <div>
      {/* ── Clinic toggle buttons ───────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5 mb-3 px-1">
        <button
          onClick={() => setFocusClinic(null)}
          className={`px-2.5 py-1 rounded-full text-[9px] font-semibold transition-all border ${
            focusClinic === null
              ? 'bg-slate-700 dark:bg-zinc-200 text-white dark:text-zinc-900 border-transparent shadow-sm'
              : 'bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-slate-400'
          }`}
        >
          All Clinics
        </button>
        {series.map((s) => (
          <button
            key={s.key}
            onClick={() => setFocusClinic(focusClinic === s.key ? null : s.key)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold transition-all border ${
              focusClinic === s.key
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-slate-400'
            }`}
            style={focusClinic === s.key ? { backgroundColor: s.color, borderColor: s.color } : {}}
            title={s.label}
          >
            <span
              className="w-2 h-2 rounded-full flex-none"
              style={{ backgroundColor: focusClinic === s.key ? 'rgba(255,255,255,0.7)' : s.color }}
            />
            <span className="max-w-[100px] truncate">{s.label}</span>
          </button>
        ))}
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────────── */}
      <div className="relative" onMouseLeave={() => setHovered(null)}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', cursor: 'crosshair', display: 'block' }}
          className="font-sans"
          onMouseMove={handleMouseMove}
        >
          {/* Y-axis labels */}
          {yTicks.map((t) => (
            <text key={t} x={PAD_L - 4} y={yScale(t) + 3.5} textAnchor="end" fontSize={9} fill="#94a3b8">
              {fmtShort(t)}
            </text>
          ))}

          {/* Baseline */}
          <line x1={PAD_L} y1={PAD_T + chartH} x2={W - PAD_R} y2={PAD_T + chartH} stroke="#cbd5e1" strokeWidth="1" />

          {/* Stacked areas */}
          {series.map((s, si) => {
            const isFocused  = focusClinic === null || focusClinic === s.key;
            const opacity    = focusClinic === null ? 0.82 : isFocused ? 0.92 : 0.10;
            return (
              <path
                key={s.key}
                d={areaPath(stackedData[si])}
                fill={s.color}
                fillOpacity={opacity}
                stroke={s.color}
                strokeWidth={isFocused && focusClinic ? 1.5 : 0.5}
                strokeOpacity={focusClinic && !isFocused ? 0.1 : 1}
                style={{ transition: 'fill-opacity 0.2s, stroke-opacity 0.2s' }}
              />
            );
          })}

          {/* X-axis labels */}
          {xLabels.map((lbl, i) => {
            if (i % xStep !== 0 && i !== n - 1) return null;
            return (
              <text key={i} x={xScale(i)} y={PAD_T + chartH + 14}
                textAnchor="middle" fontSize={8.5} fill="#64748b">
                {fmtWeek(lbl)}
              </text>
            );
          })}

          {/* Hover: vertical guide */}
          {hovered && (
            <line
              x1={xScale(hovered.idx)} y1={PAD_T}
              x2={xScale(hovered.idx)} y2={PAD_T + chartH}
              stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </svg>

        {/* Tooltip overlay */}
        {hovered && (
          <div
            className="absolute pointer-events-none z-20 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl px-3 py-2.5"
            style={{
              top: '4px',
              left: `${hovered.pctX}%`,
              transform: hovered.pctX > 68 ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
              minWidth: 160,
              maxHeight: 240,
              overflowY: 'auto',
            }}
          >
            <div className="text-[10px] font-bold text-slate-600 dark:text-zinc-300 mb-1.5 border-b border-slate-100 dark:border-zinc-700 pb-1">
              {fmtWeek(xLabels[hovered.idx])} — Total: {fmtNum(totals[hovered.idx] || 0)}
            </div>
            {[...series].reverse().map((s, ri) => {
              const si  = series.length - 1 - ri;
              const val = s.data[hovered.idx]?.y || 0;
              if (focusClinic && focusClinic !== s.key) return null;
              return (
                <div key={s.key} className="flex items-center justify-between gap-3 py-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ backgroundColor: s.color }} />
                    <span className="text-[9px] text-slate-500 dark:text-zinc-400 truncate max-w-[110px]" title={s.label}>{s.label}</span>
                  </div>
                  <span className="text-[10px] font-bold flex-none" style={{ color: s.color }}>{fmtNum(val)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Focused clinic summary strip */}
      {focusClinic && (() => {
        const s = series.find((s) => s.key === focusClinic);
        if (!s) return null;
        const vals = s.data.map((d) => Number(d.y || 0));
        const total = vals.reduce((a, b) => a + b, 0);
        const peak  = Math.max(...vals);
        const avg   = vals.length ? (total / vals.length) : 0;
        return (
          <div
            className="mt-2 mx-1 rounded-lg px-3 py-2 flex items-center gap-5 text-[10px]"
            style={{ backgroundColor: `${s.color}18`, border: `1px solid ${s.color}44` }}
          >
            <span className="font-bold" style={{ color: s.color }}>{s.label}</span>
            <span className="text-slate-500 dark:text-zinc-400">Total: <strong style={{ color: s.color }}>{fmtNum(total)}</strong></span>
            <span className="text-slate-500 dark:text-zinc-400">Avg/wk: <strong style={{ color: s.color }}>{fmtShort(avg)}</strong></span>
            <span className="text-slate-500 dark:text-zinc-400">Peak: <strong style={{ color: s.color }}>{fmtNum(peak)}</strong></span>
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — Clinic Breakdown
// ─────────────────────────────────────────────────────────────────────────────
function ClinicBreakdownTab({ onRetry }) {
  const summaryQ = useQuery({ queryKey: ['clinical-clinic-summary'], queryFn: () => clinicalApi.getClinicSummary().then((r) => r.data?.data || []), ...Q });
  const weeklyQ  = useQuery({ queryKey: ['clinical-clinic-weekly'],  queryFn: () => clinicalApi.getClinicWeekly(10).then((r)  => r.data?.data || []),  ...Q });

  // Ranked bars data
  const barRows = useMemo(() =>
    (summaryQ.data || []).map((r) => ({
      label:  r.clinic,
      value:  Number(r.tox_count   || 0),
      value2: Number(r.pcr_count   || 0),
    })),
    [summaryQ.data]
  );

  // Donut slices (top 12, rest as "Other")
  const donutSlices = useMemo(() => {
    const rows = summaryQ.data || [];
    const top  = rows.slice(0, 11);
    const rest = rows.slice(11);
    const others = rest.reduce((s, r) => s + Number(r.total_count || 0), 0);
    const slices = top.map((r, i) => ({
      label: r.clinic,
      value: Number(r.total_count || 0),
      color: TAB_COLORS[i % TAB_COLORS.length],
    }));
    if (others > 0) slices.push({ label: 'Other', value: others, color: '#94a3b8' });
    return slices;
  }, [summaryQ.data]);

  // Multi-line trend for top 10 clinics
  const { xLabels: clinicWeeklyX, clinicSeries } = useMemo(() => {
    const rows     = weeklyQ.data || [];
    const weeks    = [...new Set(rows.map((r) => r.week))].sort();
    const clinics  = [...new Set(rows.map((r) => r.clinic))];
    const byClinic = {};
    rows.forEach((r) => {
      if (!byClinic[r.clinic]) byClinic[r.clinic] = {};
      byClinic[r.clinic][r.week] = Number(r.total_count || 0);
    });
    const series = clinics.map((c, i) => ({
      key:   c,
      label: c,
      color: TAB_COLORS[i % TAB_COLORS.length],
      data:  weeks.map((w) => ({ y: byClinic[c]?.[w] || 0 })),
    }));
    return { xLabels: weeks, clinicSeries: series };
  }, [weeklyQ.data]);

  return (
    <div className="space-y-5">

      {/* Ranked bar chart — TOX (primary) + PCR (secondary) */}
      <Card title="Clinic Volume Ranking" subtitle="TOX (top bar) vs PCR (bottom bar) — scroll to see all">
        <HBarChart
          rows={barRows}
          color1={C.tox}
          color2={C.pcr}
          label1="TOX"
          label2="PCR"
          loading={summaryQ.isFetching}
          error={summaryQ.isError}
          onRetry={onRetry}
          maxRows={40}
        />
      </Card>

      {/* Two-column: donut + multi-line */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        <Card title="Clinic Share — Total Accessions" subtitle="Top 11 clinics + Other">
          <DonutChart
            slices={donutSlices}
            loading={summaryQ.isFetching}
            error={summaryQ.isError}
            onRetry={onRetry}
          />
        </Card>

        <Card title="Top 10 Clinics — Weekly Volume Trend" subtitle="Stacked area — accessions per week per clinic">
          <StackedAreaChart
            series={clinicSeries}
            xLabels={clinicWeeklyX}
            height={220}
            loading={weeklyQ.isFetching}
            error={weeklyQ.isError}
            onRetry={onRetry}
          />
        </Card>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — Clinical Detail
// ─────────────────────────────────────────────────────────────────────────────
function ClinicalDetailTab({ onRetry }) {
  const providerQ = useQuery({ queryKey: ['clinical-by-provider'], queryFn: () => clinicalApi.getByProvider(25).then((r) => r.data?.data || []),  ...Q });
  const panelQ    = useQuery({ queryKey: ['clinical-by-panel'],    queryFn: () => clinicalApi.getByPanel(25).then((r)    => r.data?.data || []),  ...Q });
  const specimenQ = useQuery({ queryKey: ['clinical-by-specimen'], queryFn: () => clinicalApi.getBySpecimen().then((r)   => r.data?.data || []), ...Q });
  const runbyQ    = useQuery({ queryKey: ['clinical-by-runby'],    queryFn: () => clinicalApi.getByRunBy(25).then((r)    => r.data?.data || []),  ...Q });

  const provRows = useMemo(() =>
    (providerQ.data || []).map((r) => ({ label: r.provider, value: Number(r.tox_count || 0), value2: Number(r.pcr_count || 0) })),
    [providerQ.data]
  );
  const panelRows = useMemo(() =>
    (panelQ.data || []).map((r) => ({ label: r.panel_name, value: Number(r.tox_count || 0), value2: Number(r.pcr_count || 0) })),
    [panelQ.data]
  );
  const specRows = useMemo(() =>
    (specimenQ.data || []).map((r) => ({ label: r.specimen_type, value: Number(r.tox_count || 0), value2: Number(r.pcr_count || 0) })),
    [specimenQ.data]
  );
  const runbyRows = useMemo(() =>
    (runbyQ.data || []).map((r) => ({ label: r.run_by, value: Number(r.tox_count || 0), value2: Number(r.pcr_count || 0) })),
    [runbyQ.data]
  );

  // Donut for specimen
  const specimenDonut = useMemo(() =>
    (specimenQ.data || []).map((r, i) => ({
      label: r.specimen_type,
      value: Number(r.total_count || 0),
      color: TAB_COLORS[i % TAB_COLORS.length],
    })),
    [specimenQ.data]
  );

  return (
    <div className="space-y-5">

      {/* Provider + Panel side-by-side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        <Card title="Volume by Ordering Provider" subtitle="TOX (top) vs PCR (bottom) — top 25">
          <HBarChart
            rows={provRows}
            color1={C.tox}
            color2={C.pcr}
            label1="TOX"
            label2="PCR"
            loading={providerQ.isFetching}
            error={providerQ.isError}
            onRetry={onRetry}
          />
        </Card>

        <Card title="Volume by Panel Name" subtitle="TOX (top) vs PCR (bottom) — top 25">
          <HBarChart
            rows={panelRows}
            color1={C.tox}
            color2={C.pcr}
            label1="TOX"
            label2="PCR"
            loading={panelQ.isFetching}
            error={panelQ.isError}
            onRetry={onRetry}
          />
        </Card>

      </div>

      {/* Specimen type: bar + donut */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        <Card title="Volume by Specimen Type" subtitle="TOX vs PCR per specimen category">
          <HBarChart
            rows={specRows}
            color1={C.tox}
            color2={C.pcr}
            label1="TOX"
            label2="PCR"
            loading={specimenQ.isFetching}
            error={specimenQ.isError}
            onRetry={onRetry}
          />
        </Card>

        <Card title="Specimen Type Distribution" subtitle="Share of total accessions">
          <DonutChart
            slices={specimenDonut}
            loading={specimenQ.isFetching}
            error={specimenQ.isError}
            onRetry={onRetry}
          />
        </Card>

      </div>

      {/* Run-by technician */}
      <Card title="Volume by Technician (Run By)" subtitle="TOX vs PCR per technician — top 25">
        <HBarChart
          rows={runbyRows}
          color1={C.tox}
          color2={C.pcr}
          label1="TOX"
          label2="PCR"
          loading={runbyQ.isFetching}
          error={runbyQ.isError}
          onRetry={onRetry}
        />
      </Card>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
const SUB_TABS = [
  { id: 'weekly',   label: 'Weekly Overview'  },
  { id: 'clinics',  label: 'Clinic Breakdown' },
  { id: 'detail',   label: 'Clinical Detail'  },
];

export default function QFDClinicalAnalysisPage() {
  const [subTab, setSubTab] = useState('weekly');
  const qc = useQueryClient();

  const overviewQ = useQuery({
    queryKey: ['clinical-overview'],
    queryFn:  () => clinicalApi.getOverview().then((r) => r.data?.data || {}),
    ...Q,
  });

  const ov = overviewQ.data || {};

  const handleRetry = () => qc.invalidateQueries({ queryKey: ['clinical'] });

  return (
    <div className="flex flex-col gap-5 pb-6">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-zinc-100">Clinical Analysis</h1>
          <p className="text-[12px] text-slate-400 dark:text-zinc-500 mt-0.5">
            {ov.date_from && ov.date_to
              ? `${fmtWeek(ov.date_from)} — ${fmtWeek(ov.date_to)}`
              : 'Pipeline data'
            }
            {' · '}
            {fmtNum(ov.total_clinics)} clinics · {fmtNum(ov.total_accessions)} accessions
          </p>
        </div>

        {/* Sub-tab buttons */}
        <div className="flex gap-0.5 bg-white dark:bg-zinc-900 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-zinc-800">
          {SUB_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSubTab(id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                subTab === id
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview KPI strip (always visible) ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Total Accessions"
          value={fmtNum(ov.total_accessions)}
          color={C.total}
        />
        <KpiCard
          label="TOX"
          value={fmtNum(ov.total_tox)}
          color={C.tox}
          sub={fmtPct(Number(ov.total_tox || 0), Number(ov.total_accessions || 0))}
        />
        <KpiCard
          label="PCR"
          value={fmtNum(ov.total_pcr)}
          color={C.pcr}
          sub={fmtPct(Number(ov.total_pcr || 0), Number(ov.total_accessions || 0))}
        />
        <KpiCard
          label="Total Clinics"
          value={fmtNum(ov.total_clinics)}
          color={C.clinics}
        />
        <KpiCard
          label="Date Range"
          value={ov.date_from ? fmtWeek(ov.date_from) : '—'}
          sub={ov.date_to ? `to ${fmtWeek(ov.date_to)}` : ''}
          color="#64748b"
        />
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      {subTab === 'weekly'  && <WeeklyOverviewTab  onRetry={handleRetry} />}
      {subTab === 'clinics' && <ClinicBreakdownTab onRetry={handleRetry} />}
      {subTab === 'detail'  && <ClinicalDetailTab  onRetry={handleRetry} />}

    </div>
  );
}
