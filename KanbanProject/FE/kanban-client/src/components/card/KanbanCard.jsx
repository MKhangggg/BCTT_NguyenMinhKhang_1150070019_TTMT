import { AlertTriangle, CalendarClock, GripVertical, Tag, UserX, Zap } from 'lucide-react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import Avatar from '../common/Avatar.jsx'

const priorityClass = {
  Low: 'priority-low',
  Medium: 'priority-medium',
  High: 'priority-high',
}

const priorityLabels = {
  Low: 'Thấp',
  Medium: 'Trung bình',
  High: 'Cao',
}

function KanbanCard({ card, onOpen }) {
  const dueDate = card.dueDate ? new Date(card.dueDate) : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDay = dueDate ? new Date(dueDate) : null
  dueDay?.setHours(0, 0, 0, 0)
  const isOverdue = dueDay && dueDay < today && !card.isArchived
  const isDueToday = dueDay && dueDay.getTime() === today.getTime() && !card.isArchived
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `card-${card.id}`,
    data: { type: 'card', card },
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-card-${card.id}`,
    data: { type: 'card', card },
  })

  const setRefs = (node) => {
    setDragRef(node)
    setDropRef(node)
  }

  return (
    <article
      ref={setRefs}
      className={`kanban-card ${isDragging ? 'dragging' : ''} ${isOver ? 'drop-target' : ''} ${card.priority === 'High' ? 'card-high-priority' : ''} ${isOverdue ? 'card-overdue' : ''}`}
      style={{ transform: CSS.Translate.toString(transform) }}
      onClick={() => onOpen(card.id)}
    >
      <button className="drag-handle" type="button" title="Kéo thẻ" onClick={(event) => event.stopPropagation()} {...listeners} {...attributes}>
        <GripVertical size={15} />
      </button>
      <div className="card-body">
        <div className="label-row">
          {card.labels?.slice(0, 3).map((label) => (
            <span key={`${card.id}-${label.id}-${label.name}`} className="card-label" style={{ backgroundColor: label.color }}>
              {label.name}
            </span>
          ))}
        </div>
        <h3>{card.title}</h3>
        <div className="card-badges">
          {isOverdue && <span className="card-badge danger-badge"><AlertTriangle size={12} /> Quá hạn</span>}
          {isDueToday && <span className="card-badge warning-badge"><CalendarClock size={12} /> Hạn hôm nay</span>}
          {card.priority === 'High' && <span className="card-badge hot-badge"><Zap size={12} /> Ưu tiên cao</span>}
          {!card.assigneeId && <span className="card-badge neutral-badge"><UserX size={12} /> Chưa phân công</span>}
        </div>
        {card.description && <p>{card.description}</p>}
        <div className="card-footer">
          <span className={`priority-dot ${priorityClass[card.priority] || ''}`}>{priorityLabels[card.priority] || card.priority}</span>
          {card.dueDate && (
            <span><CalendarClock size={14} /> {new Date(card.dueDate).toLocaleDateString()}</span>
          )}
          {card.labels?.length > 3 && <span><Tag size={14} /> {card.labels.length}</span>}
          {card.assigneeName && <Avatar name={card.assigneeName} src={card.assigneeAvatarUrl} size="sm" />}
        </div>
      </div>
    </article>
  )
}

export default KanbanCard
