import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Search, UserRound } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import Avatar from '../../components/common/Avatar.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loading from '../../components/common/Loading.jsx'
import Notice from '../../components/common/Notice.jsx'
import UserChatPanel from '../../components/chat/UserChatPanel.jsx'
import { getErrorMessage } from '../../services/api'
import { createWorkspaceRealtimeConnection } from '../../services/boardRealtimeService'
import { chatService } from '../../services/chatService'
import { useAuth } from '../../hooks/useAuth'

const realtimeLabels = {
  connecting: 'Đang kết nối',
  connected: 'Đã kết nối',
  reconnecting: 'Đang kết nối lại',
  disconnected: 'Mất kết nối',
  error: 'Lỗi kết nối',
}

function ChatPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [chatUsers, setChatUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(Number(searchParams.get('userId')) || null)
  const [realtimeEvent, setRealtimeEvent] = useState(null)
  const [realtimeStatus, setRealtimeStatus] = useState('connecting')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const selectedUserIdRef = useRef(selectedUserId)

  const loadUsers = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true)
      const items = await chatService.getUsers()
      setChatUsers(items)
      setSelectedUserId((current) => {
        const routeUserId = Number(searchParams.get('userId')) || null
        if (routeUserId && items.some((item) => Number(item.userId) === routeUserId)) return routeUserId
        if (current && items.some((item) => Number(item.userId) === Number(current))) return current
        return items[0]?.userId || null
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    selectedUserIdRef.current = selectedUserId
  }, [selectedUserId])

  useEffect(() => {
    const connection = createWorkspaceRealtimeConnection({
      onStatusChanged: setRealtimeStatus,
      onDirectMessageChanged: (event) => {
        const message = event?.data?.message
        if (!message) return
        const currentUserId = Number(user?.id)
        const otherUserId = Number(message.senderId) === currentUserId ? Number(message.recipientId) : Number(message.senderId)
        setRealtimeEvent(event)
        setChatUsers((items) => items.map((item) => {
          if (Number(item.userId) !== otherUserId) return item
          const incomingUnread = Number(message.recipientId) === currentUserId
            && Number(selectedUserIdRef.current) !== otherUserId
            && Number(message.senderId) !== currentUserId
          return {
            ...item,
            lastMessage: message.content,
            lastMessageAt: message.createdAt,
            unreadCount: incomingUnread ? Number(item.unreadCount || 0) + 1 : item.unreadCount,
          }
        }).sort((left, right) => new Date(right.lastMessageAt || 0) - new Date(left.lastMessageAt || 0)))
      },
    })

    connection.start().catch(() => setRealtimeStatus('error'))
    return () => {
      connection.stop().catch(() => {})
    }
  }, [user?.id])

  const selectedUser = useMemo(() => (
    chatUsers.find((item) => Number(item.userId) === Number(selectedUserId)) || null
  ), [chatUsers, selectedUserId])

  const filteredUsers = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return chatUsers
    return chatUsers.filter((item) => (
      item.fullName.toLowerCase().includes(text)
      || item.email.toLowerCase().includes(text)
      || (item.department || '').toLowerCase().includes(text)
      || (item.jobTitle || '').toLowerCase().includes(text)
    ))
  }, [chatUsers, query])

  const selectUser = (chatUser) => {
    setSelectedUserId(chatUser.userId)
    setChatUsers((items) => items.map((item) => (
      Number(item.userId) === Number(chatUser.userId) ? { ...item, unreadCount: 0 } : item
    )))
    setSearchParams({ userId: chatUser.userId })
  }

  const markConversationRead = useCallback((userId) => {
    setChatUsers((items) => items.map((item) => (
      Number(item.userId) === Number(userId) ? { ...item, unreadCount: 0 } : item
    )))
  }, [])

  return (
    <section className="page stack chat-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Messenger</span>
          <h2>Chat người dùng</h2>
        </div>
        <span className={`realtime-pill realtime-${realtimeStatus}`}>{realtimeLabels[realtimeStatus] || realtimeStatus}</span>
      </div>

      <Notice type="error">{error}</Notice>

      {loading ? (
        <Loading label="Đang tải danh sách người dùng" />
      ) : chatUsers.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={24} />}
          title="Chưa có người dùng để chat"
          description="Khi hệ thống có thêm tài khoản, bạn có thể nhắn tin trực tiếp tại đây."
        />
      ) : (
        <div className="chat-workspace">
          <aside className="chat-project-list direct-user-list">
            <div className="search-field">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm người dùng" />
            </div>
            <div className="chat-project-items direct-user-items">
              {filteredUsers.map((chatUser) => (
                <button
                  className={Number(selectedUserId) === Number(chatUser.userId) ? 'is-active' : ''}
                  key={chatUser.userId}
                  type="button"
                  onClick={() => selectUser(chatUser)}
                >
                  <Avatar name={chatUser.fullName} src={chatUser.avatarUrl} size="sm" />
                  <div>
                    <strong>{chatUser.fullName}</strong>
                    <small>{chatUser.lastMessage || chatUser.email}</small>
                  </div>
                  {Number(chatUser.unreadCount) > 0 && <em className="chat-unread-dot">{chatUser.unreadCount}</em>}
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <div className="empty-inline compact-empty">
                  <UserRound size={20} />
                  <strong>Không tìm thấy người dùng</strong>
                </div>
              )}
            </div>
          </aside>

          <main className="chat-main">
            <UserChatPanel
              selectedUser={selectedUser}
              realtimeEvent={realtimeEvent}
              onRead={markConversationRead}
            />
          </main>
        </div>
      )}
    </section>
  )
}

export default ChatPage
