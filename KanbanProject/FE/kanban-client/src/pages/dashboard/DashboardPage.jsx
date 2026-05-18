import { useEffect, useMemo, useState } from 'react'
import { FolderKanban, Globe2, Lock, Plus, Search, Sparkles, Users } from 'lucide-react'
import BoardCard from '../../components/board/BoardCard.jsx'
import Loading from '../../components/common/Loading.jsx'
import Notice from '../../components/common/Notice.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { boardService } from '../../services/boardService'
import { getErrorMessage } from '../../services/api'

function DashboardPage() {
  const [boards, setBoard] = useState([])
  const [form, setForm] = useState({ name: '', description: '', isPublic: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const filteredBoard = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return boards
    return boards.filter((board) => (
      board.name.toLowerCase().includes(text)
      || (board.description || '').toLowerCase().includes(text)
    ))
  }, [boards, query])

  const totalMembers = useMemo(
    () => boards.reduce((sum, board) => sum + board.memberCount, 0),
    [boards],
  )

  const loadBoard = async () => {
    try {
      setLoading(true)
      setBoard(await boardService.getBoards())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBoard()
  }, [])

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    if (!form.name.trim()) {
      setError('Vui lòng nhập tên bảng.')
      return
    }

    try {
      setSaving(true)
      await boardService.createBoard(form)
      setForm({ name: '', description: '', isPublic: false })
      await loadBoard()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Loading label="Đang tải danh sách bảng" />
  }

  return (
    <section className="page stack">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">Bảng</span>
          <h2>Lập kế hoạch, theo dõi và hoàn thành công việc dễ dàng hơn.</h2>
          <p>Quản lý bảng, mời đồng đội và tiếp tục luồng Kanban ngay trong một không gian làm việc.</p>
        </div>
        <Sparkles size={42} />
      </div>

      <div className="stats-grid">
        <StatCard icon={<FolderKanban size={20} />} label="Bảng" value={boards.length} hint="đang tham gia" tone="blue" />
        <StatCard icon={<Users size={20} />} label="Thành viên" value={totalMembers} hint="trên các bảng" tone="green" />
        <StatCard icon={<Globe2 size={20} />} label="Công khai" value={boards.filter((board) => board.isPublic).length} hint="bảng mở" tone="amber" />
        <StatCard icon={<Lock size={20} />} label="Riêng tư" value={boards.filter((board) => !board.isPublic).length} hint="bảng giới hạn" tone="red" />
      </div>

      <div className="section-heading">
        <div>
          <span className="eyebrow">Không gian làm việc</span>
          <h2>Các bảng Kanban của bạn</h2>
        </div>
        <div className="search-field">
          <Search size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm bảng" />
        </div>
      </div>

      <Notice type="error">{error}</Notice>

      <form className="create-board-form" onSubmit={handleCreate}>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Tên bảng"
        />
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Mô tả"
        />
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
          />
          Công khai
        </label>
        <button className="primary-button compact" type="submit" disabled={saving}>
          <Plus size={17} /> {saving ? 'Đang tạo...' : 'Tạo bảng'}
        </button>
      </form>

      <div className="board-grid">
        {filteredBoard.map((board) => <BoardCard key={board.id} board={board} />)}
        {filteredBoard.length === 0 && (
          <div className="empty-inline">
            <strong>Không tìm thấy bảng</strong>
            <span>Thử từ khóa khác hoặc tạo bảng mới.</span>
          </div>
        )}
      </div>
    </section>
  )
}

export default DashboardPage
