import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import { formatDate, formatMoney, truncate } from '@/lib/format'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  pending:    { label: 'Chờ xử lý',    badge: 'bg-amber-100 text-amber-700' },
  confirmed:  { label: 'Đã xác nhận',  badge: 'bg-blue-100 text-blue-700' },
  processing: { label: 'Đang xử lý',   badge: 'bg-blue-100 text-blue-700' },
  completed:  { label: 'Hoàn thành',    badge: 'bg-green-100 text-green-700' },
  delivered:  { label: 'Đã giao',       badge: 'bg-green-100 text-green-700' },
  cancelled:  { label: 'Đã hủy',        badge: 'bg-red-100 text-red-700' },
  rejected:   { label: 'Từ chối',       badge: 'bg-red-100 text-red-700' },
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xử lý' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
]

export default function UserOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/orders/')
      const list = Array.isArray(data) ? data : data?.results || []
      setOrders(list)
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải danh sách đơn hàng.'))
    } finally {
      setLoading(false)
    }
  }

  function openDetail(order) {
    setSelectedOrder(order)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setSelectedOrder(null)
  }

  function getStatusBadge(status) {
    const cfg = STATUS_CONFIG[status] || { label: status, badge: 'bg-gray-100 text-gray-600' }
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
        {cfg.label}
      </span>
    )
  }

  function getProductName(order) {
    if (order.product_name) return order.product_name
    if (order.items?.length > 0) {
      return order.items.map(i => i.product_name || i.product?.name || 'Sản phẩm').join(', ')
    }
    if (order.product?.name) return order.product.name
    return 'Đơn hàng'
  }

  const filteredOrders = filterStatus
    ? orders.filter(o => o.status === filterStatus)
    : orders

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-48 skeleton rounded-lg" />
        <div className="admin-card p-0">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-50">
              <div className="skeleton h-5 w-8 rounded" />
              <div className="skeleton h-5 flex-1 rounded" />
              <div className="skeleton h-5 w-24 rounded" />
              <div className="skeleton h-5 w-20 rounded" />
              <div className="skeleton h-5 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-card text-center py-12">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-exclamation-triangle text-red-400 text-2xl" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Lỗi tải dữ liệu</h3>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={loadOrders} className="btn-tis btn-tis-outline text-sm px-5 py-2">
          <i className="fas fa-redo mr-2" />Thử lại
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đơn hàng của tôi</h1>
          <p className="text-gray-500 text-sm mt-1">Theo dõi lịch sử và trạng thái đơn hàng</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="input-tis text-sm py-2 pr-8 w-auto min-w-[180px]"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button onClick={loadOrders} className="btn-tis btn-tis-ghost text-sm px-3 py-2" title="Tải lại">
            <i className="fas fa-sync-alt" />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="admin-card text-center py-16">
          <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-file-invoice text-gray-300 text-3xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có đơn hàng</h3>
          <p className="text-gray-400 text-sm">
            {filterStatus ? 'Không tìm thấy đơn hàng nào với trạng thái đã chọn.' : 'Bạn chưa có đơn hàng nào.'}
          </p>
        </div>
      ) : (
        <div className="admin-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sản phẩm</th>
                  <th>Ngày đặt</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="font-mono text-xs text-gray-400">#{order.id || idx + 1}</td>
                    <td>
                      <p className="font-medium text-gray-900 text-sm">{truncate(getProductName(order), 50)}</p>
                      {order.order_code && (
                        <p className="text-xs text-gray-400 mt-0.5">Mã: {order.order_code}</p>
                      )}
                    </td>
                    <td className="text-sm text-gray-600">{formatDate(order.created_at || order.order_date)}</td>
                    <td className="text-sm font-semibold text-gray-900">{formatMoney(order.total_amount || order.total || order.amount)}</td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td className="text-right">
                      <button
                        onClick={() => openDetail(order)}
                        className="btn-tis btn-tis-ghost text-xs px-3 py-1.5"
                      >
                        <i className="fas fa-eye mr-1" />Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            Hiển thị {filteredOrders.length} đơn hàng
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900">
                Chi tiết đơn hàng #{selectedOrder.id}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <i className="fas fa-times text-lg" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Trạng thái</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Order Info */}
              <div className="space-y-3">
                {selectedOrder.order_code && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Mã đơn hàng</span>
                    <span className="text-sm font-mono font-medium text-gray-900">{selectedOrder.order_code}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Ngày đặt</span>
                  <span className="text-sm text-gray-900">{formatDate(selectedOrder.created_at || selectedOrder.order_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Tổng tiền</span>
                  <span className="text-sm font-bold text-tis-red">{formatMoney(selectedOrder.total_amount || selectedOrder.total || selectedOrder.amount)}</span>
                </div>
                {selectedOrder.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Phương thức thanh toán</span>
                    <span className="text-sm text-gray-900">{selectedOrder.payment_method}</span>
                  </div>
                )}
              </div>

              {/* Order Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Sản phẩm đã mua</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.product_name || item.product?.name || 'Sản phẩm'}
                          </p>
                          {item.package_name && (
                            <p className="text-xs text-gray-400 mt-0.5">Gói: {item.package_name}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">SL: {item.quantity || 1}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 ml-4">
                          {formatMoney(item.price || item.subtotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Info */}
              {(selectedOrder.customer_name || selectedOrder.customer_phone) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Thông tin người mua</h4>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
                    {selectedOrder.customer_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Họ tên</span>
                        <span className="text-gray-900">{selectedOrder.customer_name}</span>
                      </div>
                    )}
                    {selectedOrder.customer_phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Điện thoại</span>
                        <span className="text-gray-900">{selectedOrder.customer_phone}</span>
                      </div>
                    )}
                    {selectedOrder.customer_email && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email</span>
                        <span className="text-gray-900">{selectedOrder.customer_email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.note && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Ghi chú</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{selectedOrder.note}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end rounded-b-2xl">
              <button onClick={closeModal} className="btn-tis btn-tis-ghost text-sm px-5 py-2">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
