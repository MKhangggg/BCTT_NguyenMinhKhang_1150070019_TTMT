import api from './api'

export const notificationService = {
  getNotifications: () => api.get('/notifications').then((res) => res.data),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
}
