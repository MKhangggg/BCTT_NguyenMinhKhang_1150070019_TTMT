import { MessageCircle, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Avatar from '../common/Avatar.jsx'
import Loading from '../common/Loading.jsx'
import Notice from '../common/Notice.jsx'
import { getErrorMessage } from '../../services/api'
import { chatService } from '../../services/chatService'
import { useAuth } from '../../hooks/useAuth'

function UserChatPanel({ selectedUser, realtimeEvent, onRead }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    let mounted = true
    if (!selectedUser?.userId) return undefined

    setLoading(true)
    chatService.getDirectMessages(selectedUser.userId)
      .then((items) => {
        if (mounted) {
          setMessages(items)
          onRead?.(selectedUser.userId)
        }
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
  }, [onRead, selectedUser?.userId])

  useEffect(() => {
    const incoming = realtimeEvent?.data?.message
    if (!incoming || !selectedUser?.userId) return
    const currentUserId = Number(user?.id)
    const otherUserId = Number(selectedUser.userId)
    const sameConversation = (
      (Number(incoming.senderId) === currentUserId && Number(incoming.recipientId) === otherUserId)
      || (Number(incoming.senderId) === otherUserId && Number(incoming.recipientId) === currentUserId)
    )
    if (!sameConversation) return

    setMessages((current) => (
      current.some((message) => Number(message.id) === Number(incoming.id))
        ? current
        : [...current, { ...incoming, isMine: Number(incoming.senderId) === currentUserId }]
    ))

    if (Number(incoming.senderId) === otherUserId) {
      onRead?.(otherUserId)
      chatService.getDirectMessages(otherUserId).catch(() => {})
    }
  }, [onRead, realtimeEvent, selectedUser?.userId, user?.id])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (event) => {
    event.preventDefault()
    const content = text.trim()
    if (!content || !selectedUser?.userId || sending) return

    try {
      setSending(true)
      setError('')
      const message = await chatService.sendDirectMessage(selectedUser.userId, { content })
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

  if (!selectedUser) {
    return (
      <section className="direct-chat-panel empty">
        <MessageCircle size={28} />
        <strong>Chọn người dùng để bắt đầu chat</strong>
      </section>
    )
  }

  return (
    <section className="direct-chat-panel">
      <header className="direct-chat-header">
        <Avatar name={selectedUser.fullName} src={selectedUser.avatarUrl} />
        <div>
          <span>Messenger</span>
          <strong>{selectedUser.fullName}</strong>
          <small>{selectedUser.email}</small>
        </div>
      </header>

      <Notice type="error">{error}</Notice>
      {loading ? (
        <Loading label="Đang tải tin nhắn" />
      ) : (
        <div className="direct-chat-list" ref={listRef}>
          {messages.map((message) => {
            const mine = Number(message.senderId) === Number(user?.id) || message.isMine
            return (
              <article className={`direct-chat-message ${mine ? 'is-mine' : ''}`} key={message.id}>
                {!mine && <Avatar name={message.senderName || selectedUser.fullName} src={message.senderAvatarUrl || selectedUser.avatarUrl} size="sm" />}
                <div>
                  <p>{message.content}</p>
                  <small>{message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}</small>
                </div>
              </article>
            )
          })}
          {messages.length === 0 && (
            <div className="empty-inline compact-empty">
              <strong>Chưa có tin nhắn</strong>
              <span>Bắt đầu trao đổi trực tiếp với {selectedUser.fullName}.</span>
            </div>
          )}
        </div>
      )}

      <form className="direct-chat-composer" onSubmit={sendMessage}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={`Nhắn tin cho ${selectedUser.fullName}`}
        />
        <button className="icon-button send-button" type="submit" disabled={sending || !text.trim()} title="Gửi tin nhắn">
          <Send size={16} />
        </button>
      </form>
    </section>
  )
}

export default UserChatPanel
