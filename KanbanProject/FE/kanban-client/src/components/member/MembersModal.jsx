import { Building2, X, UserPlus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  const [organizationUnits, setOrganizationUnits] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

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

  const invite = async (event) => {
    event.preventDefault()
    if (!form.email.trim()) return
    try {
      setSaving(true)
      setError('')
      await memberService.addMember(boardId, form)
      setForm({ email: '', role: 'Member' })
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
          <button className="icon-button" type="button" onClick={onClose} title="Đóng"><X size={18} /></button>
        </header>

        <Notice type="error">{error}</Notice>

        <form className="member-form" onSubmit={invite}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email thành viên"
          />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <button className="primary-button compact" type="submit" disabled={saving}>
            <UserPlus size={16} /> Thêm vào dự án
          </button>
        </form>

        <form className="member-form organization-invite-form" onSubmit={inviteUnit}>
          <select value={unitForm.organizationUnitId} onChange={(e) => setUnitForm({ ...unitForm, organizationUnitId: e.target.value })}>
            <option value="">Thêm cả phòng ban/team</option>
            {organizationUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.type === 'Team' ? 'Team' : 'Phòng ban'} · {unit.name} ({unit.memberCount})
              </option>
            ))}
          </select>
          <select value={unitForm.role} onChange={(e) => setUnitForm({ ...unitForm, role: e.target.value })}>
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
                onChange={(e) => updateRole(member.id, e.target.value)}
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
