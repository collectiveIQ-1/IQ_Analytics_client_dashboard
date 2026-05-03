/**
 * FallbackBanner.jsx
 *
 * Displays an amber warning banner across the top of the app when the backend
 * is operating in LOCAL FALLBACK mode (i.e. the primary database is unreachable).
 *
 * The banner is shown when:
 *   • The backend responds with the header X-DB-Mode: local
 *   • dbMode in AuthContext is 'local'
 *
 * Users can dismiss the banner per-session by clicking ×.
 * It reappears on page reload if the backend is still in local mode.
 */

import { useState } from 'react';
import { AlertTriangle, X, Database } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function FallbackBanner() {
  const { dbMode } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Only render when in local fallback mode and not dismissed
  if (dbMode !== 'local' || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-900 flex-shrink-0 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200"
    >
      {/* Icon */}
      <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-300 flex-shrink-0">
        <Database size={14} />
        <AlertTriangle size={14} />
      </span>

      {/* Message */}
      <span className="flex-1 leading-snug">
        <span className="font-semibold">Local fallback mode active — </span>
        the primary database is currently unreachable. The app is running on the local
        database. Some write operations and live data may be limited.
      </span>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 p-1 rounded hover:bg-amber-100 text-amber-500 hover:text-amber-700 transition-colors flex-shrink-0"
        aria-label="Dismiss fallback mode warning"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
