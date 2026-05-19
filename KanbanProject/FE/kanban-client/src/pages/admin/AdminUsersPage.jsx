import { useCallback, useEffect, useMemo, useState } from 'react'
import { KeyRound, Save, Search, ShieldCheck, UserCog, UserPlus, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../../components/common/Avatar.jsx'
import Loading from '../../components/common/Loading.jsx'
import Notice from '../../components/common/Notice.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { useUI } from '../../context/UIContext.jsx'
import { adminService } from '../../services/adminService'
import { organizationService } from '../../services/organizationService'
import { extractApiError, getErrorMessage } from '../../services/api'

const blankForm = {
  id: null,
  fullName: '',
  userName: '',
  email: '',
  password: '',
  department: '',
  organizationUnitId: '',
  jobTitle: '',
  avatarUrl: '',
  isSystemAdmin: false,
  isActive: true,
}

function AdminUsersPage() {
  const { confirm, showToast } = useUI()
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [organizationUnits, setOrganizationUnits] = useState([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(blankForm)
  const [resetPassword, setResetPassword] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId),
    [users, selectedUserId],
  )

  const redirectIfForbidden = useCallback((error) => {
    const apiError = extractApiError(error)
    if (apiError.status !== 403 && apiError.code !== 'forbidden') {
      return false
    }

    setError('Bạn không có quyền truy cập khu vực quản trị.')
    navigate('/', { replace: true })
    return true
  }, [navigate])

  const load = useCallback(async () => {
    try {
      setError('')
      const [overviewData, userData, unitData] = await Promise.all([
        adminService.getOverview(),
        adminService.getUsers(query),
        organizationService.getUnitOptions(true),
      ])
      setOverview(overviewData)
      setUsers(userData)
      setOrganizationUnits(unitData)
    } catch (err) {
      if (!redirectIfForbidden(err)) {
        setError(getErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }, [query, redirectIfForbidden])

  useEffect(() => {
    load()
  }, [load])

  const editUser = (user) => {
    setSelectedUserId(user.id)
    setResetPassword('')
    setFieldErrors({})
    setForm({
      id: user.id,
      fullName: user.fullName,
      userName: user.userName,
      email: user.email,
      password: '',
      department: user.department || '',
      organizationUnitId: user.organizationUnitId || '',
      jobTitle: user.jobTitle || '',
      avatarUrl: user.avatarUrl || '',
      isSystemAdmin: user.isSystemAdmin,
      isActive: user.isActive,
    })
  }

  const newUser = () => {
    setSelectedUserId(null)
    setResetPassword('')
    setFieldErrors({})
    setForm(blankForm)
  }

  const saveUser = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const nextErrors = {}
    if (!form.fullName.trim()) nextErrors.fullName = 'Vui lòng nhập họ và tên.'
    if (!form.userName.trim()) nextErrors.userName = 'Vui lòng nhập tên đăng nhập.'
    if (!form.email.trim()) nextErrors.email = 'Vui lòng nhập email.'
    if (!form.id && !form.password.trim()) nextErrors.password = 'Vui lòng nhập mật khẩu.'
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      setError('Bạn kiểm tra lại các trường bắt buộc nhé.')
      return
    }
    setFieldErrors({})
    setSaving(true)

    try {
      if (form.id) {
        await adminService.updateUser(form.id, {
          fullName: form.fullName,
          userName: form.userName,
          email: form.email,
          avatarUrl: form.avatarUrl || null,
          department: form.department || null,
          organizationUnitId: form.organizationUnitId ? Number(form.organizationUnitId) : null,
          jobTitle: form.jobTitle || null,
          isSystemAdmin: form.isSystemAdmin,
          isActive: form.isActive,
        })
        setMessage('Cập nhật người dùng thành công.')
        showToast({ type: 'success', title: 'Đã cập nhật người dùng', message: form.email })
      } else {
        await adminService.createUser({
          fullName: form.fullName,
          userName: form.userName,
          email: form.email,
          password: form.password,
          department: form.department || null,
          organizationUnitId: form.organizationUnitId ? Number(form.organizationUnitId) : null,
          jobTitle: form.jobTitle || null,
          isSystemAdmin: form.isSystemAdmin,
          isActive: form.isActive,
        })
        setMessage('Tạo người dùng thành công.')
        showToast({ type: 'success', title: 'Đã tạo người dùng', message: form.email })
        setForm(blankForm)
      }
      await load()
    } catch (err) {
      if (!redirectIfForbidden(err)) {
        setError(getErrorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (user) => {
    const ok = await confirm({
      title: user.isActive ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?',
      message: `${user.fullName} sẽ ${user.isActive ? 'không thể đăng nhập' : 'có thể đăng nhập lại'} sau thao tác này.`,
      confirmText: user.isActive ? 'Khóa tài khoản' : 'Mở khóa',
      tone: user.isActive ? 'danger' : 'warning',
    })
    if (!ok) return

    try {
      setError('')
      await adminService.setStatus(user.id, { isActive: !user.isActive })
      showToast({ type: 'success', title: user.isActive ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản', message: user.email })
      await load()
    } catch (err) {
      if (!redirectIfForbidden(err)) {
        setError(getErrorMessage(err))
      }
    }
  }

  const submitResetPassword = async () => {
    if (!selectedUser || !resetPassword.trim()) return
    const ok = await confirm({
      title: 'Đặt lại mật khẩu?',
      message: `Mật khẩu của ${selectedUser.email} sẽ được đổi ngay.`,
      confirmText: 'Đặt lại',
      tone: 'warning',
    })
    if (!ok) return

    try {
      setError('')
      await adminService.resetPassword(selectedUser.id, { newPassword: resetPassword })
      setResetPassword('')
      setMessage(`Đã đặt lại mật khẩu cho ${selectedUser.email}.`)
      showToast({ type: 'success', title: 'Đã đặt lại mật khẩu', message: selectedUser.email })
    } catch (err) {
      if (!redirectIfForbidden(err)) {
        setError(getErrorMessage(err))
      }
    }
  }

  if (loading) return <Loading label="Đang tải trang quản trị" />

  return (
    <section className="page stack">
      <div className="admin-hero">
        <div>
          <span className="eyebrow">Quản trị hệ thống</span>
          <h2>Quản lý người dùng</h2>
          <p>Quản lý tài khoản, trạng thái truy cập, quyền quản trị hệ thống và quyền sở hữu vận hành từ một màn hình.</p>
        </div>
        <ShieldCheck size={44} />
      </div>

      {overview && (
        <div className="stats-grid">
          <StatCard icon={<Users size={20} />} label="Người dùng" value={overview.totalUsers} hint="tổng tài khoản" tone="blue" />
          <StatCard icon={<UserCog size={20} />} label="Đang hoạt động" value={overview.activeUsers} hint="có thể đăng nhập" tone="green" />
          <StatCard icon={<ShieldCheck size={20} />} label="Quản trị viên" value={overview.systemAdmins} hint="quyền hệ thống" tone="amber" />
          <StatCard icon={<KeyRound size={20} />} label="Đơn vị DUDI" value={overview.organizationUnits || 0} hint={`${overview.teams || 0} team chuyên môn`} tone="red" />
        </div>
      )}

      <Notice type="error">{error}</Notice>
      <Notice type="success">{message}</Notice>

      <div className="admin-grid">
        <section className="admin-panel">
          <header className="admin-panel-header">
            <div>
              <span className="eyebrow">Danh bạ</span>
              <h3>Người dùng công ty</h3>
            </div>
            <button className="primary-button compact" type="button" onClick={newUser}>
              <UserPlus size={16} /> Người dùng mới
            </button>
          </header>

          <div className="search-field">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tên, email, phòng ban" />
          </div>

          <div className="user-table">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                className={`user-row ${selectedUserId === user.id ? 'selected' : ''}`}
                onClick={() => editUser(user)}
              >
                <Avatar name={user.fullName} src={user.avatarUrl} />
                <div>
                  <strong>{user.fullName}</strong>
                  <span>{user.email}</span>
                </div>
                <span>{user.organizationUnitName || user.department || 'Chưa có phòng ban'}</span>
                <span className={`status-chip ${user.isActive ? 'active' : 'inactive'}`}>
                  {user.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                </span>
                {user.isSystemAdmin && <span className="role-chip">Quản trị</span>}
              </button>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <header className="admin-panel-header">
            <div>
              <span className="eyebrow">{form.id ? 'Chỉnh sửa' : 'Tạo mới'}</span>
              <h3>{form.id ? 'Hồ sơ người dùng' : 'Tài khoản mới'}</h3>
            </div>
          </header>

          <form className="admin-form stack" onSubmit={saveUser}>
            <label>
              Họ và tên
              <input className={fieldErrors.fullName ? 'is-invalid' : ''} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              {fieldErrors.fullName && <span className="field-error-text">{fieldErrors.fullName}</span>}
            </label>
            <div className="form-grid two">
              <label>
                Tên đăng nhập
                <input className={fieldErrors.userName ? 'is-invalid' : ''} value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} />
                {fieldErrors.userName && <span className="field-error-text">{fieldErrors.userName}</span>}
              </label>
              <label>
                Email
                <input className={fieldErrors.email ? 'is-invalid' : ''} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
              </label>
            </div>
            {!form.id && (
              <label>
                Mật khẩu
                <input className={fieldErrors.password ? 'is-invalid' : ''} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                {fieldErrors.password && <span className="field-error-text">{fieldErrors.password}</span>}
              </label>
            )}
            <div className="form-grid two">
              <label>
                Phòng ban / team DUDI
                <select value={form.organizationUnitId} onChange={(e) => setForm({ ...form, organizationUnitId: e.target.value })}>
                  <option value="">Chưa gán cơ cấu</option>
                  {organizationUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.type === 'Team' ? 'Team' : 'Phòng ban'} · {unit.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>Chức danh<input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></label>
            </div>
            <label>Phòng ban hiển thị<input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Tự lấy theo đơn vị nếu đã chọn" /></label>
            <label>URL ảnh đại diện<input value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} /></label>
            <div className="switch-grid">
              <label className="check-row"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Đang hoạt động</label>
              <label className="check-row"><input type="checkbox" checked={form.isSystemAdmin} onChange={(e) => setForm({ ...form, isSystemAdmin: e.target.checked })} /> Quản trị hệ thống</label>
            </div>
            <button className="primary-button compact" type="submit" disabled={saving}>
              <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu người dùng'}
            </button>
          </form>

          {selectedUser && (
            <div className="admin-tools">
              <div>
                <strong>Công cụ tài khoản</strong>
                <small>{selectedUser.ownedBoardCount} bảng sở hữu, {selectedUser.assignedCardCount} thẻ được giao</small>
              </div>
              <button className="ghost-button compact" type="button" onClick={() => toggleStatus(selectedUser)}>
                {selectedUser.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
              </button>
              <div className="inline-form">
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      submitResetPassword()
                    }
                  }}
                  placeholder="Mật khẩu mới"
                />
                <button className="ghost-button compact" type="button" onClick={submitResetPassword}>Đặt lại</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

export default AdminUsersPage
