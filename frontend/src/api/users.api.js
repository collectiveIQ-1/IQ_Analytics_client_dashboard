import api from './axiosInstance';

export const usersApi = {
  getAll:              ()                    => api.get('/users'),
  getById:             (id)                  => api.get(`/users/${id}`),
  create:              (data)                => api.post('/users', data),
  update:              (id, data)            => api.put(`/users/${id}`, data),
  remove:              (id)                  => api.delete(`/users/${id}`),
  getUserClients:      (id)                  => api.get(`/users/${id}/clients`),
  assignClientAccess:  (id, clientId)        => api.post(`/users/${id}/clients`, { clientId }),
  removeClientAccess:  (id, clientId)        => api.delete(`/users/${id}/clients/${clientId}`),
};
