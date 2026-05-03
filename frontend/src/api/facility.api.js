import api from './axiosInstance';

export const facilityApi = {
  getDosLast12:    (month) => api.get('/facility/dos/last12',    { params: month ? { month } : {} }),
  getDosLastMonth: ()      => api.get('/facility/dos/lastmonth'),
  getDoeLast12:    (month) => api.get('/facility/doe/last12',    { params: month && month !== 'all' ? { month } : {} }),
  getDoeLastMonth: ()      => api.get('/facility/doe/lastmonth'),
  getDodLast12:    (month) => api.get('/facility/dod/last12',    { params: month && month !== 'all' ? { month } : {} }),
  getDodLastMonth: ()      => api.get('/facility/dod/lastmonth'),
};
