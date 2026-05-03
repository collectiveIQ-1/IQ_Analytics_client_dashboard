import api from './axiosInstance';

const p = (params) => Object.fromEntries(
  Object.entries(params).filter(([, v]) => v != null && v !== '' && v !== 'all')
);

export const panelApi = {
  getSummary:    (dateMode)                              => api.get('/panel/summary',       { params: p({ dateMode }) }),

  getDosLast12:  (groupBy, filter, month, panelType)    => api.get('/panel/dos/last12',    { params: p({ groupBy, filter, month, panelType }) }),
  getDosLastMonth:(groupBy, filter, panelType)           => api.get('/panel/dos/lastmonth', { params: p({ groupBy, filter, panelType }) }),

  getDoeLast12:  (groupBy, filter, month, panelType)    => api.get('/panel/doe/last12',    { params: p({ groupBy, filter, month, panelType }) }),
  getDoeLastMonth:(groupBy, filter, panelType)           => api.get('/panel/doe/lastmonth', { params: p({ groupBy, filter, panelType }) }),

  getDodLast12:  (groupBy, filter, month, panelType)    => api.get('/panel/dod/last12',    { params: p({ groupBy, filter, month, panelType }) }),
  getDodLastMonth:(groupBy, filter, panelType)           => api.get('/panel/dod/lastmonth', { params: p({ groupBy, filter, panelType }) }),

  getFilterValues:(dateMode, groupBy)                    => api.get('/panel/filters',       { params: p({ dateMode, groupBy }) }),
};
