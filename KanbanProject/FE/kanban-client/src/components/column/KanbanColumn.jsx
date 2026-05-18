import { Check, Plus, Trash2 } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { useState } from 'react'
import KanbanCard from '../card/KanbanCard.jsx'

function KanbanColumn({ column, onCreateCard, onOpenCard, onDeleteColumn, onUpdateColumn, filtersActive = false, onClearFilters }) {
  const [title, setTitle] = useState(column.name)
  const [newCardTitle, setNewCardTitle] = useState('')
  const cardCount = column.cards?.length || 0
  const hasWipLimit = Number(column.wipLimit) > 0
  const isOverLimit = hasWipLimit && cardCount > Number(column.wipLimit)
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: 'column', column },
  })

  const submitCard = (event) => {
    event.preventDefault()
    if (!newCardTitle.trim()) return
    onCreateCard(column.id, newCardTitle.trim())
    setNewCardTitle('')
  }

  const submitTitle = () => {
    if (title.trim() && title.trim() !== column.name) {
      onUpdateColumn(column.id, { name: title.trim(), position: column.position, wipLimit: column.wipLimit })
    }
  }

  return (
    <section ref={setNodeRef} className={`kanban-column ${isOver ? 'column-over' : ''} ${isOverLimit ? 'column-over-limit' : ''}`}>
      <header className="column-header">
        <div className="column-title-row">
          <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={submitTitle} />
          <button className="icon-button subtle" type="button" title="Lưu tên cột" onClick={submitTitle}>
            <Check size={15} />
          </button>
        </div>
        <div className={`column-count ${isOverLimit ? 'is-over-limit' : ''}`} title={hasWipLimit ? `WIP ${cardCount}/${column.wipLimit}` : `${cardCount} thẻ`}>
          {hasWipLimit ? `${cardCount}/${column.wipLimit}` : cardCount}
        </div>
        <button className="icon-button subtle danger" type="button" title="Xóa cột" onClick={() => onDeleteColumn(column.id)}>
          <Trash2 size={15} />
        </button>
      </header>

      <div className="cards-list">
        {column.cards?.map((card) => (
          <KanbanCard key={card.id} card={card} onOpen={onOpenCard} />
        ))}
        {!column.cards?.length && filtersActive && (
          <div className="empty-inline column-empty filter-empty">
            <strong>Không có thẻ phù hợp</strong>
            <span>Thử bộ lọc nhanh khác hoặc xóa toàn bộ bộ lọc.</span>
            <button className="ghost-button compact" type="button" onClick={onClearFilters}>Xóa bộ lọc</button>
          </div>
        )}
        {!column.cards?.length && !filtersActive && (
          <div className="empty-inline column-empty">
            <strong>Chưa có thẻ</strong>
            <span>Kéo công việc vào đây hoặc tạo thẻ mới.</span>
          </div>
        )}
      </div>

      <form className="add-card-form" onSubmit={submitCard}>
        <input value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)} placeholder="Thêm thẻ" />
        <button className="icon-button" type="submit" title="Thêm thẻ"><Plus size={17} /></button>
      </form>
    </section>
  )
}

export default KanbanColumn
