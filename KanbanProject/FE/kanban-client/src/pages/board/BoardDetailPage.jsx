import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { AlertTriangle, BarChart3, CircleDot, ExternalLink, FileQuestion, FileText, FilterX, FolderOpen, LayoutGrid, Plus, RefreshCw, Save, Search, Trash2, UserCheck, UserX, Users, Zap } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import KanbanColumn from '../../components/column/KanbanColumn.jsx'
import CardDetailModal from '../../components/card/CardDetailModal.jsx'
import MembersModal from '../../components/member/MembersModal.jsx'
import Notice from '../../components/common/Notice.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import { BoardSkeleton } from '../../components/common/Skeleton.jsx'
import Avatar from '../../components/common/Avatar.jsx'
import { useUI } from '../../context/UIContext.jsx'
import { boardService } from '../../services/boardService'
import { cardService } from '../../services/cardService'
import { columnService } from '../../services/columnService'
import { organizationService } from '../../services/organizationService'
import { getErrorMessage } from '../../services/api'
import { createBoardRealtimeConnection, formatBoardRealtimeNotification } from '../../services/boardRealtimeService'
import { useBoard } from '../../hooks/useBoard'
import { useAuth } from '../../hooks/useAuth'

const columnSuggestions = ['Cần làm', 'Đang làm', 'Đợi phản hồi', 'Hoàn thành']
const overlayPriorityLabels = {
  Low: 'Thấp',
  Medium: 'Trung bình',
  High: 'Cao',
}
const progressStatusLabels = {
  Completed: 'Hoàn thành',
  BehindSchedule: 'Chậm tiến độ',
  InProgress: 'Đang thực hiện',
  NotStarted: 'Chưa bắt đầu',
}

