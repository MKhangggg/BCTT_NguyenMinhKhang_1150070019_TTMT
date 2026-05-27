import { Building2, ChevronDown, Trash2, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Avatar from '../common/Avatar.jsx'
import Notice from '../common/Notice.jsx'
import { getErrorMessage } from '../../services/api'
import { memberService } from '../../services/memberService'
import { organizationService } from '../../services/organizationService'

const roleOptions = [
  { value: 'Admin', label: 'Quản trị dự án' },
  { value: 'Member', label: 'Thành viên' },
  { value: 'Viewer', label: 'Người xem' },
]

function MembersModal({ boardId, member: members = [], onClose, onChanged }) {
  const [form, setForm] = useState({ email: '', role: 'Member' })
  const [unitForm, setUnitForm] = useState({ organizationUnitId: '', role: 'Member' })
  const [candidates, setCandidates] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [organizationUnits, setOrganizationUnits] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedCandidate = useMemo(() => (
    candidates.find((candidate) => candidate.email === form.email) || null
  ), [candidates, form.email])

  const loadCandidates = useCallback(async () => {
    try {
      setLoadingCandidates(true)
      setCandidates(await memberService.getCandidates(boardId, ''))
    } catch {
      setCandidates([])
    } finally {
      setLoadingCandidates(false)
    }
  }, [boardId])

  useEffect(() => {
    let mounted = true
    organizationService.getUnitOptions()
      .then((items) => {
        if (mounted) setOrganizationUnits(items)
      })
      .catch(() => {
        if (mounted) setOrganizationUnits([])
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    loadCandidates()
  }, [loadCandidates])

  const invite = async (event) => {
    event.preventDefault()
    if (!form.email.trim()) {
      setError('Vui lòng chọn thành viên cần thêm.')
      return
    }

    try {
      setSaving(true)
      setError('')
      await memberService.addMember(boardId, form)
      setForm({ email: '', role: 'Member' })
      setPickerOpen(false)
      await loadCandidates()
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const inviteUnit = async (event) => {
    event.preventDefault()
    if (!unitForm.organizationUnitId) return
    try {
      setSaving(true)
      setError('')
      await memberService.addOrganizationUnitMembers(boardId, {
        organizationUnitId: Number(unitForm.organizationUnitId),
        role: unitForm.role,
        promoteLeadsToAdmin: true,
      })
      setUnitForm({ organizationUnitId: '', role: 'Member' })
      await loadCandidates()
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const updateRole = async (memberId, role) => {
    try {
      setError('')
      await memberService.updateRole(boardId, memberId, { role })
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const removeMember = async (memberId) => {
    try {
      setError('')
      await memberService.removeMember(boardId, memberId)
      await loadCandidates()
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-panel member-modal">
        <header className="modal-header">
          <h2>Thành viên dự án</h2>
          <button className="icon-button" type="button" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </header>

        <Notice type="error">{error}</Notice>

        <form className="member-form" onSubmit={invite}>
          <div className="member-candidate-field">
            <button
              className="member-picker-button"
              type="button"
              disabled={saving || loadingCandidates}
              onClick={() => setPickerOpen((value) => !value)}
            >
              <span>
                <strong>{selectedCandidate?.fullName || (loadingCandidates ? 'Đang tải danh sách...' : 'Chọn thành viên có sẵn')}</strong>
                <small>{selectedCandidate?.email || `${candidates.length} tài khoản khả dụng`}</small>
              </span>
              <ChevronDown size={16} />
            </button>
            {pickerOpen && (
              <div className="member-candidate-menu is-picker">
                {candidates.length === 0 && <span className="candidate-loading">Không còn tài khoản khả dụng</span>}
                {candidates.map((candidate) => (
                  <button
                    key={candidate.userId}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setForm({ ...form, email: candidate.email })
                      setPickerOpen(false)
                    }}
                  >
                    <Avatar name={candidate.fullName} src={candidate.avatarUrl} size="sm" />
                    <span>
                      <strong>{candidate.fullName}</strong>
                      <small>{candidate.email}{candidate.department ? ` · ${candidate.department}` : ''}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <button className="primary-button compact" type="submit" disabled={saving || !form.email}>
            <UserPlus size={16} /> Thêm vào dự án
          </button>
        </form>

        <form className="member-form organization-invite-form" onSubmit={inviteUnit}>
          <select value={unitForm.organizationUnitId} onChange={(event) => setUnitForm({ ...unitForm, organizationUnitId: event.target.value })}>
            <option value="">Thêm cả phòng ban/team</option>
            {organizationUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.type === 'Team' ? 'Team' : 'Phòng ban'} · {unit.name} ({unit.memberCount})
              </option>
            ))}
          </select>
          <select value={unitForm.role} onChange={(event) => setUnitForm({ ...unitForm, role: event.target.value })}>
            {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <button className="ghost-button compact" type="submit" disabled={saving || !unitForm.organizationUnitId}>
            <Building2 size={16} /> Thêm team
          </button>
        </form>

        <div className="member-list">
          {members.map((member) => (
            <div className="member-row" key={member.id}>
              <Avatar name={member.fullName} src={member.avatarUrl} />
              <div>
                <strong>{member.fullName}</strong>
                <small>{member.email}</small>
              </div>
              <select
                value={member.role}
                disabled={member.role === 'Owner'}
                onChange={(event) => updateRole(member.id, event.target.value)}
              >
                <option value="Owner">Chủ sở hữu</option>
                {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
              <button
                className="icon-button danger"
                type="button"
                title="Xóa thành viên"
                disabled={member.role === 'Owner'}
                onClick={() => removeMember(member.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default MembersModal
