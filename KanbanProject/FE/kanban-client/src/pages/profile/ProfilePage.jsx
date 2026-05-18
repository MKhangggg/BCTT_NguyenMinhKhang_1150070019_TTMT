import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/authService'
import { getErrorMessage } from '../../services/api'
import Notice from '../../components/common/Notice.jsx'
import Avatar from '../../components/common/Avatar.jsx'

function ProfilePage() {
  const { user } = useAuth()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const changePassword = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    if (!form.currentPassword || !form.newPassword) {
      setError('Vui lòng nhập đầy đủ hai ô mật khẩu.')
      return
    }

    try {
      await authService.changePassword(form)
      setForm({ currentPassword: '', newPassword: '' })
      setMessage('Đổi mật khẩu thành công.')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <section className="page stack narrow">
      <div className="profile-card">
        <Avatar name={user?.fullName} src={user?.avatarUrl} size="lg" />
        <div>
          <h2>{user?.fullName}</h2>
          <p>{user?.email}</p>
        </div>
      </div>

      <form className="profile-form stack" onSubmit={changePassword}>
        <h3><KeyRound size={18} /> Đổi mật khẩu</h3>
        <Notice type="success">{message}</Notice>
        <Notice type="error">{error}</Notice>
        <label>
          Mật khẩu hiện tại
          <input type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
        </label>
        <label>
          Mật khẩu mới
          <input type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
        </label>
        <button className="primary-button compact" type="submit">Cập nhật mật khẩu</button>
      </form>
    </section>
  )
}

export default ProfilePage
