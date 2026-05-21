import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'

const schema = z.object({
  current_password: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  new_password:     z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự'),
  confirm_password: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirm_password'],
}).refine(d => d.current_password !== d.new_password, {
  message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  path: ['new_password'],
})

export default function ForceChangePasswordPage() {
  const navigate = useNavigate()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    try {
      await api.post('/change-password/', {
        current_password: data.current_password,
        new_password: data.new_password,
      })
      await Swal.fire({
        icon: 'success',
        title: 'Đổi mật khẩu thành công!',
        text: 'Mật khẩu của bạn đã được cập nhật.',
        confirmButtonColor: '#D71920',
      })
      navigate('/', { replace: true })
    } catch (err) {
      const msg = getErrorMessage(err, 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.')
      Swal.fire({ icon: 'error', title: 'Đổi mật khẩu thất bại', text: msg, confirmButtonColor: '#D71920' })
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <i className="fas fa-exchange-alt text-white text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Đổi mật khẩu</h2>
        <p className="text-gray-500 text-sm mt-1">Bạn cần thay đổi mật khẩu để tiếp tục sử dụng</p>
      </div>

      {/* Info Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <i className="fas fa-info-circle text-amber-500 mt-0.5" />
          <p className="text-sm text-amber-700">
            Vì lý do bảo mật, bạn cần đổi mật khẩu. Mật khẩu mới phải có ít nhất 6 ký tự và khác mật khẩu hiện tại.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Current Password */}
        <div>
          <label className="label-tis">Mật khẩu hiện tại</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fas fa-lock" />
            </span>
            <input
              {...register('current_password')}
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Nhập mật khẩu hiện tại"
              className={`input-tis pl-10 pr-10 ${errors.current_password ? 'border-red-400 focus:ring-red-200' : ''}`}
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <i className={`fas ${showCurrent ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>
          {errors.current_password && <p className="mt-1 text-xs text-red-500">{errors.current_password.message}</p>}
        </div>

        {/* New Password */}
        <div>
          <label className="label-tis">Mật khẩu mới</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fas fa-key" />
            </span>
            <input
              {...register('new_password')}
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Tối thiểu 6 ký tự"
              className={`input-tis pl-10 pr-10 ${errors.new_password ? 'border-red-400 focus:ring-red-200' : ''}`}
            />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <i className={`fas ${showNew ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>
          {errors.new_password && <p className="mt-1 text-xs text-red-500">{errors.new_password.message}</p>}
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="label-tis">Xác nhận mật khẩu mới</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <i className="fas fa-lock" />
            </span>
            <input
              {...register('confirm_password')}
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
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
            ? <><i className="fas fa-spinner fa-spin mr-2" />Đang cập nhật...</>
            : <><i className="fas fa-save mr-2" />Cập nhật mật khẩu</>
          }
        </button>
      </form>
    </div>
  )
}
