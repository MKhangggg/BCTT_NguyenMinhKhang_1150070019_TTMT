import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  FolderKanban,
  Gauge,
  Globe2,
  LayoutPanelTop,
  Lightbulb,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserCog,
  UserRound,
  Users,
  WandSparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import BoardCard from '../../components/board/BoardCard.jsx'
import Notice from '../../components/common/Notice.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import { DashboardSkeleton } from '../../components/common/Skeleton.jsx'
import { useAuth } from '../../hooks/useAuth'
import { useUI } from '../../context/UIContext.jsx'
import { boardService } from '../../services/boardService'
import { organizationService } from '../../services/organizationService'
import { getErrorMessage } from '../../services/api'

const blankForm = { projectCode: '', name: '', description: '', summary: '', organizationUnitId: '', isPublic: false }

const boardTemplates = [
  {
    projectCode: 'WEB-KANBAN',
    name: 'Website Kanban Project',
    description: 'Theo dõi thiết kế, frontend, backend, checklist và báo cáo.',
    summary: 'Dự án xây dựng website quản lý Kanban, tập trung vào kéo thả, checklist, báo cáo và phân quyền.',
    organizationUnitId: '',
    isPublic: false,
  },
  {
    projectCode: 'BCTT',
    name: 'Báo cáo thực tập',
    description: 'Quản lý mốc viết báo cáo, minh chứng, góp ý và nộp bản cuối.',
    summary: 'Theo dõi tài liệu, minh chứng, lịch sửa bản thảo và các mốc nộp báo cáo thực tập.',
    organizationUnitId: '',
    isPublic: false,
  },
  {
    projectCode: 'SPRINT',
    name: 'Sprint tuần này',
    description: 'Lập kế hoạch, phân công, xử lý việc gấp và tổng kết cuối tuần.',
    summary: 'Không gian sprint dùng để phân công, theo dõi blocker và tổng kết tiến độ.',
    organizationUnitId: '',
    isPublic: true,
  },
]

