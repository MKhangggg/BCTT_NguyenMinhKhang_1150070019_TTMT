import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckSquare,
  CornerDownLeft,
  FileText,
  FolderKanban,
  Building2,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useBoard } from '../../hooks/useBoard'
import { useUI } from '../../context/UIContext.jsx'
import { boardService } from '../../services/boardService'
import Avatar from '../common/Avatar.jsx'
import NotificationMenu from './NotificationMenu.jsx'

function AppLayout() {
  const { user, logout, isSystemAdmin, roleLabel } = useAuth()
  const { theme, toggleTheme } = useUI()
  const { activeBoard } = useBoard()
  const navigate = useNavigate()
  const searchRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [boardSummaries, setBoardSummaries] = useState([])

  useEffect(() => {
    let mounted = true

    boardService.getBoards()
      .then((items) => {
        if (mounted) setBoardSummaries(items)
      })
      .catch(() => {
        if (mounted) setBoardSummaries([])
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const closeSearch = (event) => {
      if (!searchRef.current?.contains(event.target)) {
        setSearchOpen(false)
      }
    }

    window.addEventListener('pointerdown', closeSearch)
    return () => window.removeEventListener('pointerdown', closeSearch)
  }, [])

  const searchResults = useMemo(() => {
    const text = searchQuery.trim().toLowerCase()
    if (!text) return []

    const matchedBoards = boardSummaries
      .filter((board) => (
        board.name.toLowerCase().includes(text)
        || (board.projectCode || '').toLowerCase().includes(text)
        || (board.description || '').toLowerCase().includes(text)
        || (board.summary || '').toLowerCase().includes(text)
      ))
      .slice(0, 5)
      .map((board) => ({
        id: `board-${board.id}`,
        type: 'board',
        title: `${board.projectCode || `PRJ-${board.id}`} · ${board.name}`,
        subtitle: board.summary || board.description || `${board.memberCount || 0} thành viên`,
        to: `/boards/${board.id}`,
      }))

    const activeCards = (activeBoard?.columns || [])
      .flatMap((column) => (column.cards || []).map((card) => ({
        ...card,
        columnName: column.name,
      })))
      .filter((card) => (
        card.title.toLowerCase().includes(text)
        || (card.description || '').toLowerCase().includes(text)
        || card.labels?.some((label) => label.name.toLowerCase().includes(text))
      ))
      .slice(0, 5)
      .map((card) => ({
        id: `card-${card.id}`,
        type: 'card',
        title: card.title,
        subtitle: `${activeBoard.name} / ${card.columnName}`,
        to: `/boards/${activeBoard.id}`,
      }))

    return [...matchedBoards, ...activeCards].slice(0, 7)
  }, [activeBoard, boardSummaries, searchQuery])

  const openSearchResult = (result) => {
    if (!result) return
    setSearchQuery('')
    setSearchOpen(false)
    navigate(result.to)
  }

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      setSearchOpen(false)
      return
    }

    if (event.key === 'Enter' && searchResults[0]) {
      event.preventDefault()
      openSearchResult(searchResults[0])
    }
  }

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
        <div className={`sidebar-role-card ${isSystemAdmin ? 'admin' : 'user'}`}>
          <span>{isSystemAdmin ? <ShieldCheck size={17} /> : <UserRound size={17} />}</span>
          <div>
            <strong>{isSystemAdmin ? 'Admin' : 'User'}</strong>
            <small>{roleLabel}</small>
          </div>
        </div>

        <nav className="nav-list">
          <span className="nav-section-label">Không gian làm việc</span>
          <NavLink to="/"><LayoutDashboard size={18} /> Tổng quan</NavLink>
          <NavLink to="/projects"><FolderKanban size={18} /> Dự án</NavLink>
          <NavLink to="/calendar"><CalendarDays size={18} /> Lịch</NavLink>
          <NavLink to="/tasks"><CheckSquare size={18} /> Việc của tôi</NavLink>
          <NavLink to="/activity"><Activity size={18} /> Hoạt động</NavLink>
          <NavLink to="/reports"><BarChart3 size={18} /> Báo cáo</NavLink>
          <NavLink to="/profile"><UserRound size={18} /> Hồ sơ</NavLink>
          {isSystemAdmin && (
            <>
              <span className="nav-section-label admin-label">Hệ thống</span>
              <NavLink to="/admin/users"><ShieldCheck size={18} /> Quản trị Admin</NavLink>
              <NavLink to="/admin/organization"><Building2 size={18} /> Cơ cấu DUDI</NavLink>
            </>
          )}
        </nav>

        <button className="ghost-button sidebar-action" type="button" onClick={handleLogout}>
          <LogOut size={18} /> Đăng xuất
        </button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">{isSystemAdmin ? 'Bảng điều khiển Admin' : 'Không gian làm việc'}</span>
            <h1>{isSystemAdmin ? 'Quản trị và vận hành Kanban' : 'Hệ thống quản lý Kanban'}</h1>
          </div>
          <div className={`topbar-search global-search ${searchOpen ? 'is-open' : ''}`} ref={searchRef}>
            <Search size={17} />
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Tìm bảng, thẻ, thành viên"
            />
            {searchQuery && (
              <button className="search-clear" type="button" title="Xóa tìm kiếm" onClick={() => setSearchQuery('')}>
                <X size={15} />
              </button>
            )}
            {searchOpen && searchQuery.trim() && (
              <div className="global-search-panel">
                <header>
                  <strong>Tìm kiếm nhanh</strong>
                  <span><CornerDownLeft size={13} /> Enter để mở</span>
                </header>
                {searchResults.length === 0 ? (
                  <p>Không tìm thấy kết quả phù hợp.</p>
                ) : (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => openSearchResult(result)}
                    >
                      <span className={`search-result-icon ${result.type}`}>
                        {result.type === 'board' ? <FolderKanban size={16} /> : <FileText size={16} />}
                      </span>
                      <span>
                        <strong>{result.title}</strong>
                        <small>{result.subtitle}</small>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="topbar-user">
            <button className="icon-button topbar-icon" type="button" title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NotificationMenu />
            <Avatar name={user?.fullName || user?.userName} src={user?.avatarUrl} />
            <div className="user-copy">
              <strong>{user?.fullName}</strong>
              <small>{user?.email}</small>
            </div>
            <span className={`topbar-role-badge ${isSystemAdmin ? 'admin' : 'user'}`}>
              {isSystemAdmin ? <ShieldCheck size={14} /> : <UserRound size={14} />}
              {isSystemAdmin ? 'Admin' : 'User'}
            </span>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
