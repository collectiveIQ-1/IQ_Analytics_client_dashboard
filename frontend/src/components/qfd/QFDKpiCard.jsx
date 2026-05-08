/**
 * QFDKpiCard.jsx — Revenue Cycle Metrics KPI card.
 *
 * Colored-background style: each card has a tinted background matching the
 * reference design (pink / amber / green / purple). No icon — clean text-only layout.
 *
 * Colors:
 *   pink   → Total Payments
 *   amber  → Total Charges
 *   green  → AVG Days DOS to DOE
 *   purple → Clean Claim Rate
 */

export default function QFDKpiCard({
  label,
  value,
  subLabel,
  color = 'pink',
  onClick,
  loading = false,
}) {
  const colorMap = {
    pink: {
      bg:    'bg-pink-50   dark:bg-pink-500/10',
      label: 'text-pink-600  dark:text-pink-400',
      value: 'text-pink-900  dark:text-pink-100',
      sub:   'text-pink-400  dark:text-pink-500',
      hover: 'hover:bg-pink-100 dark:hover:bg-pink-500/20',
    },
    amber: {
      bg:    'bg-amber-50  dark:bg-amber-500/10',
      label: 'text-amber-600 dark:text-amber-400',
      value: 'text-amber-900 dark:text-amber-100',
      sub:   'text-amber-400 dark:text-amber-500',
      hover: 'hover:bg-amber-100 dark:hover:bg-amber-500/20',
    },
    green: {
      bg:    'bg-red-50  dark:bg-red-500/10',
      label: 'text-red-600 dark:text-red-400',
      value: 'text-green-900 dark:text-red-100',
      sub:   'text-red-400 dark:text-red-500',
      hover: 'hover:bg-green-100 dark:hover:bg-red-500/20',
    },
    purple: {
      bg:    'bg-purple-50 dark:bg-purple-500/10',
      label: 'text-purple-600 dark:text-purple-400',
      value: 'text-purple-900 dark:text-purple-100',
      sub:   'text-purple-400 dark:text-purple-500',
      hover: 'hover:bg-purple-100 dark:hover:bg-purple-500/20',
    },
  };

  const c = colorMap[color] || colorMap.pink;

  return (
    <div
      onClick={onClick}
      className={`
        ${c.bg} rounded-xl md:rounded-2xl p-3 md:p-5 transition-all duration-200
        ${onClick ? `cursor-pointer ${c.hover} hover:-translate-y-0.5 hover:shadow-sm` : ''}
      `}
    >
      <p className={`text-[10px] md:text-xs font-semibold uppercase tracking-wide mb-0.5 md:mb-1 ${c.label}`}>
        {label}
      </p>

      {subLabel && (
        <p className={`text-[10px] mb-3 ${c.sub}`}>{subLabel}</p>
      )}

      {loading ? (
        <div className="h-8 w-28 bg-white/50 dark:bg-black/20 rounded-lg animate-pulse" />
      ) : (
        <p className={`text-xl md:text-2xl font-bold leading-tight ${c.value}`}>
          {value}
        </p>
      )}
    </div>
  );
}
