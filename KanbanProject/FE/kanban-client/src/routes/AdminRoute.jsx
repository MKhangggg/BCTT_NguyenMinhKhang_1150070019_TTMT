import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Loading from '../components/common/Loading.jsx'
import { useAuth } from '../hooks/useAuth'

function AdminRoute() {
  const { isSystemAdmin, booting } = useAuth()
  const location = useLocation()

  if (booting) {
    return <Loading label="Đang kiểm tra quyền" />
  }

  if (!isSystemAdmin) {
    return (
      <Navigate
        to="/forbidden"
        state={{ from: location, requiredRole: 'Quản trị hệ thống' }}
        replace
      />
    )
  }

  return <Outlet />
}

export default AdminRoute
