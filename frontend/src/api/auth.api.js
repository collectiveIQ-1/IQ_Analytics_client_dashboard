import api from './axiosInstance';

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me:    ()               => api.get('/auth/me'),
};
