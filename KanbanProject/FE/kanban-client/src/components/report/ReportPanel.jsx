import { AlertTriangle, BarChart3, CheckCircle2, CircleDot, Clock3 } from 'lucide-react'

function ReportPanel({ report }) {
  if (!report) return null

  const priorityMap = Object.fromEntries(report.cardsByPriority.map((item) => [item.priority, item.count]))
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
          <div className="report-line" key={column.columnId}>
            <span>{column.columnName}</span>
            <strong>{column.count}</strong>
          </div>
        ))}
      </section>

      <section className="report-section">
        <h3>Thẻ theo mức ưu tiên</h3>
        {['Low', 'Medium', 'High'].map((priority) => (
          <div className="report-line" key={priority}>
            <span><CircleDot size={14} /> {priorityLabels[priority]}</span>
            <strong>{priorityMap[priority] || 0}</strong>
          </div>
        ))}
      </section>
    </div>
  )
}

export default ReportPanel
