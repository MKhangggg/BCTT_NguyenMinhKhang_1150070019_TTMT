import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { AlertTriangle, BarChart3, CheckCircle2, CircleDot, FilterX, LayoutGrid, Plus, RefreshCw, Search, UserCheck, UserX, Users, Zap } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import KanbanColumn from '../../components/column/KanbanColumn.jsx'
import CardDetailModal from '../../components/card/CardDetailModal.jsx'
import MembersModal from '../../components/member/MembersModal.jsx'
import Loading from '../../components/common/Loading.jsx'
import Notice from '../../components/common/Notice.jsx'
import Avatar from '../../components/common/Avatar.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { boardService } from '../../services/boardService'
import { cardService } from '../../services/cardService'
import { columnService } from '../../services/columnService'
import { getErrorMessage } from '../../services/api'
import { createBoardRealtimeConnection, formatBoardRealtimeNotification } from '../../services/boardRealtimeService'
import { useBoard } from '../../hooks/useBoard'

function BoardDetailPage() {
  const { boardId } = useParams()
  const { setActiveBoard, pushLiveNotification } = useBoard()
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newColumnName, setNewColumnName] = useState('')
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [membersOpen, setMembersOpen] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const [filters, setFilters] = useState({ query: '', priority: 'All', assigneeId: 'All', quick: 'All' })
  const [compactMode, setCompactMode] = useState(false)
  const loadingRealtimeRef = useRef(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const realtimeLabels = {
    connecting: 'Đang kết nối',
    connected: 'Đã kết nối',
    reconnecting: 'Đang kết nối lại',
    disconnected: 'Mất kết nối',
    error: 'Lỗi kết nối',
  }

  const columns = useMemo(() => board?.columns || [], [board])
  const allCards = useMemo(() => columns.flatMap((column) => column.cards || []), [columns])
  const completedCards = useMemo(() => {
    const completedColumnIds = columns
      .filter((column) => {
        const name = column.name.toLowerCase()
        return name.includes('done') || name.includes('hoàn thành') || name.includes('xong')
      })
      .map((column) => column.id)
    return allCards.filter((card) => completedColumnIds.includes(card.columnId)).length
  }, [allCards, columns])
  const overdueCards = useMemo(() => allCards.filter((card) => (
    card.dueDate && new Date(card.dueDate) < new Date() && !card.isArchived
  )).length, [allCards])
  const currentUserId = useMemo(() => {
    const currentMember = board?.members?.find((member) => member.isCurrentUser || member.isMe)
    return currentMember?.userId ? String(currentMember.userId) : null
  }, [board])
  const filteredColumns = useMemo(() => {
    const query = filters.query.trim().toLowerCase()
    return columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => {
        const matchesQuery = !query
          || card.title.toLowerCase().includes(query)
          || (card.description || '').toLowerCase().includes(query)
          || card.labels?.some((label) => label.name.toLowerCase().includes(query))
        const matchesPriority = filters.priority === 'All' || card.priority === filters.priority
        const matchesAssignee = filters.assigneeId === 'All' || String(card.assigneeId || '') === filters.assigneeId
        const isOverdue = card.dueDate && new Date(card.dueDate) < new Date() && !card.isArchived
        const matchesQuick = filters.quick === 'All'
          || (filters.quick === 'Mine' && currentUserId && String(card.assigneeId || '') === currentUserId)
          || (filters.quick === 'Overdue' && isOverdue)
          || (filters.quick === 'High' && card.priority === 'High')
          || (filters.quick === 'Unassigned' && !card.assigneeId)
        return matchesQuery && matchesPriority && matchesAssignee && matchesQuick
      }),
    }))
  }, [columns, currentUserId, filters])
  const visibleCardsCount = useMemo(() => (
    filteredColumns.reduce((sum, column) => sum + (column.cards?.length || 0), 0)
  ), [filteredColumns])
  const hasFilters = filters.query.trim() || filters.priority !== 'All' || filters.assigneeId !== 'All' || filters.quick !== 'All'
  const clearFilters = () => setFilters({ query: '', priority: 'All', assigneeId: 'All', quick: 'All' })
  const setQuickFilter = (quick) => setFilters((current) => ({ ...current, quick }))

  const loadBoard = useCallback(async ({ showLoading = true, suppressError = false } = {}) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      if (!suppressError) {
        setError('')
      }
      const data = await boardService.getBoard(boardId)
      setBoard(data)
      setActiveBoard(data)
    } catch (err) {
      if (!suppressError) {
        setError(getErrorMessage(err))
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [boardId, setActiveBoard])

  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  useEffect(() => {
    const connection = createBoardRealtimeConnection({
      boardId,
      onStatusChanged: setRealtimeStatus,
      onBoardChanged: async (event) => {
        pushLiveNotification(formatBoardRealtimeNotification(event))
        if (loadingRealtimeRef.current) return

        loadingRealtimeRef.current = true
        try {
          await loadBoard({ showLoading: false, suppressError: true })
        } finally {
          loadingRealtimeRef.current = false
        }
      },
    })

    connection.start().catch(() => setRealtimeStatus('error'))

    return () => {
      connection.stop().catch(() => {})
    }
  }, [boardId, loadBoard, pushLiveNotification])

  const createColumn = async (event) => {
    event.preventDefault()
    if (!newColumnName.trim()) return
    try {
      await columnService.createColumn(board.id, {
        name: newColumnName,
        position: columns.length + 1,
        wipLimit: null,
      })
      setNewColumnName('')
      await loadBoard()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const createCard = async (columnId, title) => {
    try {
      await cardService.createCard(columnId, {
        title,
        description: '',
        assigneeId: null,
        priority: 'Medium',
        dueDate: null,
        position: null,
        labels: [],
      })
      await loadBoard()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const updateColumn = async (columnId, payload) => {
    try {
      await columnService.updateColumn(columnId, payload)
      await loadBoard()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const deleteColumn = async (columnId) => {
    try {
      await columnService.deleteColumn(columnId)
      await loadBoard()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleDragEnd = async ({ active, over }) => {
    if (!over || !board) return

    const activeCardId = Number(String(active.id).replace('card-', ''))
    const overData = over.data.current
    if (!activeCardId || !overData) return

    const sourceColumn = columns.find((column) => column.cards.some((card) => card.id === activeCardId))
    const movingCard = sourceColumn?.cards.find((card) => card.id === activeCardId)
    if (!sourceColumn || !movingCard) return

    let targetColumnId = null
    let targetIndex = 0
    if (overData.type === 'column') {
      targetColumnId = overData.column.id
      targetIndex = columns.find((column) => column.id === targetColumnId)?.cards.length || 0
    }
    if (overData.type === 'card') {
      targetColumnId = overData.card.columnId
      targetIndex = columns.find((column) => column.id === targetColumnId)?.cards.findIndex((card) => card.id === overData.card.id) ?? 0
    }

    if (!targetColumnId) return
    if (targetColumnId === sourceColumn.id && overData.card?.id === activeCardId) return

    const nextColumns = columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => card.id !== activeCardId),
    }))

    const targetColumn = nextColumns.find((column) => column.id === targetColumnId)
    if (!targetColumn) return

    if (targetColumnId === sourceColumn.id) {
      const sourceIndex = sourceColumn.cards.findIndex((card) => card.id === activeCardId)
      if (sourceIndex < targetIndex) targetIndex -= 1
    }

    targetColumn.cards.splice(Math.max(0, targetIndex), 0, { ...movingCard, columnId: targetColumnId })
    nextColumns.forEach((column) => {
      column.cards = column.cards.map((card, index) => ({ ...card, position: index + 1, columnId: column.id }))
    })

    setBoard({ ...board, columns: nextColumns })

    try {
      const affected = nextColumns
        .filter((column) => column.id === sourceColumn.id || column.id === targetColumnId)
        .flatMap((column) => column.cards.map((card) => ({
          cardId: card.id,
          columnId: column.id,
          position: card.position,
        })))
      await cardService.reorderCards({ cards: affected })
      await loadBoard()
    } catch (err) {
      setError(getErrorMessage(err))
      await loadBoard()
    }
  }

  if (loading) {
    return <Loading label="Đang tải board" />
  }

  if (!board) {
    return <Notice type="error">{error || 'Không tìm thấy board'}</Notice>
  }

  return (
    <section className={`board-page ${compactMode ? 'board-compact' : ''}`}>
      <div className="board-toolbar">
        <div className="board-title-block">
          <span className="eyebrow">{board.isPublic ? 'Board công khai' : 'Board riêng tư'}</span>
          <h2>{board.name}</h2>
          {board.description && <p>{board.description}</p>}
          <div className="member-stack">
            {board.members.slice(0, 5).map((member) => (
              <Avatar key={member.id} name={member.fullName} src={member.avatarUrl} size="sm" />
            ))}
            <span>{board.members.length} thành viên</span>
          </div>
        </div>
        <div className="toolbar-actions">
          <span className={`realtime-pill realtime-${realtimeStatus}`}>{realtimeLabels[realtimeStatus] || realtimeStatus}</span>
          <button className={`ghost-button compact ${compactMode ? 'is-active' : ''}`} type="button" onClick={() => setCompactMode((value) => !value)}>
            <LayoutGrid size={16} /> Thu gọn
          </button>
          <button className="ghost-button compact" type="button" onClick={loadBoard}><RefreshCw size={16} /> Làm mới</button>
          <button className="ghost-button compact" type="button" onClick={() => setMembersOpen(true)}><Users size={16} /> Thành viên</button>
          <Link className="ghost-button compact" to={`/boards/${board.id}/reports`}><BarChart3 size={16} /> Báo cáo</Link>
        </div>
      </div>

      <Notice type="error">{error}</Notice>

      <div className="board-insights">
        <StatCard icon={<CircleDot size={19} />} label="Thẻ hiển thị" value={`${visibleCardsCount}/${allCards.length}`} hint="sau khi lọc" tone="blue" />
        <StatCard icon={<CheckCircle2 size={19} />} label="Hoàn thành" value={completedCards} hint="thẻ đã xong" tone="green" />
        <StatCard icon={<AlertTriangle size={19} />} label="Quá hạn" value={overdueCards} hint="đã qua hạn" tone="red" />
      </div>

      <div className="board-filterbar">
        <div className="search-field">
          <Search size={17} />
          <input value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} placeholder="Tìm thẻ hoặc nhãn" />
        </div>
        <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="All">Tất cả</option>
          <option value="Low">Thấp</option>
          <option value="Medium">Trung bình</option>
          <option value="High">Cao</option>
        </select>
        <select value={filters.assigneeId} onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })}>
          <option value="All">Tất cả người phụ trách</option>
          {board.members.map((member) => (
            <option key={member.userId} value={member.userId}>{member.fullName}</option>
          ))}
        </select>
        {hasFilters && (
          <button className="ghost-button compact" type="button" onClick={clearFilters}>
            <FilterX size={16} /> Xóa lọc
          </button>
        )}
      </div>

      <div className="quick-filterbar">
        <button className={`quick-filter ${filters.quick === 'All' ? 'is-active' : ''}`} type="button" onClick={() => setQuickFilter('All')}>
          <CircleDot size={15} /> Tất cả thẻ
        </button>
        <button className={`quick-filter ${filters.quick === 'Mine' ? 'is-active' : ''}`} type="button" onClick={() => setQuickFilter('Mine')} disabled={!currentUserId}>
          <UserCheck size={15} /> Của tôi
        </button>
        <button className={`quick-filter ${filters.quick === 'Overdue' ? 'is-active' : ''}`} type="button" onClick={() => setQuickFilter('Overdue')}>
          <AlertTriangle size={15} /> Quá hạn
        </button>
        <button className={`quick-filter ${filters.quick === 'High' ? 'is-active' : ''}`} type="button" onClick={() => setQuickFilter('High')}>
          <Zap size={15} /> Ưu tiên cao
        </button>
        <button className={`quick-filter ${filters.quick === 'Unassigned' ? 'is-active' : ''}`} type="button" onClick={() => setQuickFilter('Unassigned')}>
          <UserX size={15} /> Chưa phân công
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {filteredColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onCreateCard={createCard}
              onOpenCard={setSelectedCardId}
              onDeleteColumn={deleteColumn}
              onUpdateColumn={updateColumn}
              filtersActive={Boolean(hasFilters)}
              onClearFilters={clearFilters}
            />
          ))}

          <form className="new-column" onSubmit={createColumn}>
            <input value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="Cột mới" />
            <button className="primary-button compact" type="submit"><Plus size={16} /> Thêm cột</button>
          </form>
        </div>
      </DndContext>

      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          member={board.members}
          onClose={() => setSelectedCardId(null)}
          onSaved={loadBoard}
          onDeleted={loadBoard}
        />
      )}

      {membersOpen && (
        <MembersModal
          boardId={board.id}
          member={board.members}
          onClose={() => setMembersOpen(false)}
          onChanged={loadBoard}
        />
      )}
    </section>
  )
}

export default BoardDetailPage
