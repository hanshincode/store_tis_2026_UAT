// Token storage (sessionStorage mirrors original common.js approach)
const ACCESS_KEY  = 'access_token'
const REFRESH_KEY = 'refresh_token'
const USER_KEY    = 'user_info'

export const getAccessToken  = () => sessionStorage.getItem(ACCESS_KEY)
export const getRefreshToken = () => sessionStorage.getItem(REFRESH_KEY)

export const saveTokens = (access, refresh) => {
  if (access)  sessionStorage.setItem(ACCESS_KEY,  access)
  if (refresh) sessionStorage.setItem(REFRESH_KEY, refresh)
}

export const clearTokens = () => {
  sessionStorage.removeItem(ACCESS_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
  sessionStorage.removeItem(USER_KEY)
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

export const isAuthenticated = () => Boolean(getAccessToken())

// Migrate legacy localStorage tokens (one-time)
export const migrateLegacyTokens = () => {
  const legacyAccess  = localStorage.getItem(ACCESS_KEY)
  const legacyRefresh = localStorage.getItem(REFRESH_KEY)
  if (legacyAccess  && !sessionStorage.getItem(ACCESS_KEY))  sessionStorage.setItem(ACCESS_KEY,  legacyAccess)
  if (legacyRefresh && !sessionStorage.getItem(REFRESH_KEY)) sessionStorage.setItem(REFRESH_KEY, legacyRefresh)
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
