import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'
import PasswordField from '@/components/ui/PasswordField'

const SOCIAL_PROVIDER_META = {
  google: {
    icon: 'fab fa-google text-red-500',
    brandBg: 'from-red-500/5 to-amber-500/5 hover:border-red-200',
    brandBorder: 'border-red-100',
    brandText: 'text-red-600',
    accentColor: 'focus:ring-red-500/10 focus:border-red-500',
    title: 'Google OAuth Connection',
    description: 'Đăng nhập một chạm an toàn sử dụng tài khoản Google Workspace hoặc Gmail cá nhân.',
    callbackPath: '/accounts/google/login/callback/',
    guide: [
      'Truy cập Google Cloud Console, tạo Project mới hoặc chọn project hiện tại.',
      'Vào mục APIs & Services > Credentials, tạo một OAuth client ID loại Web application.',
      'Thêm URL callback tương ứng bên dưới vào mục "Authorized redirect URIs".',
      'Sao chép Client ID và Client Secret điền vào biểu mẫu này và lưu lại.',
    ],
  },
  microsoft: {
    icon: 'fab fa-windows text-sky-500',
    brandBg: 'from-sky-500/5 to-indigo-500/5 hover:border-sky-200',
    brandBorder: 'border-sky-100',
    brandText: 'text-sky-600',
    accentColor: 'focus:ring-sky-500/10 focus:border-sky-500',
    title: 'Microsoft Outlook / Office 365',
    description: 'Đăng nhập bảo mật sử dụng tài khoản Microsoft, Outlook, Live hoặc Office 365 doanh nghiệp.',
    callbackPath: '/accounts/microsoft/login/callback/',
    guide: [
      'Đăng nhập Azure Portal, vào mục App Registrations và tạo một Web App Registration.',
      'Thêm URL callback tương ứng bên dưới vào mục Authentication > Redirect URIs.',
      'Tạo một Client Secret mới trong Certificates & secrets và lưu lại giá trị secret.',
      'Sao chép Application (client) ID và Client Secret vừa tạo điền vào đây.',
      'Trường Tenant mặc định là "common" để hỗ trợ mọi tài khoản Microsoft. Thay đổi nếu chỉ dùng nội bộ doanh nghiệp.',
    ],
  },
}

