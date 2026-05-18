function StatCard({ icon, label, value, hint, tone = 'blue' }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <span className="stat-icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </div>
  )
}

export default StatCard
