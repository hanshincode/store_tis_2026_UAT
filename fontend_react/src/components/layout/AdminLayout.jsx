import { useState, useEffect } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { fetchList, mediaUrl } from '@/lib/api'

const ADMIN_NAV = [
  { path: '/admin',                  icon: 'fa-chart-pie',         label: 'Dashboard',        exact: true },
  { path: '/admin/products',         icon: 'fa-box-open',          label: 'Sản phẩm' },
  { path: '/admin/categories',       icon: 'fa-tags',              label: 'Danh mục' },
  { path: '/admin/orders',           icon: 'fa-file-invoice',      label: 'Đơn hàng' },
  { path: '/admin/consultations',    icon: 'fa-comments',          label: 'Tư vấn' },
  { path: '/admin/chat',             icon: 'fa-headset',           label: 'Chat realtime' },
  { path: '/admin/accounts',         icon: 'fa-users',             label: 'Khách hàng' },
  { path: '/admin/staff',            icon: 'fa-user-tie',          label: 'Nhân viên' },
  { path: '/admin/banners',          icon: 'fa-images',            label: 'Banners' },
  { path: '/admin/news',             icon: 'fa-newspaper',         label: 'Tin tức' },
  { path: '/admin/claims',           icon: 'fa-file-medical',      label: 'Bồi thường' },
  { path: '/admin/notifications',    icon: 'fa-bell',              label: 'Thông báo' },
  { path: '/admin/site-pages',       icon: 'fa-file-alt',          label: 'Trang nội dung' },
  { path: '/admin/enterprise-employees', icon: 'fa-building',      label: 'Nhân viên DN' },
  { path: '/admin/call-recordings',  icon: 'fa-microphone',        label: 'Ghi âm' },
  { divider: true },
  { path: '/admin/email-settings',   icon: 'fa-envelope',          label: 'Cấu hình Email' },
  { path: '/admin/payment-settings', icon: 'fa-credit-card',       label: 'Thanh toán' },
  { path: '/admin/social-login-settings', icon: 'fa-share-alt',   label: 'Social Login' },
  { path: '/admin/zalo-oa',          icon: 'fa-comment-dots',      label: 'Zalo OA' },
  { path: '/admin/zalo-oa-settings', icon: 'fa-cog',              label: 'Cấu hình Zalo' },
  { path: '/admin/chat-connection-settings', icon: 'fa-network-wired', label: 'Kết nối Chat' },
  { path: '/admin/registration-terms', icon: 'fa-file-contract',  label: 'Điều khoản ĐK' },
  { path: '/admin/system-logs',      icon: 'fa-list-alt',         label: 'Nhật ký hệ thống' },
]

const STAFF_VISIBLE_PATHS = new Set([
  '/admin',
  '/admin/orders',
  '/admin/consultations',
  '/admin/chat',
  '/admin/zalo-oa',
  '/admin/claims',
  '/admin/enterprise-employees',
  '/admin/accounts',
])

