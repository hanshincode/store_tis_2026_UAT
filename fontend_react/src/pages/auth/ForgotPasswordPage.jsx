import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

const schema = z.object({
  email_or_phone: z.string()
    .min(1, 'Vui lòng nhập số điện thoại hoặc email')
    .refine(val => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
      const isPhone = /^0(3|5|7|8|9)\d{8}$/.test(val)
      return isEmail || isPhone
    }, 'Vui lòng nhập số điện thoại hoặc email hợp lệ'),
})

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    try {
      const response = await api.post('/users/forgot-password/', { email_or_phone: data.email_or_phone })
      const email = response.data?.email || ''
      const phone = response.data?.phone || ''
      toast.success('Mã khôi phục đã được gửi đến email đăng ký của bạn.')

      const queryParams = new URLSearchParams()
      if (email) queryParams.set('email', email)
      if (phone) queryParams.set('phone', phone)
      queryParams.set('account', data.email_or_phone)

      navigate(`/reset-password?${queryParams.toString()}`)
    } catch (err) {
      const msg = getErrorMessage(err, 'Không thể gửi yêu cầu khôi phục mật khẩu. Vui lòng thử lại.')
      Swal.fire({ icon: 'error', title: 'Có lỗi xảy ra', text: msg, confirmButtonColor: '#D71920' })
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <i className="fas fa-key text-white text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Quên mật khẩu</h2>
        <p className="text-gray-500 text-sm mt-1">Nhập số điện thoại hoặc email đã đăng ký để khôi phục mật khẩu</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email or Phone */}
        <div>
          <label className="label-tis">Số điện thoại hoặc Email</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fas fa-user-shield" />
            </span>
            <input
              {...register('email_or_phone')}
              type="text"
              placeholder="0912 345 678 hoặc email@example.com"
              className={`input-tis pl-10 ${errors.email_or_phone ? 'border-red-400 focus:ring-red-200' : ''}`}
            />
          </div>
          {errors.email_or_phone && <p className="mt-1 text-xs text-red-500">{errors.email_or_phone.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-tis-danger w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? <><i className="fas fa-spinner fa-spin mr-2" />Đang gửi...</>
            : <><i className="fas fa-paper-plane mr-2" />Gửi mã khôi phục</>
          }
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-3">
        <Link to="/login" className="block text-sm text-gray-500 hover:text-tis-red transition-colors">
          <i className="fas fa-arrow-left mr-1" /> Quay lại đăng nhập
        </Link>
      </div>
    </div>
  )
}
