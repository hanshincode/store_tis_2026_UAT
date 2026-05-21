import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { getErrorMessage, getValidImageUrl } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { useCart } from '@/context/CartContext'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'

export default function UserCart() {
  const navigate = useNavigate()
  const { refresh: refreshCartCount } = useCart()

  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    loadCart()
  }, [])

  async function loadCart() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/cart/')
      setCart(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải giỏ hàng.'))
    } finally {
      setLoading(false)
    }
  }

  async function removeItem(itemId) {
    const result = await Swal.fire({
      title: 'Xóa sản phẩm?',
      text: 'Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#D71920',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Xóa',
    })
    if (!result.isConfirmed) return

    setRemovingId(itemId)
    try {
      await api.delete(`/cart/items/${itemId}/`)
      toast.success('Đã xóa sản phẩm khỏi giỏ hàng.')
      await loadCart()
      refreshCartCount()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể xóa sản phẩm.'))
    } finally {
      setRemovingId(null)
    }
  }

  async function updateQuantity(itemId, newQty) {
    if (newQty < 1) return
    setUpdatingId(itemId)
    try {
      await api.patch(`/cart/items/${itemId}/`, { quantity: newQty })
      await loadCart()
      refreshCartCount()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể cập nhật số lượng.'))
    } finally {
      setUpdatingId(null)
    }
  }

  const items = cart?.items || []
  const totalPrice = items.reduce((sum, item) => {
    const price = Number(item.price || item.product_price || item.subtotal || 0)
    const qty = Number(item.quantity || 1)
    return sum + price * qty
  }, 0)

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-40 skeleton rounded-lg" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="admin-card flex items-center gap-4">
            <div className="skeleton w-20 h-20 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-48 rounded" />
              <div className="skeleton h-3 w-32 rounded" />
              <div className="skeleton h-4 w-24 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-card text-center py-12">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-exclamation-triangle text-red-400 text-2xl" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Lỗi tải giỏ hàng</h3>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={loadCart} className="btn-tis btn-tis-outline text-sm px-5 py-2">
          <i className="fas fa-redo mr-2" />Thử lại
        </button>
      </div>
    )
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900">Giỏ hàng</h1>
        <div className="admin-card text-center py-20">
          <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-shopping-cart text-gray-300 text-4xl" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Giỏ hàng trống</h3>
          <p className="text-gray-400 text-sm mb-6">Bạn chưa thêm sản phẩm nào vào giỏ hàng.</p>
          <button
            onClick={() => navigate('/products')}
            className="btn-tis btn-tis-danger px-6 py-2.5"
          >
            <i className="fas fa-shopping-bag mr-2" />Khám phá sản phẩm
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Giỏ hàng</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} sản phẩm trong giỏ</p>
        </div>
        <button onClick={loadCart} className="btn-tis btn-tis-ghost text-sm px-3 py-2" title="Tải lại">
          <i className="fas fa-sync-alt" />
        </button>
      </div>

      {/* Cart Items */}
      <div className="space-y-3">
        {items.map(item => {
          const itemPrice = Number(item.price || item.product_price || item.subtotal || 0)
          const itemQty = Number(item.quantity || 1)
          const isRemoving = removingId === item.id
          const isUpdating = updatingId === item.id

          return (
            <div key={item.id} className={`admin-card flex items-start gap-4 ${isRemoving ? 'opacity-50' : ''}`}>
              {/* Product Image */}
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={getValidImageUrl(item.product_image || item.product?.image)}
                  alt={item.product_name || 'Sản phẩm'}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = 'https://placehold.co/200x200/f8f9fa/d71920?text=TIS' }}
                />
              </div>

              {/* Item Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm truncate">
                  {item.product_name || item.product?.name || 'Sản phẩm bảo hiểm'}
                </h3>
                {(item.package_name || item.package?.name) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    <i className="fas fa-box mr-1" />
                    Gói: {item.package_name || item.package?.name}
                  </p>
                )}
                <p className="text-tis-red font-bold text-sm mt-2">{formatMoney(itemPrice)}</p>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => updateQuantity(item.id, itemQty - 1)}
                    disabled={itemQty <= 1 || isUpdating}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="fas fa-minus text-xs" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-gray-900">
                    {isUpdating ? <i className="fas fa-spinner fa-spin text-xs" /> : itemQty}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, itemQty + 1)}
                    disabled={isUpdating}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <i className="fas fa-plus text-xs" />
                  </button>
                </div>
              </div>

              {/* Subtotal & Remove */}
              <div className="text-right flex flex-col items-end gap-2 flex-shrink-0">
                <p className="font-bold text-gray-900 text-sm">
                  {formatMoney(itemPrice * itemQty)}
                </p>
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={isRemoving}
                  className="text-red-400 hover:text-red-600 text-xs transition-colors disabled:opacity-50"
                  title="Xóa"
                >
                  <i className="fas fa-trash-alt mr-1" />Xóa
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary / Checkout */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600 font-medium">Tổng cộng ({items.length} sản phẩm)</span>
          <span className="text-2xl font-bold text-tis-red">{formatMoney(totalPrice)}</span>
        </div>
        <button
          onClick={() => navigate('/user/payment')}
          className="btn-tis btn-tis-danger w-full py-3 text-base"
        >
          <i className="fas fa-credit-card mr-2" />
          Thanh toán
        </button>
        <button
          onClick={() => navigate('/products')}
          className="btn-tis btn-tis-ghost w-full py-2.5 mt-2 text-sm"
        >
          <i className="fas fa-arrow-left mr-2" />Tiếp tục mua sắm
        </button>
      </div>
    </div>
  )
}
