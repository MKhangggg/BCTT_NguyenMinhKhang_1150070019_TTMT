import { MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Avatar from '../common/Avatar.jsx'
import Loading from '../common/Loading.jsx'
import Notice from '../common/Notice.jsx'
import { getErrorMessage } from '../../services/api'
import { chatService } from '../../services/chatService'
import { useAuth } from '../../hooks/useAuth'

function BoardChatPanel({ boardId, boardName, member = [], realtimeEvent, onClose, embedded = false }) {
  const { user, isSystemAdmin } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)

  const currentRole = useMemo(() => (
    member.find((item) => String(item.userId) === String(user?.id))?.role || null
  ), [member, user?.id])
  const canChat = isSystemAdmin || (currentRole && currentRole !== 'Viewer')

  useEffect(() => {
    let mounted = true
    if (!boardId) return undefined
    setLoading(true)
    chatService.getMessages(boardId)
      .then((items) => {
        if (mounted) setMessages(items)
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
  }, [boardId])

  useEffect(() => {
    if (realtimeEvent?.action !== 'ChatMessageAdded') return
    if (Number(realtimeEvent.boardId) !== Number(boardId)) return
    const incoming = realtimeEvent.data?.message
    if (!incoming) return

    setMessages((current) => (
      current.some((message) => Number(message.id) === Number(incoming.id))
        ? current
        : [...current, incoming]
    ))
  }, [boardId, realtimeEvent])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (event) => {
    event.preventDefault()
    const content = text.trim()
    if (!content || sending || !canChat) return

    try {
      setSending(true)
      setError('')
      const message = await chatService.sendMessage(boardId, { content })
      setMessages((current) => (
        current.some((item) => Number(item.id) === Number(message.id)) ? current : [...current, message]
      ))
      setText('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <aside className={`board-chat-panel ${embedded ? 'is-embedded' : ''}`}>
      <header className="board-chat-header">
        <div>
          <span><MessageCircle size={17} /> Messenger</span>
          <strong>{boardName ? `Chat · ${boardName}` : 'Chat dự án'}</strong>
        </div>
        {onClose && (
          <button className="icon-button" type="button" onClick={onClose} title="Đóng chat">
            <X size={18} />
          </button>
        )}
      </header>

      <Notice type="error">{error}</Notice>
      {loading ? (
        <Loading label="Đang tải tin nhắn" />
      ) : (
        <div className="board-chat-list" ref={listRef}>
          {messages.map((message) => {
            const mine = String(message.userId) === String(user?.id)
            return (
              <article className={`board-chat-message ${mine ? 'is-mine' : ''}`} key={message.id}>
                {!mine && <Avatar name={message.userName} src={message.avatarUrl} size="sm" />}
                <div>
                  <header>
                    <strong>{mine ? 'Bạn' : message.userName}</strong>
                    <small>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</small>
                  </header>
                  <p>{message.content}</p>
                </div>
              </article>
            )
          })}
          {messages.length === 0 && (
            <div className="empty-inline compact-empty">
              <strong>Chưa có tin nhắn</strong>
              <span>Bắt đầu trao đổi với nhóm dự án.</span>
            </div>
          )}
        </div>
      )}

      <form className="board-chat-composer" onSubmit={sendMessage}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={canChat ? 'Nhập tin nhắn...' : 'Viewer chỉ có quyền xem chat'}
          disabled={!canChat}
        />
        <button className="icon-button send-button" type="submit" disabled={sending || !text.trim() || !canChat} title="Gửi tin nhắn">
          <Send size={16} />
        </button>
      </form>
    </aside>
  )
}

export default BoardChatPanel
