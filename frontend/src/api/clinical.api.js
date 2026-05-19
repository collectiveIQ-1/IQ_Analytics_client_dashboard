/**
 * clinical.api.js — Frontend API client for /api/clinical/* endpoints.
 *
 * All calls go through the shared axiosInstance (auth headers + interceptors).
 */

import api from './axiosInstance';

const p = (params) => Object.fromEntries(
  Object.entries(params || {}).filter(([, v]) => v != null && v !== '')
);

export const clinicalApi = {
  /** Overview KPIs: total accessions, PCR, TOX, clinics, date range */
  getOverview: () =>
    api.get('/clinical/overview'),

  /** Weekly PCR + TOX volume + active clinic count */
  getWeeklyVolume: () =>
    api.get('/clinical/weekly-volume'),

  /** Weekly active clinic count + new clinics per week */
  getWeeklyAccounts: () =>
    api.get('/clinical/weekly-accounts'),

  /** Monthly PCR + TOX totals — one point per month */
  getMonthlyVolume: () =>
    api.get('/clinical/monthly-volume'),

  /** Monthly active + new clinic counts — one point per month */
  getMonthlyAccounts: () =>
    api.get('/clinical/monthly-accounts'),

  /** Per-clinic totals: PCR, TOX, grand total — for ranked bar + donut */
  getClinicSummary: () =>
    api.get('/clinical/clinic-summary'),

  /** Top-N clinic weekly volumes — for multi-line trend chart
   *  @param {number} topN — number of top clinics (default 10, max 20)
   */
  getClinicWeekly: (topN = 10) =>
    api.get('/clinical/clinic-weekly', { params: p({ topN }) }),

  /** Volume by ordering provider
   *  @param {number} limit — max rows (default 20)
   */
  getByProvider: (limit = 20) =>
    api.get('/clinical/by-provider', { params: p({ limit }) }),

  /** Volume by panel name
   *  @param {number} limit — max rows (default 20)
   */
  getByPanel: (limit = 20) =>
    api.get('/clinical/by-panel', { params: p({ limit }) }),

  /** Volume by specimen type */
  getBySpecimen: () =>
    api.get('/clinical/by-specimen'),

  /** Volume by technician (run-by)
   *  @param {number} limit — max rows (default 20)
   */
  getByRunBy: (limit = 20) =>
    api.get('/clinical/by-runby', { params: p({ limit }) }),

  /** Debug: list actual column names in iq_qfd.pipeline */
  getDebugColumns: () =>
    api.get('/clinical/debug/columns'),
};
