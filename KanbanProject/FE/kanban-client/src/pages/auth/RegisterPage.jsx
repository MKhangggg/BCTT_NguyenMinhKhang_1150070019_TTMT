import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Eye, EyeOff, KanbanSquare, LockKeyhole, Mail, ShieldCheck, Sparkles, User, UserPlus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useUI } from '../../context/UIContext.jsx'
import { getErrorMessage } from '../../services/api'
import Notice from '../../components/common/Notice.jsx'

function RegisterPage() {
  const { register } = useAuth()
  const { showToast } = useUI()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const clearFieldError = (field) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    clearFieldError(field)
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.fullName.trim()) nextErrors.fullName = 'Vui lòng nhập họ và tên.'
    if (!form.userName.trim()) nextErrors.userName = 'Vui lòng nhập tên đăng nhập.'
    if (!form.email.trim()) nextErrors.email = 'Vui lòng nhập email.'
    if (!form.password) nextErrors.password = 'Vui lòng nhập mật khẩu.'
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.'
    }
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!validate()) {
      setError('Vui lòng nhập đầy đủ các trường bắt buộc.')
      return
    }

    try {
      setLoading(true)
      await register({
        fullName: form.fullName,
        userName: form.userName,
        email: form.email,
        password: form.password,
      })
      showToast({ type: 'success', title: 'Tạo tài khoản thành công', message: 'Đang mở không gian làm việc của bạn.' })
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page auth-page-login">
      <div className="auth-shell auth-shell-register">
        <aside className="auth-showcase">
          <div className="auth-showcase-copy">
            <span className="auth-brand-chip"><KanbanSquare size={18} /> Kanban</span>
            <h2>Tạo không gian làm việc mới.</h2>
            <p>Bắt đầu quản lý bảng, thẻ và tiến độ nhóm với một tài khoản Kanban riêng cho bạn.</p>
          </div>

          <div className="auth-preview-board" aria-hidden="true">
            <div className="preview-column">
              <span>Thiết lập</span>
              <div className="preview-task is-blue">Tạo tài khoản</div>
              <div className="preview-task">Mời thành viên</div>
            </div>
            <div className="preview-column">
              <span>Quản lý</span>
              <div className="preview-task is-green">Tạo bảng đầu tiên</div>
              <div className="preview-progress"><span /></div>
            </div>
            <div className="preview-column">
              <span>Sẵn sàng</span>
              <div className="preview-task is-done"><CheckCircle2 size={14} /> Theo dõi công việc</div>
            </div>
          </div>

          <div className="auth-feature-row">
            <span><ShieldCheck size={16} /> Phân quyền rõ ràng</span>
            <span><Sparkles size={16} /> Giao diện realtime</span>
          </div>
        </aside>

        <form className="auth-panel auth-panel-login" onSubmit={handleSubmit}>
          <div className="auth-heading">
            <span className="brand-mark"><UserPlus size={23} /></span>
            <div>
              <span className="eyebrow">Bắt đầu nhanh</span>
              <h1>Tạo tài khoản</h1>
              <p>Bắt đầu sử dụng không gian làm việc Kanban của bạn.</p>
            </div>
          </div>

        <Notice type="error">{error}</Notice>

        <div className="form-grid two auth-register-grid">
          <label className="auth-field">
            <span>Họ và tên</span>
            <div className={`input-with-icon ${fieldErrors.fullName ? 'is-invalid' : ''}`}>
              <User size={18} />
              <input value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="Nguyễn Minh Khang" />
            </div>
            {fieldErrors.fullName && <span className="field-error-text">{fieldErrors.fullName}</span>}
          </label>
          <label className="auth-field">
            <span>Tên đăng nhập</span>
            <div className={`input-with-icon ${fieldErrors.userName ? 'is-invalid' : ''}`}>
              <UserPlus size={18} />
              <input value={form.userName} onChange={(e) => updateField('userName', e.target.value)} placeholder="mkhang" />
            </div>
            {fieldErrors.userName && <span className="field-error-text">{fieldErrors.userName}</span>}
          </label>
        </div>

        <label className="auth-field">
          <span>Email</span>
          <div className={`input-with-icon ${fieldErrors.email ? 'is-invalid' : ''}`}>
            <Mail size={18} />
            <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="ban@email.com" />
          </div>
          {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
        </label>

        <label className="auth-field">
          <span>Mật khẩu</span>
          <div className={`input-with-icon ${fieldErrors.password ? 'is-invalid' : ''}`}>
            <LockKeyhole size={18} />
            <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => updateField('password', e.target.value)} />
            <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {fieldErrors.password && <span className="field-error-text">{fieldErrors.password}</span>}
        </label>

        <label className="auth-field">
          <span>Xác nhận mật khẩu</span>
          <div className={`input-with-icon ${fieldErrors.confirmPassword ? 'is-invalid' : ''}`}>
            <LockKeyhole size={18} />
            <input type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} />
            <button className="password-toggle" type="button" onClick={() => setShowConfirmPassword((value) => !value)} title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
              {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {fieldErrors.confirmPassword && <span className="field-error-text">{fieldErrors.confirmPassword}</span>}
        </label>

        <button className="primary-button auth-submit" type="submit" disabled={loading}>
          <span>{loading ? 'Đang tạo...' : 'Tạo tài khoản'}</span>
          <ArrowRight size={18} />
        </button>

        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage
