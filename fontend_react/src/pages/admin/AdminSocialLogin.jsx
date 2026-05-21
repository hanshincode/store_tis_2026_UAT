import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

const SOCIAL_PROVIDER_META = {
  google: {
    icon: 'fab fa-google text-red-500',
    title: 'Google OAuth',
    description: 'Đăng nhập bảo mật sử dụng tài khoản Google Workspace hoặc Gmail cá nhân.',
    callbackPath: '/accounts/google/login/callback/',
    guide: [
      'Truy cập Google Cloud Console, tạo Project mới hoặc chọn project hiện tại.',
      'Vào mục APIs & Services > Credentials, tạo một OAuth client ID loại Web application.',
      'Thêm URL callback tương ứng bên dưới vào mục "Authorized redirect URIs".',
      'Sao chép Client ID và Client Secret điền vào biểu mẫu này và lưu lại.',
    ],
  },
  microsoft: {
    icon: 'fab fa-windows text-blue-600',
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
        <div className="spinner-tis" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <i className="fas fa-key text-red-500" /> Cài đặt Đăng nhập Mạng xã hội (OAuth2)
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Kích hoạt và cấu hình dịch vụ đăng nhập nhanh thông qua Google, Outlook/Microsoft Single Sign-On (SSO)
        </p>
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
              className="admin-card p-6 bg-white shadow-sm rounded-xl border border-gray-100 flex flex-col justify-between"
            >
              <div>
                {/* Header card */}
                <div className="flex justify-between items-start gap-4 mb-4 pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-xl shadow-inner border border-gray-100">
                      <i className={meta.icon || 'fas fa-shield-alt text-gray-500'} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-800">{providerTitle}</h3>
                      <p className="text-xs text-gray-400 mt-0.5 max-w-xs">{meta.description}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      item.is_active && item.client_id && item.has_client_secret
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {item.is_active ? 'ĐANG BẬT' : 'TẠM TẮT'}
                  </span>
                </div>

                {/* Form fields */}
                <form onSubmit={(e) => handleSubmit(e, item)} className="space-y-3.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="label-tis block text-xs font-semibold mb-1">
                        Tên kết nối
                      </label>
                      <input
                        type="text"
                        value={item.name || ''}
                        onChange={(e) => handleFieldChange(item.id, 'name', e.target.value)}
                        className="input-tis w-full !text-xs !py-1.5"
                      />
                    </div>

                    <div>
                      <label className="label-tis block text-xs font-semibold mb-1">
                        Tenant ID (Microsoft)
                      </label>
                      <input
                        type="text"
                        value={item.tenant || ''}
                        onChange={(e) => handleFieldChange(item.id, 'tenant', e.target.value)}
                        placeholder="common"
                        disabled={item.provider !== 'microsoft'}
                        className="input-tis w-full !text-xs !py-1.5 disabled:bg-gray-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label-tis block text-xs font-semibold mb-1">
                      Client ID (Application ID) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.client_id || ''}
                      onChange={(e) => handleFieldChange(item.id, 'client_id', e.target.value)}
                      placeholder="Nhập client id của app"
                      className="input-tis w-full !text-xs !py-1.5 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="label-tis block text-xs font-semibold mb-1">
                      Client Secret (Mã khóa bí mật)
                    </label>
                    <input
                      type="password"
                      value={secrets[item.provider] || ''}
                      onChange={(e) => handleSecretChange(item.provider, e.target.value)}
                      placeholder={
                        item.has_client_secret
                          ? '•••••••••••••••• (Đã lưu secret, để trống nếu không đổi)'
                          : 'Nhập client secret'
                      }
                      className="input-tis w-full !text-xs !py-1.5"
                    />
                  </div>

                  <div>
                    <label className="label-tis block text-xs font-semibold mb-1">
                      Callback URL (Redirect URI)
                    </label>
                    <input
                      type="text"
                      value={item.callback_url || defaultCallback}
                      onChange={(e) => handleFieldChange(item.id, 'callback_url', e.target.value)}
                      className="input-tis w-full !text-xs !py-1.5 font-mono bg-gray-50 text-gray-500"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="label-tis block text-xs font-semibold mb-1">
                      Ghi chú vận hành
                    </label>
                    <textarea
                      value={item.note || ''}
                      onChange={(e) => handleFieldChange(item.id, 'note', e.target.value)}
                      placeholder="Ví dụ: App Google của TIS Broker chính thức, tạo ngày..."
                      rows={2}
                      className="input-tis w-full !text-xs"
                    />
                  </div>

                  {/* Guide Accordion */}
                  <div className="bg-gray-50/70 border rounded-lg p-3">
                    <h4 className="text-[11px] font-bold text-gray-700 flex items-center gap-1 mb-1.5 uppercase tracking-wide">
                      <i className="fas fa-question-circle text-red-500" /> Hướng dẫn tích hợp
                    </h4>
                    <ol className="list-decimal pl-4 text-[10px] text-gray-600 space-y-1">
                      {meta.guide?.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Switch and Save */}
                  <div className="flex items-center justify-between pt-2 border-t mt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!item.is_active}
                        onChange={(e) => handleFieldChange(item.id, 'is_active', e.target.checked)}
                        className="rounded text-red-500 focus:ring-red-500 h-4.5 w-4.5"
                      />
                      <span className="text-xs text-gray-700 font-bold select-none">
                        Kích hoạt đăng nhập {item.provider === 'google' ? 'Google' : 'Microsoft'}
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-tis-danger !px-4 !py-1.5 !text-xs flex items-center justify-center gap-1.5 min-w-[70px]"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="spinner-tis !w-3.5 !h-3.5 !border-2 !border-white" />
                          Đang lưu
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save" /> Lưu
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
