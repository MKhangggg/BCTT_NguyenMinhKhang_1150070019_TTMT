import { AlertTriangle, BarChart3, CheckCircle2, CircleDot, Clock3 } from 'lucide-react'

function ReportPanel({ report }) {
  if (!report) return null

  const priorityMap = Object.fromEntries(report.cardsByPriority.map((item) => [item.priority, item.count]))
  const maxColumnCount = Math.max(...report.cardsByColumn.map((column) => column.count), 1)
  const totalPriorityCards = Math.max(...Object.values(priorityMap), 1)
  const priorityLabels = {
    Low: 'Thấp',
    Medium: 'Trung bình',
    High: 'Cao',
  }

  return (
    <div className="report-grid">
      <div className="metric-card"><BarChart3 size={20} /><span>Tổng</span><strong>{report.totalCards}</strong></div>
      <div className="metric-card"><CheckCircle2 size={20} /><span>Hoàn thành</span><strong>{report.completedCards}</strong></div>
      <div className="metric-card"><Clock3 size={20} /><span>Đang làm</span><strong>{report.inProgressCards}</strong></div>
      <div className="metric-card"><AlertTriangle size={20} /><span>Quá hạn</span><strong>{report.overdueCards}</strong></div>

      <section className="report-section">
        <h3>Thẻ theo cột</h3>
        {report.cardsByColumn.map((column) => (
          <div className="report-line report-line-bar" key={column.columnId}>
            <span>{column.columnName}{column.isDone && <em className="done-column-chip">Hoàn thành</em>}</span>
            <div><i style={{ width: `${Math.max(6, (column.count / maxColumnCount) * 100)}%` }} /></div>
            <strong>{column.count}</strong>
          </div>
        ))}
      </section>

      <section className="report-section">
        <h3>Thẻ theo mức ưu tiên</h3>
        {['Low', 'Medium', 'High'].map((priority) => (
          <div className="report-line report-line-bar" key={priority}>
            <span><CircleDot size={14} /> {priorityLabels[priority]}</span>
            <div><i className={`priority-${priority.toLowerCase()}`} style={{ width: `${Math.max(6, ((priorityMap[priority] || 0) / totalPriorityCards) * 100)}%` }} /></div>
            <strong>{priorityMap[priority] || 0}</strong>
          </div>
        ))}
      </section>
    </div>
  )
}

export default ReportPanel
