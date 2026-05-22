import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'

// Layouts
import PublicLayout   from '@/components/layout/PublicLayout'
import UserLayout     from '@/components/layout/UserLayout'
import AdminLayout    from '@/components/layout/AdminLayout'
import AuthLayout     from '@/components/layout/AuthLayout'

// Route pages are loaded on demand so public sessions do not download admin screens.
const HomePage = lazy(() => import('@/pages/public/HomePage'))
const ProductsPage = lazy(() => import('@/pages/public/ProductsPage'))
const ProductDetailPage = lazy(() => import('@/pages/public/ProductDetailPage'))
const NewsPage = lazy(() => import('@/pages/public/NewsPage'))
const NewsDetailPage = lazy(() => import('@/pages/public/NewsDetailPage'))
const CategoryPage = lazy(() => import('@/pages/public/CategoryPage'))
const ClaimsProcessPage = lazy(() => import('@/pages/public/ClaimsProcessPage'))
const TermsPage = lazy(() => import('@/pages/public/TermsPage'))
const CmsPage = lazy(() => import('@/pages/public/CmsPage'))
const ContactPage = lazy(() => import('@/pages/public/ContactPage'))

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const AdminLoginPage = lazy(() => import('@/pages/auth/AdminLoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'))
const ForceChangePasswordPage = lazy(() => import('@/pages/auth/ForceChangePasswordPage'))
const QuickFormPage = lazy(() => import('@/pages/auth/QuickFormPage'))

const UserDashboard = lazy(() => import('@/pages/user/UserDashboard'))
const UserOrders = lazy(() => import('@/pages/user/UserOrders'))
const UserCart = lazy(() => import('@/pages/user/UserCart'))
const UserPayment = lazy(() => import('@/pages/user/UserPayment'))
const UserChat = lazy(() => import('@/pages/user/UserChat'))
const UserClaims = lazy(() => import('@/pages/user/UserClaims'))

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'))
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'))
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'))
const AdminConsultations = lazy(() => import('@/pages/admin/AdminConsultations'))
const AdminChat = lazy(() => import('@/pages/admin/AdminChat'))
const AdminAccounts = lazy(() => import('@/pages/admin/AdminAccounts'))
const AdminStaff = lazy(() => import('@/pages/admin/AdminStaff'))
const AdminBanners = lazy(() => import('@/pages/admin/AdminBanners'))
const AdminNews = lazy(() => import('@/pages/admin/AdminNews'))
const AdminClaims = lazy(() => import('@/pages/admin/AdminClaims'))
const AdminNotifications = lazy(() => import('@/pages/admin/AdminNotifications'))
const AdminSitePages = lazy(() => import('@/pages/admin/AdminSitePages'))
const AdminProfile = lazy(() => import('@/pages/admin/AdminProfile'))
const AdminSystemLogs = lazy(() => import('@/pages/admin/AdminSystemLogs'))
const AdminEmailSettings = lazy(() => import('@/pages/admin/AdminEmailSettings'))
const AdminPaymentSettings = lazy(() => import('@/pages/admin/AdminPaymentSettings'))
const AdminSocialLogin = lazy(() => import('@/pages/admin/AdminSocialLogin'))
const AdminZaloOA = lazy(() => import('@/pages/admin/AdminZaloOA'))
const AdminZaloOASettings = lazy(() => import('@/pages/admin/AdminZaloOASettings'))
const AdminEnterpriseEmployees = lazy(() => import('@/pages/admin/AdminEnterpriseEmployees'))
const AdminRegistrationTerms = lazy(() => import('@/pages/admin/AdminRegistrationTerms'))
const AdminCallRecordings = lazy(() => import('@/pages/admin/AdminCallRecordings'))
const AdminChatConnectionSettings = lazy(() => import('@/pages/admin/AdminChatConnectionSettings'))

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

function ScrollToRouteTop() {
  const location = useLocation()

  useEffect(() => {
    const scrollRoute = () => {
      if (location.hash) {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)))
        if (target) {
          target.scrollIntoView()
          return true
        }
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      return !location.hash
    }

    const timers = [
      window.setTimeout(scrollRoute, 0),
      ...(location.hash ? [window.setTimeout(scrollRoute, 240)] : []),
    ]

    return () => timers.forEach(timer => window.clearTimeout(timer))
  }, [location.pathname, location.search, location.hash])

  return null
}

// ── App ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="spinner-tis" /></div>}>
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
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ScrollToRouteTop />
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
