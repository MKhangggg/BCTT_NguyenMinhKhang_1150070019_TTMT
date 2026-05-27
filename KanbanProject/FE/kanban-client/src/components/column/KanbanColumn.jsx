import { Check, CheckCircle2, GripVertical, Inbox, Plus, Trash2, X } from 'lucide-react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import KanbanCard from '../card/KanbanCard.jsx'
import EmptyState from '../common/EmptyState.jsx'

function KanbanColumn({ column, onCreateCard, onOpenCard, onDeleteColumn, onUpdateColumn, filtersActive = false, onClearFilters }) {
  const [title, setTitle] = useState(column.name)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const cardCount = column.cards?.length || 0
  const hasWipLimit = Number(column.wipLimit) > 0
  const isOverLimit = hasWipLimit && cardCount > Number(column.wipLimit)
  const isDoneColumn = Boolean(column.isDone)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: 'column', column },
  })
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `column-sort-${column.id}`,
    data: { type: 'column-sort', column },
  })

  const setRefs = (node) => {
    setDropRef(node)
    setDragRef(node)
  }

  const submitCard = (event) => {
    event.preventDefault()
    if (!newCardTitle.trim()) return
    onCreateCard(column.id, newCardTitle.trim())
    setNewCardTitle('')
    setIsComposing(false)
  }

  const submitTitle = () => {
    if (title.trim() && title.trim() !== column.name) {
      onUpdateColumn(column.id, { name: title.trim(), position: column.position, wipLimit: column.wipLimit })
    }
  }

  return (
    <section
      ref={setRefs}
      className={`kanban-column ${isOver ? 'column-over' : ''} ${isOverLimit ? 'column-over-limit' : ''} ${isDragging ? 'column-dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      <header className="column-header">
        <button className="drag-handle column-drag-handle" type="button" title="Kéo để đổi vị trí cột" {...listeners} {...attributes}>
          <GripVertical size={15} />
        </button>
        <div className="column-title-row">
          <input
            value={title}
            disabled={isDoneColumn}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={submitTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submitTitle()
                event.currentTarget.blur()
              }
            }}
          />
          <button className="icon-button subtle" type="button" title={isDoneColumn ? 'Cột Done mặc định không đổi tên' : 'Lưu tên cột'} disabled={isDoneColumn} onClick={submitTitle}>
            <Check size={15} />
          </button>
        </div>
        {isDoneColumn ? (
          <button className="column-done-toggle is-active" type="button" title="Cột hoàn thành mặc định" disabled>
            <CheckCircle2 size={15} />
          </button>
        ) : (
          <span className="column-done-slot" aria-hidden="true" />
        )}
        <div className={`column-count ${isOverLimit ? 'is-over-limit' : ''}`} title={hasWipLimit ? `WIP ${cardCount}/${column.wipLimit}` : `${cardCount} thẻ`}>
          {hasWipLimit ? `${cardCount}/${column.wipLimit}` : cardCount}
        </div>
        <button className="icon-button subtle column-add-button" type="button" title="Thêm thẻ" onClick={() => setIsComposing((value) => !value)}>
          {isComposing ? <X size={15} /> : <Plus size={15} />}
        </button>
        <button className="icon-button subtle danger" type="button" title={isDoneColumn ? 'Không thể xóa cột Done mặc định' : 'Xóa cột'} disabled={isDoneColumn} onClick={() => onDeleteColumn(column.id)}>
          <Trash2 size={15} />
        </button>
      </header>

      {isComposing && (
        <form className="column-card-composer" onSubmit={submitCard}>
          <input
            autoFocus
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            placeholder="Nhập tên thẻ rồi Enter"
          />
          <button className="icon-button" type="submit" title="Lưu thẻ"><Check size={16} /></button>
        </form>
      )}

      <div className="cards-list">
        {column.cards?.map((card) => (
          <KanbanCard key={card.id} card={card} onOpen={onOpenCard} />
        ))}
        {!column.cards?.length && filtersActive && (
          <EmptyState
            icon={<Inbox size={22} />}
            title="Không có thẻ phù hợp"
            description="Thử bộ lọc nhanh khác hoặc xóa toàn bộ bộ lọc."
            action={<button className="ghost-button compact" type="button" onClick={onClearFilters}>Xóa bộ lọc</button>}
          />
        )}
        {!column.cards?.length && !filtersActive && (
          <EmptyState
            icon={<Inbox size={22} />}
            title="Chưa có thẻ"
            description="Kéo công việc vào đây hoặc nhấn + trên đầu cột."
          />
        )}
      </div>
    </section>
  )
}

export default KanbanColumn
