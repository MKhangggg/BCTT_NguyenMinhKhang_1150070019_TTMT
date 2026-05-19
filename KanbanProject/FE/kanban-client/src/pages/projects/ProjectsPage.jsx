import { useEffect, useMemo, useState } from 'react'
import { FolderKanban, Globe2, Lock, Plus, Search, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import BoardCard from '../../components/board/BoardCard.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Notice from '../../components/common/Notice.jsx'
import { useAuth } from '../../hooks/useAuth'
import { boardService } from '../../services/boardService'
import { getErrorMessage } from '../../services/api'

function ProjectsPage() {
  const { isSystemAdmin } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [visibility, setVisibility] = useState('All')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    boardService.getBoards()
      .then((items) => {
        if (mounted) setProjects(items)
      })
      .catch((err) => {
        if (mounted) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const filteredProjects = useMemo(() => {
    const text = query.trim().toLowerCase()
    return projects.filter((project) => {
      const matchesQuery = !text
        || project.name.toLowerCase().includes(text)
        || (project.projectCode || '').toLowerCase().includes(text)
        || (project.organizationUnitName || '').toLowerCase().includes(text)
        || (project.summary || '').toLowerCase().includes(text)
        || (project.description || '').toLowerCase().includes(text)
      const matchesVisibility = visibility === 'All'
        || (visibility === 'Public' && project.isPublic)
        || (visibility === 'Private' && !project.isPublic)
      return matchesQuery && matchesVisibility
    })
  }, [projects, query, visibility])

  const publicCount = projects.filter((project) => project.isPublic).length
  const memberTotal = projects.reduce((sum, project) => sum + Number(project.memberCount || 0), 0)

  return (
    <section className="page stack projects-page">
      <div className="projects-hero">
        <div>
          <span className="eyebrow">Dự án</span>
          <h2>Tổng hợp dự án Kanban</h2>
          <p>Xem mã dự án, tóm tắt, tài liệu và mở nhanh bảng làm việc mà không làm dashboard bị rối.</p>
        </div>
        {isSystemAdmin && (
          <Link className="primary-button compact" to="/">
            <Plus size={16} /> Tạo dự án
          </Link>
        )}
      </div>

      <Notice type="error">{error}</Notice>

      <div className="projects-stat-strip">
        <article><FolderKanban size={18} /><span>Dự án</span><strong>{projects.length}</strong></article>
        <article><Globe2 size={18} /><span>Công khai</span><strong>{publicCount}</strong></article>
        <article><Lock size={18} /><span>Riêng tư</span><strong>{projects.length - publicCount}</strong></article>
        <article><Users size={18} /><span>Lượt thành viên</span><strong>{memberTotal}</strong></article>
      </div>

      <div className="projects-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo mã, tên hoặc tóm tắt dự án" />
        </div>
        <div className="segmented-control">
          <button className={visibility === 'All' ? 'active' : ''} type="button" onClick={() => setVisibility('All')}>Tất cả</button>
          <button className={visibility === 'Public' ? 'active' : ''} type="button" onClick={() => setVisibility('Public')}>Công khai</button>
          <button className={visibility === 'Private' ? 'active' : ''} type="button" onClick={() => setVisibility('Private')}>Riêng tư</button>
        </div>
      </div>

      {loading ? (
        <div className="board-grid">
          {[0, 1, 2].map((item) => <div className="skeleton-card" key={item} />)}
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={24} />}
          title="Không có dự án phù hợp"
          description="Thử đổi bộ lọc hoặc tạo dự án mới từ dashboard."
        />
      ) : (
        <div className="board-grid projects-grid">
          {filteredProjects.map((project, index) => (
            <BoardCard key={project.id} board={project} index={index} />
          ))}
        </div>
      )}
    </section>
  )
}

export default ProjectsPage
