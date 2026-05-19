import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Eye, EyeOff, KanbanSquare, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useUI } from '../../context/UIContext.jsx'
import { extractApiError, getErrorMessage } from '../../services/api'
import Notice from '../../components/common/Notice.jsx'

function LoginPage() {
  const { login } = useAuth()
  const { showToast } = useUI()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: 'admin@kanban.com', password: 'Admin@123' })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const clearFieldError = (field) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.email.trim()) nextErrors.email = 'Vui lòng nhập email.'
    if (!form.password) nextErrors.password = 'Vui lòng nhập mật khẩu.'
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const expired = params.get('expired')
    const message = sessionStorage.getItem('kanban_auth_message')

    if (expired && message) {
      setError(message)
      sessionStorage.removeItem('kanban_auth_message')
    }
  }, [location.search])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!validate()) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }

    try {
      setLoading(true)
      await login(form)
      showToast({ type: 'success', title: 'Đăng nhập thành công', message: 'Đang mở không gian làm việc của bạn.' })
      const params = new URLSearchParams(location.search)
      const next = params.get('next')
      navigate(next || location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      const apiError = extractApiError(err)
      if (apiError.status === 401 || apiError.code === 'unauthorized') {
        setFieldErrors({
          email: 'Kiểm tra lại email.',
          password: 'Kiểm tra lại mật khẩu.',
        })
        setError('Email hoặc mật khẩu chưa đúng. Bạn kiểm tra lại thông tin đăng nhập nhé.')
        return
      }
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page auth-page-login">
      <div className="auth-shell">
        <aside className="auth-showcase">
          <div className="auth-showcase-copy">
            <span className="auth-brand-chip"><KanbanSquare size={18} /> Kanban</span>
            <h2>Quay lại luồng công việc của bạn.</h2>
            <p>Theo dõi bảng, thẻ và tiến độ nhóm trong một không gian làm việc rõ ràng, nhanh và dễ tập trung.</p>
          </div>

          <div className="auth-preview-board" aria-hidden="true">
            <div className="preview-column">
              <span>Cần làm</span>
              <div className="preview-task is-blue">Chuẩn bị báo cáo</div>
              <div className="preview-task">Tạo checklist</div>
            </div>
            <div className="preview-column">
              <span>Đang làm</span>
              <div className="preview-task is-green">Thiết kế dashboard</div>
              <div className="preview-progress"><span /></div>
            </div>
            <div className="preview-column">
              <span>Hoàn thành</span>
              <div className="preview-task is-done"><CheckCircle2 size={14} /> Kiểm thử đăng nhập</div>
            </div>
          </div>

          <div className="auth-feature-row">
            <span><ShieldCheck size={16} /> Bảo mật JWT</span>
            <span><Sparkles size={16} /> Realtime board</span>
          </div>
        </aside>

        <form className="auth-panel auth-panel-login" onSubmit={handleSubmit}>
          <div className="auth-heading">
            <span className="brand-mark"><LockKeyhole size={23} /></span>
            <div>
              <span className="eyebrow">Chào mừng trở lại</span>
              <h1>Đăng nhập</h1>
              <p>Dùng tài khoản demo hoặc tài khoản trong không gian làm việc của bạn.</p>
            </div>
          </div>

        <Notice type="error">{error}</Notice>

        <label className="auth-field">
          <span>Email</span>
          <div className={`input-with-icon ${fieldErrors.email ? 'is-invalid' : ''}`}>
            <Mail size={18} />
            <input
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value })
                clearFieldError('email')
              }}
              placeholder="admin@kanban.com"
            />
          </div>
          {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
        </label>

        <label className="auth-field">
          <span>Mật khẩu</span>
          <div className={`input-with-icon ${fieldErrors.password ? 'is-invalid' : ''}`}>
            <LockKeyhole size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value })
                clearFieldError('password')
              }}
              placeholder="Admin@123"
            />
            <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {fieldErrors.password && <span className="field-error-text">{fieldErrors.password}</span>}
        </label>

        <button className="primary-button auth-submit" type="submit" disabled={loading}>
          <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
          <ArrowRight size={18} />
        </button>

        <div className="auth-demo-note">
          <ShieldCheck size={17} />
          <span>Tài khoản demo đã được điền sẵn để bạn vào hệ thống nhanh hơn.</span>
        </div>

        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link>
        </p>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
