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
            <i className="fas fa-comment-dots text-blue-600" /> Cấu hình Zalo Official Account (OA)
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Thiết lập kết nối kỹ thuật Zalo OA để gửi tin nhắn, đồng bộ hội thoại và CSKH trực tiếp từ hệ thống
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
            Tham số kết nối Zalo API
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Tên cấu hình
                </label>
                <input
                  type="text"
                  value={setting.name}
                  onChange={(e) => setSetting({ ...setting, name: e.target.value })}
                  placeholder="Zalo OA"
                  className="input-tis w-full"
                  required
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Zalo OA ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={setting.oa_id}
                  onChange={(e) => setSetting({ ...setting, oa_id: e.target.value })}
                  placeholder="Nhập ID Zalo OA của bạn"
                  className="input-tis w-full"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  App ID Zalo Developer <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={setting.app_id}
                  onChange={(e) => setSetting({ ...setting, app_id: e.target.value })}
                  placeholder="Nhập ID ứng dụng Zalo"
                  className="input-tis w-full font-mono"
                  required
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  App Secret (Khóa bí mật ứng dụng)
                </label>
                <input
                  type="password"
                  value={secrets.app_secret}
                  onChange={(e) => setSecrets({ ...secrets, app_secret: e.target.value })}
                  placeholder="Để trống nếu không thay đổi"
                  className="input-tis w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Access Token mới
                </label>
                <input
                  type="password"
                  value={secrets.access_token}
                  onChange={(e) => setSecrets({ ...secrets, access_token: e.target.value })}
                  placeholder="Nhập access token mới nếu cần cập nhật thủ công"
                  className="input-tis w-full font-mono"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Refresh Token mới
                </label>
                <input
                  type="password"
                  value={secrets.refresh_token}
                  onChange={(e) => setSecrets({ ...secrets, refresh_token: e.target.value })}
                  placeholder="Nhập refresh token mới để tự động gia hạn access token"
                  className="input-tis w-full font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Webhook Secret (Khóa xác thực Webhook)
                </label>
                <input
                  type="password"
                  value={secrets.webhook_secret}
                  onChange={(e) => setSecrets({ ...secrets, webhook_secret: e.target.value })}
                  placeholder="Nhập khóa webhook để bảo mật cuộc gọi nhận tin nhắn"
                  className="input-tis w-full"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Đường dẫn Webhook nhận tin nhắn (Callback URL)
                </label>
                <input
                  type="text"
                  value={setting.oa_callback_url}
                  onChange={(e) => setSetting({ ...setting, oa_callback_url: e.target.value })}
                  placeholder="https://store.tisbroker.com/api/zalo/webhook/"
                  className="input-tis w-full bg-gray-50 text-gray-500 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="label-tis block text-sm font-semibold mb-1">
                Zalo Login Callback URL
              </label>
              <input
                type="text"
                value={setting.login_callback_url}
                onChange={(e) => setSetting({ ...setting, login_callback_url: e.target.value })}
                placeholder="https://store.tisbroker.com/accounts/zalo/login/callback/"
                className="input-tis w-full bg-gray-50 text-gray-500 font-mono text-xs"
              />
            </div>

            <div className="flex items-center pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={setting.is_active}
                  onChange={(e) => setSetting({ ...setting, is_active: e.target.checked })}
                  className="rounded text-red-500 focus:ring-red-500 h-4.5 w-4.5"
                />
                <span className="text-sm text-gray-700 font-semibold select-none">
                  Kích hoạt tích hợp Zalo OA trên hệ thống
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
            </div>
          </form>
        </div>

        {/* Right Info Summary */}
        <div className="space-y-6">
          <div className="admin-card p-6 bg-white shadow-sm rounded-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
              Trạng thái Zalo OA
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Tình trạng kết nối:</span>
                {isConnected ? (
                  <span className="badge-tis bg-green-100 text-green-800 border border-green-200 text-xs px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                    <i className="fas fa-check-circle" /> Đang kết nối
                  </span>
                ) : (
                  <span className="badge-tis bg-gray-100 text-gray-600 border border-gray-200 text-xs px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                    <i className="fas fa-unlink" /> Chưa kết nối
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Tên OA:</span>
                <span className="font-semibold text-gray-800">
                  {setting.name || '--'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">OA ID:</span>
                <span className="font-semibold text-gray-800 font-mono text-xs">
                  {setting.oa_id || '--'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">App ID:</span>
                <span className="font-semibold text-gray-800 font-mono text-xs">
                  {setting.app_id || '--'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Cấu hình Zalo:</span>
                <span className="font-semibold text-gray-800">
                  {setting.is_active ? 'Đang kích hoạt' : 'Đang tạm tắt'}
                </span>
              </div>
            </div>
          </div>

          <div className="admin-card p-6 bg-blue-50/50 border border-blue-100 rounded-xl">
            <h4 className="text-sm font-bold text-blue-800 flex items-center gap-1.5 mb-2">
              <i className="fas fa-lightbulb" /> Cách lấy Token Zalo OA
            </h4>
            <div className="text-xs text-blue-700 space-y-2 leading-relaxed">
              <p>
                1. Truy cập <strong>Zalo Developer Portal</strong> và tạo một ứng dụng liên kết với Zalo OA của bạn.
              </p>
              <p>
                2. Cấu hình các quyền (scope) cần thiết như: <code>oa.chat</code>, <code>oa.cskh</code>.
              </p>
              <p>
                3. Sử dụng công cụ tạo Token trực tuyến của Zalo để lấy <strong>Access Token</strong> và <strong>Refresh Token</strong> ban đầu rồi nhập vào các ô tương ứng ở bên trái để kích hoạt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
