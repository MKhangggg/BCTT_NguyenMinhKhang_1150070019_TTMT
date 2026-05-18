import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CheckCircle2, FolderKanban, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import Loading from '../../components/common/Loading.jsx'
import Notice from '../../components/common/Notice.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import { boardService } from '../../services/boardService'
import { getErrorMessage } from '../../services/api'

function ReportsPage() {
  const [boards, setBoard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const summaries = await boardService.getBoards()
        const details = await Promise.all(summaries.map((board) => boardService.getBoard(board.id)))
        setBoard(details)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const cards = useMemo(() => boards.flatMap((board) => (board.columns || []).flatMap((column) => column.cards || [])), [boards])
  const completedCards = useMemo(() => boards.reduce((sum, board) => {
    const completedColumns = (board.columns || []).filter((column) => {
      const name = column.name.toLowerCase()
      return name.includes('done') || name.includes('hoàn thành') || name.includes('xong')
    })
    return sum + completedColumns.reduce((count, column) => count + (column.cards?.length || 0), 0)
  }, 0), [boards])
  const totalMembers = boards.reduce((sum, board) => sum + (board.members?.length || board.memberCount || 0), 0)

  if (loading) return <Loading label="Đang tải báo cáo" />

  return (
    <section className="page stack">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Phân tích</span>
          <h2>Báo cáo</h2>
          <p className="muted">Tổng quan không gian làm việc và liên kết tới báo cáo chi tiết từng bảng.</p>
        </div>
      </div>

      <Notice type="error">{error}</Notice>

      <div className="stats-grid">
        <StatCard icon={<FolderKanban size={20} />} label="Bảng" value={boards.length} hint="có sẵn" tone="blue" />
        <StatCard icon={<BarChart3 size={20} />} label="Thẻ" value={cards.length} hint="tổng công việc" tone="amber" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Hoàn thành" value={completedCards} hint="đã xong" tone="green" />
        <StatCard icon={<Users size={20} />} label="Thành viên" value={totalMembers} hint="trong bảng" tone="red" />
      </div>

      <div className="board-grid">
        {boards.map((board) => (
          <Link className="board-card" key={board.id} to={`/boards/${board.id}/reports`}>
            <span className="eyebrow">Báo cáo bảng</span>
            <h3>{board.name}</h3>
            <p>{board.description || 'Chưa có mô tả'}</p>
            <div className="board-meta">{board.columns?.length || 0} cột / {board.members?.length || board.memberCount || 0} thành viên</div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default ReportsPage
