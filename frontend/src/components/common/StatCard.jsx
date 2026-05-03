import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const gradients = {
  blue:   'from-red-500 to-red-700',
  indigo: 'from-rose-500 to-rose-700',
  emerald:'from-emerald-500 to-emerald-600',
  amber:  'from-amber-400 to-orange-500',
  purple: 'from-rose-500 to-red-700',
  rose:   'from-rose-500 to-rose-600',
  green:  'from-emerald-500 to-emerald-600',
  red:    'from-red-500 to-red-700',
  orange: 'from-amber-400 to-orange-500',
};

export default function StatCard({ label, value, trend, trendValue, trendLabel, icon: Icon, color = 'blue' }) {
  const grad = gradients[color] || gradients.blue;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-300' : trend === 'down' ? 'text-red-200' : 'text-white/70';

  return (
    <div className={`bg-gradient-to-br ${grad} rounded-2xl p-5 text-white shadow-lg relative overflow-hidden ring-1 ring-white/20 dark:ring-white/10`}>
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">{label}</p>
          {Icon && (
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Icon size={16} className="text-white" />
            </div>
          )}
        </div>

        <p className="text-3xl font-bold text-white tracking-tight mb-2">
          {value ?? '—'}
        </p>

        {(trendValue || trendLabel) && (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${trendColor}`}>
            <TrendIcon size={13} />
            <span>{trendValue}</span>
            {trendLabel && <span className="text-white/60">{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
