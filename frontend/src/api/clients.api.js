import api from './axiosInstance';

export const clientsApi = {
  getAll:      ()              => api.get('/clients'),
  getById:     (id)            => api.get(`/clients/${id}`),
  create:      (data)          => api.post('/clients', data),
  update:      (id, data)      => api.put(`/clients/${id}`, data),
  remove:      (id)            => api.delete(`/clients/${id}`),
  toggleLive:  (id, is_live)   => api.patch(`/clients/${id}/live-status`, { is_live }),
};
