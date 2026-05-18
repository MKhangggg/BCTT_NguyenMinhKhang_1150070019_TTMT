import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Loading from '../components/common/Loading.jsx'

function PrivateRoute() {
  const { isAuthenticated, booting } = useAuth()
  const location = useLocation()

  if (booting) {
    return <Loading label="Đang tải không gian làm việc" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export default PrivateRoute
