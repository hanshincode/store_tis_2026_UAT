import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminZaloOASettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingId, setSettingId] = useState(null)
  const [setting, setSetting] = useState({
    name: 'Zalo OA',
    oa_id: '',
    app_id: '',
    login_callback_url: '',
    oa_callback_url: '',
    is_active: true,
    has_access_token: false,
  })

  const [secrets, setSecrets] = useState({
    app_secret: '',
    access_token: '',
    refresh_token: '',
    webhook_secret: '',
  })

  const [showSecrets, setShowSecrets] = useState({
    app_secret: false,
    access_token: false,
    refresh_token: false,
    webhook_secret: false,
  })

  const toggleSecretVisibility = (field) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/zalo-oa-settings/')
      const raw = Array.isArray(data) ? data[0] : data
      if (raw) {
        setSettingId(raw.id)
        setSetting({
          name: raw.name || 'Zalo OA',
          oa_id: raw.oa_id || '',
          app_id: raw.app_id || '',
          login_callback_url: raw.login_callback_url || '',
          oa_callback_url: raw.oa_callback_url || '',
          is_active: raw.is_active !== false,
          has_access_token: !!raw.has_access_token,
        })
      }
      setSecrets({
        app_secret: '',
        access_token: '',
        refresh_token: '',
        webhook_secret: '',
      })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải cấu hình Zalo OA.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    setSaving(true)
    try {
      const payload = {
        name: setting.name.trim() || 'Zalo OA',
        oa_id: setting.oa_id.trim(),
        app_id: setting.app_id.trim(),
        login_callback_url: setting.login_callback_url.trim(),
        oa_callback_url: setting.oa_callback_url.trim(),
        is_active: setting.is_active,
      }

      // Append sensitive secrets only if provided
      if (secrets.app_secret.trim()) payload.app_secret = secrets.app_secret.trim()
      if (secrets.access_token.trim()) payload.access_token = secrets.access_token.trim()
      if (secrets.refresh_token.trim()) payload.refresh_token = secrets.refresh_token.trim()
      if (secrets.webhook_secret.trim()) payload.webhook_secret = secrets.webhook_secret.trim()

      const method = settingId ? 'patch' : 'post'
      const url = settingId ? `/zalo-oa-settings/${settingId}/` : '/zalo-oa-settings/'

      const { data } = await api[method](url, payload)
      setSettingId(data.id)
      toast.success('Đã lưu cấu hình Zalo OA thành công.')
      await loadSettings()
    } catch (err) {
      Swal.fire('Lỗi', getErrorMessage(err, 'Không thể lưu cấu hình Zalo OA.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const isConnected = setting.is_active && setting.has_access_token

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-[#D71920] animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Premium Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-[#D71920]/45 rounded-2xl p-6 md:p-8 shadow-xl text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#D71920]/10 rounded-full blur-2xl -ml-16 -mb-16"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-[#D71920]/20 border border-[#D71920]/35 text-xs text-red-200 font-semibold tracking-wider rounded-full uppercase">
                Zalo API Integration
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <i className="fas fa-comment-dots text-red-500" /> Cấu hình Zalo Official Account (OA)
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Thiết lập kết nối kỹ thuật Zalo OA để gửi tin nhắn, đồng bộ hội thoại và CSKH trực tiếp từ hệ thống.
            </p>
          </div>
          <button
            onClick={loadSettings}
            className="self-start md:self-auto px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white text-sm font-semibold flex items-center gap-1.5 transition duration-300 shadow-md backdrop-blur-sm"
          >
            <i className="fas fa-sync-alt" /> Làm mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form */}
        <div className="lg:col-span-2 bg-white border border-slate-100 shadow-sm rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-plug text-[#D71920]" /> Tham số kết nối Zalo API
            </h3>
            <p className="text-xs text-slate-400 mt-1">Cung cấp các thông tin định danh và bảo mật từ trang quản trị ứng dụng Zalo Developer.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label-tis block text-sm font-semibold text-slate-700 mb-1.5">
                  Tên cấu hình
                </label>
                <input
                  type="text"
                  value={setting.name}
                  onChange={(e) => setSetting({ ...setting, name: e.target.value })}
                  placeholder="Zalo OA"
                  className="input-tis w-full focus:ring-[#D71920]/10 focus:border-[#D71920]"
                  required
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold text-slate-700 mb-1.5">
                  Zalo OA ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={setting.oa_id}
                  onChange={(e) => setSetting({ ...setting, oa_id: e.target.value })}
                  placeholder="Nhập ID Zalo OA của bạn"
                  className="input-tis w-full focus:ring-[#D71920]/10 focus:border-[#D71920]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label-tis block text-sm font-semibold text-slate-700 mb-1.5">
                  App ID Zalo Developer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={setting.app_id}
                  onChange={(e) => setSetting({ ...setting, app_id: e.target.value })}
                  placeholder="Nhập ID ứng dụng Zalo"
                  className="input-tis w-full font-mono focus:ring-[#D71920]/10 focus:border-[#D71920]"
                  required
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold text-slate-700 mb-1.5">
                  App Secret (Khóa bí mật ứng dụng)
                </label>
                <div className="relative">
                  <input
                    type={showSecrets.app_secret ? 'text' : 'password'}
                    value={secrets.app_secret}
                    onChange={(e) => setSecrets({ ...secrets, app_secret: e.target.value })}
                    placeholder="Để trống nếu không thay đổi"
                    className="input-tis w-full pr-10 focus:ring-[#D71920]/10 focus:border-[#D71920]"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility('app_secret')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <i className={`far ${showSecrets.app_secret ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label-tis block text-sm font-semibold text-slate-700 mb-1.5">
                  Access Token mới
                </label>
                <div className="relative">
                  <input
                    type={showSecrets.access_token ? 'text' : 'password'}
                    value={secrets.access_token}
                    onChange={(e) => setSecrets({ ...secrets, access_token: e.target.value })}
                    placeholder="Nhập access token mới nếu cần cập nhật thủ công"
                    className="input-tis w-full pr-10 font-mono text-sm focus:ring-[#D71920]/10 focus:border-[#D71920]"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility('access_token')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <i className={`far ${showSecrets.access_token ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold text-slate-700 mb-1.5">
                  Refresh Token mới
                </label>
                <div className="relative">
                  <input
                    type={showSecrets.refresh_token ? 'text' : 'password'}
                    value={secrets.refresh_token}
                    onChange={(e) => setSecrets({ ...secrets, refresh_token: e.target.value })}
                    placeholder="Nhập refresh token mới để tự động gia hạn"
                    className="input-tis w-full pr-10 font-mono text-sm focus:ring-[#D71920]/10 focus:border-[#D71920]"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility('refresh_token')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <i className={`far ${showSecrets.refresh_token ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label-tis block text-sm font-semibold text-slate-700 mb-1.5">
                  Webhook Secret (Khóa xác thực Webhook)
                </label>
                <div className="relative">
                  <input
                    type={showSecrets.webhook_secret ? 'text' : 'password'}
                    value={secrets.webhook_secret}
                    onChange={(e) => setSecrets({ ...secrets, webhook_secret: e.target.value })}
                    placeholder="Nhập khóa webhook nhận tin nhắn"
                    className="input-tis w-full pr-10 focus:ring-[#D71920]/10 focus:border-[#D71920]"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility('webhook_secret')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <i className={`far ${showSecrets.webhook_secret ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold text-slate-700 mb-1.5">
                  Webhook Callback URL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={setting.oa_callback_url}
                    onClick={(e) => {
                      e.target.select()
                      navigator.clipboard.writeText(setting.oa_callback_url)
                      toast.success('Đã sao chép Webhook URL')
                    }}
                    placeholder="https://store.tisbroker.com/api/zalo/webhook/"
                    className="input-tis w-full bg-slate-50 text-slate-500 font-mono text-xs cursor-pointer hover:bg-slate-100 transition"
                    title="Click để sao chép"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                    <i className="far fa-copy" />
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="label-tis block text-sm font-semibold text-slate-700 mb-1.5">
                Zalo Login Callback URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={setting.login_callback_url}
                  onClick={(e) => {
                    e.target.select()
                    navigator.clipboard.writeText(setting.login_callback_url)
                    toast.success('Đã sao chép Callback URL')
                  }}
                  placeholder="https://store.tisbroker.com/accounts/zalo/login/callback/"
                  className="input-tis w-full bg-slate-50 text-slate-500 font-mono text-xs cursor-pointer hover:bg-slate-100 transition"
                  title="Click để sao chép"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  <i className="far fa-copy" />
                </span>
              </div>
            </div>

            <div className="flex items-center pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={setting.is_active}
                    onChange={(e) => setSetting({ ...setting, is_active: e.target.checked })}
                    className="sr-only peer"
                    id="is_active_toggle"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D71920]"></div>
                </div>
                <span className="text-sm text-slate-700 font-semibold select-none group-hover:text-slate-900 transition">
                  Kích hoạt tích hợp Zalo OA trên hệ thống
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-[#D71920] to-[#f54950] text-white hover:opacity-90 active:scale-95 transition-all duration-200 px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save" /> Lưu cấu hình
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Info Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
              <i className="fas fa-info-circle text-slate-400" /> Trạng thái Zalo OA
            </h3>
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Tình trạng kết nối:</span>
                {isConnected ? (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Đang kết nối
                  </span>
                ) : (
                  <span className="bg-slate-50 text-slate-600 border border-slate-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Chưa kết nối
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Tên cấu hình:</span>
                <span className="font-bold text-slate-800">
                  {setting.name || '--'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">OA ID:</span>
                <span className="font-semibold text-slate-700 font-mono text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  {setting.oa_id || '--'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">App ID:</span>
                <span className="font-semibold text-slate-700 font-mono text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  {setting.app_id || '--'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Trạng thái cấu hình:</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${setting.is_active ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}>
                  {setting.is_active ? 'Đang bật' : 'Đang tắt'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/30 border border-blue-100 rounded-2xl p-6 space-y-3 shadow-sm">
            <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
              <i className="fas fa-lightbulb text-amber-500" /> Cách lấy Token Zalo OA
            </h4>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p className="flex gap-1.5">
                <span className="font-bold text-blue-900">1.</span>
                <span>Truy cập <strong>Zalo Developer Portal</strong> và tạo ứng dụng liên kết với Zalo OA của doanh nghiệp.</span>
              </p>
              <p className="flex gap-1.5">
                <span className="font-bold text-blue-900">2.</span>
                <span>Cấu hình các quyền (scope) cần thiết như: <code>oa.chat</code>, <code>oa.cskh</code> trong mục API.</span>
              </p>
              <p className="flex gap-1.5">
                <span className="font-bold text-blue-900">3.</span>
                <span>Sử dụng công cụ tạo Token trực tuyến của Zalo để lấy <strong>Access Token</strong> và <strong>Refresh Token</strong> ban đầu rồi nhập vào các ô tương ứng ở bên trái để kích hoạt.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
