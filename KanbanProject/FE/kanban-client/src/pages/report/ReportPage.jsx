import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Loading from '../../components/common/Loading.jsx'
import Notice from '../../components/common/Notice.jsx'
import ReportPanel from '../../components/report/ReportPanel.jsx'
import { boardService } from '../../services/boardService'
import { reportService } from '../../services/reportService'
import { getErrorMessage } from '../../services/api'

function ReportPage() {
  const { boardId } = useParams()
  const [board, setBoard] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      boardService.getBoard(boardId),
      reportService.getBoardSummary(boardId),
    ])
      .then(([boardData, reportData]) => {
        setBoard(boardData)
        setReport(reportData)
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [boardId])

  if (loading) return <Loading label="Loading report" />

  return (
    <section className="page stack">
      <Link className="ghost-button compact self-start" to={`/boards/${boardId}`}><ArrowLeft size={16} /> Back</Link>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Report</span>
          <h2>{board?.name || 'Board report'}</h2>
        </div>
      </div>
      <Notice type="error">{error}</Notice>
      <ReportPanel report={report} />
    </section>
  )
}

export default ReportPage
