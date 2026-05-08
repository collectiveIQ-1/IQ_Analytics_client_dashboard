/**
 * SynapsesCleanClaimPage.jsx — CCR detail page for IOM Help.
 *
 *   A) Revenue Cycle Metrics KPI cards (same 4)
 *   B) Clean Claim Rate History bar chart (red bars, CCR Goal 95% ref line)
 *   C) Top Denial Reasons table from ionm_ccr
 */

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar,
  ResponsiveContainer,
  XAxis, YAxis, Tooltip,
  ReferenceLine,
} from 'recharts';
import { synapsesApi } from '../../../api/synapses.api';
import QFDKpiCard   from '../../../components/qfd/QFDKpiCard';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtCurrency = (v) => {
  if (v == null) return '—';
  const a = Math.abs(Number(v));
  if (a >= 1_000_000) return `$${(Number(v) / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `$${(Number(v) / 1_000).toFixed(1)}K`;
  return `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const fmtPct  = (v) => v == null ? '—' : `${Number(v).toFixed(1)}%`;
const fmtDays = (v) => v == null ? '—' : `${Number(v).toFixed(0)}`;

const fmtShortDate = (d) => {
  if (!d) return '';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } catch { return String(d); }
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SynapsesCleanClaimPage({ onNavigate }) {
  const { data: kpis,       isLoading: kpiLoading    } = useQuery({
    queryKey: ['synm-kpis'],
    queryFn:  () => synapsesApi.getKpis().then(r => r.data.data),
    staleTime: 300_000,
  });
  const { data: ccrData,    isLoading: ccrLoading    } = useQuery({
    queryKey: ['synm-ccr-history'],
    queryFn:  () => synapsesApi.getCcrHistory().then(r => r.data.data),
    staleTime: 300_000,
  });
  const { data: denialData, isLoading: denialLoading } = useQuery({
    queryKey: ['synm-denial-reasons'],
    queryFn:  () => synapsesApi.getDenialReasons().then(r => r.data.data),
    staleTime: 300_000,
  });

  return (
    <div className="space-y-6">

      {/* ── Revenue Cycle Metrics ─────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
          Revenue Cycle Metrics
        </p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <QFDKpiCard
            label="Total Payments"
            value={fmtCurrency(kpis?.total_payments)}
            subLabel="Last 12 Months"
            color="pink"
            loading={kpiLoading}
            onClick={() => onNavigate?.('payments')}
          />
          <QFDKpiCard
            label="Total Charges"
            value={fmtCurrency(kpis?.total_charges)}
            subLabel="Last 12 Months"
            color="amber"
            loading={kpiLoading}
          />
          <QFDKpiCard
            label="AVG Days DOS to DOE"
            value={fmtDays(kpis?.avg_days)}
            subLabel="Last 12 Months"
            color="green"
            loading={kpiLoading}
          />
          <QFDKpiCard
            label="Clean Claim Rate"
            value={fmtPct(kpis?.ccr)}
            subLabel="Last Month"
            color="purple"
            loading={kpiLoading}
            onClick={() => onNavigate?.('ccr')}
          />
        </div>
      </div>

      {/* ── CCR History Chart ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 dark:border-zinc-800/60">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
            Clean Claim Rate History
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            Monthly CCR trend — goal line at 95%
          </p>
        </div>
        <div style={{ minHeight: 320, height: 320 }} className="p-4">
          {ccrLoading ? (
            <div className="h-full bg-slate-50 dark:bg-zinc-900 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ccrData || []} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={fmtShortDate} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} domain={[0, 100]} width={42} />
                <Tooltip formatter={v => `${Number(v).toFixed(1)}%`} />
                <ReferenceLine
                  y={95}
                  stroke="#dc2626"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  label={{ value: 'CCR Goal 95%', position: 'insideTopRight', fontSize: 10, fill: '#dc2626' }}
                />
                <Bar dataKey="adjusted" name="Adjusted CCR" fill="#dc2626" radius={[4,4,0,0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Top Denial Reasons Table ──────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 dark:border-zinc-800/60">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
            Top Denial Reasons — Unclean Claims
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            Grouped by denial reason, sorted by claim count
          </p>
        </div>
        {denialLoading ? (
          <div className="p-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 bg-slate-50 dark:bg-zinc-900 rounded mb-2 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  {['#', 'Denial Reason', 'Claim Count', 'Value', 'Percentage'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-zinc-800/60">
                {(denialData || []).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-5 py-3 text-slate-400 dark:text-zinc-500 text-xs font-medium">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-zinc-200 font-medium max-w-xs">
                      {row.denial_reason || '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-zinc-200 tabular-nums">
                      {Number(row.claimcount).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-zinc-200 tabular-nums">
                      {fmtCurrency(row.value)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 max-w-[80px]">
                          <div
                            className="bg-red-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(Number(row.percentage), 100)}%` }}
                          />
                        </div>
                        <span className="text-slate-600 dark:text-zinc-300 text-xs tabular-nums">
                          {fmtPct(row.percentage)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!denialData || denialData.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400 dark:text-zinc-500 text-sm">
                      No denial data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
