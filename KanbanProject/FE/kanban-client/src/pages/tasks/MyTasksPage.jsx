import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckSquare, Clock3, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import Loading from '../../components/common/Loading.jsx'
import Notice from '../../components/common/Notice.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { boardService } from '../../services/boardService'
import { getErrorMessage } from '../../services/api'

function MyTasksPage() {
  const [boards, setBoard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const summaries = await boardService.getBoard()
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

  if (loading) return <Loading label="Loading tasks" />

  return (
    <section className="page stack">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Focus</span>
          <h2>Tasks cua toi</h2>
          <p className="muted">Tat ca the duoc tong hop tu cac board ban co quyen truy cap.</p>
        </div>
        <div className="search-field">
          <Search size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tim task" />
        </div>
      </div>

      <Notice type="error">{error}</Notice>

      <div className="stats-grid">
        <StatCard icon={<CheckSquare size={20} />} label="Task" value={tasks.length} hint="the hien thi" tone="blue" />
        <StatCard icon={<AlertTriangle size={20} />} label="Overdue" value={overdue} hint="past due date" tone="red" />
        <StatCard icon={<Clock3 size={20} />} label="High priority" value={highPriority} hint="can chu y" tone="amber" />
      </div>

      <div className="work-list">
        {filteredTasks.map((task) => (
          <Link className="work-row" key={`${task.boardId}-${task.id}`} to={`/boards/${task.boardId}`}>
            <div>
              <strong>{task.title}</strong>
              <span>{task.boardName} / {task.columnName}</span>
            </div>
            <small>{task.priority || 'Chua co uu tien'}{task.dueDate ? ` - Han ${new Date(task.dueDate).toLocaleDateString()}` : ''}</small>
          </Link>
        ))}
        {filteredTasks.length === 0 && <div className="empty-inline"><strong>Khong tim thay task</strong><span>Thu tu khoa khac.</span></div>}
      </div>
    </section>
  )
}

export default MyTasksPage