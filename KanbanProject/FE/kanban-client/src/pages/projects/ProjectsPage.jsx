import { useCallback, useEffect, useMemo, useState } from 'react'
import { FolderKanban, Globe2, Lock, Plus, Search, Users, X } from 'lucide-react'
import BoardCard from '../../components/board/BoardCard.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Notice from '../../components/common/Notice.jsx'
import { useAuth } from '../../hooks/useAuth'
import { useUI } from '../../context/UIContext.jsx'
import { boardService } from '../../services/boardService'
import { organizationService } from '../../services/organizationService'
import { getErrorMessage } from '../../services/api'
import { createWorkspaceRealtimeConnection } from '../../services/boardRealtimeService'

const blankForm = { projectCode: '', name: '', description: '', summary: '', organizationUnitId: '', isPublic: false }

function ProjectsPage() {
  const { isSystemAdmin } = useAuth()
  const { showToast } = useUI()
  const [projects, setProjects] = useState([])
  const [organizationUnits, setOrganizationUnits] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(blankForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [visibility, setVisibility] = useState('All')

  const loadProjects = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true)
      const items = await boardService.getBoards()
      setProjects(items)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  const loadOrganizationUnits = useCallback(async () => {
    if (!isSystemAdmin) return
    try {
      setOrganizationUnits(await organizationService.getUnitOptions())
    } catch {
      setOrganizationUnits([])
    }
  }, [isSystemAdmin])

  useEffect(() => {
    loadProjects()
    loadOrganizationUnits()
  }, [loadOrganizationUnits, loadProjects])

  useEffect(() => {
    const connection = createWorkspaceRealtimeConnection({
      onBoardListChanged: (event) => {
        if (event?.action?.startsWith('Project')) {
          loadProjects({ showLoading: false })
        }
      },
    })

    connection.start().catch(() => {})
    return () => {
      connection.stop().catch(() => {})
    }
  }, [loadProjects])

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

  const openCreateModal = () => {
    setForm(blankForm)
    setFieldErrors({})
    setError('')
    setCreateOpen(true)
    loadOrganizationUnits()
  }

  const createProject = async (event) => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setFieldErrors({ name: 'Vui lòng nhập tên dự án.' })
      return
    }

    try {
      setSaving(true)
      setError('')
      await boardService.createBoard({
        ...form,
        name,
        projectCode: form.projectCode.trim() || null,
        description: form.description.trim() || null,
        summary: form.summary.trim() || null,
        organizationUnitId: form.organizationUnitId ? Number(form.organizationUnitId) : null,
      })
      showToast({ type: 'success', title: 'Đã tạo dự án', message: name })
      setCreateOpen(false)
      setForm(blankForm)
      setFieldErrors({})
      await loadProjects({ showLoading: false })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page stack projects-page">
      <div className="projects-hero">
        <div>
          <span className="eyebrow">Dự án</span>
          <h2>Tổng hợp dự án Kanban</h2>
          <p>Xem mã dự án, tóm tắt, tài liệu và mở nhanh bảng làm việc mà không làm dashboard bị rối.</p>
        </div>
        {isSystemAdmin && (
          <button className="primary-button compact" type="button" onClick={openCreateModal}>
            <Plus size={16} /> Tạo dự án
          </button>
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
          description="Thử đổi bộ lọc hoặc tạo dự án mới từ nút phía trên."
        />
      ) : (
        <div className="board-grid projects-grid">
          {filteredProjects.map((project, index) => (
            <BoardCard key={project.id} board={project} index={index} />
          ))}
        </div>
      )}

      {createOpen && (
        <div className="modal-backdrop">
          <section className="modal-panel create-project-modal">
            <header className="modal-header">
              <h2>Tạo dự án mới</h2>
              <button className="icon-button" type="button" onClick={() => setCreateOpen(false)} title="Đóng">
                <X size={18} />
              </button>
            </header>

            <form className="project-modal-form" onSubmit={createProject}>
              <div className="form-grid two">
                <label>
                  Mã dự án
                  <input
                    value={form.projectCode}
                    onChange={(event) => setForm({ ...form, projectCode: event.target.value })}
                    placeholder="VD: PRJ-001"
                  />
                </label>
                <label>
                  Tên dự án
                  <input
                    className={fieldErrors.name ? 'is-invalid' : ''}
                    value={form.name}
                    onChange={(event) => {
                      setForm({ ...form, name: event.target.value })
                      if (fieldErrors.name) setFieldErrors({})
                    }}
                    placeholder="Nhập tên dự án"
                  />
                  {fieldErrors.name && <span className="field-error-text">{fieldErrors.name}</span>}
                </label>
              </div>

              <label>
                Mô tả ngắn
                <input
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Mục tiêu chính của dự án"
                />
              </label>

              <label>
                Đơn vị phụ trách
                <select value={form.organizationUnitId} onChange={(event) => setForm({ ...form, organizationUnitId: event.target.value })}>
                  <option value="">Chưa gắn đơn vị</option>
                  {organizationUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.type === 'Team' ? 'Team' : 'Phòng ban'} · {unit.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tóm tắt dự án
                <textarea
                  value={form.summary}
                  onChange={(event) => setForm({ ...form, summary: event.target.value })}
                  placeholder="Tóm tắt phạm vi, mục tiêu hoặc ghi chú tài liệu"
                  rows={4}
                />
              </label>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(event) => setForm({ ...form, isPublic: event.target.checked })}
                />
                Công khai
              </label>

              <div className="modal-actions">
                <button className="ghost-button compact" type="button" onClick={() => setCreateOpen(false)}>Hủy</button>
                <button className="primary-button compact" type="submit" disabled={saving}>
                  <Plus size={16} /> {saving ? 'Đang tạo...' : 'Tạo dự án'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default ProjectsPage
