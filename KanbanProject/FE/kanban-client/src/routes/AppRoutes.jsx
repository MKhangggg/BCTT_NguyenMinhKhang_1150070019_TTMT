import { Navigate, Route, Routes } from 'react-router-dom'
import { BoardProvider } from '../context/BoardContext.jsx'
import AppLayout from '../components/layout/AppLayout.jsx'
import AdminRoute from './AdminRoute.jsx'
import PrivateRoute from './PrivateRoute.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import RegisterPage from '../pages/auth/RegisterPage.jsx'
import DashboardPage from '../pages/dashboard/DashboardPage.jsx'
import BoardDetailPage from '../pages/board/BoardDetailPage.jsx'
import ReportPage from '../pages/report/ReportPage.jsx'
import ReportsPage from '../pages/reports/ReportsPage.jsx'
import CalendarPage from '../pages/calendar/CalendarPage.jsx'
import MyTasksPage from '../pages/tasks/MyTasksPage.jsx'
import ActivityPage from '../pages/activity/ActivityPage.jsx'
import ProfilePage from '../pages/profile/ProfilePage.jsx'
import AdminUsersPage from '../pages/admin/AdminUsersPage.jsx'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<PrivateRoute />}>
        <Route
          element={(
            <BoardProvider>
              <AppLayout />
            </BoardProvider>
          )}
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/boards/:boardId" element={<BoardDetailPage />} />
          <Route path="/boards/:boardId/reports" element={<ReportPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/tasks" element={<MyTasksPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
