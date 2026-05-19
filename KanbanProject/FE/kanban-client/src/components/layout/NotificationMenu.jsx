import { Bell, CheckCheck, ExternalLink } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoard } from '../../hooks/useBoard'
import { notificationService } from '../../services/notificationService'

const getNotificationTarget = (notification) => {
  if (!notification?.boardId) return null
  const cardQuery = notification.cardId ? `?cardId=${notification.cardId}` : ''
  return `/boards/${notification.boardId}${cardQuery}`
}

function NotificationMenu() {
  const navigate = useNavigate()
  const { liveNotifications, markLiveNotificationAsRead } = useBoard()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const mergedNotifications = useMemo(() => [
    ...liveNotifications,
    ...notifications.filter((notification) => !liveNotifications.some((item) => item.id === notification.id)),
  ], [liveNotifications, notifications])

  const unreadCount = useMemo(
    () => mergedNotifications.filter((notification) => !notification.isRead).length,
    [mergedNotifications],
  )

  const loadNotifications = useCallback(async () => {
    try {
      setNotifications(await notificationService.getNotifications())
    } catch {
      setNotifications([])
    }
  }, [])

  useEffect(() => {
    loadNotifications()
    const timer = window.setInterval(loadNotifications, 15000)
    return () => window.clearInterval(timer)
  }, [loadNotifications])

  useEffect(() => {
    if (open) {
      loadNotifications()
    }
  }, [loadNotifications, open])

  const markAsRead = async (id) => {
    if (String(id).startsWith('live-')) {
      markLiveNotificationAsRead(id)
      return
    }

    await notificationService.markAsRead(id)
    setNotifications((items) => items.map((item) => (
      item.id === id ? { ...item, isRead: true } : item
    )))
  }

  const openNotification = async (notification) => {
    await markAsRead(notification.id)
    const target = getNotificationTarget(notification)
    setOpen(false)
    if (target) {
      navigate(target)
    }
  }

  return (
    <div className="notification-wrap">
      <button className="icon-button topbar-icon" type="button" title="Thông báo" onClick={() => setOpen((value) => !value)}>
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {open && (
        <section className="notification-menu">
          <header>
            <div>
              <strong>Thông báo</strong>
              <small>{unreadCount} chưa đọc</small>
            </div>
            <button className="icon-button subtle" type="button" title="Làm mới thông báo" onClick={loadNotifications}>
              <CheckCheck size={16} />
            </button>
          </header>

          <div className="notification-list">
            {mergedNotifications.length === 0 && <p className="muted">Chưa có thông báo.</p>}
            {mergedNotifications.slice(0, 8).map((notification) => {
              const target = getNotificationTarget(notification)
              return (
                <button
                  key={notification.id}
                  type="button"
                  className={`notification-item ${notification.isRead ? '' : 'unread'} ${target ? 'has-target' : ''}`}
                  onClick={() => openNotification(notification)}
                >
                  <strong>
                    {notification.title}
                    {notification.isRealtime && <em>Trực tiếp</em>}
                    {target && <ExternalLink size={13} />}
                  </strong>
                  <span>{notification.message}</span>
                  <small>{new Date(notification.createdAt).toLocaleString()}</small>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

export default NotificationMenu
