/**
 * ThemeSwitcher.jsx
 *
 * Toggle-switch style control for Light / Dark mode.
 * — Sun icon on the left, Moon icon on the right.
 * — Clicking the switch (or either icon) toggles the theme.
 * — The pill slides smoothly between light and dark positions.
 *
 * Uses ThemeContext under the hood, so the user's choice is persisted
 * in localStorage and applied immediately to the whole app.
 */

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center gap-2">
      {/* Sun icon */}
      <Sun
        size={14}
        onClick={toggleTheme}
        className={`cursor-pointer transition-colors duration-200 ${
          isDark
            ? 'text-zinc-500 hover:text-zinc-300'
            : 'text-amber-500'
        }`}
      />

      {/* Toggle track */}
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle dark mode"
        onClick={toggleTheme}
        className={`
          relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
          dark:focus-visible:ring-offset-black
          ${isDark ? 'bg-red-600' : 'bg-slate-300'}
        `}
      >
        {/* Sliding knob */}
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-4 w-4 transform rounded-full
            bg-white shadow-md ring-0
            transition-transform duration-200 ease-in-out
            ${isDark ? 'translate-x-4' : 'translate-x-0'}
          `}
        />
      </button>

      {/* Moon icon */}
      <Moon
        size={14}
        onClick={toggleTheme}
        className={`cursor-pointer transition-colors duration-200 ${
          isDark
            ? 'text-zinc-200'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      />
    </div>
  );
}
