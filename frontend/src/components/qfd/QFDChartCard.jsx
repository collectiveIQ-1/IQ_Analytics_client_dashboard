/**
 * QFDChartCard.jsx — Chart card for the QFD grid.
 *
 * Props:
 *   title       — card title (never changes between normal / expanded states)
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
  return (
    <div
      data-export-item
      data-export-label={title}
      data-export-id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
      className={`
        bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800
        rounded-2xl shadow-sm overflow-hidden flex flex-col
        transition-all duration-300
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 dark:border-zinc-800/60 flex-shrink-0">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-zinc-200 truncate pr-2">{title}</h3>

        {onExpand && !onCompress && (
          <button
            data-export-ignore
            onClick={onExpand}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold
                       bg-red-600 text-white hover:bg-red-700 transition-colors flex-shrink-0"
          >
            <Maximize2 size={9} /> Expand
          </button>
        )}

        {onCompress && (
          <button
            data-export-ignore
            onClick={onCompress}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold
                       bg-slate-500 text-white hover:bg-slate-600 transition-colors flex-shrink-0"
          >
            <Minimize2 size={9} /> Compress
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ height: `${height}px` }} className="relative p-3 flex-shrink-0 transition-all duration-300">
        {loading ? (
          <div className="absolute inset-3 bg-slate-50 dark:bg-zinc-900 rounded-xl animate-pulse" />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
