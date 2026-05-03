/**
 * QFDTurnAroundTimePage.jsx — Turnaround Time tab for QFD Dashboard.
 *
 * Views (toggled by bottom buttons):
 *   Last 12 Months — horizontal bar chart, steel-blue bars, all panels
 *   Last Month     — horizontal bar chart, cyan bars, all panels
 *   More           — two side-by-side data tables (Last Month + Last 12 Months)
 *
 * "Turnaround Selection" dropdown (top-right) controls which metric the bar
 * represents — mirrors the Tableau "P Turnaround Selection" parameter.
 *
 * Dark-mode aware: ChartCard, tooltips, table, dropdown all use dark: classes.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  ResponsiveContainer,
} from 'recharts';
import { tatApi }   from '../../../api/tat.api';
import { useTheme } from '../../../contexts/ThemeContext';

// ── Constants ──────────────────────────────────────────────────────────────────

const SELECTIONS = [
  { value: 'avgdostoorderdate',              label: 'Average of DOS to Order Date' },
  { value: 'avgorderdatetofinalprinteddate', label: 'Average of Order Date to Final Printed Date' },
  { value: 'avgfinalprintedtodoe',           label: 'Average of Final Printed to DOE' },
  { value: 'avgdoetosubmissiondate',         label: 'Average of DOE to Submission Date' },
  { value: 'avgsubmissiondatetopaymentdate', label: 'Average of Submission Date to Payment Date' },
];

const TABLE_COLS = [
  { key: 'numberoflines',                   label: 'Number of Lines' },
  { key: 'avgdostoorderdate',               label: 'AVG DOS to Order Date' },
  { key: 'avgorderdatetofinalprinteddate',  label: 'AVG Order Date to Final Printed Date' },
  { key: 'avgfinalprintedtodoe',            label: 'AVG Final Printed Date to DOE' },
  { key: 'avgdoetosubmissiondate',          label: 'AVG DOE to Submission Date' },
  { key: 'avgsubmissiondatetopaymentdate',  label: 'AVG Submission Date to Payment Date' },
];

// Steel blue (Last 12 Months) and cyan (Last Month) bar palettes
const BAR_COLOR_12  = '#4f83b5';
const BAR_COLOR_MON = '#5ec8d8';

// ── Bar inside label ───────────────────────────────────────────────────────────

function BarInsideLabel({ x, y, width, height, value, dark12 }) {
  if (value == null || width < 55) return null;
  return (
    <text
      x={x + 8}
      y={y + height / 2 + 4}
      fontSize={11}
      fontWeight="700"
      fill={dark12 ? 'white' : '#0c4a6e'}
      textAnchor="start"
    >
      {`AVG Turnaround :${Math.round(Number(value))} Days`}
    </text>
  );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function TATTooltip({ active, payload, label, selectionLabel }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-zinc-700
                    bg-white dark:bg-zinc-900
                    px-4 py-3 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-700 dark:text-zinc-200">{label}</p>
      <p className="font-medium text-slate-600 dark:text-zinc-300">
        {selectionLabel}: <span className="font-bold">{val != null ? `${Math.round(val)} Days` : '—'}</span>
      </p>
    </div>
  );
}

// ── View button ───────────────────────────────────────────────────────────────

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

// ── Chart skeleton ─────────────────────────────────────────────────────────────

function ChartSkeleton({ height = 380 }) {
  return (
    <div
      className="animate-pulse bg-slate-50 dark:bg-zinc-900 rounded-xl"
      style={{ height }}
    />
  );
}

// ── Horizontal bar chart ──────────────────────────────────────────────────────

function TATBarChart({ data, selectionKey, selectionLabel, barColor, loading, isDark12 }) {
  const chartData = (data || []).filter((r) => r.panel !== 'Grand Total');

  // Use consistent height that fills the fixed container — at least 460px
  const rowH  = 46;
  const minH  = 460;
  const chartH = Math.max(minH, chartData.length * rowH + 60);

  if (loading) return <ChartSkeleton height={chartH} />;
  if (!chartData.length) {
    return (
      <p className="text-sm text-slate-400 dark:text-zinc-500 text-center py-14">
        No data available.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={chartH}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        barCategoryGap="25%"
      >
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="panel"
          type="category"
          width={230}
          tick={{ fontSize: 10, fill: '#334155', fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          className="dark:fill-zinc-300"
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <TATTooltip
              active={active}
              payload={payload}
              label={label}
              selectionLabel={selectionLabel}
            />
          )}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
        />
        <Bar
          dataKey={selectionKey}
          fill={barColor}
          radius={[0, 3, 3, 0]}
          maxBarSize={36}
          label={
            (props) => <BarInsideLabel {...props} dark12={isDark12} />
          }
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Data table (More view) ─────────────────────────────────────────────────────

function TATTable({ title, data, loading }) {
  if (loading) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 mb-3">{title}</h3>
        <div className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-zinc-800" />
      </div>
    );
  }
  if (!data?.length) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 mb-3">{title}</h3>
        <p className="text-sm text-slate-400 dark:text-zinc-500 py-6 text-center">No data available.</p>
      </div>
    );
  }

  const bodyRows  = data.filter((r) => r.panel !== 'Grand Total');
  const grandRow  = data.find((r) => r.panel === 'Grand Total');

  const fmt = (v) => (v == null ? '—' : Number(v).toLocaleString('en-US'));

  return (
    <div className="mb-8">
      <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 mb-3 px-1">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900">
              <th className="sticky left-0 z-10 bg-slate-50 dark:bg-zinc-900
                             text-left px-4 py-2.5 font-semibold
                             text-red-600 dark:text-red-400 min-w-[200px] whitespace-nowrap">
                Panel
              </th>
              {TABLE_COLS.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2.5 text-right font-semibold
                             text-red-600 dark:text-red-400 whitespace-nowrap min-w-[90px]"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr
                key={ri}
                className={`border-b border-slate-100 dark:border-zinc-800 ${
                  ri % 2 === 0
                    ? 'bg-white dark:bg-zinc-950'
                    : 'bg-slate-50/60 dark:bg-zinc-900/50'
                }`}
              >
                <td className="sticky left-0 z-10 bg-inherit px-4 py-2 font-medium
                               text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                  {row.panel}
                </td>
                {TABLE_COLS.map((col) => (
                  <td
                    key={col.key}
                    className="px-3 py-2 text-right tabular-nums
                               text-slate-600 dark:text-zinc-400"
                  >
                    {fmt(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}

            {/* Grand Total row */}
            {grandRow && (
              <tr className="border-t-2 border-slate-300 dark:border-zinc-600
                             bg-slate-100 dark:bg-zinc-800">
                <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 font-bold
                               text-slate-800 dark:text-zinc-100 whitespace-nowrap">
                  Grand Total
                </td>
                {TABLE_COLS.map((col) => (
                  <td
                    key={col.key}
                    className="px-3 py-2.5 text-right tabular-nums font-bold
                               text-slate-800 dark:text-zinc-100"
                  >
                    {fmt(grandRow[col.key])}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function QFDTurnAroundTimePage() {
  const [view,      setView]      = useState('last12');
  const [selection, setSelection] = useState('avgorderdatetofinalprinteddate');

  const { theme } = useTheme();
  const isDark    = theme === 'dark';

  // ── Queries (always fetch both — enables instant tab switching) ──────────
  const { data: last12Data, isLoading: load12 } = useQuery({
    queryKey:  ['tat-last12'],
    queryFn:   () => tatApi.getLast12().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: lastMonData, isLoading: loadMon } = useQuery({
    queryKey:  ['tat-lastmonth'],
    queryFn:   () => tatApi.getLastMonth().then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const selLabel = SELECTIONS.find((s) => s.value === selection)?.label ?? 'Selection';

  const subtitle =
    view === 'last12'   ? 'Average of TurnAround Time — Last 12 Months'
    : view === 'lastmonth' ? 'Average of TurnAround Time — Last Month'
    : 'Detailed Turnaround Tables';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-zinc-950 rounded-2xl
                      border border-slate-100 dark:border-zinc-800
                      shadow-sm overflow-hidden transition-colors duration-200">

        {/* ── Header: title + dropdown ── */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
              TurnAround Time
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              {subtitle}
            </p>
          </div>

          {/* Turnaround Selection dropdown — hidden in More view */}
          {view !== 'more' && (
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
                Turnaround Selection
              </label>
              <select
                value={selection}
                onChange={(e) => setSelection(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-zinc-700
                           bg-white dark:bg-zinc-900
                           text-xs font-medium text-slate-700 dark:text-zinc-200
                           px-3 py-1.5 pr-7 shadow-sm
                           focus:outline-none focus:ring-2 focus:ring-red-500/40
                           cursor-pointer"
              >
                {SELECTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Chart / table area — fixed min-height so card doesn't jump between views ── */}
        <div style={{ minHeight: 500 }}>

          {/* ── Last 12 Months chart ── */}
          {view === 'last12' && (
            <div className="px-4 pb-2">
              <TATBarChart
                data={last12Data}
                selectionKey={selection}
                selectionLabel={selLabel}
                barColor={BAR_COLOR_12}
                loading={load12}
                isDark12={true}
              />
            </div>
          )}

          {/* ── Last Month chart ── */}
          {view === 'lastmonth' && (
            <div className="px-4 pb-2">
              <TATBarChart
                data={lastMonData}
                selectionKey={selection}
                selectionLabel={selLabel}
                barColor={BAR_COLOR_MON}
                loading={loadMon}
                isDark12={false}
              />
            </div>
          )}

          {/* ── More: two tables ── */}
          {view === 'more' && (
            <div className="px-5 pb-2 pt-1">
              <TATTable
                title="Average of TurnAround Last Month"
                data={lastMonData}
                loading={loadMon}
              />
              <TATTable
                title="Average of TurnAround Last 12 Months"
                data={last12Data}
                loading={load12}
              />
            </div>
          )}

        </div>

        {/* ── Bottom button row ── */}
        <div className="flex items-center justify-end gap-2
                        px-5 py-4
                        border-t border-slate-100 dark:border-zinc-800">
          <ViewBtn active={view === 'lastmonth'} onClick={() => setView('lastmonth')}>
            Last Month
          </ViewBtn>
          <ViewBtn active={view === 'last12'} onClick={() => setView('last12')}>
            Last 12 Months
          </ViewBtn>
          <ViewBtn active={view === 'more'} onClick={() => setView('more')}>
            More
          </ViewBtn>
        </div>

      </div>
    </div>
  );
}
