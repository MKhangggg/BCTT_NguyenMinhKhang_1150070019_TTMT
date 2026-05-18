import { createContext, useMemo, useState } from 'react'

export const BoardContext = createContext(null)

export function BoardProvider({ children }) {
  const [activeBoard, setActiveBoard] = useState(null)
  const [liveNotifications, setLiveNotifications] = useState([])
  const pushLiveNotification = (notification) => {
    setLiveNotifications((items) => [notification, ...items].slice(0, 20))
  }
  const markLiveNotificationAsRead = (id) => {
    setLiveNotifications((items) => items.map((item) => (
      item.id === id ? { ...item, isRead: true } : item
    )))
  }
  const value = useMemo(() => ({
    activeBoard,
    setActiveBoard,
    liveNotifications,
    pushLiveNotification,
    markLiveNotificationAsRead,
  }), [activeBoard, liveNotifications])
  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}
