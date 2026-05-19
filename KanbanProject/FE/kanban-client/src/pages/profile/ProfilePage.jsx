import { useEffect, useMemo, useState } from 'react'
import { Camera, Eye, EyeOff, IdCard, KeyRound, Mail, Save, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useUI } from '../../context/UIContext.jsx'
import { authService } from '../../services/authService'
import { getErrorMessage } from '../../services/api'
import Notice from '../../components/common/Notice.jsx'
import Avatar from '../../components/common/Avatar.jsx'

const getPasswordStrength = (password) => {
  let score = 0
  if (password.length >= 6) score += 1
  if (password.length >= 10) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return Math.min(score, 5)
}

function ProfilePage() {
  const { user, roleLabel, updateStoredUser } = useAuth()
  const { showToast } = useUI()
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    avatarUrl: '',
    department: '',
    jobTitle: '',
  })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  useEffect(() => {
    setProfileForm({
      fullName: user?.fullName || '',
      avatarUrl: user?.avatarUrl || '',
      department: user?.department || '',
      jobTitle: user?.jobTitle || '',
    })
  }, [user])

  const strength = useMemo(() => getPasswordStrength(passwordForm.newPassword), [passwordForm.newPassword])
  const strengthLabel = ['Rất yếu', 'Yếu', 'Tạm ổn', 'Khá', 'Mạnh', 'Rất mạnh'][strength]

  const updateProfileField = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const updatePasswordField = (field, value) => {
    setPasswordForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!profileForm.fullName.trim()) {
      setFieldErrors((current) => ({ ...current, fullName: 'Vui lòng nhập họ tên.' }))
      return
    }

    try {
      setProfileSaving(true)
      const updated = await authService.updateProfile({
        fullName: profileForm.fullName,
        avatarUrl: profileForm.avatarUrl,
        department: profileForm.department,
        jobTitle: profileForm.jobTitle,
      })
      updateStoredUser(updated)
      setMessage('Hồ sơ cá nhân đã được cập nhật.')
      showToast({ type: 'success', title: 'Đã lưu hồ sơ', message: 'Thông tin cá nhân của bạn đã được làm mới.' })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setProfileSaving(false)
    }
  }

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError('')
    setMessage('')
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn đúng file hình ảnh.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Ảnh đại diện không được vượt quá 2 MB.')
      return
    }

    try {
      setAvatarUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      const updated = await authService.uploadAvatar(formData)
      updateStoredUser(updated)
      setProfileForm((current) => ({ ...current, avatarUrl: updated.avatarUrl || '' }))
      setMessage('Ảnh đại diện đã được cập nhật.')
      showToast({ type: 'success', title: 'Đã tải ảnh lên', message: 'Ảnh đại diện mới đã được lưu vào hồ sơ.' })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setAvatarUploading(false)
    }
  }

  const validatePassword = () => {
    const nextErrors = {}
    if (!passwordForm.currentPassword) nextErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.'
    if (!passwordForm.newPassword) nextErrors.newPassword = 'Vui lòng nhập mật khẩu mới.'
    if (passwordForm.newPassword && passwordForm.newPassword.length < 6) nextErrors.newPassword = 'Mật khẩu mới cần ít nhất 6 ký tự.'
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    if (!validatePassword()) return

    try {
      setPasswordSaving(true)
      await authService.changePassword(passwordForm)
      setPasswordForm({ currentPassword: '', newPassword: '' })
      setMessage('Đổi mật khẩu thành công.')
      showToast({ type: 'success', title: 'Đã đổi mật khẩu', message: 'Thông tin bảo mật của bạn đã được cập nhật.' })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <section className="page profile-page">
      <div className="profile-hero-card profile-hero-wide">
        <div className="profile-avatar-editor">
          <Avatar name={profileForm.fullName || user?.userName} src={profileForm.avatarUrl} size="xl" />
          <label className="avatar-upload-button" title="Tải ảnh đại diện lên">
            <Camera size={16} />
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadAvatar} disabled={avatarUploading} />
          </label>
        </div>
        <div>
          <span className="eyebrow">Hồ sơ cá nhân</span>
          <h2>{profileForm.fullName || user?.userName}</h2>
          <p><Mail size={15} /> {user?.email}</p>
        </div>
        <span className="profile-role-chip"><ShieldCheck size={15} /> {roleLabel}</span>
      </div>

      <Notice type="success">{message}</Notice>
      <Notice type="error">{error}</Notice>

      <div className="profile-wide-grid">
        <form className="profile-panel profile-editor-form" onSubmit={saveProfile}>
          <header>
            <span><IdCard size={19} /></span>
            <div>
              <h3>Thông tin hiển thị</h3>
              <p>Cập nhật tên, ảnh đại diện và thông tin công việc để đồng đội nhận diện nhanh hơn.</p>
            </div>
          </header>

          <div className="form-grid two">
            <label className="required-field">
              <span>Họ tên</span>
              <input
                className={fieldErrors.fullName ? 'is-invalid' : ''}
                value={profileForm.fullName}
                onChange={(event) => updateProfileField('fullName', event.target.value)}
              />
              {fieldErrors.fullName && <span className="field-error-text">{fieldErrors.fullName}</span>}
            </label>
            <label>
              Link ảnh đại diện hoặc tải ảnh lên
              <input
                value={profileForm.avatarUrl}
                onChange={(event) => updateProfileField('avatarUrl', event.target.value)}
                placeholder="https://..."
              />
              <small className="field-hint">Bấm biểu tượng máy ảnh ở avatar để upload ảnh JPG, PNG, WEBP hoặc GIF tối đa 2 MB.</small>
            </label>
          </div>

          <div className="form-grid two">
            <label>
              Phòng ban
              <input
                value={profileForm.department}
                onChange={(event) => updateProfileField('department', event.target.value)}
                placeholder="Ví dụ: Phát triển phần mềm"
                disabled={Boolean(user?.organizationUnitId)}
              />
              {user?.organizationUnitId && (
                <small className="field-hint">
                  Cơ cấu hiện tại: {user.organizationUnitCode} · {user.organizationUnitName}. Admin DUDI quản lý thông tin này.
                </small>
              )}
            </label>
            <label>
              Chức danh
              <input
                value={profileForm.jobTitle}
                onChange={(event) => updateProfileField('jobTitle', event.target.value)}
                placeholder="Ví dụ: Frontend Developer"
              />
            </label>
          </div>

          <button className="primary-button compact" type="submit" disabled={profileSaving}>
            <Save size={16} /> {profileSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </button>
        </form>

        <aside className="profile-panel profile-mini-summary">
          <span><Sparkles size={20} /></span>
          <h3>{user?.isSystemAdmin ? 'Tài khoản quản trị' : 'Tài khoản thành viên'}</h3>
          <div className="profile-info-list">
            <span>Tên đăng nhập <strong>{user?.userName}</strong></span>
            <span>Email <strong>{user?.email}</strong></span>
            <span>Trạng thái <strong>Đang hoạt động</strong></span>
          </div>
        </aside>
      </div>

      <form className="profile-panel profile-security-card" onSubmit={changePassword}>
        <header>
          <span><KeyRound size={19} /></span>
          <div>
            <h3>Bảo mật tài khoản</h3>
            <p>Đổi mật khẩu định kỳ để giữ tài khoản an toàn.</p>
          </div>
        </header>

        <div className="form-grid two">
          <label className="auth-field required-field">
            <span>Mật khẩu hiện tại</span>
            <div className={`input-with-icon ${fieldErrors.currentPassword ? 'is-invalid' : ''}`}>
              <KeyRound size={18} />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
              />
              <button className="password-toggle" type="button" onClick={() => setShowCurrentPassword((value) => !value)} title={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                {showCurrentPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {fieldErrors.currentPassword && <span className="field-error-text">{fieldErrors.currentPassword}</span>}
          </label>

          <label className="auth-field required-field">
            <span>Mật khẩu mới</span>
            <div className={`input-with-icon ${fieldErrors.newPassword ? 'is-invalid' : ''}`}>
              <KeyRound size={18} />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(event) => updatePasswordField('newPassword', event.target.value)}
              />
              <button className="password-toggle" type="button" onClick={() => setShowNewPassword((value) => !value)} title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {fieldErrors.newPassword && <span className="field-error-text">{fieldErrors.newPassword}</span>}
          </label>
        </div>

        <div className="profile-security-footer">
          <div className="password-strength">
            <div><span style={{ width: `${Math.max(8, strength * 20)}%` }} /></div>
            <small>Độ mạnh: {strengthLabel}</small>
          </div>
          <button className="primary-button compact" type="submit" disabled={passwordSaving}>
            <KeyRound size={16} /> {passwordSaving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default ProfilePage
