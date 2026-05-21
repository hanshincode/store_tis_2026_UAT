import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

const schema = z.object({
  phone: z.string()
    .min(1, 'Vui lòng nhập số điện thoại')
    .regex(/^0(3|5|7|8|9)\d{8}$/, 'Số điện thoại không hợp lệ'),
})

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    try {
      await api.post('/forgot-password/', { phone: data.phone })
      toast.success('OTP đã được gửi đến số điện thoại của bạn')
      navigate(`/reset-password?phone=${encodeURIComponent(data.phone)}`)
    } catch (err) {
      const msg = getErrorMessage(err, 'Không thể gửi mã OTP. Vui lòng thử lại.')
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
        <p className="text-gray-500 text-sm mt-1">Nhập số điện thoại để nhận mã OTP đặt lại mật khẩu</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Phone */}
        <div>
          <label className="label-tis">Số điện thoại</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fas fa-phone-alt" />
            </span>
            <input
              {...register('phone')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0912 345 678"
              className={`input-tis pl-10 ${errors.phone ? 'border-red-400 focus:ring-red-200' : ''}`}
            />
          </div>
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-tis-danger w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? <><i className="fas fa-spinner fa-spin mr-2" />Đang gửi...</>
            : <><i className="fas fa-paper-plane mr-2" />Gửi mã OTP</>
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
