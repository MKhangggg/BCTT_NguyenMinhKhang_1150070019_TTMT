import api from './api'

export const commentService = {
  getComments: (cardId) => api.get(`/cards/${cardId}/comments`).then((res) => res.data),
  addComment: (cardId, payload) => api.post(`/cards/${cardId}/comments`, payload).then((res) => res.data),
  deleteComment: (commentId) => api.delete(`/comments/${commentId}`),
}
