import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'

// Layouts
import PublicLayout   from '@/components/layout/PublicLayout'
import UserLayout     from '@/components/layout/UserLayout'
import AdminLayout    from '@/components/layout/AdminLayout'
import AuthLayout     from '@/components/layout/AuthLayout'

// Public Pages
import HomePage          from '@/pages/public/HomePage'
import ProductsPage      from '@/pages/public/ProductsPage'
import ProductDetailPage from '@/pages/public/ProductDetailPage'
import NewsPage          from '@/pages/public/NewsPage'
import NewsDetailPage    from '@/pages/public/NewsDetailPage'
import CategoryPage      from '@/pages/public/CategoryPage'
import ClaimsProcessPage from '@/pages/public/ClaimsProcessPage'
import TermsPage         from '@/pages/public/TermsPage'
import CmsPage           from '@/pages/public/CmsPage'
import ContactPage       from '@/pages/public/ContactPage'

// Auth Pages
import LoginPage              from '@/pages/auth/LoginPage'
import AdminLoginPage         from '@/pages/auth/AdminLoginPage'
import RegisterPage           from '@/pages/auth/RegisterPage'
import ForgotPasswordPage     from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage      from '@/pages/auth/ResetPasswordPage'
import VerifyEmailPage        from '@/pages/auth/VerifyEmailPage'
import ForceChangePasswordPage from '@/pages/auth/ForceChangePasswordPage'
import QuickFormPage          from '@/pages/auth/QuickFormPage'

// User Pages
import UserDashboard from '@/pages/user/UserDashboard'
import UserOrders    from '@/pages/user/UserOrders'
import UserCart      from '@/pages/user/UserCart'
import UserPayment   from '@/pages/user/UserPayment'
import UserChat      from '@/pages/user/UserChat'
import UserClaims    from '@/pages/user/UserClaims'

// Admin Pages
import AdminDashboard              from '@/pages/admin/AdminDashboard'
import AdminProducts               from '@/pages/admin/AdminProducts'
import AdminCategories             from '@/pages/admin/AdminCategories'
import AdminOrders                 from '@/pages/admin/AdminOrders'
import AdminConsultations          from '@/pages/admin/AdminConsultations'
import AdminChat                   from '@/pages/admin/AdminChat'
import AdminAccounts               from '@/pages/admin/AdminAccounts'
import AdminStaff                  from '@/pages/admin/AdminStaff'
import AdminBanners                from '@/pages/admin/AdminBanners'
import AdminNews                   from '@/pages/admin/AdminNews'
import AdminClaims                 from '@/pages/admin/AdminClaims'
import AdminNotifications          from '@/pages/admin/AdminNotifications'
import AdminSitePages              from '@/pages/admin/AdminSitePages'
import AdminProfile                from '@/pages/admin/AdminProfile'
import AdminSystemLogs             from '@/pages/admin/AdminSystemLogs'
import AdminEmailSettings          from '@/pages/admin/AdminEmailSettings'
import AdminPaymentSettings        from '@/pages/admin/AdminPaymentSettings'
import AdminSocialLogin            from '@/pages/admin/AdminSocialLogin'
import AdminZaloOA                 from '@/pages/admin/AdminZaloOA'
import AdminZaloOASettings         from '@/pages/admin/AdminZaloOASettings'
import AdminEnterpriseEmployees    from '@/pages/admin/AdminEnterpriseEmployees'
import AdminRegistrationTerms      from '@/pages/admin/AdminRegistrationTerms'
import AdminCallRecordings         from '@/pages/admin/AdminCallRecordings'
import AdminChatConnectionSettings from '@/pages/admin/AdminChatConnectionSettings'

