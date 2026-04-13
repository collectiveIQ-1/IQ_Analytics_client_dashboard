/**
 * tokenUtils.js — JWT decode and expiry check (client-side only).
 * Never trust these for security — backend always validates.
 */

function decode(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function isExpired(token) {
  const decoded = decode(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

export const tokenUtils = { decode, isExpired };
