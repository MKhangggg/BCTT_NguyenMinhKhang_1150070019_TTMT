function Skeleton({ className = '' }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />
}

export function DashboardSkeleton() {
  return (
    <section className="page stack">
      <div className="skeleton skeleton-hero" />
      <div className="stats-grid">
        {[0, 1, 2, 3].map((item) => <div className="skeleton skeleton-stat" key={item} />)}
      </div>
      <div className="skeleton-row">
        <Skeleton className="skeleton-title" />
        <Skeleton className="skeleton-search" />
      </div>
      <div className="board-grid">
        {[0, 1, 2].map((item) => <div className="skeleton skeleton-board-card" key={item} />)}
      </div>
    </section>
  )
}

export function BoardSkeleton() {
  return (
    <section className="board-page">
      <div className="skeleton skeleton-toolbar" />
      <div className="board-insights">
        {[0, 1, 2].map((item) => <div className="skeleton skeleton-stat" key={item} />)}
      </div>
      <div className="kanban-board skeleton-kanban-board">
        {[0, 1, 2, 3].map((column) => (
          <div className="skeleton-column" key={column}>
            <Skeleton className="skeleton-column-title" />
            <Skeleton className="skeleton-card-line" />
            <Skeleton className="skeleton-card-line short" />
            <Skeleton className="skeleton-card-line" />
          </div>
        ))}
      </div>
    </section>
  )
}

export default Skeleton
