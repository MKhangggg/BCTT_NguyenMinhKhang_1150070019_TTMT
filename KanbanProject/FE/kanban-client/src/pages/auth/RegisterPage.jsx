import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../services/api'
import Notice from '../../components/common/Notice.jsx'

function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!form.fullName || !form.userName || !form.email || !form.password) {
      setError('Vui lòng nhập đầy đủ các trường bắt buộc.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
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
      navigate('/', { replace: true })
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
          <span className="brand-mark"><UserPlus size={24} /></span>
          <div>
            <h1>Tạo tài khoản</h1>
            <p>Bắt đầu sử dụng không gian làm việc Kanban của bạn.</p>
          </div>
        </div>

        <Notice type="error">{error}</Notice>

        <label>
          Họ và tên
          <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </label>
        <label>
          Tên đăng nhập
          <input value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Mật khẩu
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <label>
          Xác nhận mật khẩu
          <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
        </label>

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
        </button>

        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </div>
  )
}

export default RegisterPage
