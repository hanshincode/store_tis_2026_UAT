import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { saveTokens } from '@/lib/auth'
import { useAuth } from '@/context/AuthContext'
import Swal from 'sweetalert2'
import api from '@/lib/api'
import '@/pages/auth/auth.css'

const IMAGE_LIST = [
  'shutterstock_673842874.jpg',
  'shutterstock_660832780.jpg',
  'shutterstock_2577344341.jpg',
  'shutterstock_563270320.jpg',
  'shutterstock_409344172.jpg',
  'shutterstock_561677989.jpg',
  'shutterstock_2528928597.jpg',
  'shutterstock_2548605069.jpg',
  'shutterstock_2222352899.jpg',
  'shutterstock_2308801975.jpg',
  'hospital.jpg',
  'shutterstock_317578871.jpg',
  'shutterstock_1878018001.jpg',
  'shutterstock_2561976731.jpg',
  'shutterstock_1871428867.jpg',
  'shutterstock_2437888025.jpg',
  'shutterstock_2364843827.jpg',
  'shutterstock_2431406087.jpg',
  'shutterstock_2445632105.jpg',
  'shutterstock_2631423457.jpg'
]

function Slide({ filename, isActive }) {
  const [isZooming, setIsZooming] = useState(false)

  useEffect(() => {
    if (isActive) {
      setIsZooming(true)
    } else {
      const t = setTimeout(() => setIsZooming(false), 2500)
      return () => clearTimeout(t)
    }
  }, [isActive])

  return (
    <div
      className={`banner-slide ${isActive ? 'active' : ''} ${isZooming ? 'zooming' : ''}`}
      style={{ backgroundImage: `url('/images/album/${filename}')` }}
    />
  )
}

export default function AuthLayout() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { fetchMe } = useAuth()
  const [slides, setSlides] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)

  // Pick 3 random images on mount
  useEffect(() => {
    const picked = [...IMAGE_LIST]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    setSlides(picked)
  }, [])

  // Rotate slides every 7 seconds
  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIdx(prev => {
        let nextIdx
        do {
          nextIdx = Math.floor(Math.random() * slides.length)
        } while (nextIdx === prev)
        return nextIdx
      })
    }, 7000)
    return () => clearInterval(timer)
  }, [slides])

  // OAuth query param handler
  useEffect(() => {
    const access = searchParams.get('access')
    const refresh = searchParams.get('refresh')
    const zaloCode = searchParams.get('code')

    if (access && refresh) {
      saveTokens(access, refresh)
      window.history.replaceState({}, document.title, window.location.pathname)
      fetchMe().then(user => {
        if (user) {
          if (user.must_change_password) {
            navigate('/force-change-password')
          } else if (['admin', 'super_admin', 'staff', 'leader'].includes(user.role)) {
            navigate('/admin')
          } else {
            navigate('/')
          }
        }
      })
    } else if (zaloCode) {
      const completeZalo = async () => {
        try {
          const { data } = await api.post('/auth/zalo/callback/', { code: zaloCode })
          saveTokens(data.access, data.refresh)
          window.history.replaceState({}, document.title, window.location.pathname)
          const user = await fetchMe()
          if (user) {
            if (user.must_change_password) {
              navigate('/force-change-password')
            } else if (['admin', 'super_admin', 'staff', 'leader'].includes(user.role)) {
              navigate('/admin')
            } else {
              navigate('/')
            }
          }
        } catch (error) {
          Swal.fire('Đăng nhập Zalo thất bại', error.response?.data?.detail || error.message || 'Không xác thực được tài khoản Zalo.', 'error')
        }
      }
      completeZalo()
    }
  }, [searchParams, fetchMe, navigate])

  const isAdminPage = location.pathname === '/admin-login'

  return (
    <div className="auth-container">
      {/* Left Banner Section */}
      <div className="auth-banner">
        <div className="banner-slideshow">
          {slides.map((filename, idx) => (
            <Slide key={filename} filename={filename} isActive={idx === currentIdx} />
          ))}
        </div>
        <div className="auth-banner-overlay">
          {isAdminPage ? (
            <>
              <h1>TIS Admin Portal</h1>
              <p>Không gian quản trị dành cho đội ngũ nội bộ TIS Broker.</p>
              <div className="mt-4">
                <i className="fas fa-check-circle text-success me-2" /> Kiểm soát đơn hàng và thanh toán
              </div>
              <div className="mt-2">
                <i className="fas fa-check-circle text-success me-2" /> Theo dõi hỗ trợ khách hàng tập trung
              </div>
            </>
          ) : (
            <>
              <h1>
                Giải pháp Bảo hiểm
                <br />
                Toàn diện cho Doanh nghiệp
              </h1>
              <p>Quản lý hợp đồng, yêu cầu bồi thường và nhận tư vấn chuyên sâu ngay trên một nền tảng duy nhất.</p>
              <div className="mt-4">
                <i className="fas fa-check-circle text-success me-2" /> Bảo mật thông tin tuyệt đối
              </div>
              <div className="mt-2">
                <i className="fas fa-check-circle text-success me-2" /> Đội ngũ hỗ trợ 24/7
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Form Area */}
      <div className="auth-form-area">
        <Outlet />
      </div>
    </div>
  )
}
