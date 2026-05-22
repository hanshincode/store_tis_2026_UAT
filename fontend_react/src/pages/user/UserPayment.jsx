import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api, { getErrorMessage, getValidImageUrl } from '@/lib/api'
import { formatMoney, formatDate } from '@/lib/format'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'

export default function UserPayment() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Payment settings
  const [paymentSettings, setPaymentSettings] = useState(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [submitting, setSubmitting] = useState(false)
  const [paymentDone, setPaymentDone] = useState(false)

  useEffect(() => {
    loadPaymentSettings()
    if (token) {
      loadOrderByToken()
    } else {
      loadLatestOrder()
    }
  }, [token])

  async function loadOrderByToken() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/orders/by_token/`, { params: { token } })
      setOrder(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Không tìm thấy đơn hàng hoặc liên kết đã hết hạn.'))
    } finally {
      setLoading(false)
    }
  }

  async function loadLatestOrder() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/orders/', { params: { ordering: '-created_at', limit: 1 } })
      const list = Array.isArray(data) ? data : data?.results || []
      if (list.length > 0) {
        setOrder(list[0])
      } else {
        setError('Không có đơn hàng nào cần thanh toán.')
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải đơn hàng.'))
    } finally {
      setLoading(false)
    }
  }

  async function loadPaymentSettings() {
    setLoadingSettings(true)
    try {
      const { data } = await api.get('/payment-settings/')
      // Handle both array and object response
      setPaymentSettings(Array.isArray(data) ? data[0] : data)
    } catch {
      // silent fail - bank info optional
    } finally {
      setLoadingSettings(false)
    }
  }

  async function handleConfirmPayment() {
    if (!order) return

    const result = await Swal.fire({
      title: 'Xác nhận thanh toán?',
      html: `<p>Bạn xác nhận đã thanh toán đơn hàng <strong>#${order.id}</strong> bằng phương thức <strong>${paymentMethod === 'bank_transfer' ? 'Chuyển khoản ngân hàng' : 'QR Code'}</strong>?</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#D71920',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Xác nhận thanh toán',
    })
    if (!result.isConfirmed) return

    setSubmitting(true)
    try {
      await api.post(`/orders/${order.id}/confirm_payment/`, {
        payment_method: paymentMethod,
      })
      toast.success('Xác nhận thanh toán thành công!')
      setPaymentDone(true)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể xác nhận thanh toán.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton rounded-lg" />
        <div className="admin-card space-y-4">
          <div className="skeleton h-5 w-3/4 rounded" />
          <div className="skeleton h-5 w-1/2 rounded" />
          <div className="skeleton h-5 w-2/3 rounded" />
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900">Thanh toán</h1>
        <div className="admin-card text-center py-16">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-circle text-red-400 text-3xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Không thể xử lý thanh toán</h3>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (paymentDone) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="admin-card text-center py-20">
          <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-check-circle text-green-500 text-5xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Thanh toán thành công!</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Đơn hàng #{order?.id} đã được xác nhận thanh toán. Chúng tôi sẽ xử lý đơn hàng sớm nhất.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <a href="/user/orders" className="btn-tis btn-tis-danger px-6 py-2.5">
              <i className="fas fa-file-invoice mr-2" />Xem đơn hàng
            </a>
            <a href="/" className="btn-tis btn-tis-ghost px-6 py-2.5">
              Về trang chủ
            </a>
          </div>
        </div>
      </div>
    )
  }

  const orderAmount = order?.total_amount || order?.total || order?.amount || 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Thanh toán</h1>
        <p className="text-gray-500 text-sm mt-1">Hoàn tất thanh toán đơn hàng #{order?.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Order Summary */}
        <div className="lg:col-span-3 space-y-6">
          {/* Order Summary */}
          <div className="admin-card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              <i className="fas fa-receipt text-tis-red mr-2" />
              Thông tin đơn hàng
            </h2>

            <div className="space-y-3">
              {order?.order_code && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Mã đơn hàng</span>
                  <span className="font-mono font-medium text-gray-900">{order.order_code}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ngày đặt</span>
                <span className="text-gray-900">{formatDate(order?.created_at || order?.order_date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Trạng thái</span>
                <span className="badge-tis badge-tis-info text-xs">{order?.status || 'pending'}</span>
              </div>
            </div>

            {/* Items */}
            {order?.items && order.items.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Sản phẩm</h3>
                <div className="space-y-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={getValidImageUrl(item.image || item.product_image || item.product?.image)}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={e => { e.target.src = 'https://placehold.co/100x100/f8f9fa/d71920?text=TIS' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.product_name || item.product?.name || 'Sản phẩm'}
                        </p>
                        <p className="text-xs text-gray-400">SL: {item.quantity || 1}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatMoney(item.price || item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="mt-5 pt-5 border-t-2 border-gray-200 flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">Tổng thanh toán</span>
              <span className="text-2xl font-bold text-tis-red">{formatMoney(orderAmount)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Methods */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Method Selection */}
          <div className="admin-card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              <i className="fas fa-wallet text-tis-red mr-2" />
              Phương thức thanh toán
            </h2>

            <div className="space-y-3">
              {/* Bank Transfer */}
              <div
                className={`selection-card ${paymentMethod === 'bank_transfer' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('bank_transfer')}
              >
                <div className="flex items-center gap-3">
                  <div className="icon-box">
                    <i className="fas fa-university" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Chuyển khoản ngân hàng</p>
                    <p className="text-xs text-gray-400">Chuyển khoản trực tiếp qua ngân hàng</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'bank_transfer' ? 'border-tis-red' : 'border-gray-300'}`}>
                  {paymentMethod === 'bank_transfer' && <div className="w-2.5 h-2.5 rounded-full bg-tis-red" />}
                </div>
              </div>

              {/* QR Code */}
              <div
                className={`selection-card ${paymentMethod === 'qr_code' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('qr_code')}
              >
                <div className="flex items-center gap-3">
                  <div className="icon-box">
                    <i className="fas fa-qrcode" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">QR Code</p>
                    <p className="text-xs text-gray-400">Quét mã QR để thanh toán nhanh</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'qr_code' ? 'border-tis-red' : 'border-gray-300'}`}>
                  {paymentMethod === 'qr_code' && <div className="w-2.5 h-2.5 rounded-full bg-tis-red" />}
                </div>
              </div>
            </div>
          </div>

          {/* Bank Info */}
          {paymentMethod === 'bank_transfer' && (
            <div className="admin-card">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                <i className="fas fa-info-circle text-blue-500 mr-2" />
                Thông tin chuyển khoản
              </h3>
              {loadingSettings ? (
                <div className="space-y-2">
                  <div className="skeleton h-4 w-full rounded" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-4 w-2/3 rounded" />
                </div>
              ) : paymentSettings ? (
                <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm">
                  {paymentSettings.bank_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ngân hàng</span>
                      <span className="font-medium text-gray-900">{paymentSettings.bank_name}</span>
                    </div>
                  )}
                  {paymentSettings.account_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Số TK</span>
                      <span className="font-mono font-bold text-gray-900">{paymentSettings.account_number}</span>
                    </div>
                  )}
                  {paymentSettings.account_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Chủ TK</span>
                      <span className="font-medium text-gray-900">{paymentSettings.account_name}</span>
                    </div>
                  )}
                  {paymentSettings.branch && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Chi nhánh</span>
                      <span className="text-gray-900">{paymentSettings.branch}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-blue-100">
                    <p className="text-xs text-blue-600">
                      <i className="fas fa-exclamation-circle mr-1" />
                      Nội dung CK: <strong>TIS {order?.order_code || order?.id} {order?.customer_phone || ''}</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Không có thông tin ngân hàng. Vui lòng liên hệ hotline.</p>
              )}
            </div>
          )}

          {/* QR Code Display */}
          {paymentMethod === 'qr_code' && (
            <div className="admin-card text-center">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                <i className="fas fa-qrcode text-tis-red mr-2" />
                Quét mã QR
              </h3>
              {paymentSettings?.qr_code_url ? (
                <img
                  src={getValidImageUrl(paymentSettings.qr_code_url)}
                  alt="QR Code thanh toán"
                  className="w-48 h-48 mx-auto rounded-xl border border-gray-200 object-contain"
                />
              ) : (
                <div className="w-48 h-48 mx-auto rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <i className="fas fa-qrcode text-3xl mb-2" />
                    <p className="text-xs">QR Code sẽ được cung cấp sau</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">
                Số tiền: <strong className="text-tis-red">{formatMoney(orderAmount)}</strong>
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirmPayment}
            disabled={submitting}
            className="btn-tis btn-tis-danger w-full py-3 text-base"
          >
            {submitting ? (
              <><i className="fas fa-spinner fa-spin mr-2" />Đang xử lý...</>
            ) : (
              <><i className="fas fa-check-circle mr-2" />Xác nhận đã thanh toán</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
