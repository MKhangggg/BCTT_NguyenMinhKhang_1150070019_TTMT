import { createContext, useCallback, useMemo, useState } from 'react'

export const BoardContext = createContext(null)

export function BoardProvider({ children }) {
  const [activeBoard, setActiveBoard] = useState(null)
  const [liveNotifications, setLiveNotifications] = useState([])
  const pushLiveNotification = useCallback((notification) => {
    setLiveNotifications((items) => [notification, ...items].slice(0, 20))
  }, [])
  const markLiveNotificationAsRead = useCallback((id) => {
    setLiveNotifications((items) => items.map((item) => (
      item.id === id ? { ...item, isRead: true } : item
    )))
  }, [])
  const value = useMemo(() => ({
    activeBoard,
    setActiveBoard,
    liveNotifications,
    pushLiveNotification,
    markLiveNotificationAsRead,
  }), [activeBoard, liveNotifications, pushLiveNotification, markLiveNotificationAsRead])
  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}
