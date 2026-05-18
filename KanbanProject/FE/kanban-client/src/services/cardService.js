import api from './api'

export const cardService = {
  createCard: (columnId, payload) => api.post(`/columns/${columnId}/cards`, payload).then((res) => res.data),
  getCard: (cardId) => api.get(`/cards/${cardId}`).then((res) => res.data),
  updateCard: (cardId, payload) => api.put(`/cards/${cardId}`, payload).then((res) => res.data),
  deleteCard: (cardId) => api.delete(`/cards/${cardId}`),
  moveCard: (cardId, payload) => api.put(`/cards/${cardId}/move`, payload).then((res) => res.data),
  reorderCards: (payload) => api.put('/cards/reorder', payload),
  archiveCard: (cardId) => api.put(`/cards/${cardId}/archive`).then((res) => res.data),
  addChecklist: (cardId, payload) => api.post(`/cards/${cardId}/checklists`, payload).then((res) => res.data),
  updateChecklist: (id, payload) => api.put(`/checklists/${id}`, payload).then((res) => res.data),
  deleteChecklist: (id) => api.delete(`/checklists/${id}`),
}
