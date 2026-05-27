import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, CheckCircle2, FolderKanban, PieChart, TrendingUp, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState.jsx'
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
  const completedCards = useMemo(() => boards.reduce((sum, board) => sum + (board.completedCards || 0), 0), [boards])
  const totalCards = useMemo(() => boards.reduce((sum, board) => sum + (board.totalCards || 0), 0), [boards])
  const totalMembers = boards.reduce((sum, board) => sum + (board.members?.length || board.memberCount || 0), 0)
  const overdueCards = boards.reduce((sum, board) => sum + (board.overdueCards || 0), 0)
  const completionRate = totalCards ? Math.round((completedCards / totalCards) * 100) : 0
  const topBoards = [...boards]
    .map((board) => ({
      ...board,
      cardCount: (board.columns || []).reduce((sum, column) => sum + (column.cards?.length || 0), 0),
    }))
    .sort((left, right) => right.cardCount - left.cardCount)
    .slice(0, 5)
  const maxBoardCards = Math.max(...topBoards.map((board) => board.cardCount), 1)
  const riskBoards = useMemo(() => boards
    .map((board) => {
      const boardCards = (board.columns || []).flatMap((column) => column.cards || [])
      const boardOverdue = board.overdueCards || 0
      const highCount = boardCards.filter((card) => card.priority === 'High' && !card.isArchived).length
      const progress = board.progressPercent || 0

      return {
        id: board.id,
        name: board.name,
        overdue: boardOverdue,
        highCount,
        progress,
        score: boardOverdue * 3 + highCount * 2 + Math.max(0, 60 - progress),
      }
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4), [boards])

  if (loading) return <Loading label="Đang tải báo cáo" />

  return (
    <section className="page stack">
      <div className="page-hero compact-hero reports-hero">
        <div>
          <span className="eyebrow">Phân tích</span>
          <h2>Báo cáo</h2>
          <p>Tổng quan sức khỏe không gian làm việc, tiến độ hoàn thành và bảng đang có nhiều công việc nhất.</p>
        </div>
        <PieChart size={42} />
      </div>

      <Notice type="error">{error}</Notice>

      <div className="stats-grid">
        <StatCard icon={<FolderKanban size={20} />} label="Bảng" value={boards.length} hint="có sẵn" tone="blue" />
        <StatCard icon={<BarChart3 size={20} />} label="Thẻ" value={cards.length} hint="tổng công việc" tone="amber" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Hoàn thành" value={`${completionRate}%`} hint={`${completedCards} thẻ đã xong`} tone="green" />
        <StatCard icon={<Users size={20} />} label="Thành viên" value={totalMembers} hint={`${overdueCards} thẻ quá hạn`} tone="red" />
      </div>

      <div className="report-dashboard-grid">
        <section className="report-section report-chart-panel">
          <header>
            <div>
              <span className="eyebrow">Hiệu suất</span>
              <h3>Bảng nhiều công việc</h3>
            </div>
            <TrendingUp size={22} />
          </header>
          <div className="chart-bars">
            {topBoards.map((board) => (
              <Link className="chart-bar-row" key={board.id} to={`/boards/${board.id}/reports`}>
                <span>{board.name}</span>
                <div><i style={{ width: `${Math.max(8, (board.cardCount / maxBoardCards) * 100)}%` }} /></div>
                <strong>{board.cardCount}</strong>
              </Link>
            ))}
            {topBoards.length === 0 && <EmptyState icon={<BarChart3 size={24} />} title="Chưa có dữ liệu" description="Tạo bảng và thẻ để bắt đầu xem báo cáo." />}
          </div>
        </section>

        <section className="report-section report-progress-panel">
          <header>
            <span className="eyebrow">Tiến độ tổng</span>
            <h3>{completionRate}% hoàn thành</h3>
          </header>
          <div className="report-radial" style={{ '--progress': `${completionRate * 3.6}deg` }}>
            <span>{completionRate}%</span>
          </div>
          <p>{completedCards}/{totalCards} thẻ đã nằm trong các cột hoàn thành.</p>
        </section>

        <section className="report-section report-risk-panel">
          <header>
            <div>
              <span className="eyebrow">Cần chú ý</span>
              <h3>Bảng có rủi ro cao</h3>
            </div>
            <AlertTriangle size={22} />
          </header>
          <div className="risk-board-list">
            {riskBoards.map((board) => (
              <Link key={board.id} to={`/boards/${board.id}`} className="risk-board-row">
                <div>
                  <strong>{board.name}</strong>
                  <span>{board.progress}% hoàn thành</span>
                </div>
                <div>
                  <span>{board.overdue} quá hạn</span>
                  <span>{board.highCount} ưu tiên cao</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {boards.length === 0 ? (
        <EmptyState icon={<FolderKanban size={24} />} title="Chưa có bảng để báo cáo" description="Tạo bảng đầu tiên để xem chỉ số và biểu đồ." />
      ) : (
        <div className="board-grid">
          {boards.map((board, index) => (
              <Link className="board-card report-board-card" key={board.id} to={`/boards/${board.id}/reports`} style={{ '--reveal-delay': `${index * 70}ms`, '--board-progress': `${board.progressPercent || 0}%` }}>
                <span className="eyebrow">Báo cáo bảng</span>
                <h3>{board.name}</h3>
                <p>{board.description || 'Chưa có mô tả'}</p>
                <div className="board-progress"><span /></div>
                <div className="board-meta">{board.progressPercent || 0}% hoàn thành / {board.overdueCards || 0} quá hạn / {board.members?.length || board.memberCount || 0} thành viên</div>
              </Link>
          ))}
        </div>
      )}
    </section>
  )
}

export default ReportsPage
