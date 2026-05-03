import api from './axiosInstance';

export const insightApi = {
  // DOS
  getDosLast12:    (groupBy, filter) => api.get('/insight/dos/last12',    { params: { groupBy, ...(filter && filter !== 'all' ? { filter } : {}) } }),
  getDosLastMonth: (groupBy, filter) => api.get('/insight/dos/lastmonth', { params: { groupBy, ...(filter && filter !== 'all' ? { filter } : {}) } }),
  getDosFilters:   (groupBy)         => api.get('/insight/dos/filters',   { params: { groupBy } }),

  // DOE
  getDoeLast12:    (groupBy, filter) => api.get('/insight/doe/last12',    { params: { groupBy, ...(filter && filter !== 'all' ? { filter } : {}) } }),
  getDoeLastMonth: (groupBy, filter) => api.get('/insight/doe/lastmonth', { params: { groupBy, ...(filter && filter !== 'all' ? { filter } : {}) } }),
  getDoeFilters:   (groupBy)         => api.get('/insight/doe/filters',   { params: { groupBy } }),

  // DOD
  getDodLast12:    (groupBy, filter) => api.get('/insight/dod/last12',    { params: { groupBy, ...(filter && filter !== 'all' ? { filter } : {}) } }),
  getDodLastMonth: (groupBy, filter) => api.get('/insight/dod/lastmonth', { params: { groupBy, ...(filter && filter !== 'all' ? { filter } : {}) } }),
  getDodFilters:   (groupBy)         => api.get('/insight/dod/filters',   { params: { groupBy } }),
};
