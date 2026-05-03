/**
 * AuthContext.jsx — Global auth state: user, token, role, and DB mode.
 *
 * Fixes applied:
 *   • Listens for 'iq-auth-expired' events dispatched by axiosInstance on 401.
 *     Instead of a hard window.location.href redirect (which caused a blank-page
 *     flash), we clear state here and let React Router's ProtectedRoute redirect
 *     the user cleanly to /login.
 *   • sessionExpired flag is exposed so the login page can show a friendly
 *     "Your session expired, please log in again" message.
 *   • dbMode is NOT initialised from localStorage — the real value is always
 *     driven by the X-DB-Mode response header so a stale cached value from a
 *     previous backend run can never confuse the UI.
 *   • Auto-logout fires when the client-side token expiry check fails so the
 *     protected routes redirect immediately instead of showing a broken state.
 */

import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef,
} from 'react';
import { tokenUtils } from '../utils/tokenUtils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,           setUser]           = useState(() => {
    try { return JSON.parse(localStorage.getItem('iq_user') || 'null'); } catch { return null; }
  });
  const [token,          setToken]          = useState(() => localStorage.getItem('iq_token') || null);
  const [dbMode,         setDbMode]         = useState('primary');  // driven by response header only
  const [sessionExpired, setSessionExpired] = useState(false);

  // Ref lets the event handler always see the latest logout callback.
  const logoutRef = useRef(null);

  // ── DB mode changes (broadcast by axios on X-DB-Mode header change) ───────
  useEffect(() => {
    const handler = (e) => setDbMode(e.detail.mode);
    window.addEventListener('iq-db-mode-change', handler);
    return () => window.removeEventListener('iq-db-mode-change', handler);
  }, []);

  // ── Auth expired (broadcast by axios on 401) ─────────────────────────────
  // Clear state here → React Router's ProtectedRoute will navigate to /login.
  // This avoids the hard window.location.href that caused a blank-page flash.
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem('iq_token');
      localStorage.removeItem('iq_user');
      localStorage.removeItem('iq_db_mode');
      setToken(null);
      setUser(null);
      setDbMode('primary');
      setSessionExpired(true);
    };
    window.addEventListener('iq-auth-expired', handler);
    return () => window.removeEventListener('iq-auth-expired', handler);
  }, []);

  const login = useCallback((tokenValue, userData) => {
    localStorage.setItem('iq_token', tokenValue);
    localStorage.setItem('iq_user',  JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('iq_token');
    localStorage.removeItem('iq_user');
    localStorage.removeItem('iq_db_mode');
    setToken(null);
    setUser(null);
    setDbMode('primary');
    setSessionExpired(false);
  }, []);

  logoutRef.current = logout;

  // Client-side expiry check: if the stored token is already expired when
  // the app loads, clear state immediately so ProtectedRoute redirects.
  useEffect(() => {
    if (token && tokenUtils.isExpired(token)) {
      logoutRef.current?.();
      setSessionExpired(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isAuthenticated = Boolean(token && user && !tokenUtils.isExpired(token));

  // ── Role helpers — always derived from the live user.role value ──────────
  const isSuperAdmin   = user?.role === 'super_admin';
  const isAdminOrAbove = user?.role === 'admin' || user?.role === 'super_admin';
  const isClient       = user?.role === 'client';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isSuperAdmin,
        isAdminOrAbove,
        isClient,
        login,
        logout,
        dbMode,
        sessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
