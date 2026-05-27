import api from './api'

export const chatService = {
  getUsers: () => api.get('/chat/users').then((res) => res.data),
  getDirectMessages: (userId) => api.get(`/chat/users/${userId}/messages`).then((res) => res.data),
  sendDirectMessage: (userId, payload) => api.post(`/chat/users/${userId}/messages`, payload).then((res) => res.data),
  getMessages: (boardId) => api.get(`/boards/${boardId}/chat/messages`).then((res) => res.data),
  sendMessage: (boardId, payload) => api.post(`/boards/${boardId}/chat/messages`, payload).then((res) => res.data),
}
