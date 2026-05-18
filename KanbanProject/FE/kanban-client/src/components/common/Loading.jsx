function Loading({ label = 'Đang tải' }) {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  )
}

export default Loading
