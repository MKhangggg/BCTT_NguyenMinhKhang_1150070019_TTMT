function Loading({ label = 'Đang tải' }) {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>{label}</span>
      <div className="loading-skeleton-stack" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

export default Loading
