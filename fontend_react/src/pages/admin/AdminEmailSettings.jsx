import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminEmailSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [setting, setSetting] = useState({
    backend: 'django.core.mail.backends.smtp.EmailBackend',
    host: 'smtp.office365.com',
    port: 587,
    use_tls: true,
    host_user: '',
    default_from_email: '',
    is_active: true,
    has_password: false,
    is_configured: false,
  })
  const [password, setPassword] = useState('')

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/email-settings/current/')
      setSetting({
        ...data,
        backend: data.backend || 'django.core.mail.backends.smtp.EmailBackend',
        host: data.host || 'smtp.office365.com',
        port: data.port || 587,
        use_tls: data.use_tls !== false,
        is_active: data.is_active !== false,
      })
      setPassword('')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải cấu hình email.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (setting.backend.includes('smtp')) {
      if (!setting.host.trim()) {
        toast.error('Vui lòng nhập SMTP host.')
        return
      }
      if (!setting.host_user.trim()) {
        toast.error('Vui lòng nhập tài khoản SMTP.')
        return
      }
      const fromEmail = (setting.default_from_email || setting.host_user || '').toLowerCase()
      const userEmail = setting.host_user.toLowerCase()
      if (fromEmail.includes('@') && userEmail.includes('@')) {
        const fromDomain = fromEmail.split('@').pop()
        const userDomain = userEmail.split('@').pop()
        if (fromDomain !== userDomain) {
          toast.error('Email gửi đi nên cùng domain với tài khoản SMTP.')
          return
        }
      }
    }

    if (setting.port < 1 || setting.port > 65535) {
      toast.error('Cổng SMTP không hợp lệ.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        backend: setting.backend,
        host: setting.host.trim(),
        port: Number(setting.port),
        use_tls: setting.use_tls,
        host_user: setting.host_user.trim(),
        default_from_email: setting.default_from_email.trim(),
        is_active: setting.is_active,
      }
      if (password) {
        payload.host_password = password
      }

      const { data } = await api.patch('/email-settings/current/', payload)
      setSetting({
        ...data,
        use_tls: data.use_tls !== false,
        is_active: data.is_active !== false,
      })
      setPassword('')
      toast.success('Đã lưu cấu hình email thành công.')
    } catch (err) {
      Swal.fire('Lỗi', getErrorMessage(err, 'Không thể lưu cấu hình email.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    const defaultRecipient = setting.default_from_email || setting.host_user || ''
    const { value: recipient } = await Swal.fire({
      title: 'Gửi email kiểm tra',
      input: 'email',
      inputLabel: 'Địa chỉ email nhận thử nghiệm',
      inputValue: defaultRecipient,
      showCancelButton: true,
      confirmButtonText: 'Gửi thử',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#D71920',
      inputValidator: (value) => {
        if (!value) {
          return 'Bạn phải điền email nhận!'
        }
      },
    })

    if (!recipient) return

    const loadingToast = toast.loading('Đang gửi email kiểm tra...')
    try {
      await api.post('/email-settings/test/', { recipient })
      toast.success('Đã gửi email kiểm tra thành công. Hãy kiểm tra hộp thư của bạn!', { id: loadingToast })
    } catch (err) {
      toast.dismiss(loadingToast)
      Swal.fire(
        'Không gửi được email',
        getErrorMessage(err, 'Vui lòng kiểm tra lại cấu hình SMTP.'),
        'error'
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner-tis" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <i className="fas fa-envelope text-red-500" /> Cấu hình Email (SMTP)
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Thiết lập máy chủ gửi thư điện tử tự động của hệ thống (OTP, Hóa đơn, Xác nhận...)
          </p>
        </div>
        <button
          onClick={loadSettings}
          className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-700 text-sm hover:bg-gray-50 flex items-center gap-1 transition"
        >
          <i className="fas fa-sync-alt" /> Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form */}
        <div className="lg:col-span-2 admin-card p-6 bg-white shadow-sm rounded-xl">
          <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
            Thông tin máy chủ SMTP
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Email Backend
                </label>
                <select
                  value={setting.backend}
                  onChange={(e) => setSetting({ ...setting, backend: e.target.value })}
                  className="input-tis w-full"
                >
                  <option value="django.core.mail.backends.smtp.EmailBackend">
                    SMTP (Khuyên dùng)
                  </option>
                  <option value="django.core.mail.backends.console.EmailBackend">
                    Console (Chỉ Debug)
                  </option>
                </select>
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  SMTP Host <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={setting.host}
                  onChange={(e) => setSetting({ ...setting, host: e.target.value })}
                  placeholder="smtp.example.com"
                  className="input-tis w-full"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Cổng SMTP (Port) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={setting.port}
                  onChange={(e) => setSetting({ ...setting, port: parseInt(e.target.value) || 0 })}
                  placeholder="587"
                  className="input-tis w-full"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="label-tis block text-sm font-semibold mb-1">
                  Tài khoản SMTP (Username) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={setting.host_user}
                  onChange={(e) => setSetting({ ...setting, host_user: e.target.value })}
                  placeholder="user@domain.com"
                  className="input-tis w-full"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Mật khẩu SMTP (Password)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    setting.has_password
                      ? '•••••••• (Đã lưu mật khẩu, để trống nếu không đổi)'
                      : 'Nhập mật khẩu / App Password'
                  }
                  className="input-tis w-full"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Email gửi đi (Default From)
                </label>
                <input
                  type="email"
                  value={setting.default_from_email}
                  onChange={(e) => setSetting({ ...setting, default_from_email: e.target.value })}
                  placeholder="no-reply@domain.com"
                  className="input-tis w-full"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={setting.use_tls}
                  onChange={(e) => setSetting({ ...setting, use_tls: e.target.checked })}
                  className="rounded text-red-500 focus:ring-red-500 h-4.5 w-4.5"
                />
                <span className="text-sm text-gray-700 font-medium select-none">
                  Kích hoạt mã hóa TLS (Khuyên dùng)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={setting.is_active}
                  onChange={(e) => setSetting({ ...setting, is_active: e.target.checked })}
                  className="rounded text-red-500 focus:ring-red-500 h-4.5 w-4.5"
                />
                <span className="text-sm text-gray-700 font-medium select-none">
                  Kích hoạt hệ thống gửi thư
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="btn-tis-danger px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm"
              >
                {saving ? (
                  <>
                    <div className="spinner-tis !w-4 !h-4 !border-2 !border-white" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save" /> Lưu cấu hình
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTestEmail}
                disabled={saving}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-2 transition"
              >
                <i className="fas fa-paper-plane text-red-500" /> Gửi email test
              </button>
            </div>
          </form>
        </div>

        {/* Right Dashboard Summary */}
        <div className="space-y-6">
          <div className="admin-card p-6 bg-white shadow-sm rounded-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
              Trạng thái cấu hình
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Trạng thái kết nối:</span>
                {setting.is_configured ? (
                  <span className="badge-tis bg-green-100 text-green-800 border border-green-200 text-xs px-2 py-0.5 rounded font-semibold">
                    Đã cấu hình
                  </span>
                ) : (
                  <span className="badge-tis bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs px-2 py-0.5 rounded font-semibold">
                    Chưa hoàn tất
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">SMTP Host:</span>
                <span className="font-semibold text-gray-800">
                  {setting.host ? `${setting.host}:${setting.port}` : '--'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Tài khoản SMTP:</span>
                <span className="font-semibold text-gray-800 max-w-[150px] truncate" title={setting.host_user}>
                  {setting.host_user || '--'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Email gửi đi:</span>
                <span className="font-semibold text-gray-800 max-w-[150px] truncate" title={setting.default_from_email}>
                  {setting.default_from_email || setting.host_user || '--'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Hệ thống gửi thư:</span>
                {setting.is_active ? (
                  <span className="text-green-600 font-semibold flex items-center gap-1 text-xs">
                    <i className="fas fa-check-circle" /> Đang kích hoạt
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold flex items-center gap-1 text-xs">
                    <i className="fas fa-times-circle" /> Đang tạm tắt
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="admin-card p-6 bg-red-50/50 border border-red-100 rounded-xl">
            <h4 className="text-sm font-bold text-red-800 flex items-center gap-1.5 mb-2">
              <i className="fas fa-info-circle" /> Lưu ý quan trọng
            </h4>
            <ul className="text-xs text-red-700 list-disc pl-4 space-y-1">
              <li>Mật khẩu SMTP thường là App Password được tạo trong cài đặt tài khoản bảo mật của nhà cung cấp dịch vụ email (Google, Microsoft 365, Outlook).</li>
              <li>Để gửi email ổn định, vui lòng kiểm tra giới hạn gửi thư hàng ngày của nhà cung cấp.</li>
              <li>Sử dụng nút <strong>Gửi email test</strong> để xác minh ngay sau khi thay đổi cấu hình.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
