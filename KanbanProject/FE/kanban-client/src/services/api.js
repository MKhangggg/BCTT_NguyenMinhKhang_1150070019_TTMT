import axios from 'axios'

const AUTH_EXPIRED_EVENT = 'kanban:auth-expired'

const asErrorArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()]
  }

  return []
}

const normalizeValidationErrors = (errors) => {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
    return null
  }

  const normalized = Object.fromEntries(
    Object.entries(errors)
      .map(([key, value]) => [key, asErrorArray(value)])
      .filter(([, value]) => value.length > 0),
  )

  return Object.keys(normalized).length > 0 ? normalized : null
}

export const extractApiError = (error) => {
  const responseData = error?.response?.data
  const validationErrors = normalizeValidationErrors(responseData?.errors)
  const messageFromValidation = validationErrors
    ? Object.values(validationErrors).flat().join(', ')
    : ''

  const message =
    (typeof responseData?.message === 'string' && responseData.message.trim())
    || messageFromValidation
    || error?.message
    || 'Request failed'

  return {
    message,
    code: typeof responseData?.code === 'string' ? responseData.code : null,
    status: Number(error?.response?.status) || 0,
    requestId: typeof responseData?.requestId === 'string' ? responseData.requestId : null,
    errors: validationErrors,
  }
}

const shouldHandleAuthExpired = (error) => {
  const apiError = extractApiError(error)

  if (apiError.status !== 401 && apiError.code !== 'unauthorized') {
    return false
  }

  if (error.config?.skipAuthRedirect) {
    return false
  }

  return Boolean(localStorage.getItem('kanban_token'))
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kanban_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (shouldHandleAuthExpired(error)) {
      sessionStorage.setItem('kanban_auth_message', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      localStorage.removeItem('kanban_token')
      localStorage.removeItem('kanban_user')
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))

      if (window.location.pathname !== '/login') {
        const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
        const redirectUrl = `/login?expired=1&next=${encodeURIComponent(currentPath)}`
        window.location.href = redirectUrl
      }
    }
    return Promise.reject(error)
  },
)

export const authExpiredEvent = AUTH_EXPIRED_EVENT

export const getErrorMessage = (error) => {
  const apiError = extractApiError(error)
  if (!apiError.requestId) {
    return apiError.message
  }

  return `${apiError.message} (requestId: ${apiError.requestId})`
}

export default api
