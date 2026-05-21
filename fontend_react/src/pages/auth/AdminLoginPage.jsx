import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/context/AuthContext'
import { clearTokens } from '@/lib/auth'
import Swal from 'sweetalert2'
import api from '@/lib/api'

const schema = z.object({
  phone: z.string().regex(/^(\+84|84|0)(3|5|7|8|9)[0-9]{8}$/, 'Số điện thoại không đúng định dạng Việt Nam'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

export default function AdminLoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    try {
      const user = await login(data.phone, data.password)
      if (!user) throw new Error('Đăng nhập thất bại')

      const INTERNAL_ROLES = ['super_admin', 'admin', 'leader', 'staff', 'claim']
      if (!INTERNAL_ROLES.includes(user.role)) {
        clearTokens()
        Swal.fire({
          icon: 'warning',
          title: 'Không có quyền truy cập',
          text: 'Trang này chỉ dành cho Admin/Staff.',
          confirmButtonColor: '#D71920'
        })
        return
      }

      navigate('/admin', { replace: true })
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

  const loginWithMicrosoft = async () => {
    try {
      const { data } = await api.get('/auth/social-login/microsoft/start/')
      if (!data.auth_url) throw new Error('Chưa nhận được link đăng nhập Outlook.')
      window.location.href = data.auth_url
    } catch (error) {
      Swal.fire('Không thể đăng nhập Outlook', error.response?.data?.detail || error.message || 'Vui lòng kiểm tra cấu hình Outlook trong admin.', 'error')
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
        <h3 className="fw-bold text-dark m-0 mt-3">Đăng nhập Admin / Staff</h3>
        <p className="text-muted mt-1">Vui lòng dùng tài khoản nội bộ được cấp quyền</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-3 text-left">
          <label className="fw-bold small mb-1">Số điện thoại</label>
          <div className="input-group">
            <span className="input-group-text"><i className="fas fa-user-shield text-muted" /></span>
            <input
              {...register('phone')}
              type="tel"
              className="form-control border-start-0 ps-0"
              placeholder="Nhập số điện thoại nội bộ"
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
          <Link to="/forgot-password?next=admin-login" className="small text-danger text-decoration-none fw-bold">
            Quên mật khẩu?
          </Link>
          <Link to="/login" className="small text-muted text-decoration-none fw-semibold">
            Đăng nhập khách hàng
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-100 p-3 fw-bold"
          style={{ backgroundColor: '#d71920', borderColor: '#d71920', color: '#fff' }}
        >
          {isSubmitting ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP NỘI BỘ'}
        </button>

        <div className="mt-4">
          <div className="d-flex align-items-center my-4">
            <hr className="flex-grow-1 text-muted opacity-25 m-0" />
            <span className="mx-3 text-muted small fw-medium text-nowrap">Hoặc đăng nhập bằng</span>
            <hr className="flex-grow-1 text-muted opacity-25 m-0" />
          </div>

          <button
            type="button"
            onClick={loginWithMicrosoft}
            className="btn btn-social-custom"
          >
            <i className="fab fa-windows icon-outlook" />
            <span>Đăng nhập Admin bằng Outlook</span>
          </button>
          <div className="form-text text-center mt-2" style={{ fontSize: '12px', color: '#6c757d' }}>
            Chỉ dành cho email @tisbroker.com có quyền Admin.
          </div>
        </div>
      </form>
    </div>
  )
}
