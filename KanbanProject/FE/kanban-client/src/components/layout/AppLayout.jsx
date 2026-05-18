import { Activity, BarChart3, CalendarDays, CheckSquare, KanbanSquare, LayoutDashboard, LogOut, Search, ShieldCheck, UserRound } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../common/Avatar.jsx'
import NotificationMenu from './NotificationMenu.jsx'

function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><KanbanSquare size={22} /></span>
          <div>
            <strong>Kanban</strong>
            <small>Quản lý công việc</small>
          </div>
        </div>

        <nav className="nav-list">
          <NavLink to="/"><LayoutDashboard size={18} /> Tổng quan</NavLink>
          <NavLink to="/calendar"><CalendarDays size={18} /> Lịch</NavLink>
          <NavLink to="/tasks"><CheckSquare size={18} /> Việc của tôi</NavLink>
          <NavLink to="/activity"><Activity size={18} /> Hoạt động</NavLink>
          <NavLink to="/reports"><BarChart3 size={18} /> Báo cáo</NavLink>
          <NavLink to="/profile"><UserRound size={18} /> Hồ sơ</NavLink>
          {user?.isSystemAdmin && <NavLink to="/admin/users"><ShieldCheck size={18} /> Quản trị</NavLink>}
        </nav>

        <button className="ghost-button sidebar-action" type="button" onClick={handleLogout}>
          <LogOut size={18} /> Đăng xuất
        </button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">Không gian làm việc</span>
            <h1>Hệ thống quản lý Kanban</h1>
          </div>
          <div className="topbar-search">
            <Search size={17} />
            <input placeholder="Tìm board, thẻ, thành viên" />
          </div>
          <div className="topbar-user">
            <NotificationMenu />
            <Avatar name={user?.fullName || user?.userName} src={user?.avatarUrl} />
            <div className="user-copy">
              <strong>{user?.fullName}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
