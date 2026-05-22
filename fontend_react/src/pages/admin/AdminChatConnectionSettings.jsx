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
  const [showCredential, setShowCredential] = useState(false)

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

  const handleCopy = async (text, label) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`Đã sao chép ${label}`)
    } catch {
      toast.error(`Không thể sao chép ${label}`)
    }
  }

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
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-[#D71920]/45 rounded-2xl p-6 md:p-8 shadow-xl text-white animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#D71920]/10 rounded-full blur-2xl -ml-16 -mb-16"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-[#D71920]/20 border border-[#D71920]/35 text-xs text-red-200 font-semibold tracking-wider rounded-full uppercase">
                RTC Infrastructure
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <i className="fas fa-network-wired text-red-500" /> Cấu hình Kết nối WebRTC (Chat/Call)
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Thiết lập tham số máy chủ trung gian TURN/STUN và bảo mật nguồn cấp cho cuộc gọi thoại/video hỗ trợ khách hàng.
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
        <div className="lg:col-span-2 admin-card p-6 bg-white border border-slate-100 shadow-lg rounded-2xl transition hover:shadow-xl">
          <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-slate-100">
            <span className="w-1.5 h-6 bg-[#D71920] rounded-full"></span>
            <h3 className="text-lg font-bold text-slate-800">
              Cấu hình kết nối RTC & ICE Servers
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Tên cấu hình <span className="text-[#D71920]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={setting.name}
                  onChange={(e) => setSetting({ ...setting, name: e.target.value })}
                  placeholder="Chat/Call Connection"
                  className="input-tis w-full focus:ring-[#D71920]/10 focus:border-[#D71920] transition duration-200"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Chính sách ICE (Transport Policy)
                </label>
                <select
                  value={setting.ice_transport_policy}
                  onChange={(e) => setSetting({ ...setting, ice_transport_policy: e.target.value })}
                  className="input-tis w-full focus:ring-[#D71920]/10 focus:border-[#D71920] transition duration-200"
                >
                  <option value="all">Tất cả (all - Khuyên dùng)</option>
                  <option value="relay">Chỉ qua máy chủ Relay (relay - Chặn IP trực tiếp)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1 flex items-center justify-between">
                  <span>App Origin</span>
                  {setting.app_origin && (
                    <button
                      type="button"
                      onClick={() => handleCopy(setting.app_origin, 'App Origin')}
                      className="text-[10px] text-slate-400 hover:text-[#D71920] transition"
                    >
                      Sao chép
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={setting.app_origin}
                  onChange={(e) => setSetting({ ...setting, app_origin: e.target.value })}
                  placeholder="https://store.tisbroker.com"
                  className="input-tis w-full focus:ring-[#D71920]/10 focus:border-[#D71920] transition duration-200"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1 flex items-center justify-between">
                  <span>API Origin</span>
                  {setting.api_origin && (
                    <button
                      type="button"
                      onClick={() => handleCopy(setting.api_origin, 'API Origin')}
                      className="text-[10px] text-slate-400 hover:text-[#D71920] transition"
                    >
                      Sao chép
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={setting.api_origin}
                  onChange={(e) => setSetting({ ...setting, api_origin: e.target.value })}
                  placeholder="https://store.tisbroker.com/api"
                  className="input-tis w-full focus:ring-[#D71920]/10 focus:border-[#D71920] transition duration-200"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1 flex items-center justify-between">
                  <span>WebSocket Origin</span>
                  {setting.ws_origin && (
                    <button
                      type="button"
                      onClick={() => handleCopy(setting.ws_origin, 'WS Origin')}
                      className="text-[10px] text-slate-400 hover:text-[#D71920] transition"
                    >
                      Sao chép
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={setting.ws_origin}
                  onChange={(e) => setSetting({ ...setting, ws_origin: e.target.value })}
                  placeholder="wss://store.tisbroker.com"
                  className="input-tis w-full focus:ring-[#D71920]/10 focus:border-[#D71920] transition duration-200"
                />
              </div>
            </div>

            <div>
              <label className="label-tis block text-sm font-semibold mb-1 flex items-center justify-between">
                <span>Các máy chủ TURN/STUN URLs (Mỗi dòng một URL)</span>
                {setting.turn_urls && (
                  <button
                    type="button"
                    onClick={() => handleCopy(setting.turn_urls, 'Danh sách TURN/STUN')}
                    className="text-[10px] text-slate-400 hover:text-[#D71920] transition"
                  >
                    Sao chép tất cả
                  </button>
                )}
              </label>
              <textarea
                value={setting.turn_urls}
                onChange={(e) => setSetting({ ...setting, turn_urls: e.target.value })}
                placeholder="turn:turn.example.com:3478?transport=udp&#10;turn:turn.example.com:3478?transport=tcp"
                rows={4}
                className="input-tis w-full font-mono text-xs focus:ring-[#D71920]/10 focus:border-[#D71920] transition duration-200"
              />
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Cung cấp danh sách các STUN/TURN server URLs để thiết lập kết nối ngang hàng WebRTC (P2P). Ví dụ: <code>turn:your-domain.com:3478?transport=udp</code>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1 flex items-center justify-between">
                  <span>Tài khoản TURN (Username)</span>
                  {setting.turn_username && (
                    <button
                      type="button"
                      onClick={() => handleCopy(setting.turn_username, 'TURN Username')}
                      className="text-[10px] text-slate-400 hover:text-[#D71920] transition"
                    >
                      Sao chép
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={setting.turn_username}
                  onChange={(e) => setSetting({ ...setting, turn_username: e.target.value })}
                  placeholder="Nhập username của TURN server"
                  className="input-tis w-full focus:ring-[#D71920]/10 focus:border-[#D71920] transition duration-200"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Mật khẩu TURN (Credential)
                </label>
                <div className="relative">
                  <input
                    type={showCredential ? "text" : "password"}
                    value={turnCredential}
                    onChange={(e) => setTurnCredential(e.target.value)}
                    placeholder="Nhập credential (để trống nếu không đổi)"
                    className="input-tis w-full pr-10 focus:ring-[#D71920]/10 focus:border-[#D71920] transition duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCredential(!showCredential)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <i className={`fas ${showCredential ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
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
                className="input-tis w-full text-xs focus:ring-[#D71920]/10 focus:border-[#D71920] transition duration-200"
              />
            </div>

            <div className="flex items-center pt-2">
              <label className="relative flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={setting.is_active}
                  onChange={(e) => setSetting({ ...setting, is_active: e.target.checked })}
                  className="rounded text-[#D71920] focus:ring-[#D71920] h-5 w-5 border-slate-300 transition duration-150"
                />
                <div className="select-none">
                  <span className="text-sm text-slate-700 font-bold block">
                    Kích hoạt cấu hình RTC phục vụ hỗ trợ gọi trực tiếp
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5 font-normal">
                    Hệ thống sẽ chỉ sử dụng cấu hình này cho hội thoại thời gian thực khi được bật.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="btn-tis-danger px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition"
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

        {/* Right Info */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="admin-card p-6 bg-white border border-slate-100 shadow-lg rounded-2xl transition hover:shadow-xl">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <span className="w-1.5 h-6 bg-[#D71920] rounded-full"></span>
              <h3 className="text-lg font-bold text-slate-800">
                Trạng thái WebRTC
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500">Trạng thái:</span>
                {setting.is_active ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs px-2.5 py-1 rounded-full font-bold">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Đang bật
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-500 border border-slate-100 text-xs px-2.5 py-1 rounded-full font-bold">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                    Đang tắt
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500">Chính sách ICE:</span>
                <span className="font-bold text-slate-700 uppercase bg-slate-100 px-2 py-0.5 rounded text-xs">
                  {setting.ice_transport_policy}
                </span>
              </div>

              <div className="flex justify-between items-start text-sm pb-1">
                <span className="text-slate-500 min-w-[100px]">Số lượng TURN:</span>
                <span className="font-bold text-slate-800 text-right">
                  {setting.turn_urls ? setting.turn_urls.split('\n').filter(s => s.trim()).length : 0} servers
                </span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="admin-card p-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/20 border border-blue-100/70 shadow-sm rounded-2xl">
            <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-3">
              <i className="fas fa-info-circle text-blue-500" /> WebRTC là gì?
            </h4>
            <div className="text-xs text-blue-700/90 space-y-2.5 leading-relaxed">
              <p>
                <strong>WebRTC (Web Real-Time Communication)</strong> cho phép người dùng thực hiện cuộc gọi video/audio và truyền file trực tiếp giữa hai trình duyệt mà không cần qua server lưu trữ trung gian.
              </p>
              <p>
                Tuy nhiên, do cấu hình mạng (NAT, Tường lửa), các máy Client thường không thể kết nối trực tiếp với nhau. Khi đó, máy chủ <strong>TURN</strong> đóng vai trò làm trạm trung chuyển (relay) luồng thoại.
              </p>
              <p className="font-semibold text-blue-800/80">
                Lưu ý:
              </p>
              <p>
                Hãy cấu hình đúng giao thức <code>turn:</code> hoặc <code>turns:</code> tùy thuộc vào cổng mạng và chứng chỉ SSL của máy chủ TURN để cuộc gọi không bị mất kết nối âm thanh/hình ảnh.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

