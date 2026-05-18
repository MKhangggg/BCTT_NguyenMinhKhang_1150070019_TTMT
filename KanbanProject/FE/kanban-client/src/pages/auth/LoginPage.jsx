import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../services/api'
import Notice from '../../components/common/Notice.jsx'

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: 'admin@kanban.com', password: 'Admin@123' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    if (!form.email || !form.password) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }

    try {
      setLoading(true)
      await login(form)
      const params = new URLSearchParams(location.search)
      const next = params.get('next')
      navigate(next || location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-panel" onSubmit={handleSubmit}>
        <div className="auth-heading">
          <span className="brand-mark"><LogIn size={24} /></span>
          <div>
            <h1>Đăng nhập</h1>
            <p>Dùng tài khoản demo hoặc tài khoản trong không gian làm việc của bạn.</p>
          </div>
        </div>

        <Notice type="error">{error}</Notice>

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="admin@kanban.com"
          />
        </label>

        <label>
          Mật khẩu
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Admin@123"
          />
        </label>

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
