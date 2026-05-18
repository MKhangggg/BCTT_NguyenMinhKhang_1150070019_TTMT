import { X, UserPlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Avatar from '../common/Avatar.jsx'
import Notice from '../common/Notice.jsx'
import { getErrorMessage } from '../../services/api'
import { memberService } from '../../services/memberService'

const roleOptions = [
  { value: 'Admin', label: 'Quản trị bảng' },
  { value: 'Member', label: 'Thành viên' },
  { value: 'Viewer', label: 'Người xem' },
]

function MembersModal({ boardId, member: members = [], onClose, onChanged }) {
  const [form, setForm] = useState({ email: '', role: 'Member' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

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
          <h2>Thành viên bảng</h2>
          <button className="icon-button" type="button" onClick={onClose} title="Đóng"><X size={18} /></button>
        </header>

        <Notice type="error">{error}</Notice>

        <form className="member-form" onSubmit={invite}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="thanhvien@email.com"
          />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <button className="primary-button compact" type="submit" disabled={saving}>
            <UserPlus size={16} /> Mời
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
