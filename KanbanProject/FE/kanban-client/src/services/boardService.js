import api from './api'

export const boardService = {
  getBoards: () => api.get('/boards').then((res) => res.data),
  getBoard: (id) => api.get(`/boards/${id}`).then((res) => res.data),
  createBoard: (payload) => api.post('/boards', payload).then((res) => res.data),
  updateBoard: (id, payload) => api.put(`/boards/${id}`, payload).then((res) => res.data),
  deleteBoard: (id) => api.delete(`/boards/${id}`),
}
