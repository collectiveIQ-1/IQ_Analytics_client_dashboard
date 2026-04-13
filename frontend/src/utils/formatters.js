/**
 * formatters.js — Number, date and string formatting helpers.
 */

export const formatNumber = (n) =>
  n == null ? '—' : new Intl.NumberFormat('en-US').format(n);

export const formatCurrency = (n, currency = 'USD') =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

export const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatPercent = (n) =>
  n == null ? '—' : `${(n * 100).toFixed(1)}%`;

export const slugToTitle = (slug) =>
  slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
