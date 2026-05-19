import { Inbox } from 'lucide-react'

function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state-card">
      <span className="empty-state-icon">{icon || <Inbox size={24} />}</span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  )
}

export default EmptyState
