import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import api, { fetchList, mediaUrl } from '@/lib/api'
import { getLanguage, setLanguage, t } from '@/lib/i18n'
import MegaMenu from './MegaMenu'

const SEARCH_HISTORY_KEY = 'tis_search_history'

const toAppLink = (href = '#') => {
  if (!href || href === '#') return '#'
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href
  const [rawPath, query = ''] = href.split('?')
  const cleanPath = rawPath.replace(/^\/+/, '')
  const suffix = query ? `?${query}` : ''
  const map = {
    'index.html': '/',
    'products.html': '/products',
    'news.html': '/news',
    'login.html': '/login',
    'register.html': '/register',
    'terms.html': '/terms',
    'claims-process.html': '/claims-process',
    'quick-form.html': '/quick-form',
    'user/index.html': '/user',
    'user/orders.html': '/user/orders',
    'user/cart.html': '/user/cart',
    'user/chat.html': '/user/chat',
  }
  if (cleanPath === 'page.html') {
    const params = new URLSearchParams(query)
    return params.get('slug') ? `/page/${params.get('slug')}` : '/page/gioi-thieu'
  }
  if (cleanPath === 'product-detail.html') {
    const params = new URLSearchParams(query)
    return params.get('id') ? `/products/${params.get('id')}` : '/products'
  }
  if (cleanPath === 'news-detail.html') {
    const params = new URLSearchParams(query)
    return params.get('id') ? `/news/${params.get('id')}` : '/news'
  }
  return (map[cleanPath] || `/${cleanPath.replace(/\.html$/, '')}`) + suffix
}

const getSearchHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]')
      .filter(item => typeof item === 'string' && item.trim())
      .slice(0, 8)
  } catch {
    return []
  }
}

const saveSearchHistory = (keyword) => {
  const clean = keyword.trim()
  if (!clean) return []
  const next = [clean, ...getSearchHistory().filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8)
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
  return next
}

