import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { getAccessToken, saveTokens, clearTokens, migrateLegacyTokens } from '@/lib/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch current user info
  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me/')
      setUser(data)
      return data
    } catch {
      setUser(null)
      return null
    }
  }, [])

  // Login via phone + password (supports optional scope)
  const login = useCallback(async (phone, password, scope = '') => {
    const payload = { phone, password }
    if (scope) payload.scope = scope
    const { data } = await api.post('/login/', payload)
    saveTokens(data.access, data.refresh)
    const me = await fetchMe()
    return me
  }, [fetchMe])

  // Logout
  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
    window.location.href = '/login'
  }, [])

  // Initialize on mount
  useEffect(() => {
    migrateLegacyTokens()
    if (getAccessToken()) {
      fetchMe().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }

    // Listen for forced logout from Axios interceptor
    const handler = () => {
      setUser(null)
      window.location.href = '/login'
    }
    window.addEventListener('tis:logout', handler)
    return () => window.removeEventListener('tis:logout', handler)
  }, [fetchMe])

  const isAdmin   = user && ['admin', 'super_admin'].includes(user.role)
  const isStaff   = user && ['staff', 'leader', 'claim'].includes(user.role)
  const isInternal = user && (user.is_superuser || ['admin', 'super_admin', 'staff', 'leader', 'claim'].includes(user.role))

  return (
    <AuthContext.Provider value={{
      user, loading, isAdmin, isStaff, isInternal,
      login, logout, fetchMe, setUser,
      isAuthenticated: Boolean(user),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