// ── Route Guards ──────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="spinner-tis" /></div>
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function RequireAdmin({ children }) {
  const { user, isInternal, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="spinner-tis" /></div>
  if (!user) return <Navigate to="/admin-login" replace />
  if (!isInternal) return <Navigate to="/" replace />
  if (user.role === 'claim' && window.location.pathname !== '/admin/claims') {
    return <Navigate to="/admin/claims" replace />
  }
  return children
}

function RequireGuest({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  return isAuthenticated ? <Navigate to="/" replace /> : children
}

// ── App ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* ── Public Routes ── */}
      <Route element={<PublicLayout />}>
        <Route path="/"                   element={<HomePage />} />
        <Route path="/products"           element={<ProductsPage />} />
        <Route path="/products/:id"       element={<ProductDetailPage />} />
        <Route path="/news"               element={<NewsPage />} />
        <Route path="/news/:id"           element={<NewsDetailPage />} />
        <Route path="/category/:id"       element={<CategoryPage />} />
        <Route path="/claims-process"     element={<ClaimsProcessPage />} />
        <Route path="/terms"              element={<TermsPage />} />
        <Route path="/contact"            element={<ContactPage />} />
        <Route path="/page/:slug"         element={<CmsPage />} />
      </Route>

      {/* ── Auth Routes ── */}
      <Route element={<AuthLayout />}>
        <Route path="/login"                    element={<RequireGuest><LoginPage /></RequireGuest>} />
        <Route path="/admin-login"              element={<RequireGuest><AdminLoginPage /></RequireGuest>} />
        <Route path="/register"                 element={<RequireGuest><RegisterPage /></RequireGuest>} />
        <Route path="/forgot-password"          element={<ForgotPasswordPage />} />
        <Route path="/reset-password"           element={<ResetPasswordPage />} />
        <Route path="/verify-email"             element={<VerifyEmailPage />} />
        <Route path="/force-change-password"    element={<ForceChangePasswordPage />} />
        <Route path="/quick-form"               element={<QuickFormPage />} />
      </Route>

      {/* ── User Dashboard Routes ── */}
      <Route path="/user" element={<RequireAuth><UserLayout /></RequireAuth>}>
        <Route index                    element={<UserDashboard />} />
        <Route path="orders"            element={<UserOrders />} />
        <Route path="cart"              element={<UserCart />} />
        <Route path="payment"           element={<UserPayment />} />
        <Route path="chat"              element={<UserChat />} />
        <Route path="claims"            element={<UserClaims />} />
      </Route>

      {/* ── Admin Panel Routes ── */}
      <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index                            element={<AdminDashboard />} />
        <Route path="products"                  element={<AdminProducts />} />
        <Route path="categories"                element={<AdminCategories />} />
        <Route path="orders"                    element={<AdminOrders />} />
        <Route path="consultations"             element={<AdminConsultations />} />
        <Route path="chat"                      element={<AdminChat />} />
        <Route path="accounts"                  element={<AdminAccounts />} />
        <Route path="staff"                     element={<AdminStaff />} />
        <Route path="banners"                   element={<AdminBanners />} />
        <Route path="news"                      element={<AdminNews />} />
        <Route path="claims"                    element={<AdminClaims />} />
        <Route path="notifications"             element={<AdminNotifications />} />
        <Route path="site-pages"                element={<AdminSitePages />} />
        <Route path="profile"                   element={<AdminProfile />} />
        <Route path="system-logs"               element={<AdminSystemLogs />} />
        <Route path="email-settings"            element={<AdminEmailSettings />} />
        <Route path="payment-settings"          element={<AdminPaymentSettings />} />
        <Route path="social-login-settings"     element={<AdminSocialLogin />} />
        <Route path="zalo-oa"                   element={<AdminZaloOA />} />
        <Route path="zalo-oa-settings"          element={<AdminZaloOASettings />} />
        <Route path="enterprise-employees"      element={<AdminEnterpriseEmployees />} />
        <Route path="registration-terms"        element={<AdminRegistrationTerms />} />
        <Route path="call-recordings"           element={<AdminCallRecordings />} />
        <Route path="chat-connection-settings"  element={<AdminChatConnectionSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: { fontFamily: '"Be Vietnam Pro", sans-serif', fontSize: '14px' },
              success: { iconTheme: { primary: '#D71920', secondary: '#fff' } },
            }}
          />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
