import { Calendar, Globe2, KanbanSquare, Lock, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

function BoardCard({ board }) {
  return (
    <Link className="board-card" to={`/boards/${board.id}`}>
      <div className="board-card-top">
        <span className="board-icon"><KanbanSquare size={18} /></span>
        <span className="status-pill">
          {board.isPublic ? <Globe2 size={14} /> : <Lock size={14} />}
          {board.isPublic ? 'Công khai' : 'Riêng tư'}
        </span>
      </div>
      <h2>{board.name}</h2>
      <p>{board.description || 'Chưa có mô tả'}</p>
      <div className="board-progress">
        <span style={{ width: `${Math.min(100, Math.max(18, board.memberCount * 18))}%` }} />
      </div>
      <div className="board-meta">
        <span><Users size={15} /> {board.memberCount} thành viên</span>
        <span><Calendar size={15} /> {new Date(board.createdAt).toLocaleDateString()}</span>
      </div>
    </Link>
  )
}

export default BoardCard
