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
        const summaries = await boardService.getBoard()
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
    const completedColumns = (board.columns || []).filter((column) => column.name.toLowerCase().includes('done'))
    return sum + completedColumns.reduce((count, column) => count + (column.cards?.length || 0), 0)
  }, 0), [boards])
  const totalMembers = boards.reduce((sum, board) => sum + (board.members?.length || board.memberCount || 0), 0)

  if (loading) return <Loading label="Loading reports" />

  return (
    <section className="page stack">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Analytics</span>
          <h2>Reports</h2>
          <p className="muted">Workspace-level overview with links to detailed board reports.</p>
        </div>
      </div>

      <Notice type="error">{error}</Notice>

      <div className="stats-grid">
        <StatCard icon={<FolderKanban size={20} />} label="Board" value={boards.length} hint="co san" tone="blue" />
        <StatCard icon={<BarChart3 size={20} />} label="Cards" value={cards.length} hint="total work" tone="amber" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Done" value={doneCards} hint="completed" tone="green" />
        <StatCard icon={<Users size={20} />} label="Members" value={totalMembers} hint="board memberhips" tone="red" />
      </div>

      <div className="board-grid">
        {boards.map((board) => (
          <Link className="board-card" key={board.id} to={`/boards/${board.id}/reports`}>
            <span className="eyebrow">Board report</span>
            <h3>{board.name}</h3>
            <p>{board.description || 'Chua co mo ta'}</p>
            <div className="board-meta">{board.columns?.length || 0} columns / {board.members?.length || board.memberCount || 0} member</div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default ReportsPage