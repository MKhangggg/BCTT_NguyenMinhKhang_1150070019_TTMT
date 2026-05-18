import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock3, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import Loading from '../../components/common/Loading'
import Notice from '../../components/common/Notice'
import StatCard from '../../components/common/StatCard'
import { getErrorMessage } from '../../services/api'
import { boardService } from '../../services/boardService'

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const priorityLabels = {
  Low: 'Thấp',
  Medium: 'Trung bình',
  High: 'Cao',
}

const priorityOrder = {
  High: 3,
  Medium: 2,
  Low: 1,
}

const pad = (value) => String(value).padStart(2, '0')

const toDateKey = (value) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const fromDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const getStartOfDayTimestamp = (value) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const buildMonthGrid = (monthAnchor) => {
  const firstDay = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1)
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - firstDay.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

const getDueStatus = (dueDate, todayStart) => {
  const dueStart = getStartOfDayTimestamp(dueDate)
  if (dueStart < todayStart) {
    return 'overdue'
  }
  if (dueStart === todayStart) {
    return 'today'
  }
  return 'upcoming'
}

const formatDueDateTime = (dueDate) => {
  const date = new Date(dueDate)
  if (date.getHours() === 0 && date.getMinutes() === 0) {
    return date.toLocaleDateString()
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function CalendarPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [boards, setBoard] = useState([])
  const [dueCards, setDueCards] = useState([])
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()))
  const [filters, setFilters] = useState({
    query: '',
    priority: 'All',
    boardId: 'All',
  })

  const loadCalendar = async () => {
    try {
      setLoading(true)
      setError('')
      const boardSummaries = await boardService.getBoards()
      setBoard(boardSummaries)
      const boardDetails = await Promise.all(boardSummaries.map((board) => boardService.getBoard(board.id)))
      const cardsWithDueDate = boardDetails.flatMap((board) =>
        (board.columns || []).flatMap((column) =>
          (column.cards || [])
            .filter((card) => card.dueDate && !card.isArchived)
            .map((card) => ({
              id: card.id,
              boardId: board.id,
              boardName: board.name,
              columnName: column.name,
              title: card.title,
              description: card.description || '',
              assigneeName: card.assigneeName || '',
              priority: card.priority,
              dueDate: card.dueDate,
              dueDateKey: toDateKey(card.dueDate),
              dueTimestamp: new Date(card.dueDate).getTime(),
              labels: card.labels || [],
            }))
        )
      )
      setDueCards(cardsWithDueDate)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCalendar()
  }, [])

  const filteredCards = useMemo(() => {
    const text = filters.query.trim().toLowerCase()
    return dueCards
      .filter((card) => {
        const matchesText =
          !text ||
          card.title.toLowerCase().includes(text) ||
          card.description.toLowerCase().includes(text) ||
          card.boardName.toLowerCase().includes(text) ||
          card.assigneeName.toLowerCase().includes(text) ||
          card.labels.some((label) => label.name.toLowerCase().includes(text))
        const matchesPriority = filters.priority === 'All' || card.priority === filters.priority
        const matchesBoard = filters.boardId === 'All' || String(card.boardId) === filters.boardId
        return matchesText && matchesPriority && matchesBoard
      })
      .sort(
        (left, right) =>
          left.dueTimestamp - right.dueTimestamp ||
          (priorityOrder[right.priority] || 0) - (priorityOrder[left.priority] || 0)
      )
  }, [dueCards, filters])

  const cardsByDate = useMemo(() => {
    const grouped = {}
    filteredCards.forEach((card) => {
      if (!grouped[card.dueDateKey]) {
        grouped[card.dueDateKey] = []
      }
      grouped[card.dueDateKey].push(card)
    })
    return grouped
  }, [filteredCards])

  const monthDays = useMemo(() => buildMonthGrid(monthCursor), [monthCursor])
  const selectedDateCards = cardsByDate[selectedDateKey] || []

  const monthCardCount = useMemo(
    () =>
      filteredCards.filter((card) => {
        const dueDate = new Date(card.dueDate)
        return dueDate.getFullYear() === monthCursor.getFullYear() && dueDate.getMonth() === monthCursor.getMonth()
      }).length,
    [filteredCards, monthCursor]
  )

  const overdueCount = useMemo(() => {
    const todayStart = getStartOfDayTimestamp(new Date())
    return filteredCards.filter((card) => getDueStatus(card.dueDate, todayStart) === 'overdue').length
  }, [filteredCards])

  const todayCount = useMemo(() => {
    const todayStart = getStartOfDayTimestamp(new Date())
    return filteredCards.filter((card) => getDueStatus(card.dueDate, todayStart) === 'today').length
  }, [filteredCards])

  const monthTitle = useMemo(
    () => monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    [monthCursor]
  )

  const selectedDateLabel = useMemo(
    () =>
      fromDateKey(selectedDateKey).toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [selectedDateKey]
  )

  const handleSelectDay = (date) => {
    setSelectedDateKey(toDateKey(date))
    if (date.getMonth() !== monthCursor.getMonth() || date.getFullYear() !== monthCursor.getFullYear()) {
      setMonthCursor(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }

  const shiftMonth = (offset) => {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const jumpToToday = () => {
    const today = new Date()
    setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDateKey(toDateKey(today))
  }

  const todayStart = getStartOfDayTimestamp(new Date())

  return (
    <section className="page stack">
      <div className="section-heading">
        <div>
          <h2>Lịch</h2>
          <p>Theo dõi hạn thẻ trên tất cả bảng trong một lịch chung.</p>
        </div>
        <button type="button" className="ghost-button compact" onClick={loadCalendar}>
          Làm mới
        </button>
      </div>

      {error && <Notice type="error">{error}</Notice>}

      <div className="calendar-overview">
        <StatCard icon={<CalendarDays size={18} />} label="Hạn tháng này" value={monthCardCount} tone="blue" />
        <StatCard icon={<AlertTriangle size={18} />} label="Quá hạn" value={overdueCount} tone="red" />
        <StatCard icon={<Clock3 size={18} />} label="Hạn hôm nay" value={todayCount} tone="amber" />
      </div>

      {loading ? (
        <Loading label="Đang tải lịch..." />
      ) : (
        <div className="calendar-surface">
          <div className="calendar-panel">
            <div className="calendar-toolbar">
              <h3>{monthTitle}</h3>
              <div className="calendar-nav">
                <button type="button" className="ghost-button compact" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft size={16} />
                </button>
                <button type="button" className="ghost-button compact" onClick={jumpToToday}>
                  Hôm nay
                </button>
                <button type="button" className="ghost-button compact" onClick={() => shiftMonth(1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="calendar-weekdays">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="calendar-days">
              {monthDays.map((date) => {
                const dateKey = toDateKey(date)
                const cardsForDay = cardsByDate[dateKey] || []
                const isToday = dateKey === toDateKey(new Date())
                const isSelected = dateKey === selectedDateKey
                const isCurrentMonth =
                  date.getMonth() === monthCursor.getMonth() && date.getFullYear() === monthCursor.getFullYear()
                const dayClassName = [
                  'calendar-day',
                  !isCurrentMonth ? 'outside-month' : '',
                  isToday ? 'is-today' : '',
                  isSelected ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={dayClassName}
                    onClick={() => handleSelectDay(date)}
                    title={`${date.toLocaleDateString()} (${cardsForDay.length} thẻ)`}
                  >
                    <span className="day-number">{date.getDate()}</span>
                    <div className="day-chips">
                      {cardsForDay.slice(0, 3).map((card) => (
                        <span
                          key={`${dateKey}-${card.id}`}
                          className={`due-chip ${getDueStatus(card.dueDate, todayStart)}`}
                        >
                          {card.title}
                        </span>
                      ))}
                      {cardsForDay.length > 3 && <span className="day-more">+{cardsForDay.length - 3} nữa</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="calendar-agenda">
            <div className="calendar-agenda-head">
              <div>
                <h3>{selectedDateLabel}</h3>
                <span className="calendar-agenda-count">{selectedDateCards.length} thẻ</span>
              </div>
            </div>

            <div className="calendar-filters">
              <label className="field search-field">
                <Search size={16} />
                <input
                  value={filters.query}
                  onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                  placeholder="Tìm tiêu đề, bảng, người phụ trách, nhãn..."
                />
              </label>
              <div className="calendar-filter-row">
                <label className="field">
                  Ưu tiên
                  <select
                    value={filters.priority}
                    onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
                  >
                    <option value="All">Tất cả</option>
                    <option value="Low">Thấp</option>
                    <option value="Medium">Trung bình</option>
                    <option value="High">Cao</option>
                  </select>
                </label>
                <label className="field">
                  Bảng
                  <select
                    value={filters.boardId}
                    onChange={(event) => setFilters((current) => ({ ...current, boardId: event.target.value }))}
                  >
                    <option value="All">Tất cả bảng</option>
                    {boards.map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="agenda-list">
              {selectedDateCards.length === 0 ? (
                <div className="empty-state">
                  <CalendarDays size={30} />
                  <p>Không có thẻ đến hạn trong ngày này với bộ lọc hiện tại.</p>
                </div>
              ) : (
                selectedDateCards.map((card) => {
                  const status = getDueStatus(card.dueDate, todayStart)
                  return (
                    <article key={`${card.boardId}-${card.id}`} className={`agenda-card ${status}`}>
                      <div className="agenda-top">
                        <Link to={`/boards/${card.boardId}`}>{card.title}</Link>
                        <span className={`priority-pill ${card.priority.toLowerCase()}`}>{priorityLabels[card.priority] || card.priority}</span>
                      </div>
                      <p>
                        {card.boardName} · {card.columnName}
                      </p>
                      <div className="agenda-meta">
                        <span>{formatDueDateTime(card.dueDate)}</span>
                        {card.assigneeName && <span>Người phụ trách: {card.assigneeName}</span>}
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}

export default CalendarPage
