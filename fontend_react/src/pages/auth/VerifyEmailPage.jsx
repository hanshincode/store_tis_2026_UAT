import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

const schema = z.object({
  code: z.string().min(1, 'Vui lòng nhập mã xác thực'),
})

const RESEND_COOLDOWN = 60 // seconds

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const email = searchParams.get('email') || ''
  const token = searchParams.get('token') || ''
  const [countdown, setCountdown] = useState(0)
  const [resending, setResending] = useState(false)
  const [verifyingToken, setVerifyingToken] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // Start countdown on mount
  useEffect(() => {
    setCountdown(RESEND_COOLDOWN)
  }, [])

  // Auto verification if token exists
  useEffect(() => {
    if (token) {
      const autoVerify = async () => {
        setVerifyingToken(true)
        try {
          await api.post('/users/verify-email/', { token, email, phone })
          await Swal.fire({
            icon: 'success',
            title: 'Xác thực thành công!',
            text: 'Tài khoản đã được kích hoạt thành công. Vui lòng đăng nhập.',
            confirmButtonColor: '#D71920',
          })
          navigate('/login', { replace: true })
        } catch (err) {
          const msg = getErrorMessage(err, 'Liên kết xác thực không hợp lệ hoặc đã hết hạn.')
          Swal.fire({ icon: 'error', title: 'Xác thực thất bại', text: msg, confirmButtonColor: '#D71920' })
        } finally {
          setVerifyingToken(false)
        }
      }
      autoVerify()
    }
  }, [token, email, phone, navigate])

  const onSubmit = async (data) => {
    try {
      await api.post('/users/verify-email/', { phone, email, token, code: data.code })
      await Swal.fire({
        icon: 'success',
        title: 'Xác thực thành công!',
        text: 'Tài khoản đã được kích hoạt. Vui lòng đăng nhập.',
        confirmButtonColor: '#D71920',
      })
      navigate('/login', { replace: true })
    } catch (err) {
      const msg = getErrorMessage(err, 'Mã xác thực không đúng hoặc đã hết hạn.')
      Swal.fire({ icon: 'error', title: 'Xác thực thất bại', text: msg, confirmButtonColor: '#D71920' })
    }
  }

  const handleResend = useCallback(async () => {
    if (countdown > 0 || resending) return
    setResending(true)
    try {
      await api.post('/users/resend-verification/', { email_or_phone: email || phone })
      toast.success('Mã xác thực mới đã được gửi đến email của bạn.')
      setCountdown(RESEND_COOLDOWN)
    } catch (err) {
      const msg = getErrorMessage(err, 'Không thể gửi lại mã. Vui lòng thử lại.')
      toast.error(msg)
    } finally {
      setResending(false)
    }
  }, [phone, email, countdown, resending])

  if (verifyingToken) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-tis-red">
          <i className="fas fa-spinner fa-spin text-2xl" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Đang xác thực liên kết...</h3>
        <p className="text-gray-500 text-sm">Vui lòng chờ trong giây lát hệ thống đang kích hoạt tài khoản của bạn.</p>
      </div>
    )
  }

  // If no email, phone and token param, show error
  if (!phone && !email && !token) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-exclamation-triangle text-red-400 text-2xl" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Thiếu thông tin</h3>
        <p className="text-gray-500 text-sm mb-6">Vui lòng đăng ký tài khoản trước hoặc sử dụng liên kết xác minh từ email.</p>
        <Link to="/register" className="btn-tis-danger px-6 py-2.5">
          <i className="fas fa-user-plus mr-2" /> Đăng ký
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <i className="fas fa-envelope-open-text text-white text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Xác thực tài khoản</h2>
        <p className="text-gray-500 text-sm mt-1">
          Nhập mã xác thực đã gửi đến <span className="font-semibold text-gray-700">{email || phone}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Verification Code */}
        <div>
          <label className="label-tis">Mã xác thực</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fas fa-shield-alt" />
            </span>
            <input
              {...register('code')}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Nhập mã xác thực"
              autoFocus
              className={`input-tis pl-10 text-center text-lg tracking-[0.3em] font-mono ${errors.code ? 'border-red-400 focus:ring-red-200' : ''}`}
            />
          </div>
          {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-tis-danger w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? <><i className="fas fa-spinner fa-spin mr-2" />Đang xác thực...</>
            : <><i className="fas fa-check-circle mr-2" />Xác thực</>
          }
        </button>
      </form>

      {/* Resend */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 mb-2">Chưa nhận được mã?</p>
        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || resending}
          className={`text-sm font-semibold transition-colors ${
            countdown > 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-tis-red hover:underline cursor-pointer'
          }`}
        >
          {resending ? (
            <><i className="fas fa-spinner fa-spin mr-1" /> Đang gửi...</>
          ) : countdown > 0 ? (
            <><i className="fas fa-clock mr-1" /> Gửi lại mã ({countdown}s)</>
          ) : (
            <><i className="fas fa-redo mr-1" /> Gửi lại mã</>
          )}
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <Link to="/login" className="text-sm text-gray-500 hover:text-tis-red transition-colors">
          <i className="fas fa-arrow-left mr-1" /> Quay lại đăng nhập
        </Link>
      </div>
    </div>
  )
}
