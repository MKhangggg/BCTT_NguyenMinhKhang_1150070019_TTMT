import { ArrowLeft, ShieldAlert, UserRound } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function ForbiddenPage() {
  const { roleLabel } = useAuth()
  const location = useLocation()
  const requiredRole = location.state?.requiredRole || 'Quản trị hệ thống'

  return (
    <section className="page forbidden-page">
      <div className="forbidden-panel">
        <span className="forbidden-icon"><ShieldAlert size={34} /></span>
        <div>
          <span className="eyebrow">Không đủ quyền</span>
          <h2>Khu vực này dành cho Admin</h2>
          <p>
            Tài khoản hiện tại đang ở vai trò <strong>{roleLabel}</strong>. Để vào trang này, tài khoản cần quyền <strong>{requiredRole}</strong>.
          </p>
        </div>
        <div className="role-compare">
          <div>
            <UserRound size={18} />
            <span>Vai trò hiện tại</span>
            <strong>{roleLabel}</strong>
          </div>
          <div>
            <ShieldAlert size={18} />
            <span>Vai trò yêu cầu</span>
            <strong>{requiredRole}</strong>
          </div>
        </div>
        <div className="forbidden-actions">
          <Link className="ghost-button compact" to="/">
            <ArrowLeft size={16} /> Về tổng quan
          </Link>
          <Link className="primary-button compact" to="/profile">
            Xem hồ sơ
          </Link>
        </div>
      </div>
    </section>
  )
}

export default ForbiddenPage
