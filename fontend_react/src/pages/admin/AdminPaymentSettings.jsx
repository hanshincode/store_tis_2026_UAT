import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminPaymentSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [setting, setSetting] = useState({
    bank_id: '',
    account_no: '',
    account_name: '',
    template: 'compact2',
    payment_timeout_minutes: 15,
    is_active: true,
    is_configured: false,
  })

  const loadSettings = async () => {
    setLoading(true)
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
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải cấu hình thanh toán.'))
    } finally {
      setLoading(false)
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
        )}&amount=100000&addInfo=TEST%20PAYMENT`
      : null

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
            <i className="fas fa-qrcode text-red-500" /> Cấu hình Thanh toán (VietQR)
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Cài đặt thông tin tài khoản nhận tiền qua mã QR tự động cho hóa đơn mua bảo hiểm
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
            Thông tin tài khoản ngân hàng nhận tiền
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Mã ngân hàng (VietQR Bank ID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={setting.bank_id}
                  onChange={(e) => setSetting({ ...setting, bank_id: e.target.value })}
                  placeholder="Ví dụ: VCB, MB, TCB, ACB, VPB..."
                  className="input-tis w-full uppercase"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Nhập mã viết tắt chuẩn của ngân hàng (ví dụ: VCB, MB, BIDV)
                </p>
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Số tài khoản <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={setting.account_no}
                  onChange={(e) => setSetting({ ...setting, account_no: e.target.value })}
                  placeholder="Nhập số tài khoản nhận tiền"
                  className="input-tis w-full"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Tên chủ tài khoản (Viết hoa không dấu) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={setting.account_name}
                  onChange={(e) => setSetting({ ...setting, account_name: e.target.value })}
                  placeholder="Ví dụ: NGUYEN VAN A"
                  className="input-tis w-full uppercase"
                  required
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Mẫu hiển thị VietQR (Template)
                </label>
                <select
                  value={setting.template}
                  onChange={(e) => setSetting({ ...setting, template: e.target.value })}
                  className="input-tis w-full"
                >
                  <option value="compact2">Compact 2 (Thông tin tối giản, khuyên dùng)</option>
                  <option value="compact">Compact (Đầy đủ thông tin nhỏ)</option>
                  <option value="qr">QR Only (Chỉ hiện mã QR)</option>
                  <option value="print">Print (Mẫu in hóa đơn)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Thời hạn mã QR hết hạn (phút)
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
                  className="input-tis w-full"
                  required
                />
                <p className="text-xs text-gray-400 mt-1 font-medium">
                  Thời gian tối đa để khách hàng quét mã thanh toán. Mặc định 15 phút.
                </p>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setting.is_active}
                    onChange={(e) => setSetting({ ...setting, is_active: e.target.checked })}
                    className="rounded text-red-500 focus:ring-red-500 h-4.5 w-4.5"
                  />
                  <span className="text-sm text-gray-700 font-semibold select-none">
                    Kích hoạt cổng thanh toán QR
                  </span>
                </label>
              </div>
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

        {/* Right Preview */}
        <div className="space-y-6">
          <div className="admin-card p-6 bg-white shadow-sm rounded-xl flex flex-col items-center">
            <h3 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b w-full text-center">
              Mã QR Xem thử (Demo 100K)
            </h3>
            {qrPreviewUrl ? (
              <div className="text-center w-full">
                <div className="p-3 bg-gray-50 rounded-xl border inline-block mb-3">
                  <img
                    src={qrPreviewUrl}
                    alt="VietQR Demo Preview"
                    className="w-56 h-auto object-contain mx-auto rounded shadow-sm"
                  />
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-700">Chủ TK: {setting.account_name}</p>
                  <p className="font-mono">
                    {setting.bank_id} - {setting.account_no}
                  </p>
                  <p className="mt-2 text-red-500 font-semibold italic">Mẫu QR hiển thị thực tế trên trang thanh toán của khách</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <i className="fas fa-qrcode text-5xl mb-3 block" />
                <p className="text-xs max-w-[200px] mx-auto">Vui lòng điền đủ mã ngân hàng, số tài khoản và tên chủ TK để tạo mã QR preview.</p>
              </div>
            )}
          </div>

          <div className="admin-card p-6 bg-yellow-50/50 border border-yellow-100 rounded-xl">
            <h4 className="text-sm font-bold text-yellow-800 flex items-center gap-1.5 mb-2">
              <i className="fas fa-lightbulb" /> Thông tin bổ sung
            </h4>
            <div className="text-xs text-yellow-700 space-y-2">
              <p>Mã QR tự động sử dụng chuẩn của mạng thanh toán quốc gia Napas247, tương thích với tất cả app ngân hàng và ví điện tử tại Việt Nam.</p>
              <p>Hệ thống tự động điền số tiền và nội dung chuyển khoản khớp với từng đơn hàng để tối ưu việc đối soát tự động.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
