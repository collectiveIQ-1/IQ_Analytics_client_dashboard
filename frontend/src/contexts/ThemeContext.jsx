/**
 * ThemeContext.jsx — Global light/dark theme state.
 *
 *   • Persists the selected theme in localStorage under `iq_theme`.
 *   • Falls back to the user's OS preference on first visit.
 *   • Adds/removes the `dark` class on <html> so Tailwind's `dark:` variants
 *     and raw CSS can respond accordingly.
 *   • Exposes `{ theme, toggleTheme, setTheme }` via useTheme().
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);

function getInitialTheme() {
  try {
    const stored = localStorage.getItem('iq_theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* ignore */ }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem('iq_theme', theme); } catch { /* ignore */ }
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next === 'dark' ? 'dark' : 'light');
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
