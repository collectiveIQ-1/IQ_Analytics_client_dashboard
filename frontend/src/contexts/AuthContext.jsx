/**
 * AuthContext.jsx — Global auth state: user, token, role.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { tokenUtils } from '../utils/tokenUtils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('iq_user') || 'null'); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('iq_token') || null);

  const login = useCallback((tokenValue, userData) => {
    localStorage.setItem('iq_token', tokenValue);
    localStorage.setItem('iq_user',  JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('iq_token');
    localStorage.removeItem('iq_user');
    setToken(null);
    setUser(null);
  }, []);

  // Auto-logout if token is expired
  const isAuthenticated = Boolean(token && user && !tokenUtils.isExpired(token));

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
