/**
 * axiosInstance.js — Axios base config with JWT interceptor + DB mode tracking.
 *
 * Fixes applied:
 *   • 401 handling now dispatches a custom DOM event ('iq-auth-expired') instead
 *     of a hard window.location.href redirect.  This lets React Router handle
 *     navigation cleanly and avoids the blank-page flash that happened when the
 *     hard redirect fired mid-render.
 *   • stale iq_db_mode is also cleared on 401 so the next session starts fresh.
 *   • On startup the stale iq_db_mode value is NOT trusted — the real value is
 *     always driven by the X-DB-Mode response header from the backend.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('iq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — handle auth + DB mode header ──────────────────────
api.interceptors.response.use(
  (res) => {
    // Capture the X-DB-Mode header the backend adds to every response.
    // Dispatch an event only when the mode has actually changed so we
    // don't spam re-renders on every single API call.
    const dbMode = res.headers['x-db-mode'];
    if (dbMode) {
      const prevMode = localStorage.getItem('iq_db_mode');
      if (prevMode !== dbMode) {
        localStorage.setItem('iq_db_mode', dbMode);
        window.dispatchEvent(
          new CustomEvent('iq-db-mode-change', { detail: { mode: dbMode } })
        );
      }
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      // Only treat this as an expired session when a token was actually sent.
      // If there was no token we don't fire the event (avoids infinite loops
      // when the page renders without auth while DEV_BYPASS is on).
      const hadToken = !!localStorage.getItem('iq_token');

      // Clear stale auth + DB mode so the next session starts clean.
      localStorage.removeItem('iq_token');
      localStorage.removeItem('iq_user');
      localStorage.removeItem('iq_db_mode');

      if (hadToken) {
        // Dispatch a soft event so AuthContext / React Router can redirect
        // cleanly without a hard browser navigation that causes a blank flash.
        window.dispatchEvent(new CustomEvent('iq-auth-expired'));
      }
    }
    return Promise.reject(err);
  }
);

export default api;
