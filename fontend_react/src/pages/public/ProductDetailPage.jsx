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
  const [autoPlay, setAutoPlay] = useState(images.length > 1)

  useEffect(() => {
    setCurrent(0)
    setAutoPlay(images.length > 1)
  }, [images])

  useEffect(() => {
    if (!autoPlay || images.length <= 1) return undefined

    const galleryTimer = window.setInterval(() => {
      setCurrent((index) => (index + 1) % images.length)
    }, 4200)

    return () => window.clearInterval(galleryTimer)
  }, [autoPlay, images.length])

  if (!images.length) return null

  const selectImage = (index) => {
    setCurrent(index)
    setAutoPlay(false)
  }

  return (
    <div className="product-gallery">
      <div className="product-gallery-stage">
        <img
          src={images[current]}
          alt={`${name} - ảnh ${current + 1}`}
          className="product-gallery-image"
          onError={e => { e.target.src = 'https://placehold.co/800x600/f8f9fa/d71920?text=TIS' }}
        />
        {images.length > 1 && (
          <>
            <button onClick={() => selectImage((current - 1 + images.length) % images.length)}
              className="product-gallery-arrow is-prev" aria-label="Ảnh trước">
              <i className="fas fa-chevron-left" />
            </button>
            <button onClick={() => selectImage((current + 1) % images.length)}
              className="product-gallery-arrow is-next" aria-label="Ảnh tiếp theo">
              <i className="fas fa-chevron-right" />
            </button>
            <div className="product-gallery-meta">
              <span>{current + 1} / {images.length}</span>
              <button type="button" onClick={() => setAutoPlay((playing) => !playing)}>
                <i className={`fas ${autoPlay ? 'fa-pause' : 'fa-play'}`} />
                {autoPlay ? 'Tạm dừng' : 'Tự chuyển'}
              </button>
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="product-gallery-thumbs" aria-label="Danh sách ảnh sản phẩm">
          {images.map((img, i) => (
            <button key={`${img}-${i}`} onClick={() => selectImage(i)}
              className={`product-gallery-thumb ${i === current ? 'is-active' : ''}`}
              aria-label={`Xem ảnh ${i + 1}`}
            >
              <img src={img} alt=""
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

  const galleryImages = [
    ...(product.images || []).map(img => img.image_url || img.image),
    product.image_url,
  ]
    .filter(Boolean)
    .map(image => getValidImageUrl(image))
    .filter((image, index, allImages) => allImages.indexOf(image) === index)
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            {/* Premium Gradient Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#D71920] to-[#f54950] text-white p-6">
              {/* Decorative background blur shapes */}
              <div className="absolute right-[-20px] top-[-20px] w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="absolute left-[-10px] bottom-[-30px] w-24 h-24 rounded-full bg-white/5 blur-lg pointer-events-none" />
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
                  <i className="fas fa-headset text-xl animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Yêu cầu tư vấn</h3>
                  <p className="text-white/80 text-xs mt-1">Chuyên viên sẽ liên hệ với bạn sau</p>
                </div>
              </div>
              
              <button 
                onClick={() => setConsultModal(false)} 
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all duration-200"
                aria-label="Đóng"
              >
                <i className="fas fa-times text-sm" />
              </button>
            </div>

            {/* Premium Form Layout */}
            <form onSubmit={submitConsultation} className="p-6 space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Họ và tên</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                    <i className="far fa-user text-sm" />
                  </span>
                  <input 
                    value={consultForm.name} 
                    onChange={e => setConsultForm({ ...consultForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-[#D71920] focus:ring-4 focus:ring-[#D71920]/10 transition-all outline-none" 
                    placeholder="Nguyễn Văn A" 
                    required 
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Số điện thoại <span className="text-[#D71920]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                    <i className="fas fa-phone-alt text-sm" />
                  </span>
                  <input 
                    value={consultForm.phone} 
                    onChange={e => setConsultForm({ ...consultForm, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-[#D71920] focus:ring-4 focus:ring-[#D71920]/10 transition-all outline-none" 
                    placeholder="09xx xxx xxx" 
                    required 
                    inputMode="tel" 
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Email <span className="text-[#D71920]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                    <i className="far fa-envelope text-sm" />
                  </span>
                  <input 
                    value={consultForm.email} 
                    onChange={e => setConsultForm({ ...consultForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-[#D71920] focus:ring-4 focus:ring-[#D71920]/10 transition-all outline-none" 
                    placeholder="email@gmail.com" 
                    type="email" 
                    required 
                  />
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Nội dung</label>
                <div className="relative">
                  <span className="absolute top-3 left-0 pl-3.5 flex items-start text-gray-400 pointer-events-none">
                    <i className="far fa-edit text-sm" />
                  </span>
                  <textarea 
                    value={consultForm.note} 
                    onChange={e => setConsultForm({ ...consultForm, note: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-[#D71920] focus:ring-4 focus:ring-[#D71920]/10 transition-all outline-none resize-none" 
                    rows={3} 
                    placeholder="Nhập nội dung cần tư vấn..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={submitting} 
                className="w-full py-3.5 px-4 bg-gradient-to-r from-[#D71920] to-[#f54950] text-white font-bold rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/35 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2 mt-2 text-sm cursor-pointer"
              >
                {submitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2" />
                    Đang gửi yêu cầu...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane mr-2" />
                    Gửi yêu cầu ngay
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-2">
                <i className="fas fa-shield-alt text-[#D71920]/75" />
                <span>Cam kết bảo mật thông tin tuyệt đối</span>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
