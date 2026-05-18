import api from './api'

export const memberService = {
  getMembers: (boardId) => api.get(`/boards/${boardId}/members`).then((res) => res.data),
  addMember: (boardId, payload) => api.post(`/boards/${boardId}/members`, payload).then((res) => res.data),
  updateRole: (boardId, memberId, payload) => api.put(`/boards/${boardId}/members/${memberId}/role`, payload).then((res) => res.data),
  removeMember: (boardId, memberId) => api.delete(`/boards/${boardId}/members/${memberId}`),
}
