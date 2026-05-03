/**
 * ConfidasCleanClaimPage.jsx — Clean Claim Rate detail page for Confidas.
 *
 * Contains:
 *   A) Revenue Cycle Metrics (same 4 KPI cards as Home)
 *   B) Clean Claim Rate History bar chart (red, with CCR Goal 95% ref line)
 *   C) Top 10 Denial Reasons table
 */

import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar,
  ResponsiveContainer,
  XAxis, YAxis, Tooltip,
  ReferenceLine,
} from 'recharts';
import { confidasApi } from '../../../api/confidas.api';
import QFDKpiCard      from '../../../components/qfd/QFDKpiCard';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtCurrency = (v) => {
  if (v == null) return '—';
  const a = Math.abs(Number(v));
  if (a >= 1_000_000) return `$${(Number(v) / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `$${(Number(v) / 1_000).toFixed(1)}K`;
  return `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const fmtPct  = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);
const fmtDays = (v) => (v == null ? '—' : `${Number(v).toFixed(0)}`);

const fmtShortDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } catch { return String(d); }
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ConfidasCleanClaimPage({ onNavigate }) {

  const { data: kpis,       isLoading: kpiLoading    } = useQuery({
    queryKey: ['confidas-kpis'],
    queryFn:  () => confidasApi.getKpis().then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: ccrData,    isLoading: ccrLoading    } = useQuery({
    queryKey: ['confidas-ccr-history'],
    queryFn:  () => confidasApi.getCcrHistory().then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const { data: denialData, isLoading: denialLoading } = useQuery({
    queryKey: ['confidas-denial-reasons'],
    queryFn:  () => confidasApi.getDenialReasons().then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const maxPct = Math.max(...(denialData || []).map(r => Number(r.percentage) || 0), 1);

  return (
    <div className="space-y-6">

      {/* ── A) Revenue Cycle Metrics ──────────────────────────────────── */}
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
            onClick={() => onNavigate?.('ar')}
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
            value={kpis?.ccr != null ? fmtPct(kpis.ccr) : '—'}
            subLabel="Last Month"
            color="purple"
            loading={kpiLoading}
            onClick={() => onNavigate?.('ccr')}
          />
        </div>
      </div>

      {/* ── B) CCR History Chart ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 dark:border-zinc-800/60">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
            Clean Claim Rate History
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            Monthly CCR trend — goal line at 95%
          </p>
        </div>
        <div style={{ height: 320 }} className="p-4">
          {ccrLoading ? (
            <div className="h-full bg-slate-50 dark:bg-zinc-900 rounded-xl animate-pulse" />
          ) : !ccrData || ccrData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              <p className="text-sm text-slate-400 dark:text-zinc-500">CCR history data coming soon</p>
              <p className="text-xs text-slate-300 dark:text-zinc-600">This chart will populate once ccr_history table is available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ccrData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={fmtShortDate} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={v => `${v}%`}
                  domain={[0, 100]}
                  width={42}
                />
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

      {/* ── C) Top 10 Denial Reasons Table ───────────────────────────── */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 dark:border-zinc-800/60">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
            Top 10 Denial Reasons — Unclean Claims
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            Grouped by denial reason, sorted by claim count
          </p>
        </div>

        {denialLoading ? (
          <div className="p-6 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 bg-slate-50 dark:bg-zinc-900 rounded animate-pulse" />
            ))}
          </div>
        ) : !denialData || denialData.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-slate-400 dark:text-zinc-500">Denial reasons data coming soon</p>
            <p className="text-xs text-slate-300 dark:text-zinc-600">This table will populate once the ccr table is available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800">
                <tr>
                  {['#', 'Denial Reason', 'Claim Count', 'Value', 'Percentage'].map((h) => (
                    <th key={h}
                      className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-zinc-800/60">
                {denialData.map((row, idx) => (
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
                            style={{ width: `${Math.min((Number(row.percentage) / maxPct) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400 tabular-nums min-w-[40px]">
                          {fmtPct(row.percentage)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
