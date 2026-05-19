import api from './api'

export const organizationService = {
  getUnits: (includeInactive = false) => api.get('/organization/units', { params: { includeInactive } }).then((res) => res.data),
  getUnitOptions: (includeInactive = false) => api.get('/organization/units/options', { params: { includeInactive } }).then((res) => res.data),
  createUnit: (payload) => api.post('/organization/units', payload).then((res) => res.data),
  updateUnit: (unitId, payload) => api.put(`/organization/units/${unitId}`, payload).then((res) => res.data),
  addMember: (unitId, payload) => api.post(`/organization/units/${unitId}/members`, payload).then((res) => res.data),
  updateMemberRole: (unitId, memberId, payload) => api.put(`/organization/units/${unitId}/members/${memberId}/role`, payload).then((res) => res.data),
  removeMember: (unitId, memberId) => api.delete(`/organization/units/${unitId}/members/${memberId}`).then((res) => res.data),
}
