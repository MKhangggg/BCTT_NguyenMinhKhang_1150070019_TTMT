import { useCallback, useEffect, useState } from 'react'
import { Archive, AtSign, CalendarClock, CheckSquare, CircleDot, Clock3, FileText, FileUp, Flag, Hash, Image, ListChecks, MessageSquarePlus, MoreVertical, Paperclip, Plus, Save, Send, Smile, Sparkles, Tag, Trash2, UserRound, X } from 'lucide-react'
import Avatar from '../common/Avatar.jsx'
import Loading from '../common/Loading.jsx'
import Notice from '../common/Notice.jsx'
import { cardService } from '../../services/cardService'
import { commentService } from '../../services/commentService'
import { getErrorMessage } from '../../services/api'
import { useUI } from '../../context/UIContext.jsx'

const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

const priorityOptions = [
  { value: 'Low', label: 'Thấp' },
  { value: 'Medium', label: 'Trung bình' },
  { value: 'High', label: 'Cao' },
]

const priorityLabels = Object.fromEntries(priorityOptions.map((item) => [item.value, item.label]))
const labelPalette = ['#2563eb', '#7c3aed', '#f97316', '#10b981', '#ef4444', '#0f766e']

const parseLabelNames = (value) => value
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean)

function CardDetailModal({ cardId, member = [], onClose, onSaved, onDeleted }) {
  const { confirm, showToast } = useUI()
  const [card, setCard] = useState(null)
  const [comments, setComments] = useState([])
  const [form, setForm] = useState(null)
  const [labelText, setLabelText] = useState('')
  const [newLabelText, setNewLabelText] = useState('')
  const [checklistText, setChecklistText] = useState('')
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [checklistDrafts, setChecklistDrafts] = useState({})

  const setFieldError = (field, message) => {
    setFieldErrors((current) => ({ ...current, [field]: message }))
  }

  const clearFieldError = (field) => {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [cardData, commentData] = await Promise.all([
        cardService.getCard(cardId),
        commentService.getComments(cardId),
      ])
      setCard(cardData)
      setComments(commentData)
      setForm({
        title: cardData.title,
        description: cardData.description || '',
        priority: cardData.priority,
        dueDate: toInputDate(cardData.dueDate),
        position: cardData.position,
        isArchived: cardData.isArchived,
      })
      setLabelText((cardData.labels || []).map((label) => label.name).join(', '))
      setChecklistDrafts(Object.fromEntries((cardData.checklistItems || []).map((item) => [item.id, item.content])))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [cardId])

  useEffect(() => {
    load()
  }, [load])

  const buildLabelPayload = (nextLabelText) => parseLabelNames(nextLabelText)
    .map((name, index) => ({
      name,
      color: (card?.labels || []).find((label) => label.name === name)?.color || labelPalette[index % labelPalette.length],
    }))

  const saveCardDraft = async ({ nextForm = form, nextLabelText = labelText, closeAfterSave = false, notify = false } = {}) => {
    if (!nextForm || saving) return false
    const title = nextForm.title.trim()
    if (!title) {
      setFieldError('title', 'Tiêu đề là bắt buộc.')
      setError('Vui lòng nhập tiêu đề.')
      return false
    }

    try {
      setSaving(true)
      setError('')
      clearFieldError('title')
      const updatedCard = await cardService.updateCard(cardId, {
        title,
        description: nextForm.description,
        assigneeId: card.assigneeId ?? null,
        priority: nextForm.priority,
        dueDate: nextForm.dueDate ? new Date(nextForm.dueDate).toISOString() : null,
        position: nextForm.position,
        isArchived: nextForm.isArchived,
        labels: buildLabelPayload(nextLabelText),
      })
      setCard(updatedCard)
      setForm({
        title: updatedCard.title,
        description: updatedCard.description || '',
        priority: updatedCard.priority,
        dueDate: toInputDate(updatedCard.dueDate),
        position: updatedCard.position,
        isArchived: updatedCard.isArchived,
      })
      setLabelText((updatedCard.labels || []).map((label) => label.name).join(', '))
      setChecklistDrafts(Object.fromEntries((updatedCard.checklistItems || []).map((item) => [item.id, item.content])))
      onSaved()
      if (notify) {
        showToast({ type: 'success', title: 'Đã lưu thẻ', message: `"${updatedCard.title}" đã được cập nhật.` })
      }
      if (closeAfterSave) onClose()
      return true
    } catch (err) {
      setError(getErrorMessage(err))
      return false
    } finally {
      setSaving(false)
    }
  }

  const saveCard = async (event) => {
    event?.preventDefault()
    await saveCardDraft({ closeAfterSave: false, notify: true })
  }

  const handleInlineSaveKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    saveCardDraft()
  }

  const addChecklist = async (event) => {
    event?.preventDefault()
    const content = checklistText.trim()
    if (!content) {
      setFieldError('checklist', 'Nhập nội dung mục việc rồi nhấn Enter.')
      return
    }
    try {
      setError('')
      clearFieldError('checklist')
      await cardService.addChecklist(cardId, { content, position: null })
      setChecklistText('')
      showToast({ type: 'success', title: 'Đã thêm mục việc', message: content })
      await load()
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const updateChecklist = async (item, patch) => {
    try {
      setError('')
      await cardService.updateChecklist(item.id, { ...item, ...patch })
      await load()
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const commitChecklistContent = async (item) => {
    const content = (checklistDrafts[item.id] ?? item.content).trim()
    if (!content) {
      setFieldError(`checklist-${item.id}`, 'Mục việc không được để trống.')
      return
    }
    clearFieldError(`checklist-${item.id}`)
    if (content === item.content) return
    await updateChecklist(item, { content })
  }

  const handleChecklistKeyDown = (event, item) => {
    if (event.key === 'Escape') {
      setChecklistDrafts((current) => ({ ...current, [item.id]: item.content }))
      clearFieldError(`checklist-${item.id}`)
      return
    }
    if (event.key !== 'Enter') return
    event.preventDefault()
    commitChecklistContent(item)
  }

  const deleteChecklist = async (id) => {
    const ok = await confirm({
      title: 'Xóa mục việc?',
      message: 'Mục việc này sẽ bị xóa khỏi thẻ.',
      confirmText: 'Xóa mục',
    })
    if (!ok) return

    try {
      setError('')
      await cardService.deleteChecklist(id)
      showToast({ type: 'success', title: 'Đã xóa mục việc' })
      await load()
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const addComment = async (event) => {
    event?.preventDefault()
    const content = commentText.trim()
    if (!content) {
      setFieldError('comment', 'Nhập nội dung bình luận rồi nhấn Enter.')
      return
    }
    try {
      setError('')
      clearFieldError('comment')
      await commentService.addComment(cardId, { content })
      setCommentText('')
      showToast({ type: 'success', title: 'Đã thêm bình luận' })
      await load()
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const deleteComment = async (commentId) => {
    const ok = await confirm({
      title: 'Xóa bình luận?',
      message: 'Bình luận này sẽ bị xóa khỏi thẻ.',
      confirmText: 'Xóa bình luận',
    })
    if (!ok) return

    try {
      setError('')
      await commentService.deleteComment(commentId)
      showToast({ type: 'success', title: 'Đã xóa bình luận' })
      await load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const archiveCard = async () => {
    const ok = await confirm({
      title: 'Lưu trữ thẻ?',
      message: `Thẻ "${card?.title || 'này'}" sẽ được chuyển vào trạng thái lưu trữ.`,
      confirmText: 'Lưu trữ',
      tone: 'warning',
    })
    if (!ok) return

    try {
      setError('')
      await cardService.archiveCard(cardId)
      showToast({ type: 'success', title: 'Đã lưu trữ thẻ', message: card?.title })
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const deleteCard = async () => {
    const ok = await confirm({
      title: 'Xóa thẻ?',
      message: `Thẻ "${card?.title || 'này'}" sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.`,
      confirmText: 'Xóa thẻ',
    })
    if (!ok) return

    try {
      setError('')
      await cardService.deleteCard(cardId)
      showToast({ type: 'success', title: 'Đã xóa thẻ', message: card?.title })
      onDeleted()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const labels = parseLabelNames(labelText)
  const completedChecklist = card?.checklistItems?.filter((item) => item.isCompleted).length || 0
  const checklistTotal = card?.checklistItems?.length || 0
  const checklistPercent = checklistTotal ? Math.round((completedChecklist / checklistTotal) * 100) : 0
  const creator = member.find((item) => String(item.userId) === String(card?.createdById))
  const creatorName = card?.createdByName || creator?.fullName || 'Người dùng không xác định'
  const dueBadgeText = form?.dueDate ? `Hạn ${new Date(form.dueDate).toLocaleDateString()}` : 'Chưa có hạn'
  const titleInvalid = Boolean(fieldErrors.title || !form?.title?.trim())

  const addLabel = async (event) => {
    event?.preventDefault()
    if (saving) return
    const name = newLabelText.trim()
    if (!name) {
      setFieldError('label', 'Nhập tên nhãn rồi nhấn Enter.')
      return
    }
    if (labels.some((label) => label.toLowerCase() === name.toLowerCase())) {
      setFieldError('label', 'Nhãn này đã có trong thẻ.')
      return
    }
    clearFieldError('label')
    const previousLabelText = labelText
    const nextLabelText = [...labels, name].join(', ')
    setLabelText(nextLabelText)
    setNewLabelText('')
    const saved = await saveCardDraft({ nextLabelText })
    if (!saved) {
      setLabelText(previousLabelText)
      return
    }
    showToast({ type: 'success', title: 'Đã thêm nhãn', message: name })
  }

  const removeLabel = async (name) => {
    if (saving) return
    const previousLabelText = labelText
    const nextLabelText = labels.filter((label) => label !== name).join(', ')
    setLabelText(nextLabelText)
    const saved = await saveCardDraft({ nextLabelText })
    if (!saved) {
      setLabelText(previousLabelText)
      return
    }
    showToast({ type: 'success', title: 'Đã xóa nhãn', message: name })
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-panel card-modal">
        <header className="modal-header">
          <h2>Chi tiết thẻ</h2>
          <button className="icon-button" type="button" onClick={onClose} title="Đóng"><X size={18} /></button>
        </header>

        {loading && <Loading label="Đang tải thẻ" />}
        <Notice type="error">{error}</Notice>

        {!loading && card && form && (
          <div className="task-detail">
            <header className="task-detail-header">
              <div className="task-title-block">
                <div className="eyebrow-row">
                  <span className="eyebrow">Chi tiết thẻ</span>
                  <span className="required-pill">Tiêu đề bắt buộc</span>
                </div>
                <input
                  className={`task-title-input ${titleInvalid ? 'is-invalid' : ''}`}
                  value={form.title}
                  required
                  aria-invalid={titleInvalid}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value })
                    clearFieldError('title')
                  }}
                  onKeyDown={handleInlineSaveKeyDown}
                />
                {fieldErrors.title && <span className="field-error-text">{fieldErrors.title}</span>}
                <div className="task-chip-row">
                  <span className={`task-chip priority-${form.priority.toLowerCase()}`}><Flag size={13} /> {priorityLabels[form.priority] || form.priority}</span>
                  {labels.map((label, index) => (
                    <button className="task-chip label-chip" type="button" key={label} style={{ '--chip': labelPalette[index % labelPalette.length] }} onClick={() => removeLabel(label)} title="Xóa nhãn">
                      <Tag size={12} /> {label} <X size={12} />
                    </button>
                  ))}
                  <span className="task-chip due-chip-detail"><CalendarClock size={13} /> {dueBadgeText}</span>
                  <span className="task-chip completed-chip"><CheckSquare size={13} /> {completedChecklist}/{checklistTotal} hoàn thành</span>
                  <span className="task-chip status-chip-detail"><CircleDot size={13} /> {card.columnName || 'Cột hiện tại'}</span>
                </div>
              </div>
              <div className="task-header-actions">
                <button className="primary-button compact" type="button" onClick={saveCard} disabled={saving}><Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu'}</button>
                <button className="icon-button" type="button" onClick={archiveCard} title="Lưu trữ"><Archive size={17} /></button>
                <button className="icon-button danger" type="button" onClick={deleteCard} title="Xóa"><Trash2 size={17} /></button>
                <button className="icon-button" type="button" title="Thêm tùy chọn"><MoreVertical size={17} /></button>
                <button className="icon-button" type="button" onClick={onClose} title="Đóng"><X size={18} /></button>
              </div>
            </header>

            <div className="task-detail-grid">
              <main className="task-main stack">
                <section className="task-section">
                  <h3><ListChecks size={18} /> Mô tả</h3>
                  <div className="description-editor-shell">
                    <div className="description-toolbar"><span>Định dạng</span><span>@nhắc tên</span><span>/lệnh</span></div>
                    <textarea
                      className="task-description"
                      rows="6"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      onKeyDown={(event) => {
                        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                          event.preventDefault()
                          saveCardDraft()
                        }
                      }}
                      placeholder="Thêm mô tả thẻ, tiêu chí hoàn thành hoặc bối cảnh dự án..."
                    />
                  </div>
                </section>

                <section className="task-section attachments-empty">
                  <div className="task-section-head"><h3><FileUp size={18} /> Tệp đính kèm</h3><button className="ghost-button compact" type="button"><Paperclip size={15} /> Thêm</button></div>
                  <div className="attachment-grid">
                    <button className="attachment-card image-preview" type="button"><span><Image size={20} /></span><div><strong>Xem-truoc-thiet-ke.png</strong><small>Xem trước ảnh · 1.8 MB</small></div></button>
                    <button className="attachment-card doc-preview" type="button"><span><FileText size={20} /></span><div><strong>Tóm tắt thẻ.pdf</strong><small>Tài liệu · 420 KB</small></div></button>
                    <button className="attachment-card upload-card" type="button"><span><Plus size={20} /></span><div><strong>Thêm tệp đính kèm</strong><small>Tải tệp, liên kết hoặc ảnh chụp màn hình</small></div></button>
                  </div>
                </section>

                <section className="task-section">
                  <div className="task-section-head">
                    <h3><CheckSquare size={18} /> Danh sách việc ({completedChecklist}/{checklistTotal})</h3>
                    <strong>{checklistPercent}%</strong>
                  </div>
                  <div className="checklist-progress"><span style={{ width: `${checklistPercent}%` }} /></div>
                  <div className="checklist modern-checklist">
                    {card.checklistItems.map((item) => (
                      <div className="checklist-row modern-check-row" key={item.id}>
                        <label className="custom-check"><input type="checkbox" checked={item.isCompleted} onChange={(e) => updateChecklist(item, { isCompleted: e.target.checked })} /><span><CheckSquare size={13} /></span></label>
                        <input
                          className={`${item.isCompleted ? 'is-done' : ''} ${fieldErrors[`checklist-${item.id}`] ? 'is-invalid' : ''}`}
                          value={checklistDrafts[item.id] ?? item.content}
                          onChange={(e) => {
                            setChecklistDrafts((current) => ({ ...current, [item.id]: e.target.value }))
                            clearFieldError(`checklist-${item.id}`)
                          }}
                          onKeyDown={(event) => handleChecklistKeyDown(event, item)}
                          onBlur={() => commitChecklistContent(item)}
                        />
                        <button className="icon-button danger" type="button" title="Xóa mục việc" onClick={() => deleteChecklist(item.id)}><Trash2 size={14} /></button>
                        {fieldErrors[`checklist-${item.id}`] && <span className="field-error-text checklist-row-error">{fieldErrors[`checklist-${item.id}`]}</span>}
                      </div>
                    ))}
                    {card.checklistItems.length === 0 && <div className="empty-inline compact-empty"><strong>Chưa có danh sách việc</strong><span>Chia thẻ này thành các bước nhỏ hơn.</span></div>}
                  </div>
                  <form className="inline-form" onSubmit={addChecklist}>
                    <input
                      className={fieldErrors.checklist ? 'is-invalid' : ''}
                      value={checklistText}
                      onChange={(e) => {
                        setChecklistText(e.target.value)
                        clearFieldError('checklist')
                      }}
                      placeholder="Thêm mục việc"
                    />
                    <button className="icon-button" type="submit" title="Thêm mục việc"><Plus size={16} /></button>
                  </form>
                  {fieldErrors.checklist && <span className="field-error-text">{fieldErrors.checklist}</span>}
                </section>

                <section className="task-section">
                  <h3><Clock3 size={18} /> Hoạt động</h3>
                  <div className="activity-timeline">
                    {card.activityLogs.map((activity) => (
                      <div className="timeline-item" key={activity.id}>
                        <Avatar name={activity.userName} src={activity.avatarUrl} size="sm" />
                        <div><strong>{activity.userName}</strong><p>{activity.description}</p><small>{activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Gần đây'}</small></div>
                      </div>
                    ))}
                    {card.activityLogs.length === 0 && <div className="empty-inline compact-empty"><strong>Chưa có hoạt động</strong><span>Các thay đổi sẽ hiển thị tại đây.</span></div>}
                  </div>
                </section>
              </main>

              <aside className="task-sidebar stack">
                <section className="task-section task-properties">
                  <h3><Sparkles size={18} /> Thuộc tính</h3>
                  <div className="property-card"><span><UserRound size={15} /> Người tạo</span><div className="assignee-preview"><Avatar name={creatorName} src={creator?.avatarUrl} size="sm" /><strong>{creatorName}</strong></div></div>
                  <div className="property-card">
                    <span><CalendarClock size={15} /> Hạn</span>
                    <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} onKeyDown={handleInlineSaveKeyDown} />
                  </div>
                  <div className="property-card">
                    <span><Flag size={15} /> Ưu tiên</span>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} onKeyDown={handleInlineSaveKeyDown}>
                      {priorityOptions.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
                    </select>
                  </div>
                  <div className={`property-card ${fieldErrors.label ? 'is-invalid' : ''}`}>
                    <span><Tag size={15} /> Nhãn</span>
                    <div className="sidebar-labels">{labels.map((label, index) => <button className="task-chip label-chip" type="button" key={label} style={{ '--chip': labelPalette[index % labelPalette.length] }} onClick={() => removeLabel(label)}>{label}<X size={11} /></button>)}</div>
                    <form className="label-add-row" onSubmit={addLabel}>
                      <input
                        className={fieldErrors.label ? 'is-invalid' : ''}
                        value={newLabelText}
                        onChange={(e) => {
                          setNewLabelText(e.target.value)
                          clearFieldError('label')
                        }}
                        placeholder="Giao diện"
                      />
                      <button className="icon-button" type="submit" title="Thêm nhãn" disabled={saving}><Plus size={15} /></button>
                    </form>
                    {fieldErrors.label && <span className="field-error-text">{fieldErrors.label}</span>}
                  </div>
                  <div className="property-line"><span>Trạng thái</span><strong>{card.columnName || 'Cột hiện tại'}</strong></div>
                  <div className="property-line"><span>Mã thẻ</span><strong><Hash size={13} /> {card.id}</strong></div>
                  <div className="task-progress-card">
                    <span>Tiến độ danh sách việc</span>
                    <strong>{checklistPercent}%</strong>
                    <div className="checklist-progress"><span style={{ width: `${checklistPercent}%` }} /></div>
                  </div>
                </section>
              </aside>

              <aside className="task-comments-column">
                <section className="task-section comments-panel">
                  <h3><MessageSquarePlus size={18} /> Bình luận</h3>
                  <form className={`comment-composer ${fieldErrors.comment ? 'is-invalid' : ''}`} onSubmit={addComment}>
                    <button className="icon-button subtle" type="button" title="Nhắc tên"><AtSign size={16} /></button>
                    <input
                      className={fieldErrors.comment ? 'is-invalid' : ''}
                      value={commentText}
                      onChange={(e) => {
                        setCommentText(e.target.value)
                        clearFieldError('comment')
                      }}
                      placeholder="Viết bình luận..."
                    />
                    <button className="icon-button subtle" type="button" title="Biểu tượng cảm xúc"><Smile size={16} /></button>
                    <button className="icon-button send-button" type="submit" title="Thêm bình luận"><Send size={16} /></button>
                  </form>
                  {fieldErrors.comment && <span className="field-error-text">{fieldErrors.comment}</span>}
                  <div className="comment-list modern-comments">
                    {comments.map((comment) => (
                      <div className="comment-row modern-comment" key={comment.id}>
                        <Avatar name={comment.userName} src={comment.avatarUrl} size="sm" />
                        <div><header><strong>{comment.userName}</strong><small>Vừa xong</small></header><p>{comment.content}</p><footer><button type="button">Bày tỏ cảm xúc</button><button type="button">Trả lời</button></footer></div>
                        <button className="icon-button danger" type="button" title="Xóa bình luận" onClick={() => deleteComment(comment.id)}><Trash2 size={14} /></button>
                      </div>
                    ))}
                    {comments.length === 0 && <div className="empty-inline compact-empty"><strong>Chưa có bình luận</strong><span>Bắt đầu trao đổi.</span></div>}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default CardDetailModal
