import api from './axiosInstance';

export const dashboardApi = {
  getSummary: (clientId) => api.get(`/dashboard/${clientId}/summary`),
  getKpis:    (clientId) => api.get(`/dashboard/${clientId}/kpis`),
  getCharts:  (clientId) => api.get(`/dashboard/${clientId}/charts`),
  getReports: (clientId) => api.get(`/dashboard/${clientId}/reports`),
};