export default function AdminSocialLogin() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState([])
  const [submittingId, setSubmittingId] = useState(null)
  const [secrets, setSecrets] = useState({}) // stores secret input by provider

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/social-login-settings/')
      setSettings(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải cấu hình đăng nhập mạng xã hội.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleFieldChange = (id, field, value) => {
    setSettings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const handleSecretChange = (provider, value) => {
    setSecrets((prev) => ({ ...prev, [provider]: value }))
  }

  const handleSubmit = async (e, item) => {
    e.preventDefault()

    if (!item.client_id.trim()) {
      toast.error(`Vui lòng điền Client ID cho kết nối ${item.provider_label || item.provider}.`)
      return
    }

    setSubmittingId(item.id)
    try {
      const payload = {
        provider: item.provider,
        name: item.name.trim(),
        tenant: item.tenant?.trim() || '',
        client_id: item.client_id.trim(),
        callback_url: item.callback_url.trim(),
        note: item.note?.trim() || '',
        is_active: !!item.is_active,
      }

      const secretVal = secrets[item.provider]?.trim()
      if (secretVal) {
        payload.client_secret = secretVal
      }

      await api.patch(`/social-login-settings/${item.id}/`, payload)
      setSecrets((prev) => ({ ...prev, [item.provider]: '' }))
      toast.success(`Đã lưu cấu hình đăng nhập ${item.provider_label || item.provider}.`)
      await loadSettings()
    } catch (err) {
      Swal.fire('Lỗi', getErrorMessage(err, 'Không thể lưu cấu hình.'), 'error')
    } finally {
      setSubmittingId(null)
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
                OAuth2 SSO
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <i className="fas fa-key text-tis-red" /> Đăng nhập Mạng xã hội
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Cấu hình các cổng đăng nhập một chạm sử dụng giao thức OAuth2 an toàn. Người dùng và nhân viên có thể sử dụng tài khoản Google hoặc Microsoft SSO để đăng nhập nhanh vào hệ thống.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.map((item) => {
          const meta = SOCIAL_PROVIDER_META[item.provider] || {}
          const providerTitle = item.provider_label || meta.title || item.provider
          const defaultCallback = `${window.location.origin}${meta.callbackPath || ''}`
          const isSubmitting = submittingId === item.id

          return (
            <div
              key={item.id}
              className={`bg-gradient-to-br ${meta.brandBg || 'from-slate-50 to-slate-100'} border ${meta.brandBorder || 'border-slate-100'} shadow-sm rounded-2xl p-6 flex flex-col justify-between transition-all duration-300`}
            >
              <div>
                {/* Header card */}
                <div className="flex justify-between items-start gap-4 mb-5 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-slate-150">
                      <i className={meta.icon || 'fas fa-shield-alt text-slate-500'} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{providerTitle}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{meta.description}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      item.is_active && item.client_id && item.has_client_secret
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {item.is_active ? 'ĐANG BẬT' : 'TẠM TẮT'}
                  </span>
                </div>

                {/* Form fields */}
                <form onSubmit={(e) => handleSubmit(e, item)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Tên kết nối
                      </label>
                      <input
                        type="text"
                        value={item.name || ''}
                        onChange={(e) => handleFieldChange(item.id, 'name', e.target.value)}
                        className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-tis-red/10 focus:border-tis-red transition-all duration-300`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Tenant ID (Chỉ Microsoft)
                      </label>
                      <input
                        type="text"
                        value={item.tenant || ''}
                        onChange={(e) => handleFieldChange(item.id, 'tenant', e.target.value)}
                        placeholder="common"
                        disabled={item.provider !== 'microsoft'}
                        className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-tis-red/10 focus:border-tis-red transition-all duration-300 disabled:bg-slate-50 disabled:cursor-not-allowed`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Client ID (Application ID) <span className="text-tis-red">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.client_id || ''}
                      onChange={(e) => handleFieldChange(item.id, 'client_id', e.target.value)}
                      placeholder="Nhập client id của app"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-tis-red/10 focus:border-tis-red transition-all duration-300 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Client Secret (Mã khóa bí mật)
                    </label>
                    <PasswordField
                      value={secrets[item.provider] || ''}
                      onChange={(e) => handleSecretChange(item.provider, e.target.value)}
                      placeholder={
                        item.has_client_secret
                          ? '•••••••••••••••• (Đã lưu khóa bí mật, để trống nếu không đổi)'
                          : 'Nhập client secret'
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-tis-red/10 focus:border-tis-red transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Callback URL (Redirect URI)
                    </label>
                    <input
                      type="text"
                      value={item.callback_url || defaultCallback}
                      onChange={(e) => handleFieldChange(item.id, 'callback_url', e.target.value)}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-mono"
                      readOnly
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Ghi chú vận hành
                    </label>
                    <textarea
                      value={item.note || ''}
                      onChange={(e) => handleFieldChange(item.id, 'note', e.target.value)}
                      placeholder="Ví dụ: App Google chính thức của TIS Broker..."
                      rows={2}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-tis-red/10 focus:border-tis-red transition-all duration-300"
                    />
                  </div>

                  {/* Guide Accordion */}
                  <div className="bg-white/80 border border-slate-150 rounded-xl p-3.5 space-y-2">
                    <h4 className="text-[10px] font-extrabold text-slate-700 flex items-center gap-1 uppercase tracking-wide">
                      <i className="fas fa-circle-info text-tis-red" /> Hướng dẫn cấu hình tích hợp
                    </h4>
                    <ol className="list-decimal pl-4 text-[10px] text-slate-500 space-y-1.5 font-medium leading-relaxed">
                      {meta.guide?.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Switch and Save */}
                  <div className="flex items-center justify-between pt-3.5 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={!!item.is_active}
                        onChange={(e) => handleFieldChange(item.id, 'is_active', e.target.checked)}
                        className="rounded border-slate-300 text-tis-red focus:ring-tis-red/30 h-4.5 w-4.5 accent-tis-red cursor-pointer transition-colors"
                      />
                      <span className="text-xs text-slate-700 font-bold select-none group-hover:text-slate-900 transition-colors">
                        Kích hoạt đăng nhập {item.provider === 'google' ? 'Google' : 'Microsoft'}
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-gradient-to-r from-tis-red to-tis-red/90 hover:from-tis-red hover:to-red-600 text-white font-bold rounded-xl text-xs transition duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10 hover:shadow-red-500/20 active:scale-98 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Đang lưu
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save" /> Lưu kết nối
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
