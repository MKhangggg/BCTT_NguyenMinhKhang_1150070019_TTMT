function Notice({ type = 'info', children }) {
  if (!children) return null
  return <div className={`notice notice-${type}`}>{children}</div>
}

export default Notice
