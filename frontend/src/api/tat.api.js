import api from './axiosInstance';

export const tatApi = {
  getLastMonth: () => api.get('/tat/lastmonth'),
  getLast12:    () => api.get('/tat/last12'),
};
