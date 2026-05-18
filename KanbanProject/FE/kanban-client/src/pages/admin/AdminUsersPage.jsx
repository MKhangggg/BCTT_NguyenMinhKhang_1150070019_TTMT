import { useCallback, useEffect, useMemo, useState } from 'react'
import { KeyRound, Save, Search, ShieldCheck, UserCog, UserPlus, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../../components/common/Avatar.jsx'
import Loading from '../../components/common/Loading.jsx'
import Notice from '../../components/common/Notice.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { adminService } from '../../services/adminService'
import { extractApiError, getErrorMessage } from '../../services/api'

const blankForm = {
  id: null,
  fullName: '',
  userName: '',
  email: '',
  password: '',
  department: '',
  jobTitle: '',
  avatarUrl: '',
  isSystemAdmin: false,
  isActive: true,
}

function AdminUsersPage() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(blankForm)
  const [resetPassword, setResetPassword] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

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
      const [overviewData, userData] = await Promise.all([
        adminService.getOverview(),
        adminService.getUsers(query),
      ])
      setOverview(overviewData)
      setUsers(userData)
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
    setForm({
      id: user.id,
      fullName: user.fullName,
      userName: user.userName,
      email: user.email,
      password: '',
      department: user.department || '',
      jobTitle: user.jobTitle || '',
      avatarUrl: user.avatarUrl || '',
      isSystemAdmin: user.isSystemAdmin,
      isActive: user.isActive,
    })
  }

  const newUser = () => {
    setSelectedUserId(null)
    setResetPassword('')
    setForm(blankForm)
  }

  const saveUser = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      if (form.id) {
        await adminService.updateUser(form.id, {
          fullName: form.fullName,
          userName: form.userName,
          email: form.email,
          avatarUrl: form.avatarUrl || null,
          department: form.department || null,
          jobTitle: form.jobTitle || null,
          isSystemAdmin: form.isSystemAdmin,
          isActive: form.isActive,
        })
        setMessage('User updated successfully.')
      } else {
        await adminService.createUser({
          fullName: form.fullName,
          userName: form.userName,
          email: form.email,
          password: form.password,
          department: form.department || null,
          jobTitle: form.jobTitle || null,
          isSystemAdmin: form.isSystemAdmin,
          isActive: form.isActive,
        })
        setMessage('User created successfully.')
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
    try {
      setError('')
      await adminService.setStatus(user.id, { isActive: !user.isActive })
      await load()
    } catch (err) {
      if (!redirectIfForbidden(err)) {
        setError(getErrorMessage(err))
      }
    }
  }

  const submitResetPassword = async () => {
    if (!selectedUser || !resetPassword.trim()) return
    try {
      setError('')
      await adminService.resetPassword(selectedUser.id, { newPassword: resetPassword })
      setResetPassword('')
      setMessage(`Password reset for ${selectedUser.email}.`)
    } catch (err) {
      if (!redirectIfForbidden(err)) {
        setError(getErrorMessage(err))
      }
    }
  }

  if (loading) return <Loading label="Loading admin console" />

  return (
    <section className="page stack">
      <div className="admin-hero">
        <div>
          <span className="eyebrow">Admin he thong</span>
          <h2>User administration</h2>
          <p>Manage company accounts, access status, system administrators, and operational ownership from one console.</p>
        </div>
        <ShieldCheck size={44} />
      </div>

      {overview && (
        <div className="stats-grid">
          <StatCard icon={<Users size={20} />} label="Users" value={overview.totalUsers} hint="tong tai khoan" tone="blue" />
          <StatCard icon={<UserCog size={20} />} label="Active" value={overview.activeUsers} hint="co the dang nhap" tone="green" />
          <StatCard icon={<ShieldCheck size={20} />} label="Admins" value={overview.systemAdmins} hint="quyen he thong" tone="amber" />
          <StatCard icon={<KeyRound size={20} />} label="Board" value={overview.totalBoard} hint={`${overview.totalCards} the dang hoat dong`} tone="red" />
        </div>
      )}

      <Notice type="error">{error}</Notice>
      <Notice type="success">{message}</Notice>

      <div className="admin-grid">
        <section className="admin-panel">
          <header className="admin-panel-header">
            <div>
              <span className="eyebrow">Directory</span>
              <h3>Company users</h3>
            </div>
            <button className="primary-button compact" type="button" onClick={newUser}>
              <UserPlus size={16} /> Users moi
            </button>
          </header>

          <div className="search-field">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tim ten, email, phong ban" />
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
                <span>{user.department || 'Chua co phong ban'}</span>
                <span className={`status-chip ${user.isActive ? 'active' : 'inactive'}`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
                {user.isSystemAdmin && <span className="role-chip">Admin</span>}
              </button>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <header className="admin-panel-header">
            <div>
              <span className="eyebrow">{form.id ? 'Chinh sua' : 'Create'}</span>
              <h3>{form.id ? 'Profile nguoi dung' : 'Tai khoan moi'}</h3>
            </div>
          </header>

          <form className="admin-form stack" onSubmit={saveUser}>
            <label>Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
            <div className="form-grid two">
              <label>Username<input value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} /></label>
              <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            </div>
            {!form.id && (
              <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            )}
            <div className="form-grid two">
              <label>Department<input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
              <label>Chuc danh<input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></label>
            </div>
            <label>Avatar URL<input value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} /></label>
            <div className="switch-grid">
              <label className="check-row"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
              <label className="check-row"><input type="checkbox" checked={form.isSystemAdmin} onChange={(e) => setForm({ ...form, isSystemAdmin: e.target.checked })} /> Admin he thong</label>
            </div>
            <button className="primary-button compact" type="submit" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save user'}
            </button>
          </form>

          {selectedUser && (
            <div className="admin-tools">
              <div>
                <strong>Account tools</strong>
                <small>{selectedUser.ownedBoardCount} owned boards, {selectedUser.assignedCardCount} assigned cards</small>
              </div>
              <button className="ghost-button compact" type="button" onClick={() => toggleStatus(selectedUser)}>
                {selectedUser.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <div className="inline-form">
                <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Password moi" />
                <button className="ghost-button compact" type="button" onClick={submitResetPassword}>Dat lai</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

export default AdminUsersPage
