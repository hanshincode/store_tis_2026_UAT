import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'

const schema = z.object({
  otp_code:     z.string().min(1, 'Vui lòng nhập mã OTP'),
  new_password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  confirm_password: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirm_password'],
})

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const [showPass, setShowPass]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    try {
      await api.post('/reset-password/', {
        phone,
        otp_code: data.otp_code,
        new_password: data.new_password,
      })
      await Swal.fire({
        icon: 'success',
        title: 'Đặt lại mật khẩu thành công!',
        text: 'Vui lòng đăng nhập bằng mật khẩu mới.',
        confirmButtonColor: '#D71920',
      })
      navigate('/login', { replace: true })
    } catch (err) {
      const msg = getErrorMessage(err, 'Mã OTP không đúng hoặc đã hết hạn.')
      Swal.fire({ icon: 'error', title: 'Có lỗi xảy ra', text: msg, confirmButtonColor: '#D71920' })
    }
  }

  // If no phone param, show error
  if (!phone) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-exclamation-triangle text-red-400 text-2xl" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Thiếu thông tin</h3>
        <p className="text-gray-500 text-sm mb-6">Vui lòng thực hiện quên mật khẩu trước.</p>
        <Link to="/forgot-password" className="btn-tis-danger px-6 py-2.5">
          <i className="fas fa-arrow-left mr-2" /> Quên mật khẩu
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <i className="fas fa-unlock-alt text-white text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h2>
        <p className="text-gray-500 text-sm mt-1">
          Nhập mã OTP đã gửi đến <span className="font-semibold text-gray-700">{phone}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* OTP */}
        <div>
          <label className="label-tis">Mã OTP</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fas fa-hashtag" />
            </span>
            <input
              {...register('otp_code')}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Nhập mã OTP"
              autoFocus
              className={`input-tis pl-10 text-center text-lg tracking-[0.3em] font-mono ${errors.otp_code ? 'border-red-400 focus:ring-red-200' : ''}`}
            />
          </div>
          {errors.otp_code && <p className="mt-1 text-xs text-red-500">{errors.otp_code.message}</p>}
        </div>

        {/* New Password */}
        <div>
          <label className="label-tis">Mật khẩu mới</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fas fa-lock" />
            </span>
            <input
              {...register('new_password')}
              type={showPass ? 'text' : 'password'}
              placeholder="Tối thiểu 6 ký tự"
              className={`input-tis pl-10 pr-10 ${errors.new_password ? 'border-red-400 focus:ring-red-200' : ''}`}
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>
          {errors.new_password && <p className="mt-1 text-xs text-red-500">{errors.new_password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="label-tis">Xác nhận mật khẩu mới</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fas fa-lock" />
            </span>
            <input
              {...register('confirm_password')}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu mới"
              className={`input-tis pl-10 pr-10 ${errors.confirm_password ? 'border-red-400 focus:ring-red-200' : ''}`}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <i className={`fas ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>
          {errors.confirm_password && <p className="mt-1 text-xs text-red-500">{errors.confirm_password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-tis-danger w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? <><i className="fas fa-spinner fa-spin mr-2" />Đang xử lý...</>
            : <><i className="fas fa-check mr-2" />Đặt lại mật khẩu</>
          }
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <Link to="/forgot-password" className="text-sm text-gray-500 hover:text-tis-red transition-colors">
          <i className="fas fa-redo mr-1" /> Gửi lại mã OTP
        </Link>
      </div>
    </div>
  )
}
