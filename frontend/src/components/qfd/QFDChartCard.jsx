/**
 * QFDChartCard.jsx — Chart card for the QFD grid.
 *
 * Props:
 *   title       — card title
 *   onExpand    — show Expand button and call this when clicked (optional)
 *   onCompress  — show Compress button and call this when clicked (optional)
 *   loading     — show animated skeleton
 *   children    — chart content
 *   height      — chart body height in px
 *   className   — extra classes on the outer wrapper
 */

import { Maximize2, Minimize2 } from 'lucide-react';

export default function QFDChartCard({
  title,
  onExpand,
  onCompress,
  loading = false,
  children,
  height = 200,
  className = '',
}) {
  const outerClass = [
    'bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800',
    'rounded-2xl shadow-card overflow-hidden flex flex-col',
    'transition-all duration-300 hover:shadow-card-hover',
    className,
  ].join(' ');

  return (
    <div
      data-export-item
      data-export-label={title}
      data-export-id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
      className={outerClass}
    >
      {/* Header — left red accent stripe + bold title */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-800/60 flex-shrink-0 bg-slate-50/60 dark:bg-zinc-900/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-0.5 h-4 rounded-full bg-red-500 flex-shrink-0" />
          <h3 className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 uppercase tracking-widest truncate">
            {title}
          </h3>
        </div>

        {onExpand && !onCompress && (
          <button
            data-export-ignore
            onClick={onExpand}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-colors flex-shrink-0 shadow-sm"
          >
            <Maximize2 size={9} /> Expand
          </button>
        )}

        {onCompress && (
          <button
            data-export-ignore
            onClick={onCompress}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-500 text-white hover:bg-slate-600 active:bg-slate-700 transition-colors flex-shrink-0 shadow-sm"
          >
            <Minimize2 size={9} /> Compress
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ height: height + 'px' }} className="relative p-2.5 flex-shrink-0 transition-all duration-300">
        {loading ? (
          <div className="absolute inset-2.5 bg-slate-50 dark:bg-zinc-900 rounded-xl animate-pulse" />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
