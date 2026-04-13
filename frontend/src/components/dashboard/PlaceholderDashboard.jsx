import { Construction, BarChart3, LineChart, PieChart } from 'lucide-react';

export default function PlaceholderDashboard({ clientName }) {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="card bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Construction size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold">{clientName} Dashboard</h2>
            <p className="text-blue-100 text-sm mt-0.5">
              This dashboard is under construction. Data visualizations will appear here.
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Total Cases', 'Active Studies', 'Completion Rate', 'Revenue'].map((label) => (
          <div key={label} className="card border border-dashed border-slate-200 animate-pulse">
            <div className="h-3 bg-slate-200 rounded w-2/3 mb-3" />
            <div className="h-7 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>

      {/* Placeholder chart area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { icon: BarChart3, label: 'Monthly Overview' },
          { icon: LineChart, label: 'Trend Analysis' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="card border border-dashed border-slate-200">
            <p className="text-sm font-semibold text-slate-500 mb-4">{label}</p>
            <div className="h-48 flex items-center justify-center text-slate-300">
              <Icon size={48} strokeWidth={1} />
            </div>
          </div>
        ))}
      </div>

      <div className="card border border-dashed border-slate-200 text-center py-8 text-slate-400">
        <PieChart size={40} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm">Additional charts and reports will be built here in Phase 2+</p>
      </div>
    </div>
  );
}
