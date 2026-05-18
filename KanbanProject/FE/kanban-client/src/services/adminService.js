import api from './api'

export const adminService = {
  getOverview: () => api.get('/admin/overview').then((res) => res.data),
  getUsers: (search = '') => api.get('/admin/users', { params: { search } }).then((res) => res.data),
  createUser: (payload) => api.post('/admin/users', payload).then((res) => res.data),
  updateUser: (userId, payload) => api.put(`/admin/users/${userId}`, payload).then((res) => res.data),
  setStatus: (userId, payload) => api.put(`/admin/users/${userId}/status`, payload).then((res) => res.data),
  resetPassword: (userId, payload) => api.put(`/admin/users/${userId}/reset-password`, payload),
}
