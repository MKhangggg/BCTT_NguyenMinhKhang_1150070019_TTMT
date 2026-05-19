import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CheckSquare, Clock3, Flame, Search, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState.jsx'
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

const startOfDay = (value) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const getTaskBucket = (task) => {
  if (!task.dueDate) return 'noDue'
  const due = startOfDay(task.dueDate)
  const today = startOfDay(new Date())
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (due < today) return 'overdue'
  if (due.getTime() === today.getTime()) return 'today'
  if (due.getTime() === tomorrow.getTime()) return 'tomorrow'
  return 'upcoming'
}

const quickFilters = [
  { value: 'All', label: 'Tất cả', icon: CheckSquare },
  { value: 'Today', label: 'Hôm nay', icon: CalendarClock },
  { value: 'Overdue', label: 'Quá hạn', icon: AlertTriangle },
  { value: 'High', label: 'Ưu tiên cao', icon: Flame },
  { value: 'NoDue', label: 'Chưa có hạn', icon: Clock3 },
]

function MyTasksPage() {
  const [boards, setBoard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [quickFilter, setQuickFilter] = useState('All')

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
      bucket: getTaskBucket(card),
      isCompleted: column.name.toLowerCase().includes('done')
        || column.name.toLowerCase().includes('hoàn thành')
        || column.name.toLowerCase().includes('xong'),
    })))
  )), [boards])

  const filteredTasks = useMemo(() => {
    const text = query.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesText = !text
        || task.title.toLowerCase().includes(text)
        || (task.description || '').toLowerCase().includes(text)
        || task.boardName.toLowerCase().includes(text)
        || task.columnName.toLowerCase().includes(text)
      const matchesQuick = quickFilter === 'All'
        || (quickFilter === 'Today' && task.bucket === 'today')
        || (quickFilter === 'Overdue' && task.bucket === 'overdue')
        || (quickFilter === 'High' && task.priority === 'High')
        || (quickFilter === 'NoDue' && task.bucket === 'noDue')
      return matchesText && matchesQuick
    })
  }, [query, quickFilter, tasks])

  const groupedTasks = useMemo(() => ({
    overdue: filteredTasks.filter((task) => task.bucket === 'overdue'),
    today: filteredTasks.filter((task) => task.bucket === 'today'),
    upcoming: filteredTasks.filter((task) => ['tomorrow', 'upcoming'].includes(task.bucket)),
    noDue: filteredTasks.filter((task) => task.bucket === 'noDue'),
  }), [filteredTasks])

  const recommendedTask = useMemo(() => {
    const bucketScore = { overdue: 0, today: 1, tomorrow: 2, upcoming: 3, noDue: 4 }
    const priorityScore = { High: 0, Medium: 1, Low: 2 }

    return [...filteredTasks]
      .filter((task) => !task.isCompleted && !task.isArchived)
      .sort((left, right) => (
        (bucketScore[left.bucket] ?? 5) - (bucketScore[right.bucket] ?? 5)
        || (priorityScore[left.priority] ?? 3) - (priorityScore[right.priority] ?? 3)
        || new Date(left.dueDate || '2999-12-31') - new Date(right.dueDate || '2999-12-31')
      ))[0]
  }, [filteredTasks])

  const overdue = tasks.filter((task) => task.bucket === 'overdue' && !task.isArchived).length
  const today = tasks.filter((task) => task.bucket === 'today').length
  const highPriority = tasks.filter((task) => task.priority === 'High').length
  const completed = tasks.filter((task) => task.isCompleted).length
  const doneRate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0

  if (loading) return <Loading label="Đang tải việc" />

  const renderTask = (task) => (
    <Link className={`work-row task-row task-priority-${String(task.priority).toLowerCase()} ${task.bucket}`} key={`${task.boardId}-${task.id}`} to={`/boards/${task.boardId}`}>
      <div>
        <strong>{task.title}</strong>
        <span>{task.boardName} / {task.columnName}</span>
      </div>
      <div className="task-row-meta">
        <span className={`priority-pill ${String(task.priority).toLowerCase()}`}>{priorityLabels[task.priority] || 'Chưa có ưu tiên'}</span>
        {task.dueDate && <small>Hạn {new Date(task.dueDate).toLocaleDateString()}</small>}
      </div>
    </Link>
  )

  return (
    <section className="page stack">
      <div className="page-hero compact-hero">
        <div>
          <span className="eyebrow">Tập trung</span>
          <h2>Việc của tôi</h2>
          <p>Tổng hợp thẻ từ các bảng bạn có quyền truy cập, ưu tiên việc cần xử lý trước.</p>
        </div>
        <CheckCircle2 size={42} />
      </div>

      <Notice type="error">{error}</Notice>

      <section className="focus-brief-panel">
        <div>
          <span className="focus-brief-icon"><Target size={20} /></span>
          <div>
            <span className="eyebrow">Gợi ý tập trung</span>
            <h3>{recommendedTask ? recommendedTask.title : 'Không có việc cần ưu tiên ngay'}</h3>
            <p>
              {recommendedTask
                ? `${recommendedTask.boardName} / ${recommendedTask.columnName}`
                : 'Các việc hiện tại đang khá ổn. Bạn có thể tạo hạn hoặc nhãn để hệ thống gợi ý tốt hơn.'}
            </p>
          </div>
        </div>
        <div className="focus-brief-side">
          <div className="focus-brief-progress">
            <span>Tiến độ chung</span>
            <strong>{doneRate}%</strong>
            <i><b style={{ width: `${doneRate}%` }} /></i>
          </div>
          {recommendedTask && (
            <Link to={`/boards/${recommendedTask.boardId}`}>
              Mở bảng <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </section>

      <div className="stats-grid">
        <StatCard icon={<CheckSquare size={20} />} label="Việc" value={tasks.length} hint="tổng thẻ" tone="blue" />
        <StatCard icon={<CalendarClock size={20} />} label="Hôm nay" value={today} hint="cần xử lý" tone="green" />
        <StatCard icon={<AlertTriangle size={20} />} label="Quá hạn" value={overdue} hint="đã qua hạn" tone="red" />
        <StatCard icon={<Flame size={20} />} label="Ưu tiên cao" value={highPriority} hint={`${completed} đã xong`} tone="amber" />
      </div>

      <div className="task-control-panel">
        <div className="search-field">
          <Search size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm việc, bảng hoặc cột" />
        </div>
        <div className="quick-filterbar inline">
          {quickFilters.map((filter) => {
            const Icon = filter.icon
            return (
              <button className={`quick-filter ${quickFilter === filter.value ? 'is-active' : ''}`} type="button" key={filter.value} onClick={() => setQuickFilter(filter.value)}>
                <Icon size={15} /> {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={24} />}
          title="Không tìm thấy việc"
          description="Thử đổi từ khóa hoặc chọn bộ lọc khác để xem thêm công việc."
        />
      ) : (
        <div className="task-groups">
          <section className="task-section-panel overdue">
            <h3>Quá hạn <span>{groupedTasks.overdue.length}</span></h3>
            <div className="work-list">{groupedTasks.overdue.map(renderTask)}</div>
          </section>
          <section className="task-section-panel today">
            <h3>Hôm nay <span>{groupedTasks.today.length}</span></h3>
            <div className="work-list">{groupedTasks.today.map(renderTask)}</div>
          </section>
          <section className="task-section-panel">
            <h3>Sắp tới <span>{groupedTasks.upcoming.length}</span></h3>
            <div className="work-list">{groupedTasks.upcoming.map(renderTask)}</div>
          </section>
          <section className="task-section-panel muted-panel">
            <h3>Chưa có hạn <span>{groupedTasks.noDue.length}</span></h3>
            <div className="work-list">{groupedTasks.noDue.map(renderTask)}</div>
          </section>
        </div>
      )}
    </section>
  )
}

export default MyTasksPage
