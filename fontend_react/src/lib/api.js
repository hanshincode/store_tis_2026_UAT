import axios from 'axios'
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from './auth'

// ── Resolve API base URL (mirrors common.js resolveApiDomain logic) ────────
function resolveApiBase() {
  const { protocol, hostname, port } = window.location
  // Dev: vite proxy handles /api → backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/api'
  }
  // Production domain variants
  if (hostname === 'store-uat.tisbroker.com') return 'https://store-uat.tisbroker.com/api'
  return `${protocol}//${hostname}${port ? ':' + port : ''}/api`
}

export const API_BASE = resolveApiBase()
export const DOMAIN   = API_BASE.replace(/\/api$/, '')

export const mediaUrl = (path) => {
  if (!path) return 'https://placehold.co/800x600/f8f9fa/d71920?text=TIS+Broker'
  if (String(path).startsWith('http')) return path
  const clean = String(path).startsWith('/') ? path : `/${path}`
  if (clean.startsWith('/media')) return `${DOMAIN}${clean}`
  return `${DOMAIN}/media${clean}`
}

export const getValidImageUrl = (url) => {
  if (!url || String(url).trim() === '') {
    return 'https://placehold.co/600x420/f8f9fa/d71920?text=TIS+Broker'
  }
  return mediaUrl(url)
}

export const websocketUrl = (path = '') => {
  const base = DOMAIN || window.location.origin
  const domainUrl = new URL(base)
  const wsProto   = domainUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  const clean     = String(path).startsWith('/') ? path : `/${path}`
  return `${wsProto}//${domainUrl.host}${clean}`
}

// ── Axios instance ────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Accept': 'application/json' },
})

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// Auto-refresh token on 401
let isRefreshing = false
let failedQueue  = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      const refresh = getRefreshToken()
      if (!refresh) {
        clearTokens()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers['Authorization'] = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(`${API_BASE}/token/refresh/`, { refresh })
        saveTokens(data.access, data.refresh || refresh)
        processQueue(null, data.access)
        original.headers['Authorization'] = `Bearer ${data.access}`
        return api(original)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearTokens()
        window.dispatchEvent(new CustomEvent('tis:logout'))
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

// ── Helper: extract readable error message ────────────────────────────────
export const getErrorMessage = (error, fallback = 'Đã xảy ra lỗi.') => {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  const msg = data.detail || data.message || data.error ||
    Object.values(data).flat().join(', ')
  return msg || fallback
}

// ── Generic typed fetch helpers ───────────────────────────────────────────
export const fetchList = async (endpoint, params) => {
  const { data } = await api.get(endpoint, { params })
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

export const fetchOne = async (endpoint) => {
  const { data } = await api.get(endpoint)
  return data
}

export default api
