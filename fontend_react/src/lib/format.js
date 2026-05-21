// ── Format helpers (mirror formatMoney, formatDate from common.js) ────────

export const formatMoney = (value) => {
  const num = Number(value)
  if (isNaN(num) || num === 0) return 'Liên hệ'
  return num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
}

export const formatDate = (dateStr, opts = {}) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', ...opts })
  } catch {
    return dateStr
  }
}

export const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

export const escapeHTML = (value) => {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export const slugify = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export const normalizeSearchText = (text) => {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim()
}

export const truncate = (text, max = 80) => {
  const s = String(text || '').trim()
  return s.length > max ? s.slice(0, max) + '...' : s
}

export const stripHtml = (html) => {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export const normalizeList = (data) => {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}

// Validate Vietnam phone number
export const isValidVietnamPhone = (phone) => {
  const cleaned = String(phone || '').replace(/\s/g, '').replace(/^(\+84|84)/, '0')
  return /^0(3|5|7|8|9)\d{8}$/.test(cleaned)
}

export const normalizePhone = (phone) => {
  return String(phone || '').replace(/\s/g, '').replace(/^(\+84|84)/, '0')
}

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
