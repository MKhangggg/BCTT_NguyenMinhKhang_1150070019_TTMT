import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckSquare, Clock3, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import Loading from '../../components/common/Loading.jsx'
import Notice from '../../components/common/Notice.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { boardService } from '../../services/boardService'
import { getErrorMessage } from '../../services/api'

const priorityLabels = {
  Low: 'Thấp',
  Medium: 'Trung bình',
  High: 'Cao',
}

function MyTasksPage() {
  const [boards, setBoard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const summaries = await boardService.getBoards()
        const details = await Promise.all(summaries.map((board) => boardService.getBoard(board.id)))
        setBoard(details)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const tasks = useMemo(() => boards.flatMap((board) => (
    (board.columns || []).flatMap((column) => (column.cards || []).map((card) => ({
      ...card,
      boardId: board.id,
      boardName: board.name,
      columnName: column.name,
    })))
  )), [boards])

  const filteredTasks = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return tasks
    return tasks.filter((task) => (
      task.title.toLowerCase().includes(text)
      || (task.description || '').toLowerCase().includes(text)
      || task.boardName.toLowerCase().includes(text)
      || task.columnName.toLowerCase().includes(text)
    ))
  }, [query, tasks])

  const overdue = tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && !task.isArchived).length
  const highPriority = tasks.filter((task) => task.priority === 'High').length

  if (loading) return <Loading label="Đang tải việc" />

  return (
    <section className="page stack">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Tập trung</span>
          <h2>Việc của tôi</h2>
          <p className="muted">Tất cả thẻ được tổng hợp từ các bảng bạn có quyền truy cập.</p>
        </div>
        <div className="search-field">
          <Search size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm việc" />
        </div>
      </div>

      <Notice type="error">{error}</Notice>

      <div className="stats-grid">
        <StatCard icon={<CheckSquare size={20} />} label="Việc" value={tasks.length} hint="thẻ hiển thị" tone="blue" />
        <StatCard icon={<AlertTriangle size={20} />} label="Quá hạn" value={overdue} hint="đã qua hạn" tone="red" />
        <StatCard icon={<Clock3 size={20} />} label="Ưu tiên cao" value={highPriority} hint="cần chú ý" tone="amber" />
      </div>

      <div className="work-list">
        {filteredTasks.map((task) => (
          <Link className="work-row" key={`${task.boardId}-${task.id}`} to={`/boards/${task.boardId}`}>
            <div>
              <strong>{task.title}</strong>
              <span>{task.boardName} / {task.columnName}</span>
            </div>
            <small>{priorityLabels[task.priority] || 'Chưa có ưu tiên'}{task.dueDate ? ` - Hạn ${new Date(task.dueDate).toLocaleDateString()}` : ''}</small>
          </Link>
        ))}
        {filteredTasks.length === 0 && <div className="empty-inline"><strong>Không tìm thấy việc</strong><span>Thử từ khóa khác.</span></div>}
      </div>
    </section>
  )
}

export default MyTasksPage
