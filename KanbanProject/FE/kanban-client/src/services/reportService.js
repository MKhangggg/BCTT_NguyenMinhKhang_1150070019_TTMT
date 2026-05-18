import api from './api'

export const reportService = {
  getBoardSummary: (boardId) => api.get(`/reports/boards/${boardId}/summary`).then((res) => res.data),
}