const getVisibleAdminNav = (role) => {
  if (role === 'claim') return ADMIN_NAV.filter(item => item.path === '/admin/claims')
  if (['leader', 'staff'].includes(role)) {
    return ADMIN_NAV.filter(item => item.divider ? false : STAFF_VISIBLE_PATHS.has(item.path))
  }
  return ADMIN_NAV
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [badges, setBadges] = useState({})

  const visibleNav = getVisibleAdminNav(user?.role)
  const fullName = `${user?.last_name || ''} ${user?.first_name || ''}`.trim() || user?.username || 'Admin'
  const avatarUrl = user?.avatar
    ? mediaUrl(user.avatar)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=d71920&color=fff`

  useEffect(() => {
    let cancelled = false
    const updateBadges = async () => {
      try {
        const [consultations, claims] = await Promise.all([
          fetchList('/consultations/').catch(() => []),
          fetchList('/claims/').catch(() => []),
        ])
        if (cancelled) return
        const activeConsultations = consultations.filter(item => item.status !== 'archived')
        setBadges({
          '/admin/consultations': activeConsultations.filter(item => item.status === 'new').length,
          '/admin/chat': activeConsultations.filter(item => item.last_message && item.last_message.is_staff === false).length,
          '/admin/claims': claims.filter(item => item.status === 'new').length,
        })
      } catch {
        setBadges({})
      }
    }
    updateBadges()
    const timer = setInterval(updateBadges, 8000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return (
    <div className="admin-app-shell bg-gray-100 flex">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)} />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 lg:z-auto
        h-screen flex flex-col
        bg-white text-gray-800 border-r border-gray-200
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-16'}
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className={`admin-sidebar-brand ${sidebarOpen ? '' : 'is-collapsed'}`}>
          {sidebarOpen ? (
            <Link to="/admin" className="admin-brand-link">
              <span className="admin-brand-logo-frame">
                <img src="/images/logo.png" alt="TIS Logo" className="admin-brand-logo" onError={(e) => { e.target.onerror = null; e.target.src = '/favicon.svg' }} />
              </span>
              <span className="admin-brand-copy">
                <strong>TIS Broker</strong>
                <small>Quản trị hệ thống</small>
              </span>
            </Link>
          ) : (
            <Link to="/admin" className="admin-brand-mark">
              <img src="/images/logo.png" alt="TIS" onError={(e) => { e.target.onerror = null; e.target.src = '/favicon.svg' }} />
            </Link>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="admin-sidebar-toggle">
            <i className={`fas ${sidebarOpen ? 'fa-chevron-left' : 'fa-bars'} text-sm`} />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {visibleNav.map((item, idx) => {
            if (item.divider) return (
              <hr key={idx} className="border-gray-200 my-3 mx-2" />
            )
            const badgeCount = badges[item.path] || 0
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `admin-nav-link ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-0' : ''}`
                }
                title={!sidebarOpen ? item.label : undefined}
              >
                <i className={`fas ${item.icon} w-4 text-center flex-shrink-0`} />
                {sidebarOpen && <span className="truncate text-xs">{item.label}</span>}
                {sidebarOpen && badgeCount > 0 && (
                  <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-tis-red text-white text-[10px] font-bold flex items-center justify-center">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 p-3">
          {user?.role !== 'claim' && (
            <NavLink to="/admin/profile"
              className={({ isActive }) => `admin-nav-link mb-1 ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-0' : ''}`}
            >
              <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              {sidebarOpen && <span className="text-xs truncate">{fullName}</span>}
            </NavLink>
          )}
          <button onClick={logout}
            className={`admin-nav-link w-full text-red-500 hover:text-red-600 hover:bg-red-50 ${!sidebarOpen ? 'justify-center px-0' : ''}`}
            title={!sidebarOpen ? 'Đăng xuất' : undefined}
          >
            <i className="fas fa-sign-out-alt w-4 text-center flex-shrink-0" />
            {sidebarOpen && <span className="text-xs">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <div className="admin-workspace flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="admin-topbar sticky top-0 z-30">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <i className="fas fa-bars" />
          </button>

          <div className="admin-topbar-title hidden lg:flex">
            <span className="admin-topbar-dot" />
            <div>
              <strong>Admin Console</strong>
              <span>TIS Insurance Broker</span>
            </div>
          </div>

          <div className="flex-1 lg:hidden" />

          <div className="admin-topbar-actions">
            <Link to="/" target="_blank"
              className="admin-site-link">
              <i className="fas fa-arrow-up-right-from-square text-xs" />
              <span className="hidden sm:inline">Xem trang web</span>
            </Link>

            <div className="admin-topbar-user">
              <div className="admin-topbar-avatar">
                <img src={avatarUrl} alt="" />
              </div>
              <div className="hidden md:block min-w-0">
                <p>{fullName}</p>
                <span>{user?.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
