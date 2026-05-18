import api from './api'

export const columnService = {
  createColumn: (boardId, payload) => api.post(`/boards/${boardId}/columns`, payload).then((res) => res.data),
  updateColumn: (columnId, payload) => api.put(`/columns/${columnId}`, payload).then((res) => res.data),
  deleteColumn: (columnId) => api.delete(`/columns/${columnId}`),
  reorderColumns: (payload) => api.put('/columns/reorder', payload),
}
