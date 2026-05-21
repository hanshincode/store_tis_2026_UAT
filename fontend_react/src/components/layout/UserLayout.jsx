import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const USER_NAV = [
  { to: '/user',        label: 'Hồ sơ',        icon: 'fa-user',         exact: true },
  { to: '/user/orders', label: 'Đơn hàng',     icon: 'fa-file-invoice' },
  { to: '/user/cart',   label: 'Giỏ hàng',     icon: 'fa-shopping-cart' },
  { to: '/user/chat',   label: 'Chat hỗ trợ',  icon: 'fa-headset' },
  { to: '/user/claims', label: 'Bồi thường',   icon: 'fa-file-medical' },
]

export default function UserLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 pt-[72px]">
      <div className="container mx-auto px-4 max-w-6xl py-5 md:py-8 flex flex-col md:flex-row gap-5 md:gap-8">
        <nav className="user-mobile-nav md:hidden">
          {USER_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `user-mobile-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <i className={`fas ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 hidden md:block">
          <div className="card-tis p-4 sticky top-24">
            {/* User Info */}
            <div className="flex items-center gap-3 mb-6 p-3 bg-red-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-tis-red text-white flex items-center justify-center font-bold">
                {(user?.first_name || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-800 truncate">{user?.last_name} {user?.first_name}</p>
                <p className="text-xs text-gray-400">Khách hàng</p>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="space-y-1">
              {USER_NAV.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-tis-red text-white shadow-sm'
                        : 'text-gray-600 hover:bg-red-50 hover:text-tis-red'
                    }`
                  }
                >
                  <i className={`fas ${item.icon} w-4`} />
                  {item.label}
                </NavLink>
              ))}

              <hr className="border-gray-100 my-2" />

              <button
                onClick={logout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 w-full text-left"
              >
                <i className="fas fa-sign-out-alt w-4" />
                Đăng xuất
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
