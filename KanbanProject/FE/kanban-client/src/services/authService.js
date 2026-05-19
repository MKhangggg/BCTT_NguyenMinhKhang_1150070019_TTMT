import api from './api'

export const authService = {
  register: (payload) => api.post('/auth/register', payload).then((res) => res.data),
  login: (payload) => api.post('/auth/login', payload, { skipAuthRedirect: true }).then((res) => res.data),
  me: (options = {}) => api.get('/auth/me', options).then((res) => res.data),
  updateProfile: (payload) => api.put('/auth/profile', payload).then((res) => res.data),
  uploadAvatar: (formData) => api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data),
  changePassword: (payload) => api.put('/auth/change-password', payload),
}
