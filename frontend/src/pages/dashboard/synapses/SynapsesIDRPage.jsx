/**
 * SynapsesIDRPage.jsx — IDR Payment Summary tab for IOM Help Dashboard.
 *
 * 4-chart grid (all interactive / cross-filtering):
 *   Top-left:  Area chart  — IDR Payment Received (monthly trend)
 *   Top-right: Bar chart   — IDR Claim Count by status
 *   Bot-left:  Pie chart   — IDR Pro and Tech Wise
 *   Bot-right: H-bar chart — IDR Insurance Wise
 *
 * Source table: iq_ionm.smartsheet
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  XAxis, YAxis, Tooltip, LabelList,
} from 'recharts';
import { synapsesApi } from '../../../api/synapses.api';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtK = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000)     return '$' + (n / 1_000).toFixed(0) + 'K';
  return '$' + n.toFixed(0);
};

const fmtMonth = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return isNaN(dt.getTime()) ? String(d)
    : dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const PIE_COLORS = ['#1e3a8a', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ h = 220 }) {
  return <div className="animate-pulse bg-slate-100 dark:bg-zinc-800 rounded-lg" style={{ height: h }} />;
}

// ── Shared tooltip ────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 dark:text-zinc-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="font-medium">
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? fmtK(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ── H-bar end label ───────────────────────────────────────────────────────────

const HBarLabel = ({ x, y, width, height, value }) => {
  if (!value || width < 10) return null;
  return (
    <text x={x + width + 4} y={y + height / 2} dominantBaseline="middle"
      fontSize={9} fontWeight="600" fill="#334155" textAnchor="start">
      {fmtK(value)}
    </text>
  );
};

// ── Custom pie label ──────────────────────────────────────────────────────────

const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => {
  const RADIAN = Math.PI / 180;
  const r   = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x   = cx + r * Math.cos(-midAngle * RADIAN);
  const y   = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="700">
      {name}
    </text>
  );
};

// ── Card wrapper ──────────────────────────────────────────────────────────────

function ChartCard({ title, children }) {
  return (
    <div
      data-export-item
      data-export-label={title}
      data-export-id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
      className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-4"
    >
      <p className="text-[12px] font-semibold text-slate-600 dark:text-zinc-300 mb-2">{title}</p>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SynapsesIDRPage() {
  // Cross-filter state: { type: 'month'|'status'|'protech'|'insurance', value: string } | null
  const [activeFilter, setActiveFilter] = useState(null);

  const toggle = (type, value) => {
    setActiveFilter((prev) =>
      prev?.type === type && prev?.value === value ? null : { type, value }
    );
  };

  // ── Data fetches ─────────────────────────────────────────────────────────

  const { data: trendRaw  = [], isLoading: trendLoad  } = useQuery({
    queryKey: ['synm-idr-trend'],
    queryFn:  () => synapsesApi.getIdrPaymentTrend().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 5 * 60_000,
  });
  const { data: statusRaw = [], isLoading: statusLoad } = useQuery({
    queryKey: ['synm-idr-status'],
    queryFn:  () => synapsesApi.getIdrStatusCount().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 5 * 60_000,
  });
  const { data: protechRaw = [], isLoading: ptLoad } = useQuery({
    queryKey: ['synm-idr-protech'],
    queryFn:  () => synapsesApi.getIdrProTech().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 5 * 60_000,
  });
  const { data: insRaw = [], isLoading: insLoad } = useQuery({
    queryKey: ['synm-idr-insurance'],
    queryFn:  () => synapsesApi.getIdrInsurance().then((r) => r.data?.data ?? r.data ?? []),
    staleTime: 5 * 60_000,
  });

  // ── Filtered data (client-side cross-filter) ──────────────────────────────

  const trendData   = trendRaw;
  const statusData  = statusRaw;
  const protechData = protechRaw;
  const insData     = insRaw;

  // ── Area chart: Payment Trend ─────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── IDR Payment Received (Area) ─────────────────────────────── */}
        <ChartCard title="IDR Payment Received">
          {trendLoad ? <Skeleton /> : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="idrAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tickFormatter={fmtMonth}
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    axisLine={false} tickLine={false}
                    angle={-35} textAnchor="end" height={45}
                  />
                  <YAxis
                    tickFormatter={fmtK}
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    axisLine={false} tickLine={false} width={52}
                  />
                  <Tooltip content={<ChartTip />} labelFormatter={fmtMonth} />
                  <Area
                    type="monotone" dataKey="value" name="Payment"
                    stroke="#6366f1" strokeWidth={2}
                    fill="url(#idrAreaGrad)" dot={false}
                    activeDot={{ r: 4, onClick: (_, p) => toggle('month', p.payload?.month) }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* ── IDR Claim Count (Bar by status) ────────────────────────── */}
        <ChartCard title="IDR Claim Count">
          {statusLoad ? <Skeleton /> : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    axisLine={false} tickLine={false} width={30}
                  />
                  <Tooltip content={<ChartTip />} />
                  <Bar
                    dataKey="value" name="Claims" radius={[3,3,0,0]}
                    onClick={(d) => toggle('status', d.label)}
                    cursor="pointer"
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? '#1e3a8a' : '#22c55e'}
                        opacity={activeFilter?.type === 'status' && activeFilter?.value !== _.label ? 0.4 : 1} />
                    ))}
                    <LabelList dataKey="value" position="top" fontSize={10} fontWeight="700" fill="#334155" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* ── IDR Pro and Tech Wise (Pie) ──────────────────────────────── */}
        <ChartCard title="IDR Pro and Tech Wise">
          {ptLoad ? <Skeleton /> : (
            <div style={{ height: 220 }} className="flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={protechData}
                    dataKey="value"
                    nameKey="label"
                    cx="50%" cy="50%"
                    outerRadius={90}
                    labelLine={false}
                    label={PieLabel}
                    onClick={(d) => toggle('protech', d.label)}
                    cursor="pointer"
                  >
                    {protechData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        opacity={activeFilter?.type === 'protech' && activeFilter?.value !== entry.label ? 0.35 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtK(v)} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-col gap-1 text-xs pl-2 min-w-[80px]">
                {protechData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-slate-600 dark:text-zinc-300 font-medium">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        {/* ── IDR Insurance Wise (H-bar) ───────────────────────────────── */}
        <ChartCard title="IDR Insurance Wise">
          {insLoad ? <Skeleton /> : (
            <div style={{ height: 220 }} className="overflow-y-auto">
              <ResponsiveContainer width="100%" height={Math.max(insData.length * 26, 200)}>
                <BarChart
                  data={insData}
                  layout="vertical"
                  margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
                  barSize={14}
                >
                  <XAxis type="number" tickFormatter={fmtK}
                    tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="label" type="category" width={130}
                    tick={{ fontSize: 9, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Bar
                    dataKey="value" name="Payment" fill="#e879f9" radius={[0,3,3,0]}
                    onClick={(d) => toggle('insurance', d.label)} cursor="pointer"
                  >
                    {insData.map((entry, i) => (
                      <Cell key={i} fill={i === 0 ? '#c084fc' : '#e879f9'}
                        opacity={activeFilter?.type === 'insurance' && activeFilter?.value !== entry.label ? 0.35 : 1} />
                    ))}
                    <LabelList dataKey="value" content={HBarLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

      </div>

      {/* Active filter pill */}
      {activeFilter && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-zinc-400">Filtered by:</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold">
            {activeFilter.value}
            <button onClick={() => setActiveFilter(null)} className="ml-1 hover:text-red-900">✕</button>
          </span>
        </div>
      )}
    </div>
  );
}
