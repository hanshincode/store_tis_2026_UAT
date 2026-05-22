import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'
import PasswordField from '@/components/ui/PasswordField'

export default function AdminEmailSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
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

  const loadSettings = async (showToast = false) => {
    if (showToast) setRefreshing(true)
    else setLoading(true)
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
      if (showToast) {
        toast.success('Đã làm mới cấu hình email.')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải cấu hình email.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
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
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-tis-red animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Premium Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-tis-red/80 rounded-2xl p-6 md:p-8 shadow-xl text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-tis-red/20 rounded-full blur-2xl -ml-16 -mb-16"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-tis-red/20 border border-tis-red/35 text-xs text-red-200 font-semibold tracking-wider rounded-full uppercase">
                System Utility
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <i className="fas fa-envelope text-tis-red" /> Cấu hình Email (SMTP)
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Thiết lập máy chủ gửi thư điện tử tự động của hệ thống (mã xác minh OTP, Hóa đơn bảo hiểm, Thông báo từ hệ thống...)
            </p>
          </div>
          
          <button
            onClick={() => loadSettings(true)}
            disabled={refreshing}
            className="self-start md:self-center px-4 py-2 bg-white/10 hover:bg-white/15 active:scale-95 text-white border border-white/15 rounded-xl text-sm font-semibold flex items-center gap-2 transition duration-200 backdrop-blur-md shadow-lg"
          >
            <i className={`fas fa-sync-alt ${refreshing ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Form settings */}
        <div className="lg:col-span-2 bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/55 border-b border-slate-100 flex items-center gap-2">
            <i className="fas fa-sliders text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800">
              Thông tin cấu hình SMTP Server
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Email Backend
                </label>
                <select
                  value={setting.backend}
                  onChange={(e) => setSetting({ ...setting, backend: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-tis-red focus:ring-2 focus:ring-tis-red/10 transition-all duration-300"
                >
                  <option value="django.core.mail.backends.smtp.EmailBackend">
                    SMTP (Khuyên dùng cho Production)
                  </option>
                  <option value="django.core.mail.backends.console.EmailBackend">
                    Console Debug (Chỉ in ra Log của Terminal)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  SMTP Host <span className="text-tis-red">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <i className="fas fa-server text-xs" />
                  </div>
                  <input
                    type="text"
                    value={setting.host}
                    onChange={(e) => setSetting({ ...setting, host: e.target.value })}
                    placeholder="smtp.example.com"
                    className="w-full pl-9 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-tis-red focus:ring-2 focus:ring-tis-red/10 transition-all duration-300"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Cổng SMTP (Port) <span className="text-tis-red">*</span>
                </label>
                <input
                  type="number"
                  value={setting.port}
                  onChange={(e) => setSetting({ ...setting, port: parseInt(e.target.value) || 0 })}
                  placeholder="587"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-tis-red focus:ring-2 focus:ring-tis-red/10 transition-all duration-300"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Tài khoản SMTP (Username) <span className="text-tis-red">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <i className="fas fa-user-circle text-xs" />
                  </div>
                  <input
                    type="text"
                    value={setting.host_user}
                    onChange={(e) => setSetting({ ...setting, host_user: e.target.value })}
                    placeholder="user@domain.com"
                    className="w-full pl-9 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-tis-red focus:ring-2 focus:ring-tis-red/10 transition-all duration-300"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Mật khẩu SMTP (Password)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <i className="fas fa-key text-xs" />
                  </div>
                  <PasswordField
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      setting.has_password
                        ? '•••••••• (Đã lưu, để trống để giữ nguyên)'
                        : 'Nhập mật khẩu / App Password'
                    }
                    className="w-full pl-9 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-tis-red focus:ring-2 focus:ring-tis-red/10 transition-all duration-300"
                    buttonClassName="right-3.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Email gửi đi (Default From)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <i className="fas fa-paper-plane text-xs" />
                  </div>
                  <input
                    type="email"
                    value={setting.default_from_email}
                    onChange={(e) => setSetting({ ...setting, default_from_email: e.target.value })}
                    placeholder="no-reply@domain.com"
                    className="w-full pl-9 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-tis-red focus:ring-2 focus:ring-tis-red/10 transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6 py-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={setting.use_tls}
                  onChange={(e) => setSetting({ ...setting, use_tls: e.target.checked })}
                  className="rounded border-slate-300 text-tis-red focus:ring-tis-red/30 h-4.5 w-4.5 accent-tis-red cursor-pointer transition-colors"
                />
                <span className="text-sm text-slate-700 font-semibold select-none group-hover:text-slate-900 transition-colors">
                  Kích hoạt mã hóa TLS
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={setting.is_active}
                  onChange={(e) => setSetting({ ...setting, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-tis-red focus:ring-tis-red/30 h-4.5 w-4.5 accent-tis-red cursor-pointer transition-colors"
                />
                <span className="text-sm text-slate-700 font-semibold select-none group-hover:text-slate-900 transition-colors">
                  Kích hoạt hệ thống gửi thư
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-tis-red to-tis-red/90 hover:from-tis-red hover:to-red-600 text-white font-bold rounded-xl text-sm transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-red-500/10 hover:shadow-red-500/20 active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                className="px-5 py-2.5 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition active:scale-98 flex items-center gap-2 shadow-sm"
              >
                <i className="fas fa-paper-plane text-tis-red" /> Gửi email test
              </button>
            </div>
          </form>
        </div>

        {/* Right Info Panels */}
        <div className="space-y-6">
          {/* Status summary */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50/55 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                Trạng thái cấu hình
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Trạng thái kết nối:</span>
                {setting.is_configured ? (
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs rounded-full font-bold">
                    Đã hoàn tất
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs rounded-full font-bold">
                    Chưa hoàn tất
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">SMTP Server:</span>
                <span className="font-semibold text-slate-800 text-right">
                  {setting.host ? `${setting.host}:${setting.port}` : '--'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Tài khoản gửi:</span>
                <span className="font-semibold text-slate-800 max-w-[170px] truncate text-right" title={setting.host_user}>
                  {setting.host_user || '--'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm py-1.5 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Email gửi đi:</span>
                <span className="font-semibold text-slate-800 max-w-[170px] truncate text-right" title={setting.default_from_email}>
                  {setting.default_from_email || setting.host_user || '--'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm pt-1">
                <span className="text-slate-500 font-medium">Mã hóa TLS:</span>
                {setting.use_tls ? (
                  <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                    <i className="fas fa-lock" /> Đang bật (SSL/TLS)
                  </span>
                ) : (
                  <span className="text-amber-600 font-bold text-xs flex items-center gap-1">
                    <i className="fas fa-unlock" /> Không dùng (Bảo mật thấp)
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center text-sm pt-1.5">
                <span className="text-slate-500 font-medium">Hệ thống gửi thư:</span>
                {setting.is_active ? (
                  <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" /> Đang kích hoạt
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Đang tạm tắt
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notes info */}
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
              <i className="fas fa-triangle-exclamation text-amber-600" /> Lưu ý quan trọng
            </h4>
            <div className="text-xs text-amber-700 leading-relaxed space-y-2 font-medium">
              <p>1. Mật khẩu SMTP thường là <strong>App Password (Mật khẩu ứng dụng)</strong> được tạo trong cài đặt bảo mật 2 lớp của Gmail hoặc Microsoft Outlook/O365. Không nên điền mật khẩu chính của tài khoản.</p>
              <p>2. Đảm bảo cấu hình cổng (Port) và phương thức mã hóa TLS đồng bộ với hướng dẫn của nhà cung cấp SMTP (VD: Gmail dùng TLS cổng 587 hoặc SSL cổng 465).</p>
              <p>3. Sử dụng tính năng <strong>Gửi email test</strong> ở góc dưới bên trái form để kiểm tra kết nối ngay sau khi thay đổi để đảm bảo các tiến trình gửi OTP của người dùng không bị gián đoạn.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
