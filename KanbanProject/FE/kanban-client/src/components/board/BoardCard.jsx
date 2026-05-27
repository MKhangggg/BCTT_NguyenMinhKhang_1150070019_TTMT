import { AlertTriangle, ArrowRight, Calendar, CheckCircle2, Clock3, FileText, Globe2, KanbanSquare, Lock, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

const progressStatusLabels = {
  Completed: 'Hoàn thành',
  BehindSchedule: 'Chậm tiến độ',
  InProgress: 'Đang làm',
  NotStarted: 'Chưa bắt đầu',
}

function BoardCard({ board, index = 0 }) {
  const memberCount = Number(board.memberCount || 0)
  const progressPercent = Number(board.progressPercent || 0)
  const progress = `${Math.min(100, Math.max(0, progressPercent))}%`
  const isBehindSchedule = board.progressStatus === 'BehindSchedule'
  const createdAt = board.createdAt ? new Date(board.createdAt) : null

  return (
    <Link className="board-card" to={`/boards/${board.id}`} style={{ '--reveal-delay': `${index * 70}ms`, '--board-progress': progress }}>
      <div className="board-card-top">
        <span className="board-icon"><KanbanSquare size={18} /></span>
        <span className="status-pill">
          {board.isPublic ? <Globe2 size={14} /> : <Lock size={14} />}
          {board.isPublic ? 'Công khai' : 'Riêng tư'}
        </span>
      </div>
      <span className="project-code-chip">{board.projectCode || `PRJ-${board.id}`}</span>
      <h2>{board.name}</h2>
      {board.organizationUnitName && (
        <span className="board-unit-chip">{board.organizationUnitType === 'Team' ? 'Team' : 'Phòng ban'} · {board.organizationUnitName}</span>
      )}
      <p>{board.summary || board.description || 'Chưa có tóm tắt dự án'}</p>
      <div className="board-progress">
        <span />
      </div>
      <div className="board-card-signals">
        <span><CheckCircle2 size={14} /> {progressPercent}% hoàn thành</span>
        <span>{board.completedCards || 0}/{board.totalCards || 0} thẻ xong</span>
        <span>{isBehindSchedule ? <AlertTriangle size={14} /> : <Clock3 size={14} />} {progressStatusLabels[board.progressStatus] || 'Chưa rõ'}</span>
      </div>
      <div className="board-card-signals">
        <span><Users size={14} /> {memberCount || 1} người</span>
        <span><FileText size={14} /> {board.documentCount || 0} tài liệu</span>
        <span><AlertTriangle size={14} /> {board.overdueCards || 0} quá hạn</span>
      </div>
      <div className="board-meta">
        <span><Calendar size={15} /> {createdAt?.toLocaleDateString() || 'Chưa rõ ngày'}</span>
        <strong>Mở bảng <ArrowRight size={15} /></strong>
      </div>
    </Link>
  )
}

export default BoardCard
