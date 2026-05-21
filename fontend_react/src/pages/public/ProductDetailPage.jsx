import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api, { fetchOne, getValidImageUrl, mediaUrl } from '@/lib/api'
import { formatMoney, truncate, stripHtml } from '@/lib/format'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import Swal from 'sweetalert2'

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

function GallerySection({ images, name }) {
  const [current, setCurrent] = useState(0)
  if (!images.length) return null

  return (
    <div>
      {/* Main Image */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-100 mb-3" style={{ height: 380 }}>
        <img
          src={images[current]}
          alt={name}
          className="w-full h-full object-cover transition-opacity duration-200"
          onError={e => { e.target.src = 'https://placehold.co/800x600/f8f9fa/d71920?text=TIS' }}
        />
        {images.length > 1 && (
          <>
            <button onClick={() => setCurrent((current - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white">
              <i className="fas fa-chevron-left text-sm text-gray-700" />
            </button>
            <button onClick={() => setCurrent((current + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white">
              <i className="fas fa-chevron-right text-sm text-gray-700" />
            </button>
            <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              {current + 1}/{images.length}
            </div>
          </>
        )}
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === current ? 'border-tis-red' : 'border-transparent hover:border-gray-300'}`}>
              <img src={img} alt="" className="w-full h-full object-cover"
                onError={e => { e.target.src = 'https://placehold.co/100x100/f8f9fa/d71920?text=TIS' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProductDetailPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { refresh: refreshCart } = useCart()
  const [product, setProduct]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [consultModal, setConsultModal] = useState(false)
  const [consultForm, setConsultForm] = useState({ name: '', phone: '', email: '', note: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchOne(`/products/${id}/`).then(p => {
      setProduct(p)
      const pkgs = getUniquePackages(p.packages || [])
      if (pkgs.length) setSelectedPkg(pkgs[0])
    }).catch(() => navigate('/products')).finally(() => setLoading(false))
  }, [id])

  const getUniquePackages = (pkgs) => {
    const seen = new Set()
    return pkgs.filter(pkg => {
      const key = `${pkg.duration_days}|${Number(pkg.price)||0}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const openConsultation = async (note = '') => {
    const defaultNote = note || (product ? `Tư vấn sản phẩm: ${product.name}` : '')
    let name = '', phone = '', email = ''
    if (isAuthenticated) {
      try {
        const { data: me } = await api.get('/users/me/')
        name = `${me.last_name || ''} ${me.first_name || ''}`.trim() || me.username
        phone = me.phone || ''
        email = me.email || ''
      } catch {}
    }
    setConsultForm({ name, phone, email, note: defaultNote })
    setConsultModal(true)
  }

  const submitConsultation = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        product: product?.id || null,
        customer_name: consultForm.name,
        customer_contact: consultForm.phone,
        email: consultForm.email,
        note: consultForm.note,
        send_customer_email: true,
      }
      const res = await api.post('/consultations/', payload)
      setConsultModal(false)
      if (isAuthenticated && res.data?.id) {
        navigate(`/user/chat?consultation=${res.data.id}`)
        return
      }
      const safePhone = escapeHtml(consultForm.phone)
      const safeEmail = escapeHtml(consultForm.email)
      const safeNote = escapeHtml(consultForm.note || 'Không có')
      const emailNotice = res.data?.customer_email_sent
        ? 'Email xác nhận đã được gửi tới địa chỉ bạn cung cấp.'
        : 'Yêu cầu đã được ghi nhận. Email xác nhận sẽ được gửi khi hệ thống email hoạt động.'
      Swal.fire({
        title: 'Đã tiếp nhận!',
        html: `<div class="text-left"><p>Hệ thống đã ghi nhận thông tin.</p><p class="text-muted small mt-2">Chuyên viên sẽ liên hệ qua <b>${safePhone}</b> trong giây lát.</p><div class="mt-3 rounded-lg bg-gray-50 p-3 text-sm"><div><b>Email:</b> ${safeEmail}</div><div><b>Nội dung:</b> ${safeNote}</div></div><p class="text-xs text-gray-400 mt-2">${escapeHtml(emailNotice)}</p></div>`,
        icon: 'success', confirmButtonColor: '#D71920', confirmButtonText: 'Hoàn tất',
      })
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể gửi yêu cầu. Vui lòng thử lại.', confirmButtonColor: '#D71920' })
    } finally { setSubmitting(false) }
  }

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      Swal.fire({ title: 'Đăng nhập', text: 'Quý khách cần đăng nhập để thanh toán.', icon: 'info',
        showCancelButton: true, confirmButtonColor: '#D71920', confirmButtonText: 'Đăng nhập ngay', cancelButtonText: 'Để sau',
      }).then(r => { if (r.isConfirmed) navigate('/login') })
      return
    }
    if (!selectedPkg) { Swal.fire({ icon: 'warning', title: 'Vui lòng chọn thời hạn bảo hiểm.', confirmButtonColor: '#D71920' }); return }
    try {
      const { data: order } = await api.post('/orders/buy_now/', { package_id: selectedPkg.id, quantity: 1 })
      navigate(`/user/payment?token=${order.payment_token || order.id}`)
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể tạo đơn thanh toán.', confirmButtonColor: '#D71920' })
    }
  }

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      Swal.fire({
        title: 'Đăng nhập',
        text: 'Quý khách cần đăng nhập để thêm sản phẩm vào giỏ hàng.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#D71920',
        confirmButtonText: 'Đăng nhập ngay',
        cancelButtonText: 'Để sau',
      }).then(r => { if (r.isConfirmed) navigate('/login') })
      return
    }
    if (!selectedPkg) {
      Swal.fire({ icon: 'warning', title: 'Vui lòng chọn thời hạn bảo hiểm.', confirmButtonColor: '#D71920' })
      return
    }
    try {
      await api.post('/cart/add/', { package_id: selectedPkg.id, quantity: 1 })
      Swal.fire({
        title: 'Thành công',
        text: 'Sản phẩm đã được thêm vào giỏ hàng.',
        icon: 'success',
        confirmButtonColor: '#D71920',
        confirmButtonText: 'Hoàn tất',
      })
      refreshCart()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể thêm sản phẩm vào giỏ hàng.', confirmButtonColor: '#D71920' })
    }
  }

  if (loading) return (
    <div className="container mx-auto px-4 max-w-6xl py-12">
      <div className="grid lg:grid-cols-2 gap-10">
        <div className="skeleton rounded-2xl" style={{ height: 380 }} />
        <div className="space-y-4 pt-4">
          <div className="skeleton h-6 w-1/3" />
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-10 w-1/2 mt-4" />
        </div>
      </div>
    </div>
  )

  if (!product) return null

  const galleryImages = (product.images || [])
    .map(img => getValidImageUrl(img.image_url || img.image))
    .filter(Boolean)
  if (!galleryImages.length) galleryImages.push(getValidImageUrl(null))

  const packages = getUniquePackages(product.packages || [])
  const displayPrice = product.is_price_hidden
    ? <span className="text-tis-red font-bold text-2xl">Liên hệ</span>
    : <span className="text-tis-red font-bold text-2xl">
        {selectedPkg ? formatMoney(selectedPkg.price) : (product.base_price ? formatMoney(product.base_price) : 'Đang cập nhật')}
      </span>

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-7xl py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-400 mb-6">
          <Link to="/" className="hover:text-tis-red">Trang chủ</Link>
          <span className="mx-2">/</span>
          <Link to="/products" className="hover:text-tis-red">Sản phẩm</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{product.name}</span>
        </nav>

        {/* Main Layout */}
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
          {/* Left: Gallery */}
          <div>
            <span className="badge-tis-red text-xs mb-3 inline-block">
              {product.category_name || 'Gói bảo hiểm'}
            </span>
            <h1 className="text-2xl font-bold text-gray-900 mb-4 lg:hidden">{product.name}</h1>
            <GallerySection images={galleryImages} name={product.name} />
            <div className="flex justify-center gap-6 mt-4 text-sm text-gray-400">
              <span><i className="fas fa-check-circle text-green-500 mr-1" /> Chính hãng</span>
              <span><i className="fas fa-bolt text-yellow-400 mr-1" /> Cấp đơn nhanh</span>
            </div>
          </div>

          {/* Right: Info */}
          <div className="card-tis p-7">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 hidden lg:block">{product.name}</h2>
            <div className="flex items-center gap-3 mb-4">
              <span className="badge-tis-dark text-xs">
                <i className={`fas ${product.target_audience === 'ent' ? 'fa-building' : 'fa-user'} mr-1`} />
                {product.target_audience === 'ent' ? 'Doanh nghiệp' : 'Cá nhân'}
              </span>
              {product.provider_name && (
                <span className="text-gray-400 text-sm">Cung cấp bởi: <strong className="text-gray-700">{product.provider_name}</strong></span>
              )}
            </div>

            <div className="mb-1 text-gray-400 text-xs uppercase font-semibold tracking-wider">Phí bảo hiểm:</div>
            <div className="mb-4">{displayPrice}</div>

            {product.short_description && (
              <p className="text-gray-500 text-sm leading-relaxed mb-6">{product.short_description}</p>
            )}

            {/* Packages */}
            {packages.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm text-gray-800">Chọn thời hạn:</span>
                  <span className="text-xs text-gray-400"><i className="far fa-clock mr-1" />Hiệu lực ngay</span>
                </div>
                <div className="space-y-2">
                  {packages.map(pkg => {
                    const icons = pkg.duration_days <= 90 ? 'fa-calendar-day' : pkg.duration_days >= 365 ? 'fa-calendar-check' : 'fa-calendar-alt'
                    return (
                      <div key={pkg.id}
                        onClick={() => setSelectedPkg(pkg)}
                        className={`selection-card ${selectedPkg?.id === pkg.id ? 'selected' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="icon-box"><i className={`fas ${icons}`} /></div>
                          <div>
                            <div className="font-bold text-sm text-gray-900">{pkg.duration_label || `${pkg.duration_days} ngày`}</div>
                            <div className="text-xs text-gray-400">Bảo vệ toàn diện</div>
                          </div>
                        </div>
                        <div className="font-bold text-tis-red">
                          {product.is_price_hidden ? 'Liên hệ' : formatMoney(pkg.price)}
                        </div>
                      </div>
                    )
                  })}
                  <div className="selection-card" onClick={() => openConsultation(`Tôi muốn tùy chỉnh thời hạn: ${product.name}`)}>
                    <div className="flex items-center gap-3">
                      <div className="icon-box"><i className="fas fa-sliders-h" /></div>
                      <div>
                        <div className="font-bold text-sm text-gray-900">Tùy chỉnh / Khác</div>
                        <div className="text-xs text-gray-400">Thiết kế theo nhu cầu</div>
                      </div>
                    </div>
                    <i className="fas fa-chevron-right text-gray-300" />
                  </div>
                </div>
              </div>
            )}

            {/* Policy Info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-500 space-y-2">
              <div className="flex justify-between">
                <span>Hình thức cấp đơn:</span>
                <span className="font-bold text-gray-800"><i className="fas fa-qrcode text-tis-red mr-1" />GCN Điện tử</span>
              </div>
              <div className="flex justify-between">
                <span>Phạm vi:</span>
                <span className="font-bold text-gray-800">Toàn lãnh thổ Việt Nam</span>
              </div>
            </div>

            {/* Action Buttons */}
            {product.is_price_hidden ? (
              <button onClick={() => openConsultation(`Yêu cầu tư vấn phí cho sản phẩm: ${product.name}`)}
                className="btn-tis-danger w-full py-3">
                <i className="fas fa-phone-alt mr-2" />Yêu cầu tư vấn
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleAddToCart} className="btn-tis-outline py-3 text-sm">
                    <i className="fas fa-cart-plus mr-2" />Thêm giỏ hàng
                  </button>
                  <button onClick={handleBuyNow} className="btn-tis-danger py-3 text-sm">
                    <i className="fas fa-bolt mr-2" />Thanh toán ngay
                  </button>
                </div>
                <button onClick={() => openConsultation(`Phân tích rủi ro cho sản phẩm: ${product.name}`)}
                  className="btn-tis-ghost w-full py-2.5 border border-gray-200 rounded-full text-sm">
                  <i className="fas fa-chart-line mr-2" />Phân tích rủi ro
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="card-tis mt-10 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">Chi tiết quyền lợi</h2>
            <div
              className="prose prose-sm max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </div>
        )}
      </div>

      {/* ── Consultation Modal ── */}
      {consultModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h5 className="font-bold text-gray-900">Yêu cầu tư vấn</h5>
                <p className="text-xs text-gray-400 mt-0.5">Chuyên viên sẽ liên hệ trong vòng 30 phút</p>
              </div>
              <button onClick={() => setConsultModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <i className="fas fa-times text-sm text-gray-600" />
              </button>
            </div>
            <form onSubmit={submitConsultation} className="p-5 space-y-4">
              <div>
                <label className="label-tis">Họ và tên</label>
                <input value={consultForm.name} onChange={e => setConsultForm({ ...consultForm, name: e.target.value })}
                  className="input-tis" placeholder="Nguyễn Văn A" required />
              </div>
              <div>
                <label className="label-tis">Số điện thoại <span className="text-red-400">*</span></label>
                <input value={consultForm.phone} onChange={e => setConsultForm({ ...consultForm, phone: e.target.value })}
                  className="input-tis" placeholder="09xx xxx xxx" required inputMode="tel" />
              </div>
              <div>
                <label className="label-tis">Email <span className="text-red-400">*</span></label>
                <input value={consultForm.email} onChange={e => setConsultForm({ ...consultForm, email: e.target.value })}
                  className="input-tis" placeholder="email@gmail.com" type="email" required />
              </div>
              <div>
                <label className="label-tis">Nội dung</label>
                <textarea value={consultForm.note} onChange={e => setConsultForm({ ...consultForm, note: e.target.value })}
                  className="input-tis resize-none" rows={3} />
              </div>
              <button type="submit" disabled={submitting} className="btn-tis-danger w-full py-3 disabled:opacity-60">
                {submitting ? <><i className="fas fa-spinner fa-spin mr-2" />Đang gửi...</> : <><i className="fas fa-paper-plane mr-2" />Gửi yêu cầu</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
