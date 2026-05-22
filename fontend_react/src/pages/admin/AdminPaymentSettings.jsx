import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminPaymentSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [setting, setSetting] = useState({
    bank_id: '',
    account_no: '',
    account_name: '',
    template: 'compact2',
    payment_timeout_minutes: 15,
    is_active: true,
    is_configured: false,
  })

  const loadSettings = async (showToast = false) => {
    if (showToast) setRefreshing(true)
    else setLoading(true)
    try {
      const { data } = await api.get('/payment-settings/current/')
      setSetting({
        ...data,
        bank_id: data.bank_id || '',
        account_no: data.account_no || '',
        account_name: data.account_name || '',
        template: data.template || 'compact2',
        payment_timeout_minutes: data.payment_timeout_minutes || 15,
        is_active: data.is_active !== false,
      })
      if (showToast) {
        toast.success('Đã làm mới cấu hình thanh toán.')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải cấu hình thanh toán.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const normalizeAccountNo = (val) => {
    return String(val || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const account_no = normalizeAccountNo(setting.account_no)
    const bank_id = setting.bank_id.trim().toUpperCase()
    const account_name = setting.account_name.trim().toUpperCase()

    if (!bank_id) {
      toast.error('Vui lòng nhập mã ngân hàng VietQR.')
      return
    }
    if (!account_no) {
      toast.error('Vui lòng nhập số tài khoản nhận tiền.')
      return
    }
    if (!account_name) {
      toast.error('Vui lòng nhập tên chủ tài khoản.')
      return
    }
    if (setting.payment_timeout_minutes < 1 || setting.payment_timeout_minutes > 1440) {
      toast.error('Thời hạn thanh toán QR phải từ 1 đến 1440 phút.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        bank_id,
        account_no,
        account_name,
        template: setting.template,
        payment_timeout_minutes: Number(setting.payment_timeout_minutes),
        is_active: setting.is_active,
      }

      const { data } = await api.patch('/payment-settings/current/', payload)
      setSetting({
        ...data,
        is_active: data.is_active !== false,
      })
      toast.success('Đã lưu cấu hình thanh toán thành công.')
    } catch (err) {
      Swal.fire('Lỗi', getErrorMessage(err, 'Không thể lưu cấu hình thanh toán.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  // VietQR Live Preview URL
  const qrPreviewUrl =
    setting.bank_id && setting.account_no && setting.account_name
      ? `https://img.vietqr.io/image/${setting.bank_id}-${setting.account_no}-${setting.template}.jpg?accountName=${encodeURIComponent(
          setting.account_name
        )}&amount=100000&addInfo=TIS%20TEST`
      : null

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
                Payment Gateway
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <i className="fas fa-qrcode text-tis-red" /> Cấu hình Thanh toán (VietQR)
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Cài đặt thông tin tài khoản ngân hàng nhận tiền. Hệ thống sẽ tự động sinh mã QR tương ứng với mã đơn hàng và số tiền thực tế của khách hàng.
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Bank config */}
        <div className="lg:col-span-7 bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 bg-slate-50/55 border-b border-slate-100 flex items-center gap-2">
            <i className="fas fa-bank text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800">
              Thông tin tài khoản ngân hàng thụ hưởng
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Mã ngân hàng (VietQR Bank ID) <span className="text-tis-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={setting.bank_id}
                    onChange={(e) => setSetting({ ...setting, bank_id: e.target.value })}
                    placeholder="Ví dụ: VCB, MB, TCB, ACB, VPB..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-tis-red focus:ring-2 focus:ring-tis-red/10 transition-all duration-300 uppercase font-semibold"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nhập mã viết tắt chuẩn của Napas (ví dụ: VCB, MB, BIDV, TCB)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Số tài khoản thụ hưởng <span className="text-tis-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={setting.account_no}
                    onChange={(e) => setSetting({ ...setting, account_no: e.target.value })}
                    placeholder="Nhập số tài khoản nhận tiền"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-tis-red focus:ring-2 focus:ring-tis-red/10 transition-all duration-300 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Tên chủ tài khoản (Viết hoa không dấu) <span className="text-tis-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={setting.account_name}
                    onChange={(e) => setSetting({ ...setting, account_name: e.target.value })}
                    placeholder="Ví dụ: NGUYEN VAN A"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-tis-red focus:ring-2 focus:ring-tis-red/10 transition-all duration-300 uppercase font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Mẫu thiết kế VietQR (Template)
                  </label>
                  <select
                    value={setting.template}
                    onChange={(e) => setSetting({ ...setting, template: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-tis-red focus:ring-2 focus:ring-tis-red/10 transition-all duration-300"
                  >
                    <option value="compact2">Compact 2 (Thông tin tối giản - Đẹp nhất)</option>
                    <option value="compact">Compact (Đầy đủ thông tin nhỏ)</option>
                    <option value="qr">QR Only (Chỉ hiện mã QR, không kèm text)</option>
                    <option value="print">Print (Mẫu in đen trắng khổ giấy lớn)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Thời hạn hiệu lực mã QR (Phút)
                  </label>
                  <input
                    type="number"
                    value={setting.payment_timeout_minutes}
                    onChange={(e) =>
                      setSetting({ ...setting, payment_timeout_minutes: parseInt(e.target.value) || 0 })
                    }
                    placeholder="15"
                    min="1"
                    max="1440"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-tis-red focus:ring-2 focus:ring-tis-red/10 transition-all duration-300"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hóa đơn chuyển trạng thái hủy nếu quá hạn (tối thiểu 1, tối đa 1440 phút)
                  </p>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={setting.is_active}
                      onChange={(e) => setSetting({ ...setting, is_active: e.target.checked })}
                      className="rounded border-slate-300 text-tis-red focus:ring-tis-red/30 h-4.5 w-4.5 accent-tis-red cursor-pointer transition-colors"
                    />
                    <span className="text-sm text-slate-700 font-semibold select-none group-hover:text-slate-900 transition-colors">
                      Kích hoạt phương thức quét mã QR
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-6 mt-6 border-t border-slate-100">
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
            </div>
          </form>
        </div>

        {/* Right Preview: VietQR mock phone screen frame */}
        <div className="lg:col-span-5 space-y-6 flex flex-col items-center">
          {/* Smartphone Frame Container */}
          <div className="relative mx-auto w-[270px] h-[550px] bg-slate-950 rounded-[40px] shadow-2xl border-[10px] border-slate-900 ring-2 ring-slate-800 overflow-hidden flex flex-col">
            {/* Phone Notch/Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-30 flex items-center justify-center gap-1.5 px-3">
              <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
              <div className="w-8 h-1 bg-slate-800 rounded-full" />
            </div>

            {/* Internal phone screen */}
            {qrPreviewUrl ? (
              <div className="relative w-full h-full bg-slate-50 flex flex-col z-10 select-none overflow-y-auto no-scrollbar">
                {/* Phone Status Bar */}
                <div className="h-8 flex justify-between items-center px-6 text-slate-800 text-[10px] font-bold bg-white/80 backdrop-blur-sm z-20 sticky top-0">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5">
                    <i className="fas fa-signal" />
                    <i className="fas fa-wifi" />
                    <i className="fas fa-battery-three-quarters" />
                  </div>
                </div>

                {/* Banking app checkout screen mock */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Header bar mock */}
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-400 text-xs"><i className="fas fa-arrow-left" /></span>
                      <span className="text-slate-800 font-bold text-xs">Thanh toán đơn hàng</span>
                      <span className="text-slate-400 text-xs"><i className="fas fa-ellipsis-h" /></span>
                    </div>

                    {/* Order metadata summary */}
                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm text-center">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Tổng thanh toán</span>
                      <div className="text-base font-extrabold text-slate-800 mt-0.5">100.000 đ</div>
                      <div className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full inline-block mt-1 font-semibold max-w-full truncate">
                        Nội dung: HD-8234-TIS
                      </div>
                    </div>

                    {/* QR Code mockup */}
                    <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-md text-center flex flex-col items-center">
                      <div className="relative group">
                        <img
                          src={qrPreviewUrl}
                          alt="VietQR Live Preview"
                          className="w-40 h-40 object-contain rounded"
                          onError={(e) => {
                            e.target.src = 'https://placehold.co/200x200/eee/333?text=VietQR+Error'
                          }}
                        />
                      </div>
                      <div className="mt-2 text-[9px] text-slate-400 font-semibold max-w-[180px] leading-tight">
                        Quét mã bằng app ngân hàng của bạn để thanh toán ngay
                      </div>
                    </div>

                    {/* Recipient Details */}
                    <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm text-xs space-y-1.5 text-slate-700">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Ngân hàng:</span>
                        <span className="font-bold text-slate-800">{setting.bank_id}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Số tài khoản:</span>
                        <span className="font-bold text-slate-800 font-mono">{setting.account_no}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Chủ tài khoản:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[120px]" title={setting.account_name}>{setting.account_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Complete payment mock button */}
                  <div className="pt-4">
                    <button type="button" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-xl transition duration-200 flex items-center justify-center gap-1 shadow-md">
                      <i className="fas fa-check-circle text-[10px]" /> Hoàn tất quét mã
                    </button>
                    <div className="text-center text-[8px] text-slate-400 mt-1">
                      Mẫu thanh toán giả lập trên điện thoại di động
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-slate-900 flex flex-col justify-center items-center text-center p-6 text-slate-500 z-10">
                <i className="fas fa-qrcode text-6xl mb-4 text-slate-700" />
                <h4 className="text-sm font-bold text-slate-400 mb-1">Mẫu hiển thị VietQR</h4>
                <p className="text-[10px] leading-relaxed max-w-[180px] text-slate-500">
                  Vui lòng nhập đầy đủ Bank ID, Số tài khoản và Tên chủ tài khoản để tạo giao diện xem thử.
                </p>
              </div>
            )}

            {/* Home indicator bar at bottom */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-300 rounded-full z-20" />
          </div>
          
          <div className="w-full bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 shadow-sm">
            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-1.5 mb-2">
              <i className="fas fa-info-circle text-amber-600" /> Về liên kết VietQR
            </h4>
            <div className="text-xs text-amber-700 leading-relaxed space-y-1 font-medium">
              <p>Mã QR tự sinh tuân thủ chuẩn của Napas247, tự động nhúng số tiền và mã hóa đơn, loại bỏ hoàn toàn các lỗi điền tay sai sót thông tin thụ hưởng hay số tiền từ khách hàng.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

