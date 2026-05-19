import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { AlertTriangle, BarChart3, CalendarClock, CheckCircle2, CircleDot, ClipboardList, ExternalLink, FileQuestion, FileText, FilterX, FolderOpen, LayoutGrid, Plus, RefreshCw, Save, Search, Trash2, UserCheck, UserX, Users, Zap } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import KanbanColumn from '../../components/column/KanbanColumn.jsx'
import CardDetailModal from '../../components/card/CardDetailModal.jsx'
import MembersModal from '../../components/member/MembersModal.jsx'
import Notice from '../../components/common/Notice.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import { BoardSkeleton } from '../../components/common/Skeleton.jsx'
import Avatar from '../../components/common/Avatar.jsx'
import StatCard from '../../components/common/StatCard.jsx'
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
  const [filters, setFilters] = useState({ query: '', priority: 'All', assigneeId: 'All', quick: 'All' })
  const [compactMode, setCompactMode] = useState(false)
  const [showProjectSummary, setShowProjectSummary] = useState(false)
  const [activeDragId, setActiveDragId] = useState(null)
  const [projectForm, setProjectForm] = useState({ projectCode: '', name: '', description: '', summary: '', organizationUnitId: '', isPublic: false })
  const [organizationUnits, setOrganizationUnits] = useState([])
  const [documentForm, setDocumentForm] = useState({ title: '', url: '', description: '' })
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
  const todayCards = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return allCards.filter((card) => {
      if (!card.dueDate || card.isArchived) return false
      const due = new Date(card.dueDate)
      due.setHours(0, 0, 0, 0)
      return due.getTime() === today.getTime()
    }).length
  }, [allCards])
  const highPriorityCards = useMemo(() => allCards.filter((card) => card.priority === 'High' && !card.isArchived).length, [allCards])
  const unassignedCards = useMemo(() => allCards.filter((card) => !card.assigneeId && !card.isArchived).length, [allCards])
  const completionRate = useMemo(() => (
    allCards.length ? Math.round((completedCards / allCards.length) * 100) : 0
  ), [allCards.length, completedCards])
  const currentUserId = useMemo(() => {
    return user?.id ? String(user.id) : null
  }, [user])
  const currentProjectRole = useMemo(() => (
    board?.members?.find((member) => String(member.userId) === currentUserId)?.role || null
  ), [board, currentUserId])
  const canManageProject = isSystemAdmin || currentProjectRole === 'Owner' || currentProjectRole === 'Admin'
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
    if (!documentForm.title.trim() || !documentForm.url.trim()) {
      setError('Vui lòng nhập tên tài liệu và liên kết tài liệu.')
      return
    }

    try {
      setDocumentSaving(true)
      setError('')
      await boardService.addProjectDocument(board.id, documentForm)
      showToast({ type: 'success', title: 'Đã thêm tài liệu', message: documentForm.title })
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
      targetIndex = targetColumnId === sourceColumn.id
        ? (columns.find((column) => column.id === targetColumnId)?.cards.findIndex((card) => card.id === overData.card.id) ?? 0)
        : 0
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
    <section className={`board-page ${compactMode ? 'board-compact' : ''} ${activeDragId ? 'is-dragging-card' : ''}`}>
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
          <small>{board.documents?.length || 0} tài liệu · ID #{board.id}{board.organizationUnitName ? ` · ${board.organizationUnitName}` : ''}</small>
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
            <span>ID dự án</span>
            <strong>#{board.id}</strong>
            <small>{board.projectCode || 'Chưa đặt mã'}</small>
          </div>
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
                  value={documentForm.title}
                  onChange={(event) => setDocumentForm({ ...documentForm, title: event.target.value })}
                  placeholder="Tên tài liệu"
                />
                <input
                  value={documentForm.url}
                  onChange={(event) => setDocumentForm({ ...documentForm, url: event.target.value })}
                  placeholder="https://..."
                />
                <input
                  value={documentForm.description}
                  onChange={(event) => setDocumentForm({ ...documentForm, description: event.target.value })}
                  placeholder="Mô tả ngắn"
                />
                <button className="primary-button compact" type="submit" disabled={documentSaving}>
                  <Plus size={16} /> {documentSaving ? 'Đang thêm...' : 'Thêm tài liệu'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      )}

      <div className="board-insights">
        <StatCard icon={<CircleDot size={19} />} label="Thẻ hiển thị" value={`${visibleCardsCount}/${allCards.length}`} hint="sau khi lọc" tone="blue" />
        <StatCard icon={<CheckCircle2 size={19} />} label="Hoàn thành" value={completedCards} hint="thẻ đã xong" tone="green" />
        <StatCard icon={<AlertTriangle size={19} />} label="Quá hạn" value={overdueCards} hint="đã qua hạn" tone="red" />
      </div>

      <section className="board-health-panel">
        <div className="board-health-main">
          <span className="board-health-icon"><ClipboardList size={20} /></span>
          <div>
            <span className="eyebrow">Sức khỏe bảng</span>
            <h3>{completionRate}% hoàn thành</h3>
            <p>Ưu tiên xử lý thẻ quá hạn, thẻ chưa phân công và việc có hạn hôm nay để bảng gọn hơn.</p>
          </div>
        </div>
        <div className="board-health-ring" style={{ '--progress': `${completionRate * 3.6}deg` }}>
          <strong>{completionRate}%</strong>
          <span>xong</span>
        </div>
        <div className="board-health-flags">
          <span><Zap size={15} /> Ưu tiên cao <strong>{highPriorityCards}</strong></span>
          <span><CalendarClock size={15} /> Hạn hôm nay <strong>{todayCards}</strong></span>
          <span><UserX size={15} /> Chưa giao <strong>{unassignedCards}</strong></span>
        </div>
      </section>

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
      </DndContext>

      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          member={board.members}
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
