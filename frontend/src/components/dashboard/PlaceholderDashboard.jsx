import { BarChart3, LineChart, PieChart, TrendingUp, Users, DollarSign, Activity, Construction } from 'lucide-react';

const mockKpis = [
  { label: 'Total Cases',      value: '—', icon: Activity,    color: 'from-red-500 to-red-700' },
  { label: 'Active Studies',   value: '—', icon: Users,       color: 'from-rose-500 to-rose-700' },
  { label: 'Completion Rate',  value: '—', icon: TrendingUp,  color: 'from-emerald-500 to-emerald-600' },
  { label: 'Revenue',          value: '—', icon: DollarSign,  color: 'from-amber-400 to-orange-500' },
];

export default function PlaceholderDashboard({ clientName }) {
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Construction banner */}
      <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-800 rounded-2xl p-6 text-white relative overflow-hidden ring-1 ring-white/10">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute right-10 -bottom-10 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="p-3.5 bg-white/20 rounded-2xl backdrop-blur-sm flex-shrink-0">
            <Construction size={26} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{clientName} Dashboard</h2>
            <p className="text-red-100 text-sm mt-1 max-w-lg">
              This dashboard is being built. KPIs, charts, filters, and reports will appear
              here once the data layer is connected for this client.
            </p>
          </div>
        </div>
      </div>

      {/* KPI skeleton cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {mockKpis.map(({ label, icon: Icon, color }) => (
          <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-5 text-white relative overflow-hidden ring-1 ring-white/15`}>
            <div className="absolute -right-3 -top-3 w-16 h-16 bg-white/10 rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">{label}</p>
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Icon size={14} className="text-white" />
                </div>
              </div>
              <div className="h-7 bg-white/20 rounded-lg w-16 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[
          { icon: BarChart3,  label: 'Monthly Volume Overview',  desc: 'Monthly trend data will appear here' },
          { icon: LineChart,  label: 'Performance Trend',        desc: 'KPI trend analysis will appear here' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{label}</h3>
                <p className="text-xs text-slate-400 dark:text-zinc-400 mt-0.5">{desc}</p>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-zinc-900 rounded-xl">
                <Icon size={16} className="text-slate-400 dark:text-zinc-400" />
              </div>
            </div>
            <div className="h-44 rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-zinc-900 dark:to-zinc-900/40 flex items-end justify-center gap-1.5 px-4 pb-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-slate-200 dark:bg-zinc-800 rounded-t-sm animate-pulse"
                  style={{ height: `${20 + Math.sin(i * 0.8) * 30 + Math.random() * 20}%`, animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-900 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-100 dark:bg-zinc-900 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-50 dark:bg-zinc-900 rounded w-1/3" />
                </div>
                <div className="h-3 bg-slate-100 dark:bg-zinc-900 rounded w-12" />
              </div>
            ))}
          </div>
        </div>

        <div className="card flex flex-col items-center justify-center text-center py-4">
          <div className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl mb-3">
            <PieChart size={32} className="text-slate-300 dark:text-zinc-500" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-zinc-200">Distribution Chart</p>
          <p className="text-xs text-slate-400 dark:text-zinc-400 mt-1">Coming in Phase 2+</p>
        </div>
      </div>
    </div>
  );
}
