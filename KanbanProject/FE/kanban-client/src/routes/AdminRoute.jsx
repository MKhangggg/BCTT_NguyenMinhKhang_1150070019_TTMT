import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Loading from '../components/common/Loading.jsx'
import { useAuth } from '../hooks/useAuth'

function AdminRoute() {
  const { user, booting } = useAuth()
  const location = useLocation()

  if (booting) {
    return <Loading label="Đang kiểm tra quyền" />
  }

  if (!user?.isSystemAdmin) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return <Outlet />
}

export default AdminRoute
