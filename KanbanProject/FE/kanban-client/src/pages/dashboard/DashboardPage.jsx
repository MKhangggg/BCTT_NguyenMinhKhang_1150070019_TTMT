import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FolderKanban,
  Gauge,
  Globe2,
  LayoutPanelTop,
  Lightbulb,
  Lock,
  Search,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import BoardCard from '../../components/board/BoardCard.jsx'
import Notice from '../../components/common/Notice.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import { DashboardSkeleton } from '../../components/common/Skeleton.jsx'
import { useAuth } from '../../hooks/useAuth'
import { boardService } from '../../services/boardService'
import { getErrorMessage } from '../../services/api'
import { createWorkspaceRealtimeConnection } from '../../services/boardRealtimeService'

function DashboardPage() {
  const { isSystemAdmin, roleLabel } = useAuth()
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const loadBoards = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true)
      const boardData = await boardService.getBoards()
      setBoards(boardData)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBoards()
  }, [loadBoards])

  useEffect(() => {
    const connection = createWorkspaceRealtimeConnection({
      onBoardListChanged: (event) => {
        if (event?.action?.startsWith('Project')) {
          loadBoards({ showLoading: false })
        }
      },
    })

    connection.start().catch(() => {})
    return () => {
      connection.stop().catch(() => {})
    }
  }, [loadBoards])

  const filteredBoard = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return boards
    return boards.filter((board) => (
      board.name.toLowerCase().includes(text)
      || (board.projectCode || '').toLowerCase().includes(text)
      || (board.organizationUnitName || '').toLowerCase().includes(text)
      || (board.description || '').toLowerCase().includes(text)
      || (board.summary || '').toLowerCase().includes(text)
    ))
  }, [boards, query])

  const totalMembers = useMemo(
    () => boards.reduce((sum, board) => sum + Number(board.memberCount || 0), 0),
    [boards],
  )

  const workspaceHealth = useMemo(() => {
    const publicBoards = boards.filter((board) => board.isPublic).length
    const privateBoards = boards.length - publicBoards
    const newestBoard = [...boards].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0]
    const averageMembers = boards.length ? Math.round(totalMembers / boards.length) : 0
    const privacyScore = boards.length ? Math.round((privateBoards / boards.length) * 100) : 0

    return {
      publicBoards,
      privateBoards,
      newestBoard,
      averageMembers,
      privacyScore,
    }
  }, [boards, totalMembers])

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <section className="page stack">
      <section className={`role-overview-panel ${isSystemAdmin ? 'admin' : 'user'}`}>
        <div className="role-overview-main">
          <span>{isSystemAdmin ? <ShieldCheck size={22} /> : <UserRound size={22} />}</span>
          <div>
            <span className="eyebrow">Vai trò hiện tại</span>
            <h3>{isSystemAdmin ? 'Admin hệ thống' : 'User thường'}</h3>
            <p>
              {isSystemAdmin
                ? 'Bạn có quyền quản trị tài khoản, dự án, thành viên và theo dõi chỉ số toàn hệ thống.'
                : 'Bạn tập trung vào các dự án, thẻ, lịch, việc được giao và báo cáo trong những không gian mình tham gia.'}
            </p>
          </div>
        </div>
        <div className="role-permission-list">
          <span><FolderKanban size={15} /> Dự án</span>
          <span><Users size={15} /> Thành viên dự án</span>
          {isSystemAdmin ? (
            <span><UserCog size={15} /> Quản trị người dùng</span>
          ) : (
            <span><Lock size={15} /> Không vào khu Admin</span>
          )}
        </div>
        {isSystemAdmin ? (
          <Link className="primary-button compact" to="/admin/users">
            <ShieldCheck size={16} /> Mở quản trị
          </Link>
        ) : (
          <span className="role-readonly-badge">{roleLabel}</span>
        )}
      </section>

      <div className="stats-grid">
        <StatCard icon={<FolderKanban size={20} />} label="Dự án" value={boards.length} hint="đang tham gia" tone="blue" />
        <StatCard icon={<Users size={20} />} label="Thành viên" value={totalMembers} hint="trên các dự án" tone="green" />
        <StatCard icon={<Globe2 size={20} />} label="Công khai" value={workspaceHealth.publicBoards} hint="dự án mở" tone="amber" />
        <StatCard icon={<Lock size={20} />} label="Riêng tư" value={workspaceHealth.privateBoards} hint="dự án giới hạn" tone="red" />
      </div>

      <div className="dashboard-command-grid dashboard-readonly-grid">
        <section className="dashboard-focus-panel">
          <header>
            <span><Gauge size={18} /></span>
            <div>
              <strong>Sức khỏe không gian</strong>
              <small>Theo dõi nhanh mức tổ chức hiện tại</small>
            </div>
          </header>
          <div className="focus-metrics">
            <div>
              <span>Dự án mới nhất</span>
              <strong>{workspaceHealth.newestBoard?.name || 'Chưa có dự án'}</strong>
            </div>
            <div>
              <span>Thành viên trung bình</span>
              <strong>{workspaceHealth.averageMembers}</strong>
            </div>
          </div>
          <div className="health-meter">
            <div style={{ width: `${Math.max(8, workspaceHealth.privacyScore)}%` }} />
          </div>
          <p>{workspaceHealth.privacyScore}% dự án đang để riêng tư, phù hợp khi dữ liệu còn đang hoàn thiện.</p>
        </section>

        <section className="dashboard-tip-panel">
          <span><Lightbulb size={18} /></span>
          <div>
            <strong>Gợi ý vận hành</strong>
            <p>Tạo dự án từ menu Dự án, thêm thành viên theo vai trò, đính kèm tài liệu nền và dùng cột Kanban để theo dõi tiến độ.</p>
          </div>
        </section>
      </div>

      <div className="section-heading">
        <div>
          <span className="eyebrow">Không gian làm việc</span>
          <h2>Các dự án Kanban của bạn</h2>
        </div>
        <div className="search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm dự án" />
        </div>
      </div>

      <Notice type="error">{error}</Notice>

      {!isSystemAdmin && (
        <section className="project-user-note">
          <Lock size={18} />
          <div>
            <strong>User chỉ xem các dự án được phân quyền</strong>
            <p>Khi Admin thêm bạn vào dự án, dự án sẽ tự hiển thị tại đây theo thời gian thực.</p>
          </div>
        </section>
      )}

      <div className="board-grid">
        {filteredBoard.map((board, index) => <BoardCard key={board.id} board={board} index={index} />)}
        {filteredBoard.length === 0 && (
          <EmptyState
            icon={<LayoutPanelTop size={24} />}
            title={query.trim() ? 'Không tìm thấy dự án' : 'Chưa có dự án nào'}
            description={query.trim() ? 'Thử từ khóa khác.' : 'Dự án sẽ xuất hiện khi bạn được thêm vào hoặc được cấp quyền xem.'}
          />
        )}
      </div>
    </section>
  )
}

export default DashboardPage
