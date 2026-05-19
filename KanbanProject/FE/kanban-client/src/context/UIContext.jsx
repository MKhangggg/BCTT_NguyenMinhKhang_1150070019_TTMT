import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

const UIContext = createContext(null)

const toastIcons = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
}

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('kanban_theme') || 'light')
  const confirmResolver = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('kanban_theme', theme)
  }, [theme])

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(({ title, message, type = 'info', duration = 3200 }) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((current) => [...current, { id, title, message, type }])
    if (duration > 0) {
      window.setTimeout(() => removeToast(id), duration)
    }
    return id
  }, [removeToast])

  const confirm = useCallback((options) => new Promise((resolve) => {
    confirmResolver.current = resolve
    setConfirmState({
      title: 'Xác nhận thao tác',
      message: 'Bạn có chắc muốn tiếp tục?',
      confirmText: 'Xác nhận',
      cancelText: 'Hủy',
      tone: 'danger',
      ...options,
    })
  }), [])

  const closeConfirm = useCallback((result) => {
    confirmResolver.current?.(result)
    confirmResolver.current = null
    setConfirmState(null)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(() => ({
    showToast,
    confirm,
    theme,
    toggleTheme,
  }), [confirm, showToast, theme, toggleTheme])

  return (
    <UIContext.Provider value={value}>
      {children}

      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div className={`toast-card toast-${toast.type}`} key={toast.id}>
            <span className="toast-icon">{toastIcons[toast.type] || toastIcons.info}</span>
            <div>
              {toast.title && <strong>{toast.title}</strong>}
              {toast.message && <p>{toast.message}</p>}
            </div>
            <button className="icon-button subtle" type="button" onClick={() => removeToast(toast.id)} title="Đóng">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="modal-backdrop confirm-backdrop">
          <section className={`confirm-modal confirm-${confirmState.tone}`} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <span className="confirm-icon"><AlertTriangle size={24} /></span>
            <div>
              <h2 id="confirm-title">{confirmState.title}</h2>
              <p>{confirmState.message}</p>
            </div>
            <div className="confirm-actions">
              <button className="ghost-button" type="button" onClick={() => closeConfirm(false)}>{confirmState.cancelText}</button>
              <button className="primary-button danger-action" type="button" onClick={() => closeConfirm(true)}>{confirmState.confirmText}</button>
            </div>
          </section>
        </div>
      )}
    </UIContext.Provider>
  )
}

export function useUI() {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI phải được dùng bên trong UIProvider')
  }
  return context
}
