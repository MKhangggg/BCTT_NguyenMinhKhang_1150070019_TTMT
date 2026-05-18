import api from './api'

export const authService = {
  register: (payload) => api.post('/auth/register', payload).then((res) => res.data),
  login: (payload) => api.post('/auth/login', payload, { skipAuthRedirect: true }).then((res) => res.data),
  me: (options = {}) => api.get('/auth/me', options).then((res) => res.data),
  changePassword: (payload) => api.put('/auth/change-password', payload),
}