function DashboardPage() {
  const { isSystemAdmin, roleLabel } = useAuth()
  const { showToast } = useUI()
  const createFormRef = useRef(null)
  const [boards, setBoards] = useState([])
  const [organizationUnits, setOrganizationUnits] = useState([])
  const [form, setForm] = useState(blankForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [query, setQuery] = useState('')

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

  const loadBoard = async () => {
    try {
      setLoading(true)
      const [boardData, unitData] = await Promise.all([
        boardService.getBoards(),
        organizationService.getUnitOptions(),
      ])
      setBoards(boardData)
      setOrganizationUnits(unitData)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBoard()
  }, [])

  const applyTemplate = (template) => {
    setForm(template)
    setFieldErrors({})
    setError('')
    createFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    if (!form.name.trim()) {
      setFieldErrors({ name: 'Vui lòng nhập tên dự án.' })
      setError('Vui lòng nhập tên dự án.')
      return
    }

    try {
      setSaving(true)
      await boardService.createBoard({
        ...form,
        organizationUnitId: form.organizationUnitId ? Number(form.organizationUnitId) : null,
      })
      showToast({ type: 'success', title: 'Đã tạo dự án', message: `Dự án "${form.name.trim()}" đã sẵn sàng.` })
      setForm(blankForm)
      setFieldErrors({})
      await loadBoard()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <section className="page stack">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">Dự án</span>
          <h2>Lập kế hoạch, theo dõi và hoàn thành công việc dễ dàng hơn.</h2>
          <p>Quản lý dự án, mời đồng đội và tiếp tục luồng Kanban ngay trong một không gian làm việc.</p>
        </div>
        <Sparkles size={42} />
      </div>

      <section className={`role-overview-panel ${isSystemAdmin ? 'admin' : 'user'}`}>
        <div className="role-overview-main">
          <span>{isSystemAdmin ? <ShieldCheck size={22} /> : <UserRound size={22} />}</span>
          <div>
            <span className="eyebrow">Vai trò hiện tại</span>
            <h3>{isSystemAdmin ? 'Admin hệ thống' : 'User thường'}</h3>
            <p>
              {isSystemAdmin
                ? 'Bạn có thêm quyền quản trị tài khoản, tạo dự án, thêm thành viên và theo dõi chỉ số toàn hệ thống.'
                : 'Bạn tập trung vào dự án, thẻ, lịch, việc được giao và báo cáo trong những không gian mình tham gia.'}
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

      <div className="dashboard-command-grid">
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

        <section className="template-panel">
          <header>
            <div>
              <span className="eyebrow">Tạo nhanh</span>
              <h3>Mẫu dự án hay dùng</h3>
            </div>
            <WandSparkles size={22} />
          </header>
          <div className="template-list">
            {boardTemplates.map((template) => (
              <button key={template.name} type="button" onClick={() => applyTemplate(template)} disabled={!isSystemAdmin}>
                <span><WandSparkles size={16} /></span>
                <div>
                  <strong>{template.name}</strong>
                  <small>{template.description}</small>
                </div>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </section>

        <section className="dashboard-tip-panel">
          <span><Lightbulb size={18} /></span>
          <div>
            <strong>Gợi ý vận hành</strong>
            <p>Tạo dự án với mã rõ ràng, thêm thành viên theo vai trò, đính kèm tài liệu nền và dùng cột Kanban để theo dõi tiến độ.</p>
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
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm dự án" />
        </div>
      </div>

      <Notice type="error">{error}</Notice>

      {isSystemAdmin ? (
        <form className="create-board-form project-create-form" onSubmit={handleCreate} ref={createFormRef}>
          <input
            value={form.projectCode}
            onChange={(e) => setForm({ ...form, projectCode: e.target.value })}
            placeholder="Mã dự án, ví dụ PRJ-001"
          />
          <input
            className={fieldErrors.name ? 'is-invalid' : ''}
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value })
              if (fieldErrors.name) setFieldErrors({})
            }}
            placeholder="Tên dự án"
          />
          {fieldErrors.name && <span className="field-error-text create-board-error">{fieldErrors.name}</span>}
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Mô tả ngắn"
          />
          <select
            value={form.organizationUnitId}
            onChange={(e) => setForm({ ...form, organizationUnitId: e.target.value })}
          >
            <option value="">Đơn vị phụ trách</option>
            {organizationUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.type === 'Team' ? 'Team' : 'Phòng ban'} · {unit.name}
              </option>
            ))}
          </select>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
            />
            Công khai
          </label>
          <button className="primary-button compact" type="submit" disabled={saving}>
            <Plus size={17} /> {saving ? 'Đang tạo...' : 'Tạo dự án'}
          </button>
          <textarea
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="Tóm tắt dự án, mục tiêu, phạm vi hoặc ghi chú tài liệu"
            rows={2}
          />
        </form>
      ) : (
        <section className="project-user-note">
          <Lock size={18} />
          <div>
            <strong>User chỉ xem các dự án được phân quyền</strong>
            <p>Admin hệ thống sẽ tạo dự án, thêm thành viên và phân quyền. Khi được thêm vào dự án, bạn sẽ thấy dự án tại đây.</p>
          </div>
        </section>
      )}

      <div className="board-grid">
        {filteredBoard.map((board, index) => <BoardCard key={board.id} board={board} index={index} />)}
        {filteredBoard.length === 0 && (
          <EmptyState
            icon={<LayoutPanelTop size={24} />}
            title={query.trim() ? 'Không tìm thấy dự án' : 'Chưa có dự án nào'}
            description={query.trim() ? 'Thử từ khóa khác hoặc tạo dự án mới.' : 'Tạo dự án đầu tiên để bắt đầu tổ chức công việc.'}
          />
        )}
      </div>
    </section>
  )
}

export default DashboardPage
