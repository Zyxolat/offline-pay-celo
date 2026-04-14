import api from './api';

export const adminAPI = {
  login: (email: string, password: string) => api.post('/admin/login', { email, password }),
  getStats: () => api.get('/admin/stats'),
  getUsers: (page = 1, limit = 50) => api.get('/admin/users', { params: { page, limit } }),
  getTransactions: (page = 1, limit = 50) => api.get('/admin/transactions', { params: { page, limit } }),
  getWallets: (page = 1, limit = 50) => api.get('/admin/wallets', { params: { page, limit } }),
};
