import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminChatConnectionSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingId, setSettingId] = useState(null)
  const [setting, setSetting] = useState({
    name: 'Chat/Call Connection',
    is_active: true,
    app_origin: '',
    api_origin: '',
    ws_origin: '',
    turn_urls: '',
    turn_username: '',
    ice_transport_policy: 'all',
    note: '',
  })
  const [turnCredential, setTurnCredential] = useState('')

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/chat-connection-settings/')
      // Handle either single object or array
      const raw = Array.isArray(data) ? data[0] : data
      if (raw) {
        setSettingId(raw.id)
        setSetting({
          name: raw.name || 'Chat/Call Connection',
          is_active: raw.is_active !== false,
          app_origin: raw.app_origin || '',
          api_origin: raw.api_origin || '',
          ws_origin: raw.ws_origin || '',
          turn_urls: raw.turn_urls || '',
          turn_username: raw.turn_username || '',
          ice_transport_policy: raw.ice_transport_policy || 'all',
          note: raw.note || '',
        })
      }
      setTurnCredential('')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải cấu hình kết nối chat/call.'))
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
        name: setting.name.trim() || 'Chat/Call Connection',
        is_active: setting.is_active,
        app_origin: setting.app_origin.trim(),
        api_origin: setting.api_origin.trim(),
        ws_origin: setting.ws_origin.trim(),
        turn_urls: setting.turn_urls.trim(),
        turn_username: setting.turn_username.trim(),
        ice_transport_policy: setting.ice_transport_policy,
        note: setting.note.trim(),
      }

      if (turnCredential.trim()) {
        payload.turn_credential = turnCredential.trim()
      }

      const method = settingId ? 'patch' : 'post'
      const url = settingId ? `/chat-connection-settings/${settingId}/` : '/chat-connection-settings/'

      const { data } = await api[method](url, payload)
      setSettingId(data.id)
      setTurnCredential('')
      toast.success('Đã lưu cấu hình kết nối RTC thành công.')
      await loadSettings()
    } catch (err) {
      Swal.fire('Lỗi', getErrorMessage(err, 'Không thể lưu cấu hình kết nối.'), 'error')
    } finally {
      setSaving(false)
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
            <i className="fas fa-network-wired text-red-500" /> Cấu hình Kết nối WebRTC (Chat/Call)
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Thiết lập tham số máy chủ trung gian TURN/STUN và bảo mật nguồn cấp cho cuộc gọi thoại/video hỗ trợ khách hàng
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
            Cấu hình kết nối RTC & ICE Servers
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
                  placeholder="Chat/Call Connection"
                  className="input-tis w-full"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Chính sách ICE (Transport Policy)
                </label>
                <select
                  value={setting.ice_transport_policy}
                  onChange={(e) => setSetting({ ...setting, ice_transport_policy: e.target.value })}
                  className="input-tis w-full"
                >
                  <option value="all">Tất cả (all - Khuyên dùng)</option>
                  <option value="relay">Chỉ qua máy chủ Relay (relay - Chặn IP trực tiếp)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  App Origin
                </label>
                <input
                  type="text"
                  value={setting.app_origin}
                  onChange={(e) => setSetting({ ...setting, app_origin: e.target.value })}
                  placeholder="https://store.tisbroker.com"
                  className="input-tis w-full"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  API Origin
                </label>
                <input
                  type="text"
                  value={setting.api_origin}
                  onChange={(e) => setSetting({ ...setting, api_origin: e.target.value })}
                  placeholder="https://store.tisbroker.com/api"
                  className="input-tis w-full"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  WebSocket Origin
                </label>
                <input
                  type="text"
                  value={setting.ws_origin}
                  onChange={(e) => setSetting({ ...setting, ws_origin: e.target.value })}
                  placeholder="wss://store.tisbroker.com"
                  className="input-tis w-full"
                />
              </div>
            </div>

            <div>
              <label className="label-tis block text-sm font-semibold mb-1">
                Các máy chủ TURN/STUN URLs (Mỗi dòng một URL)
              </label>
              <textarea
                value={setting.turn_urls}
                onChange={(e) => setSetting({ ...setting, turn_urls: e.target.value })}
                placeholder="turn:turn.example.com:3478?transport=udp&#10;turn:turn.example.com:3478?transport=tcp"
                rows={3}
                className="input-tis w-full font-mono text-xs"
              />
              <p className="text-xs text-gray-400 mt-1">
                Cung cấp danh sách các STUN/TURN server URLs để thiết lập kết nối ngang hàng WebRTC (P2P).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Tài khoản TURN (Username)
                </label>
                <input
                  type="text"
                  value={setting.turn_username}
                  onChange={(e) => setSetting({ ...setting, turn_username: e.target.value })}
                  placeholder="Nhập username của TURN server"
                  className="input-tis w-full"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Mật khẩu TURN (Credential)
                </label>
                <input
                  type="password"
                  value={turnCredential}
                  onChange={(e) => setTurnCredential(e.target.value)}
                  placeholder="Nhập credential của TURN server (để trống nếu không đổi)"
                  className="input-tis w-full"
                />
              </div>
            </div>

            <div>
              <label className="label-tis block text-sm font-semibold mb-1">
                Ghi chú cấu hình
              </label>
              <textarea
                value={setting.note}
                onChange={(e) => setSetting({ ...setting, note: e.target.value })}
                placeholder="Ghi chú về nhà cung cấp TURN server, ngày gia hạn..."
                rows={2}
                className="input-tis w-full text-xs"
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
                  Kích hoạt cấu hình RTC phục vụ hỗ trợ gọi trực tiếp
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

        {/* Right Info */}
        <div className="space-y-6">
          <div className="admin-card p-6 bg-white shadow-sm rounded-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
              Trạng thái WebRTC
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Trạng thái:</span>
                {setting.is_active ? (
                  <span className="badge-tis bg-green-100 text-green-800 border border-green-200 text-xs px-2 py-0.5 rounded font-semibold">
                    Đang bật
                  </span>
                ) : (
                  <span className="badge-tis bg-gray-100 text-gray-600 border border-gray-200 text-xs px-2 py-0.5 rounded font-semibold">
                    Đang tắt
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Chính sách ICE:</span>
                <span className="font-semibold text-gray-800 uppercase text-xs">
                  {setting.ice_transport_policy}
                </span>
              </div>

              <div className="flex justify-between items-start text-sm">
                <span className="text-gray-500 min-w-[100px]">Số lượng TURN:</span>
                <span className="font-semibold text-gray-800 text-right">
                  {setting.turn_urls ? setting.turn_urls.split('\n').filter(Boolean).length : 0} servers
                </span>
              </div>
            </div>
          </div>

          <div className="admin-card p-6 bg-blue-50/50 border border-blue-100 rounded-xl">
            <h4 className="text-sm font-bold text-blue-800 flex items-center gap-1.5 mb-2">
              <i className="fas fa-info-circle" /> WebRTC là gì?
            </h4>
            <div className="text-xs text-blue-700 space-y-2">
              <p>
                <strong>WebRTC (Web Real-Time Communication)</strong> cho phép người dùng thực hiện cuộc gọi video/audio và truyền file trực tiếp giữa hai trình duyệt mà không cần qua server lưu trữ trung gian.
              </p>
              <p>
                Tuy nhiên, do cấu hình mạng (NAT, Tường lửa), các máy Client thường không thể kết nối trực tiếp với nhau. Khi đó, máy chủ <strong>TURN</strong> đóng vai trò làm trạm trung chuyển (relay) luồng thoại.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
