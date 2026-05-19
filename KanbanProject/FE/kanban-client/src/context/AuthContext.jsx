import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { authExpiredEvent } from '../services/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('kanban_token'))
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('kanban_user')
    return stored ? JSON.parse(stored) : null
  })
  const [booting, setBooting] = useState(Boolean(token))

  const persistSession = useCallback((authResponse) => {
    localStorage.setItem('kanban_token', authResponse.token)
    localStorage.setItem('kanban_user', JSON.stringify(authResponse.user))
    setToken(authResponse.token)
    setUser(authResponse.user)
  }, [])

  const login = useCallback(async (payload) => {
    const response = await authService.login(payload)
    persistSession(response)
    return response
  }, [persistSession])

  const register = useCallback(async (payload) => {
    const response = await authService.register(payload)
    persistSession(response)
    return response
  }, [persistSession])

  const logout = useCallback(() => {
    localStorage.removeItem('kanban_token')
    localStorage.removeItem('kanban_user')
    setToken(null)
    setUser(null)
  }, [])

  const updateStoredUser = useCallback((nextUser) => {
    localStorage.setItem('kanban_user', JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  useEffect(() => {
    const handleAuthExpired = () => logout()
    window.addEventListener(authExpiredEvent, handleAuthExpired)
    return () => window.removeEventListener(authExpiredEvent, handleAuthExpired)
  }, [logout])

  useEffect(() => {
    if (!token) {
      setBooting(false)
      return
    }

    authService.me()
      .then((me) => {
        setUser(me)
        localStorage.setItem('kanban_user', JSON.stringify(me))
      })
      .catch(() => logout())
      .finally(() => setBooting(false))
  }, [token, logout])

  const isSystemAdmin = Boolean(user?.isSystemAdmin)
  const role = isSystemAdmin ? 'admin' : 'user'
  const roleLabel = isSystemAdmin ? 'Quản trị hệ thống' : 'Người dùng'

  const value = useMemo(() => ({
    token,
    user,
    booting,
    isAuthenticated: Boolean(token),
    isSystemAdmin,
    role,
    roleLabel,
    login,
    register,
    logout,
    updateStoredUser,
  }), [token, user, booting, isSystemAdmin, role, roleLabel, login, register, logout, updateStoredUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
