import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/context/AuthContext'
import { clearTokens, saveTokens } from '@/lib/auth'
import Swal from 'sweetalert2'
import api from '@/lib/api'

const schema = z.object({
  phone: z.string().regex(/^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/, 'Số điện thoại không đúng định dạng Việt Nam'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

export default function LoginPage() {
  const { login, fetchMe } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showPass, setShowPass] = useState(false)

  // Handle Google/Microsoft callback (access + refresh in URL)
  useEffect(() => {
    const access = searchParams.get('access')
    const refresh = searchParams.get('refresh')
    if (access && refresh) {
      saveTokens(access, refresh)
      fetchMe().then(() => {
        const next = searchParams.get('next') || '/'
        navigate(next, { replace: true })
      }).catch(() => {
        clearTokens()
        Swal.fire({
          icon: 'error',
          title: 'Thất bại',
          text: 'Không thể lấy thông tin tài khoản.',
          confirmButtonColor: '#D71920',
        })
      })
      return
    }

    // Handle Zalo callback (code in URL)
    const code = searchParams.get('code')
    if (code) {
      Swal.fire({ title: 'Đang xử lý Zalo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })
      api.post('/auth/zalo/callback/', { code })
        .then(({ data }) => {
          saveTokens(data.access, data.refresh)
          return fetchMe()
        })
        .then(() => {
          Swal.close()
          navigate('/', { replace: true })
        })
        .catch((err) => {
          Swal.close()
          clearTokens()
          Swal.fire({
            icon: 'error',
            title: 'Đăng nhập Zalo thất bại',
            text: err.response?.data?.detail || err.message || 'Lỗi kết nối hệ thống',
            confirmButtonColor: '#D71920',
          })
        })
    }
  }, [searchParams, fetchMe, navigate])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    try {
      const user = await login(data.phone, data.password)
      if (!user) throw new Error('Đăng nhập thất bại')

      const INTERNAL_ROLES = ['super_admin', 'admin', 'leader', 'staff', 'claim']
      if (INTERNAL_ROLES.includes(user.role)) {
        clearTokens()
        Swal.fire({
          icon: 'info',
          title: 'Tài khoản nội bộ',
          text: 'Vui lòng đăng nhập bằng trang Admin/Staff.',
          confirmButtonColor: '#D71920',
        }).then(() => {
          navigate('/admin-login')
        })
        return
      }

      const redirect = new URLSearchParams(window.location.search).get('next') || '/'
      navigate(redirect, { replace: true })
    } catch (err) {
      clearTokens()
      Swal.fire({
        icon: 'error',
        title: 'Thất bại',
        text: err.response?.data?.detail || err.message || 'Lỗi kết nối hệ thống',
        confirmButtonColor: '#D71920'
      })
    }
  }

  const loginWithSocial = async (provider, label) => {
    try {
      const endpoint = provider === 'zalo' ? '/auth/zalo/start/' : `/auth/social-login/${provider}/start/`
      const { data } = await api.get(endpoint)
      if (!data.auth_url) throw new Error(`Chưa nhận được link đăng nhập ${label}.`)
      window.location.href = data.auth_url
    } catch (error) {
      Swal.fire(`Không thể đăng nhập ${label}`, error.response?.data?.detail || error.message || `Vui lòng kiểm tra cấu hình ${label} trong admin.`, 'error')
    }
  }

  return (
    <div>
      <div className="mb-5 text-center">
        <img
          src="/images/logo.png"
          alt="TIS Logo"
          className="auth-logo mx-auto"
          onError={(e) => {
            e.target.onerror = null
            e.target.src = 'https://via.placeholder.com/200x60/d71920/ffffff?text=TIS+BROKER'
          }}
        />
        <h3 className="fw-bold text-dark m-0 mt-3">Đăng nhập hệ thống</h3>
        <p className="text-muted mt-1">Chào mừng bạn quay lại TIS Broker</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-3 text-left">
          <label className="fw-bold small mb-1">Số điện thoại</label>
          <div className="input-group">
            <span className="input-group-text"><i className="fas fa-user text-muted" /></span>
            <input
              {...register('phone')}
              type="tel"
              className="form-control border-start-0 ps-0"
              placeholder="Nhập số điện thoại"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          {errors.phone && <p className="mt-1 text-xs text-red-500 text-left">{errors.phone.message}</p>}
        </div>

        <div className="mb-4 text-left">
          <label className="fw-bold small mb-1">Mật khẩu</label>
          <div className="input-group">
            <span className="input-group-text"><i className="fas fa-lock text-muted" /></span>
            <input
              {...register('password')}
              type={showPass ? 'text' : 'password'}
              className="form-control border-start-0 border-end-0 ps-0"
              placeholder="Mật khẩu của bạn"
            />
            <span
              className="input-group-text bg-white cursor-pointer toggle-password"
              onClick={() => setShowPass(!showPass)}
            >
              <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'} text-muted`} />
            </span>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-500 text-left">{errors.password.message}</p>}
        </div>

        <div className="d-flex justify-content-between align-items-center mb-4 text-sm">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="rememberMe" />
            <label className="form-check-label small text-muted cursor-pointer" htmlFor="rememberMe">
              Ghi nhớ đăng nhập
            </label>
          </div>
          <Link to="/forgot-password" className="small text-danger text-decoration-none fw-bold">
            Quên mật khẩu?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-100 p-3 fw-bold"
          style={{ backgroundColor: '#d71920', borderColor: '#d71920', color: '#fff' }}
        >
          {isSubmitting ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'}
        </button>

        <div className="text-center mt-4">
          <span className="text-muted">Chưa có tài khoản?</span>{' '}
          <Link to="/register" className="text-danger text-decoration-none fw-bold">Đăng ký</Link>
        </div>

        <div className="text-center mt-3">
          <Link to="/admin-login" className="small text-muted text-decoration-none fw-semibold">
            Đăng nhập dành cho Admin / Staff
          </Link>
        </div>

        <div className="mt-4">
          <div className="d-flex align-items-center my-4">
            <hr className="flex-grow-1 text-muted opacity-25 m-0" />
            <span className="mx-3 text-muted small fw-medium text-nowrap">Hoặc đăng nhập bằng</span>
            <hr className="flex-grow-1 text-muted opacity-25 m-0" />
          </div>

          <div className="d-flex flex-column gap-2">
            <button
              type="button"
              onClick={() => loginWithSocial('google', 'Google')}
              className="btn btn-social-custom"
            >
              <i className="fab fa-google icon-google" />
              <span>Đăng nhập bằng Google</span>
            </button>

            <button
              type="button"
              onClick={() => loginWithSocial('microsoft', 'Outlook')}
              className="btn btn-social-custom"
            >
              <i className="fab fa-windows icon-outlook" />
              <span>Đăng nhập bằng Outlook</span>
            </button>

            <button
              type="button"
              onClick={() => loginWithSocial('zalo', 'Zalo')}
              className="btn btn-social-custom"
            >
              <i className="fas fa-comment-dots icon-zalo" />
              <span>Đăng nhập bằng Zalo</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
