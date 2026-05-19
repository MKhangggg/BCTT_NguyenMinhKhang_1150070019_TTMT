import { useEffect, useMemo, useState } from 'react'
import { Building2, FolderTree, Save, Search, ShieldCheck, Trash2, UserPlus, UsersRound } from 'lucide-react'
import Avatar from '../../components/common/Avatar.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Notice from '../../components/common/Notice.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { useUI } from '../../context/UIContext.jsx'
import { adminService } from '../../services/adminService'
import { getErrorMessage } from '../../services/api'
import { organizationService } from '../../services/organizationService'

const blankUnitForm = {
  id: null,
  code: '',
  name: '',
  description: '',
  type: 'Department',
  parentId: '',
  managerId: '',
  isActive: true,
}

const unitTypeLabel = {
  Department: 'Phòng ban',
  Team: 'Team',
}

function AdminOrganizationPage() {
  const { confirm, showToast } = useUI()
  const [units, setUnits] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUnitId, setSelectedUnitId] = useState(null)
  const [unitForm, setUnitForm] = useState(blankUnitForm)
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'Member' })
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const load = async () => {
    try {
      setError('')
      const [unitData, userData] = await Promise.all([
        organizationService.getUnits(true),
        adminService.getUsers(''),
      ])
      setUnits(unitData)
      setUsers(userData)
      if (!selectedUnitId && unitData.length > 0) {
        const firstUnit = unitData[0]
        setSelectedUnitId(firstUnit.id)
        setUnitForm({
          id: firstUnit.id,
          code: firstUnit.code,
          name: firstUnit.name,
          description: firstUnit.description || '',
          type: firstUnit.type,
          parentId: firstUnit.parentId || '',
          managerId: firstUnit.managerId || '',
          isActive: firstUnit.isActive,
        })
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const departments = useMemo(
    () => units.filter((unit) => unit.type === 'Department'),
    [units],
  )

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId),
    [selectedUnitId, units],
  )

  const availableUsers = useMemo(() => {
    const memberIds = new Set((selectedUnit?.members || []).map((member) => member.userId))
    return users.filter((user) => user.isActive && !memberIds.has(user.id))
  }, [selectedUnit, users])

  const filteredUnits = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return units

    return units.filter((unit) => (
      unit.name.toLowerCase().includes(text)
      || unit.code.toLowerCase().includes(text)
      || (unit.parentName || '').toLowerCase().includes(text)
      || (unit.managerName || '').toLowerCase().includes(text)
    ))
  }, [query, units])

  const stats = useMemo(() => ({
    departments: units.filter((unit) => unit.type === 'Department' && unit.isActive).length,
    teams: units.filter((unit) => unit.type === 'Team' && unit.isActive).length,
    members: units.reduce((sum, unit) => sum + Number(unit.memberCount || 0), 0),
    projects: units.reduce((sum, unit) => sum + Number(unit.boardCount || 0), 0),
  }), [units])

  const editUnit = (unit, sourceUnits = units) => {
    const freshUnit = sourceUnits.find((item) => item.id === unit.id) || unit
    setSelectedUnitId(freshUnit.id)
    setFieldErrors({})
    setMessage('')
    setUnitForm({
      id: freshUnit.id,
      code: freshUnit.code,
      name: freshUnit.name,
      description: freshUnit.description || '',
      type: freshUnit.type,
      parentId: freshUnit.parentId || '',
      managerId: freshUnit.managerId || '',
      isActive: freshUnit.isActive,
    })
  }

  const newUnit = () => {
    setSelectedUnitId(null)
    setUnitForm(blankUnitForm)
    setMemberForm({ userId: '', role: 'Member' })
    setFieldErrors({})
    setMessage('')
  }

  const saveUnit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    const nextErrors = {}
    if (!unitForm.code.trim()) nextErrors.code = 'Vui lòng nhập mã đơn vị.'
    if (!unitForm.name.trim()) nextErrors.name = 'Vui lòng nhập tên đơn vị.'
    if (unitForm.type === 'Team' && !unitForm.parentId) nextErrors.parentId = 'Team cần thuộc một phòng ban.'
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      setError('Bạn kiểm tra lại các trường bắt buộc nhé.')
      return
    }

    const payload = {
      code: unitForm.code,
      name: unitForm.name,
      description: unitForm.description || null,
      type: unitForm.type,
      parentId: unitForm.type === 'Team' && unitForm.parentId ? Number(unitForm.parentId) : null,
      managerId: unitForm.managerId ? Number(unitForm.managerId) : null,
      isActive: unitForm.isActive,
    }

    try {
      setSaving(true)
      const saved = unitForm.id
        ? await organizationService.updateUnit(unitForm.id, payload)
        : await organizationService.createUnit(payload)
      setMessage(unitForm.id ? 'Đã cập nhật đơn vị.' : 'Đã tạo đơn vị mới.')
      showToast({ type: 'success', title: unitForm.id ? 'Đã cập nhật đơn vị' : 'Đã tạo đơn vị', message: saved.name })
      const nextUnits = await organizationService.getUnits(true)
      setUnits(nextUnits)
      editUnit(saved, nextUnits)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const addMember = async (event) => {
    event.preventDefault()
    if (!selectedUnit || !memberForm.userId) return

    try {
      setError('')
      const updated = await organizationService.addMember(selectedUnit.id, {
        userId: Number(memberForm.userId),
        role: memberForm.role,
      })
      setMemberForm({ userId: '', role: 'Member' })
      const nextUnits = units.map((unit) => (unit.id === updated.id ? updated : unit))
      setUnits(nextUnits)
      editUnit(updated, nextUnits)
      showToast({ type: 'success', title: 'Đã thêm thành viên vào đơn vị', message: updated.name })
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const updateMemberRole = async (member, role) => {
    if (!selectedUnit) return

    try {
      setError('')
      const updated = await organizationService.updateMemberRole(selectedUnit.id, member.id, { role })
      const nextUnits = units.map((unit) => (unit.id === updated.id ? updated : unit))
      setUnits(nextUnits)
      editUnit(updated, nextUnits)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const removeMember = async (member) => {
    if (!selectedUnit) return
    const ok = await confirm({
      title: 'Xóa khỏi đơn vị?',
      message: `${member.fullName} sẽ không còn thuộc ${selectedUnit.name}.`,
      confirmText: 'Xóa thành viên',
      tone: 'danger',
    })
    if (!ok) return

    try {
      setError('')
      const updated = await organizationService.removeMember(selectedUnit.id, member.id)
      const nextUnits = units.map((unit) => (unit.id === updated.id ? updated : unit))
      setUnits(nextUnits)
      editUnit(updated, nextUnits)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (loading) {
    return <section className="page stack"><div className="skeleton-card tall" /></section>
  }

  return (
    <section className="page stack organization-page">
      <div className="admin-hero organization-hero">
        <div>
          <span className="eyebrow">Cơ cấu nội bộ DUDI</span>
          <h2>Phòng ban, team và quản lý vận hành</h2>
          <p>Quản lý đơn vị tổ chức thực tế: phòng ban cha, team con, trưởng nhóm, thành viên và dự án đang phụ trách.</p>
        </div>
        <FolderTree size={46} />
      </div>

      <div className="stats-grid">
        <StatCard icon={<Building2 size={20} />} label="Phòng ban" value={stats.departments} hint="đang hoạt động" tone="blue" />
        <StatCard icon={<UsersRound size={20} />} label="Team" value={stats.teams} hint="nhóm chuyên môn" tone="green" />
        <StatCard icon={<UserPlus size={20} />} label="Lượt thành viên" value={stats.members} hint="trong cơ cấu" tone="amber" />
        <StatCard icon={<ShieldCheck size={20} />} label="Dự án gắn đơn vị" value={stats.projects} hint="đang phụ trách" tone="red" />
      </div>

      <Notice type="error">{error}</Notice>
      <Notice type="success">{message}</Notice>

      <div className="organization-grid">
        <section className="admin-panel organization-list-panel">
          <header className="admin-panel-header">
            <div>
              <span className="eyebrow">Danh bạ tổ chức</span>
              <h3>Phòng ban & team</h3>
            </div>
            <button className="primary-button compact" type="button" onClick={newUnit}>
              <Building2 size={16} /> Đơn vị mới
            </button>
          </header>
          <div className="search-field">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, tên, quản lý" />
          </div>

          <div className="organization-tree">
            {filteredUnits.length === 0 ? (
              <EmptyState icon={<FolderTree size={24} />} title="Chưa có đơn vị phù hợp" description="Tạo phòng ban DUDI đầu tiên hoặc đổi từ khóa tìm kiếm." />
            ) : (
              filteredUnits.map((unit) => (
                <button
                  className={`organization-unit-card ${selectedUnitId === unit.id ? 'selected' : ''} ${unit.type.toLowerCase()}`}
                  key={unit.id}
                  type="button"
                  onClick={() => editUnit(unit)}
                >
                  <span className="unit-type-chip">{unitTypeLabel[unit.type]}</span>
                  <div>
                    <strong>{unit.name}</strong>
                    <small>{unit.code}{unit.parentName ? ` · ${unit.parentName}` : ''}</small>
                  </div>
                  <div className="unit-card-meta">
                    <span>{unit.memberCount} thành viên</span>
                    <span>{unit.managerName || 'Chưa có quản lý'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="admin-panel organization-editor-panel">
          <header className="admin-panel-header">
            <div>
              <span className="eyebrow">{unitForm.id ? 'Cập nhật' : 'Tạo mới'}</span>
              <h3>{unitForm.id ? unitForm.name : 'Đơn vị DUDI'}</h3>
            </div>
          </header>

          <form className="admin-form stack" onSubmit={saveUnit}>
            <div className="form-grid two">
              <label className="required-field">
                <span>Mã đơn vị</span>
                <input className={fieldErrors.code ? 'is-invalid' : ''} value={unitForm.code} onChange={(event) => setUnitForm({ ...unitForm, code: event.target.value })} placeholder="DUDI-FE" />
                {fieldErrors.code && <span className="field-error-text">{fieldErrors.code}</span>}
              </label>
              <label className="required-field">
                <span>Tên đơn vị</span>
                <input className={fieldErrors.name ? 'is-invalid' : ''} value={unitForm.name} onChange={(event) => setUnitForm({ ...unitForm, name: event.target.value })} placeholder="Team Frontend" />
                {fieldErrors.name && <span className="field-error-text">{fieldErrors.name}</span>}
              </label>
            </div>

            <div className="form-grid two">
              <label>
                Loại đơn vị
                <select value={unitForm.type} onChange={(event) => setUnitForm({ ...unitForm, type: event.target.value, parentId: event.target.value === 'Department' ? '' : unitForm.parentId })}>
                  <option value="Department">Phòng ban</option>
                  <option value="Team">Team</option>
                </select>
              </label>
              <label className={unitForm.type === 'Team' ? 'required-field' : ''}>
                <span>Thuộc phòng ban</span>
                <select className={fieldErrors.parentId ? 'is-invalid' : ''} value={unitForm.parentId} onChange={(event) => setUnitForm({ ...unitForm, parentId: event.target.value })} disabled={unitForm.type === 'Department'}>
                  <option value="">Không có</option>
                  {departments.filter((unit) => unit.id !== unitForm.id).map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
                {fieldErrors.parentId && <span className="field-error-text">{fieldErrors.parentId}</span>}
              </label>
            </div>

            <label>
              Mô tả nhiệm vụ
              <textarea value={unitForm.description} onChange={(event) => setUnitForm({ ...unitForm, description: event.target.value })} rows={3} placeholder="Vai trò, phạm vi, nghiệp vụ đơn vị phụ trách..." />
            </label>

            <div className="form-grid two">
              <label>
                Quản lý / trưởng nhóm
                <select value={unitForm.managerId} onChange={(event) => setUnitForm({ ...unitForm, managerId: event.target.value })}>
                  <option value="">Chưa chọn</option>
                  {users.filter((user) => user.isActive).map((user) => (
                    <option key={user.id} value={user.id}>{user.fullName} · {user.email}</option>
                  ))}
                </select>
              </label>
              <label className="check-row organization-active-check">
                <input type="checkbox" checked={unitForm.isActive} onChange={(event) => setUnitForm({ ...unitForm, isActive: event.target.checked })} />
                Đơn vị đang hoạt động
              </label>
            </div>

            <button className="primary-button compact" type="submit" disabled={saving}>
              <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu cơ cấu'}
            </button>
          </form>

          {selectedUnit && (
            <div className="unit-members-section">
              <header>
                <div>
                  <span className="eyebrow">Nhân sự đơn vị</span>
                  <h3>{selectedUnit.memberCount} thành viên</h3>
                </div>
              </header>

              <form className="unit-member-form" onSubmit={addMember}>
                <select value={memberForm.userId} onChange={(event) => setMemberForm({ ...memberForm, userId: event.target.value })}>
                  <option value="">Chọn nhân sự DUDI</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>{user.fullName} · {user.email}</option>
                  ))}
                </select>
                <select value={memberForm.role} onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value })}>
                  <option value="Member">Thành viên</option>
                  <option value="Lead">Trưởng nhóm</option>
                </select>
                <button className="ghost-button compact" type="submit">
                  <UserPlus size={16} /> Thêm
                </button>
              </form>

              <div className="unit-member-list">
                {(selectedUnit.members || []).length === 0 ? (
                  <EmptyState icon={<UsersRound size={24} />} title="Chưa có thành viên" description="Thêm nhân sự vào phòng ban hoặc team để có thể mời cả nhóm vào dự án." />
                ) : (
                  selectedUnit.members.map((member) => (
                    <article className="unit-member-row" key={member.id}>
                      <Avatar name={member.fullName} src={member.avatarUrl} />
                      <div>
                        <strong>{member.fullName}</strong>
                        <small>{member.email}{member.jobTitle ? ` · ${member.jobTitle}` : ''}</small>
                      </div>
                      <select value={member.role} onChange={(event) => updateMemberRole(member, event.target.value)}>
                        <option value="Member">Thành viên</option>
                        <option value="Lead">Trưởng nhóm</option>
                      </select>
                      <button className="icon-button danger" type="button" title="Xóa khỏi đơn vị" onClick={() => removeMember(member)}>
                        <Trash2 size={16} />
                      </button>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

export default AdminOrganizationPage