function BoardDetailPage() {
  const { boardId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, isSystemAdmin } = useAuth()
  const { confirm, showToast } = useUI()
  const { setActiveBoard, pushLiveNotification } = useBoard()
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newColumnName, setNewColumnName] = useState('')
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [membersOpen, setMembersOpen] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState(null)
  const [filters, setFilters] = useState({ query: '', priority: 'All', assigneeId: 'All', quick: 'All' })
  const [compactMode, setCompactMode] = useState(false)
  const [showProjectSummary, setShowProjectSummary] = useState(false)
  const [activeDragId, setActiveDragId] = useState(null)
  const [projectForm, setProjectForm] = useState({ projectCode: '', name: '', description: '', summary: '', organizationUnitId: '', isPublic: false })
  const [organizationUnits, setOrganizationUnits] = useState([])
  const [documentForm, setDocumentForm] = useState({ title: '', url: '', description: '' })
  const [documentErrors, setDocumentErrors] = useState({})
  const [projectSaving, setProjectSaving] = useState(false)
  const [documentSaving, setDocumentSaving] = useState(false)
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
  const activeDragCard = useMemo(() => {
    const rawId = String(activeDragId || '')
    if (!rawId.startsWith('card-')) return null
    const cardId = Number(rawId.replace('card-', ''))
    return allCards.find((card) => Number(card.id) === cardId) || null
  }, [activeDragId, allCards])
  const currentUserId = useMemo(() => {
    return user?.id ? String(user.id) : null
  }, [user])
  const currentProjectRole = useMemo(() => (
    board?.members?.find((member) => String(member.userId) === currentUserId)?.role || null
  ), [board, currentUserId])
  const canManageProject = isSystemAdmin || currentProjectRole === 'Owner' || currentProjectRole === 'Admin'
  const boardProgressPercent = Number(board?.progressPercent || 0)
  const boardProgressStatus = progressStatusLabels[board?.progressStatus] || 'Chưa rõ tiến độ'
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
        const isOverdue = Boolean(card.isOverdue ?? (card.dueDate && new Date(card.dueDate) < new Date() && !card.isArchived && !card.isCompleted))
        const matchesQuick = filters.quick === 'All'
          || (filters.quick === 'Mine' && currentUserId && String(card.assigneeId || '') === currentUserId)
          || (filters.quick === 'Overdue' && isOverdue)
          || (filters.quick === 'High' && card.priority === 'High')
          || (filters.quick === 'Unassigned' && !card.assigneeId)
        return matchesQuery && matchesPriority && matchesAssignee && matchesQuick
      }),
    }))
  }, [columns, currentUserId, filters])
  const hasFilters = filters.query.trim() || filters.priority !== 'All' || filters.assigneeId !== 'All' || filters.quick !== 'All'
  const clearFilters = () => setFilters({ query: '', priority: 'All', assigneeId: 'All', quick: 'All' })
  const setQuickFilter = (quick) => setFilters((current) => ({ ...current, quick }))
  const openCardModal = (cardId) => {
    setSelectedCardId(cardId)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('cardId', cardId)
    setSearchParams(nextParams, { replace: true })
  }
  const closeCardModal = () => {
    setSelectedCardId(null)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('cardId')
    setSearchParams(nextParams, { replace: true })
  }

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
    let mounted = true
    organizationService.getUnitOptions()
      .then((items) => {
        if (mounted) setOrganizationUnits(items)
      })
      .catch(() => {
        if (mounted) setOrganizationUnits([])
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!board) return
    setProjectForm({
      projectCode: board.projectCode || '',
      name: board.name || '',
      description: board.description || '',
      summary: board.summary || '',
      organizationUnitId: board.organizationUnitId || '',
      isPublic: Boolean(board.isPublic),
    })
  }, [board])

  useEffect(() => {
    if (!board) return
    const cardId = Number(searchParams.get('cardId'))
    if (!cardId) return

    const exists = (board.columns || []).some((column) => (
      (column.cards || []).some((card) => Number(card.id) === cardId)
    ))
    if (exists) {
      setSelectedCardId(cardId)
    }
  }, [board, searchParams])

  useEffect(() => {
    const connection = createBoardRealtimeConnection({
      boardId,
      onStatusChanged: setRealtimeStatus,
      onBoardChanged: async (event) => {
        setLastRealtimeEvent(event)
        pushLiveNotification(formatBoardRealtimeNotification(event))

        if (['ChatMessageAdded', 'CommentAdded', 'CommentDeleted'].includes(event?.action)) {
          return
        }

        const realtimeBoard = event?.data?.board || event?.data?.Board
        if (realtimeBoard) {
          setBoard(realtimeBoard)
          setActiveBoard(realtimeBoard)
          return
        }

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
  }, [boardId, loadBoard, pushLiveNotification, setActiveBoard])

  const createColumn = async (event) => {
    event.preventDefault()
    if (!newColumnName.trim()) return
    try {
      await columnService.createColumn(board.id, {
        name: newColumnName,
        position: columns.length + 1,
        wipLimit: null,
      })
      showToast({ type: 'success', title: 'Đã thêm cột', message: `Cột "${newColumnName.trim()}" đã được tạo.` })
      setNewColumnName('')
      await loadBoard()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const updateProjectInfo = async (event) => {
    event.preventDefault()
    if (!projectForm.name.trim()) {
      setError('Vui lòng nhập tên dự án.')
      return
    }

    try {
      setProjectSaving(true)
      setError('')
      await boardService.updateBoard(board.id, {
        projectCode: projectForm.projectCode,
        name: projectForm.name,
        description: projectForm.description,
        summary: projectForm.summary,
        organizationUnitId: projectForm.organizationUnitId ? Number(projectForm.organizationUnitId) : null,
        isPublic: projectForm.isPublic,
      })
      showToast({ type: 'success', title: 'Đã cập nhật dự án', message: 'Thông tin tổng quan đã được lưu.' })
      await loadBoard({ showLoading: false })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setProjectSaving(false)
    }
  }

  const addProjectDocument = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    const title = documentForm.title.trim()
    const url = documentForm.url.trim()
    const description = documentForm.description.trim()

    if (!title) {
      nextErrors.title = 'Vui lòng nhập tên tài liệu.'
    } else if (title.length < 2) {
      nextErrors.title = 'Tên tài liệu cần ít nhất 2 ký tự.'
    }

    if (!url) {
      nextErrors.url = 'Vui lòng nhập liên kết tài liệu.'
    } else {
      try {
        const parsedUrl = new URL(url)
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          nextErrors.url = 'Liên kết phải bắt đầu bằng http:// hoặc https://.'
        }
      } catch {
        nextErrors.url = 'Liên kết tài liệu không hợp lệ.'
      }
    }

    if (description.length > 500) {
      nextErrors.description = 'Mô tả tài liệu không được vượt quá 500 ký tự.'
    }

    if (Object.keys(nextErrors).length) {
      setDocumentErrors(nextErrors)
      setError('Bạn kiểm tra lại thông tin tài liệu được đánh dấu màu đỏ nhé.')
      return
    }

    try {
      setDocumentSaving(true)
      setError('')
      setDocumentErrors({})
      await boardService.addProjectDocument(board.id, { title, url, description: description || null })
      showToast({ type: 'success', title: 'Đã thêm tài liệu', message: title })
      setDocumentForm({ title: '', url: '', description: '' })
      await loadBoard({ showLoading: false })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDocumentSaving(false)
    }
  }

  const removeProjectDocument = async (document) => {
    const ok = await confirm({
      title: 'Xóa tài liệu dự án?',
      message: `Tài liệu "${document.title}" sẽ bị xóa khỏi phần tổng quan dự án.`,
      confirmText: 'Xóa tài liệu',
      tone: 'danger',
    })
    if (!ok) return

    try {
      setError('')
      await boardService.deleteProjectDocument(board.id, document.id)
      showToast({ type: 'success', title: 'Đã xóa tài liệu', message: document.title })
      await loadBoard({ showLoading: false })
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
      showToast({ type: 'success', title: 'Đã tạo thẻ', message: `Thẻ "${title}" đã được thêm vào bảng.` })
      await loadBoard()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const updateColumn = async (columnId, payload) => {
    try {
      await columnService.updateColumn(columnId, payload)
      showToast({ type: 'success', title: 'Đã cập nhật cột', message: 'Tên cột đã được lưu.' })
      await loadBoard()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const deleteColumn = async (columnId) => {
    const column = columns.find((item) => item.id === columnId)
    const ok = await confirm({
      title: 'Xóa cột?',
      message: `Cột "${column?.name || 'này'}" và các thẻ trong cột sẽ bị xóa. Thao tác này không thể hoàn tác.`,
      confirmText: 'Xóa cột',
    })
    if (!ok) return

    try {
      await columnService.deleteColumn(columnId)
      showToast({ type: 'success', title: 'Đã xóa cột', message: `Cột "${column?.name || 'đã chọn'}" đã được xóa.` })
      await loadBoard()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleDragStart = ({ active }) => {
    setActiveDragId(active?.id || null)
  }

  const handleDragCancel = () => {
    setActiveDragId(null)
  }

  const handleDragEnd = async ({ active, over }) => {
    setActiveDragId(null)
    if (!over || !board) return

    const activeData = active.data.current
    const overData = over.data.current
    if (!overData) return

    if (activeData?.type === 'column-sort') {
      const sourceColumnId = activeData.column.id
      const targetColumnId = overData.column?.id || overData.card?.columnId
      if (!sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) return

      const sourceIndex = columns.findIndex((column) => column.id === sourceColumnId)
      const targetIndex = columns.findIndex((column) => column.id === targetColumnId)
      if (sourceIndex < 0 || targetIndex < 0) return

      const nextColumns = [...columns]
      const [movingColumn] = nextColumns.splice(sourceIndex, 1)
      nextColumns.splice(targetIndex, 0, movingColumn)
      const positionedColumns = nextColumns.map((column, index) => ({ ...column, position: index + 1 }))

      setBoard({ ...board, columns: positionedColumns })

      try {
        await columnService.reorderColumns({
          columns: positionedColumns.map((column) => ({ columnId: column.id, position: column.position })),
        })
        showToast({ type: 'success', title: 'Đã sắp xếp cột', message: 'Thứ tự cột đã được lưu.' })
        await loadBoard({ showLoading: false })
      } catch (err) {
        setError(getErrorMessage(err))
        await loadBoard({ showLoading: false })
      }
      return
    }

    const activeCardId = Number(String(active.id).replace('card-', ''))
    if (!activeCardId) return

    const sourceColumn = columns.find((column) => column.cards.some((card) => card.id === activeCardId))
    const movingCard = sourceColumn?.cards.find((card) => card.id === activeCardId)
    if (!sourceColumn || !movingCard) return

    let targetColumnId = null
    let targetIndex = 0
    if (overData.type === 'column') {
      targetColumnId = overData.column.id
      targetIndex = targetColumnId === sourceColumn.id ? (columns.find((column) => column.id === targetColumnId)?.cards.length || 0) : 0
    }
    if (overData.type === 'column-sort') {
      targetColumnId = overData.column.id
      targetIndex = targetColumnId === sourceColumn.id ? (columns.find((column) => column.id === targetColumnId)?.cards.length || 0) : 0
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
      await cardService.reorderCards({ cards: affected, movedCardId: movingCard.id })
      showToast({ type: 'success', title: 'Đã di chuyển thẻ', message: `"${movingCard.title}" đã được cập nhật vị trí.` })
      await loadBoard()
    } catch (err) {
      setError(getErrorMessage(err))
      await loadBoard()
    }
  }

  if (loading) {
    return <BoardSkeleton />
  }

  if (!board) {
    return (
      <section className="page">
        <EmptyState
          icon={<FileQuestion size={26} />}
          title="Không tìm thấy bảng"
          description={error || 'Bảng này không tồn tại hoặc bạn không có quyền truy cập.'}
        />
      </section>
    )
  }

  return (
    <section className={`board-page ${compactMode ? 'board-compact' : ''} ${activeDragCard ? 'is-dragging-card' : ''}`}>
      <div className="board-toolbar">
        <div className="board-title-block">
          <span className="eyebrow">
            {board.isPublic ? 'Dự án công khai' : 'Dự án riêng tư'} · {board.projectCode || `PRJ-${board.id}`}
            {board.organizationUnitName ? ` · ${board.organizationUnitName}` : ''}
          </span>
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

      <section className="project-summary-strip">
        <div>
          <span className="project-code-chip">{board.projectCode || `PRJ-${board.id}`}</span>
          <strong>{board.summary || board.description || 'Chưa có tóm tắt dự án.'}</strong>
          <small>{boardProgressPercent}% hoàn thành · {board.completedCards || 0}/{board.totalCards || 0} thẻ xong · {board.overdueCards || 0} quá hạn · {boardProgressStatus}</small>
        </div>
        <button className="ghost-button compact" type="button" onClick={() => setShowProjectSummary((value) => !value)}>
          <FolderOpen size={16} /> {showProjectSummary ? 'Ẩn tổng quan' : 'Tổng quan dự án'}
        </button>
      </section>

      {showProjectSummary && (
      <section className="project-summary-panel">
        <div className="project-summary-head">
          <div>
            <span className="eyebrow">Tổng quan dự án</span>
            <h3>
              <span>{board.projectCode || `PRJ-${board.id}`}</span>
              {board.name}
            </h3>
            <p>{board.summary || board.description || 'Chưa có tóm tắt dự án. Admin hoặc quản trị dự án nên bổ sung mục tiêu, phạm vi và tài liệu nền.'}</p>
          </div>
          <div className="project-id-card">
            <span>Tiến độ dự án</span>
            <strong>{boardProgressPercent}%</strong>
            <small>{board.completedCards || 0}/{board.totalCards || 0} thẻ hoàn thành · {boardProgressStatus}</small>
          </div>
        </div>

        <div className="project-summary-strip">
          <div>
            <strong>{board.remainingCards || 0} thẻ còn lại · {board.overdueCards || 0} thẻ quá hạn</strong>
            <small>Mỗi dự án luôn có đúng một cột hoàn thành; tiến độ được tính từ thẻ chưa lưu trữ nằm trong cột đó.</small>
          </div>
          <div className="board-progress" style={{ '--board-progress': `${boardProgressPercent}%` }}><span /></div>
        </div>

        <div className="project-summary-grid">
          <form className="project-info-form" onSubmit={updateProjectInfo}>
            <header>
              <FolderOpen size={18} />
              <strong>Thông tin dự án</strong>
            </header>
            <div className="form-grid two">
              <label>
                Mã dự án
                <input
                  value={projectForm.projectCode}
                  onChange={(event) => setProjectForm({ ...projectForm, projectCode: event.target.value })}
                  placeholder="Ví dụ PRJ-001"
                  disabled={!canManageProject}
                />
              </label>
              <label>
                Tên dự án
                <input
                  className={!projectForm.name.trim() ? 'is-invalid' : ''}
                  value={projectForm.name}
                  onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })}
                  disabled={!canManageProject}
                />
              </label>
            </div>
            <label>
              Đơn vị phụ trách
              <select
                value={projectForm.organizationUnitId}
                onChange={(event) => setProjectForm({ ...projectForm, organizationUnitId: event.target.value })}
                disabled={!canManageProject}
              >
                <option value="">Chưa gắn phòng ban/team</option>
                {organizationUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.type === 'Team' ? 'Team' : 'Phòng ban'} · {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mô tả ngắn
              <input
                value={projectForm.description}
                onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })}
                disabled={!canManageProject}
              />
            </label>
            <label>
              Tóm tắt dự án
              <textarea
                value={projectForm.summary}
                onChange={(event) => setProjectForm({ ...projectForm, summary: event.target.value })}
                placeholder="Mục tiêu, phạm vi, tài liệu liên quan, ghi chú nghiệp vụ..."
                rows={4}
                disabled={!canManageProject}
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={projectForm.isPublic}
                onChange={(event) => setProjectForm({ ...projectForm, isPublic: event.target.checked })}
                disabled={!canManageProject}
              />
              Dự án công khai
            </label>
            {canManageProject ? (
              <button className="primary-button compact" type="submit" disabled={projectSaving}>
                <Save size={16} /> {projectSaving ? 'Đang lưu...' : 'Lưu tổng quan'}
              </button>
            ) : (
              <p className="project-readonly-note">Bạn đang ở chế độ xem. Chỉ Admin hệ thống hoặc quản trị dự án mới sửa được phần này.</p>
            )}
          </form>

          <div className="project-documents-panel">
            <header>
              <div>
                <span className="eyebrow">Tài liệu dự án</span>
                <h3>{board.documents?.length || 0} tài liệu</h3>
              </div>
              <FileText size={22} />
            </header>
            <div className="project-doc-list">
              {(board.documents || []).length === 0 ? (
                <EmptyState
                  icon={<FileText size={22} />}
                  title="Chưa có tài liệu"
                  description="Thêm link tài liệu đặc tả, báo cáo, thiết kế hoặc biên bản để nhóm dễ tra cứu."
                />
              ) : (
                board.documents.map((document) => (
                  <article className="project-doc-item" key={document.id}>
                    <div>
                      <strong>{document.title}</strong>
                      {document.description && <span>{document.description}</span>}
                      <small>{new Date(document.createdAt).toLocaleDateString()}</small>
                    </div>
                    <a className="icon-button subtle" href={document.url} target="_blank" rel="noreferrer" title="Mở tài liệu">
                      <ExternalLink size={15} />
                    </a>
                    {canManageProject && (
                      <button className="icon-button danger" type="button" title="Xóa tài liệu" onClick={() => removeProjectDocument(document)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </article>
                ))
              )}
            </div>
            {canManageProject && (
              <form className="project-document-form" onSubmit={addProjectDocument}>
                <input
                  className={documentErrors.title ? 'is-invalid' : ''}
                  value={documentForm.title}
                  onChange={(event) => {
                    setDocumentForm({ ...documentForm, title: event.target.value })
                    if (documentErrors.title) setDocumentErrors((current) => ({ ...current, title: '' }))
                  }}
                  placeholder="Tên tài liệu"
                />
                {documentErrors.title && <span className="field-error-text">{documentErrors.title}</span>}
                <input
                  className={documentErrors.url ? 'is-invalid' : ''}
                  value={documentForm.url}
                  onChange={(event) => {
                    setDocumentForm({ ...documentForm, url: event.target.value })
                    if (documentErrors.url) setDocumentErrors((current) => ({ ...current, url: '' }))
                  }}
                  placeholder="https://..."
                />
                {documentErrors.url && <span className="field-error-text">{documentErrors.url}</span>}
                <input
                  className={documentErrors.description ? 'is-invalid' : ''}
                  value={documentForm.description}
                  onChange={(event) => {
                    setDocumentForm({ ...documentForm, description: event.target.value })
                    if (documentErrors.description) setDocumentErrors((current) => ({ ...current, description: '' }))
                  }}
                  placeholder="Mô tả ngắn"
                />
                {documentErrors.description && <span className="field-error-text">{documentErrors.description}</span>}
                <button className="primary-button compact" type="submit" disabled={documentSaving}>
                  <Plus size={16} /> {documentSaving ? 'Đang thêm...' : 'Thêm tài liệu'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      )}

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

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragCancel={handleDragCancel} onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {columns.length === 0 && (
            <EmptyState
              icon={<LayoutGrid size={24} />}
              title="Chưa có cột nào"
              description="Tạo cột đầu tiên để bắt đầu kéo thả công việc."
            />
          )}
          {filteredColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onCreateCard={createCard}
              onOpenCard={openCardModal}
              onDeleteColumn={deleteColumn}
              onUpdateColumn={updateColumn}
              filtersActive={Boolean(hasFilters)}
              onClearFilters={clearFilters}
            />
          ))}

          <form className="new-column" onSubmit={createColumn}>
            <input value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="Cột mới" />
            <button className="primary-button compact" type="submit"><Plus size={16} /> Thêm cột</button>
            <div className="column-suggestion-list">
              {columnSuggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => setNewColumnName(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </form>
        </div>
        <DragOverlay dropAnimation={null} zIndex={1200}>
          {activeDragCard ? (
            <article className={`kanban-card drag-overlay-card ${activeDragCard.priority === 'High' ? 'card-high-priority' : ''}`}>
              <div className="card-body">
                <div className="label-row">
                  {activeDragCard.labels?.slice(0, 3).map((label) => (
                    <span key={`overlay-${activeDragCard.id}-${label.id}-${label.name}`} className="card-label" style={{ backgroundColor: label.color }}>
                      {label.name}
                    </span>
                  ))}
                </div>
                <h3>{activeDragCard.title}</h3>
                <div className="card-footer">
                  <span className="priority-dot">{overlayPriorityLabels[activeDragCard.priority] || activeDragCard.priority}</span>
                  {activeDragCard.assigneeName && <span>{activeDragCard.assigneeName}</span>}
                </div>
              </div>
            </article>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          member={board.members}
          realtimeEvent={lastRealtimeEvent}
          onClose={closeCardModal}
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