export default function Header() {
  const { user, isAuthenticated, isInternal, logout } = useAuth()
  const { count: cartCount } = useCart()
  const navigate = useNavigate()

  const [scrolled, setScrolled]       = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [searchOpen, setSearchOpen]   = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [showNotif, setShowNotif]         = useState(false)
  const [cmsMenus, setCmsMenus]           = useState([])
  const [language, setUiLanguage]         = useState(getLanguage())
  const [searchHistory, setSearchHistory] = useState(() => getSearchHistory())
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const searchRef = useRef(null)

  // Scroll effect
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Load notifications if logged in
  useEffect(() => {
    if (!isAuthenticated) return
    const poll = async () => {
      try {
        const [items, countPayload] = await Promise.all([
          fetchList('/notifications/?page_size=10'),
          api.get('/notifications/unread-count/').then(res => res.data).catch(() => null),
        ])
        setNotifications(items)
        setUnreadCount(Number(countPayload?.count ?? items.filter(item => !item.is_read).length))
      } catch {
        setNotifications([])
        setUnreadCount(0)
      }
    }
    poll()
    const timer = setInterval(poll, 30000)
    return () => clearInterval(timer)
  }, [isAuthenticated])

  useEffect(() => {
    fetchList('/header-menu-items/')
      .then(items => setCmsMenus(items.slice(0, 4)))
      .catch(() => setCmsMenus([]))
  }, [])

  // Close search on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSearchOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus search input when opened
  useEffect(() => {
    if (!searchOpen) return
    setTimeout(() => searchRef.current?.focus(), 80)
    Promise.all([
      fetchList('/products/').catch(() => []),
      fetchList('/categories/').catch(() => []),
    ]).then(([products, categories]) => {
      setSearchSuggestions([
        ...products.slice(0, 8).map(product => ({
          type: 'product',
          label: product.name,
          subtitle: [product.category_name, product.short_description].filter(Boolean).join(' · '),
          href: `/products/${product.id}`,
          image: product.images?.[0]?.image ? mediaUrl(product.images[0].image) : '',
        })),
        ...categories.slice(0, 6).map(category => ({
          type: 'category',
          label: category.name,
          subtitle: 'Danh mục bảo hiểm',
          href: `/products?category=${category.id}`,
        })),
      ])
    }).catch(() => setSearchSuggestions([]))
  }, [searchOpen])

  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const clean = searchQuery.trim()
    setSearchHistory(saveSearchHistory(clean))
    navigate(`/products?search=${encodeURIComponent(clean)}`)
    setSearchOpen(false)
    setSearchQuery('')
  }

  const submitHistory = (keyword) => {
    setSearchHistory(saveSearchHistory(keyword))
    navigate(`/products?search=${encodeURIComponent(keyword)}`)
    setSearchOpen(false)
  }

  const clearHistory = () => {
    localStorage.setItem(SEARCH_HISTORY_KEY, '[]')
    setSearchHistory([])
  }

  const changeLanguage = (lang) => {
    setLanguage(lang)
    setUiLanguage(lang)
  }

  const openSearch = () => {
    setSearchHistory(getSearchHistory())
    setSearchOpen(true)
  }

  const handleLogout = () => {
    logout()
    setMobileOpen(false)
  }

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/')
      setNotifications([])
      setUnreadCount(0)
    } catch {
      setUnreadCount(notifications.filter(item => !item.is_read).length)
    }
  }

  return (
    <>
      {/* ── Main Header ─────────────────────────────────────────────── */}
      <header className={`tis-main-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container mx-auto px-4 max-w-7xl">
          <nav className="flex items-center justify-between h-[72px] gap-4">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <img
                src="/images/logo.png"
                alt="TIS Broker"
                className="h-10 object-contain"
                onError={e => { e.target.src = 'https://placehold.co/150x50/ffffff/d71920?text=TIS+BROKER' }}
              />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1 flex-1 px-4">
              <NavLink to="/"        className={({ isActive }) => `nav-link px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-tis-red ${isActive ? 'text-tis-red' : 'text-gray-700'}`}>
                {t('nav.home')}
              </NavLink>

              {/* Products Mega Menu */}
              <MegaMenu />

              <NavLink to="/news"    className={({ isActive }) => `nav-link px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-tis-red ${isActive ? 'text-tis-red' : 'text-gray-700'}`}>
                {t('nav.news')}
              </NavLink>
              <NavLink to="/contact" className={({ isActive }) => `nav-link px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-tis-red ${isActive ? 'text-tis-red' : 'text-gray-700'}`}>
                {t('nav.contact')}
              </NavLink>
              {cmsMenus.map(item => (
                <NavLink
                  key={item.id || item.href || item.label}
                  to={toAppLink(item.href)}
                  className={({ isActive }) => `nav-link px-3 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-tis-red ${isActive ? 'text-tis-red' : 'text-gray-700'}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <button
                onClick={openSearch}
                className="p-2 rounded-lg text-gray-600 hover:text-tis-red hover:bg-red-50 transition-colors"
                title={t('common.search')}
              >
                <i className="fas fa-search text-lg" />
              </button>

              {/* Cart */}
              <Link
                to="/user/cart"
                className="relative p-2 rounded-lg text-gray-600 hover:text-tis-red hover:bg-red-50 transition-colors"
                title={t('nav.cart')}
              >
                <i className="fas fa-shopping-cart text-lg" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-tis-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Notifications (logged in only) */}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => setShowNotif(!showNotif)}
                    className="relative p-2 rounded-lg text-gray-600 hover:text-tis-red hover:bg-red-50 transition-colors"
                    title="Thông báo"
                  >
                    <i className="fas fa-bell text-lg" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-tis-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotif && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-slide-up">
                      <div className="flex items-center justify-between px-4 py-3 border-b">
                        <strong className="text-sm font-bold">Thông báo</strong>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-tis-red hover:underline">Đọc tất cả</button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-sm">Không có thông báo mới</div>
                        ) : (
                          notifications.slice(0, 8).map(n => (
                            <div key={n.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                              <p className="text-sm text-gray-800 line-clamp-2">{n.message}</p>
                              <span className="text-xs text-gray-400 mt-1 block">{n.created_at}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="relative group hidden lg:block">
                <button
                  className="flex items-center gap-1 p-2 rounded-lg text-gray-600 hover:text-tis-red hover:bg-red-50 transition-colors text-sm font-bold"
                  title={t('common.language')}
                >
                  <i className="fas fa-globe" />
                  <span>{language.toUpperCase()}</span>
                </button>
                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                  <button onClick={() => changeLanguage('vi')} className={`block w-full text-left px-3 py-2 text-sm ${language === 'vi' ? 'text-tis-red font-bold bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                    Tiếng Việt
                  </button>
                  <button onClick={() => changeLanguage('en')} className={`block w-full text-left px-3 py-2 text-sm ${language === 'en' ? 'text-tis-red font-bold bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                    English
                  </button>
                </div>
              </div>

              {/* Auth */}
              {isAuthenticated ? (
                <div className="relative group hidden lg:block">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700">
                    <div className="w-8 h-8 rounded-full bg-tis-red text-white flex items-center justify-center text-xs font-bold">
                      {(user?.first_name || user?.username || 'U')[0].toUpperCase()}
                    </div>
                    <span className="hidden xl:block max-w-[100px] truncate">
                      {user?.last_name} {user?.first_name || user?.username}
                    </span>
                    <i className="fas fa-chevron-down text-xs text-gray-400" />
                  </button>

                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                    <div className="p-3 border-b border-gray-50">
                      <p className="text-xs text-gray-400">Xin chào</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{user?.last_name} {user?.first_name}</p>
                    </div>
                    <div className="p-1">
                      <Link to="/user" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50">
                        <i className="fas fa-user w-4" /> Hồ sơ của tôi
                      </Link>
                      <Link to="/user/orders" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50">
                        <i className="fas fa-file-invoice w-4" /> Đơn hàng
                      </Link>
                      <Link to="/user/chat" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50">
                        <i className="fas fa-headset w-4" /> Hỗ trợ & Chat
                      </Link>
                      {isInternal && (
                        <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50">
                          <i className="fas fa-shield-halved w-4" /> {t('nav.admin')}
                        </Link>
                      )}
                      <hr className="my-1 border-gray-100" />
                      <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-tis-red rounded-lg hover:bg-red-50">
                        <i className="fas fa-sign-out-alt w-4" /> Đăng xuất
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="hidden lg:inline-flex btn-tis-danger text-sm px-5 py-2">
                  {t('nav.login')}
                </Link>
              )}

              {/* Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <i className={`fas ${mobileOpen ? 'fa-times' : 'fa-bars'} text-lg`} />
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 animate-fade-in">
            <div className="container mx-auto px-4 py-4 space-y-1">
              <MobileNavLink to="/"         onClick={() => setMobileOpen(false)}>{t('nav.home')}</MobileNavLink>
              <MobileNavLink to="/products" onClick={() => setMobileOpen(false)}>{t('nav.products')}</MobileNavLink>
              <MobileNavLink to="/news"     onClick={() => setMobileOpen(false)}>{t('nav.news')}</MobileNavLink>
              <MobileNavLink to="/contact"  onClick={() => setMobileOpen(false)}>{t('nav.contact')}</MobileNavLink>
              {cmsMenus.map(item => (
                <MobileNavLink key={item.id || item.href || item.label} to={toAppLink(item.href)} onClick={() => setMobileOpen(false)}>{item.label}</MobileNavLink>
              ))}
              <hr className="border-gray-100 my-2" />
              {isAuthenticated ? (
                <>
                  <MobileNavLink to="/user"       onClick={() => setMobileOpen(false)}>Hồ sơ của tôi</MobileNavLink>
                  <MobileNavLink to="/user/orders" onClick={() => setMobileOpen(false)}>Đơn hàng</MobileNavLink>
                  <MobileNavLink to="/user/chat"   onClick={() => setMobileOpen(false)}>{t('nav.support_chat')}</MobileNavLink>
                  {isInternal && <MobileNavLink to="/admin" onClick={() => setMobileOpen(false)}>Trang quản trị</MobileNavLink>}
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-tis-red font-semibold">
                    <i className="fas fa-sign-out-alt mr-2" />Đăng xuất
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="block w-full btn-tis-danger text-center mt-2">
                  Đăng nhập
                </Link>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => changeLanguage('vi')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${language === 'vi' ? 'bg-red-50 text-tis-red' : 'bg-gray-50 text-gray-600'}`}>VI</button>
                <button onClick={() => changeLanguage('en')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${language === 'en' ? 'bg-red-50 text-tis-red' : 'bg-gray-50 text-gray-600'}`}>EN</button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Search Overlay ──────────────────────────────────────────── */}
      {searchOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[1001] animate-fade-in" onClick={() => setSearchOpen(false)} />
          <div className="fixed top-0 left-0 right-0 z-[1002] bg-white shadow-2xl p-6 animate-slide-up">
            <div className="container mx-auto max-w-3xl">
              <form onSubmit={handleSearch} className="flex items-center gap-4">
                <i className="fas fa-search text-gray-400 text-xl" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm trên TIS Broker"
                  className="flex-1 text-lg font-medium text-gray-800 placeholder-gray-400 bg-transparent border-none outline-none"
                />
                <button type="button" onClick={() => setSearchOpen(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                  <i className="fas fa-times text-xl" />
                </button>
              </form>
              {(searchHistory.length > 0 || searchSuggestions.length > 0) && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {searchSuggestions.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase text-gray-400 mb-2">Gợi ý</div>
                      <div className="space-y-1">
                        {searchSuggestions
                          .filter(item => !searchQuery.trim() || item.label?.toLowerCase().includes(searchQuery.trim().toLowerCase()))
                          .slice(0, 6)
                          .map(item => (
                            <button
                              key={`${item.type}-${item.href}`}
                              type="button"
                              onClick={() => {
                                if (item.label) setSearchHistory(saveSearchHistory(item.label))
                                navigate(item.href)
                                setSearchOpen(false)
                              }}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-gray-50"
                            >
                              {item.image ? (
                                <img src={item.image} alt="" className="h-9 w-9 rounded-lg object-cover" />
                              ) : (
                                <span className="h-9 w-9 rounded-lg bg-red-50 text-tis-red flex items-center justify-center"><i className="fas fa-shield-halved" /></span>
                              )}
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-gray-800">{item.label}</span>
                                {item.subtitle && <span className="block truncate text-xs text-gray-400">{item.subtitle}</span>}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                  {searchHistory.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold uppercase text-gray-400">Tìm kiếm gần đây</div>
                        <button type="button" onClick={clearHistory} className="text-xs font-semibold text-tis-red hover:underline">Xóa lịch sử</button>
                      </div>
                      <div className="space-y-1">
                        {searchHistory.map(keyword => (
                          <button
                            key={keyword}
                            type="button"
                            onClick={() => submitHistory(keyword)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <i className="fas fa-history text-gray-400" />
                            <span className="flex-1 truncate">{keyword}</span>
                            <i className="fas fa-arrow-right text-xs text-gray-300" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Backdrop for notifications dropdown */}
      {showNotif && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
      )}
    </>
  )
}

function MobileNavLink({ to, onClick, children }) {
  return (
    <NavLink to={to} onClick={onClick}
      className={({ isActive }) =>
        `block px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${isActive ? 'bg-red-50 text-tis-red' : 'text-gray-700 hover:bg-gray-50'}`
      }
    >
      {children}
    </NavLink>
  )
}
