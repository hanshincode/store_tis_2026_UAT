import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { fetchList, mediaUrl, getValidImageUrl } from '@/lib/api'
import { formatMoney, normalizeList, normalizeSearchText, truncate, stripHtml } from '@/lib/format'
import { formatDate } from '@/lib/format'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import Swal from 'sweetalert2'

/* ─── Hero Banner Slider ──────────────────────────────────────────────── */
function HeroBanner() {
  const [banners, setBanners] = useState([])
  const [current, setCurrent] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const timerRef = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    fetchList('/banners/?is_active=true').then(list => {
      setBanners(list)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setIsPlaying(true)
  }, [current])

  useEffect(() => {
    if (banners.length <= 1) return
    const activeBanner = banners[current]

    // Pause auto-sliding while a video is playing
    if (activeBanner?.video_file && isPlaying) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % banners.length)
    }, 5000)

    return () => clearInterval(timerRef.current)
  }, [banners.length, current, isPlaying])

  const goTo = (idx) => {
    setCurrent(idx)
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
  }

  const handleVideoEnded = () => {
    if (banners.length > 1) {
      setCurrent(c => (c + 1) % banners.length)
    }
  }

  const togglePlayPause = (e) => {
    e.stopPropagation()
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  if (!banners.length) {
    return (
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-tis-red to-tis-red-dark h-80 flex items-center justify-center">
        <div className="text-white text-center">
          <i className="fas fa-shield-halved text-6xl mb-4 opacity-80" />
          <h2 className="text-2xl font-bold">TIS Insurance Broker</h2>
          <p className="mt-2 opacity-80">Giải pháp bảo hiểm toàn diện</p>
        </div>
      </div>
    )
  }

  const b = banners[current]
  const imgUrl = getValidImageUrl(b.background_image || b.image_url || b.image)
  const videoUrl = b.video_file ? getValidImageUrl(b.video_file) : null
  const primaryLink = b.button_link || b.cta_url
  const primaryText = b.button_text || b.cta_text || 'Xem ngay'
  const bannerTemplate = b.template || 'single_left'
  const showTitle = b.show_title !== false
  const isWideBanner = bannerTemplate === 'wide_product'
  const hasBannerContent = Boolean((showTitle && b.title) || b.subtitle || b.eyebrow || b.custom_html)

  return (
    <div className={`relative rounded-2xl overflow-hidden group banner-img-wrap hero-banner hero-banner-${bannerTemplate} ${isWideBanner ? 'hero-banner-wide-frame' : 'h-[420px]'}`}>
      {/* Media: Video or Image */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnded}
          className={`hero-banner-media absolute inset-0 w-full h-full transition-all duration-500 ${isWideBanner ? 'object-contain' : 'object-cover'}`}
        />
      ) : (
        <img
          src={imgUrl}
          alt={b.title || 'TIS Banner'}
          className={`hero-banner-media w-full h-full transition-all duration-500 ${isWideBanner ? 'object-contain' : 'object-cover'}`}
          onError={e => {
            e.target.src = 'https://placehold.co/1200x500/D71920/ffffff?text=TIS+Broker'
          }}
        />
      )}

      {/* Overlay */}
      {(!isWideBanner || hasBannerContent) && (
        <div className={`absolute inset-0 z-10 ${
          isWideBanner
            ? 'bg-gradient-to-r from-black/65 via-black/15 to-transparent'
            : 'bg-gradient-to-t from-black/70 via-black/20 to-transparent'
        }`} />
      )}

      {/* Video Controls Overlay */}
      {videoUrl && (
        <button
          type="button"
          onClick={togglePlayPause}
          className="absolute bottom-4 right-4 z-30 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition-all shadow-lg border border-white/20"
          title={isPlaying ? "Tạm dừng" : "Phát video"}
        >
          <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm`} />
        </button>
      )}

      {/* Content */}
      {hasBannerContent && (
        <div className="hero-banner-content absolute inset-x-8 bottom-8 text-white z-20">
          {b.eyebrow && <span className="hero-banner-eyebrow">{b.eyebrow}</span>}
          {showTitle && b.title && <h2 className="text-2xl font-bold mb-2 drop-shadow-lg">{b.title}</h2>}
          {b.subtitle && <p className="text-white/90 text-sm line-clamp-2 drop-shadow">{b.subtitle}</p>}
          {b.custom_html && bannerTemplate === 'custom_html' && (
            <div className="hero-banner-custom" dangerouslySetInnerHTML={{ __html: b.custom_html }} />
          )}
          {(primaryLink || b.secondary_button_link) && (
            <div className="hero-banner-actions">
              {primaryLink && (
                <a href={primaryLink} className="inline-flex items-center gap-2 btn-tis hero-banner-primary text-sm px-5 py-2">
                  {primaryText} <i className="fas fa-arrow-right" />
                </a>
              )}
              {b.secondary_button_link && (
                <a href={b.secondary_button_link} className="inline-flex items-center gap-2 btn-tis hero-banner-secondary text-sm px-5 py-2">
                  {b.secondary_button_text || 'Tư vấn ngay'}
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {banners.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`banner-dot transition-all ${i === current ? 'active' : ''}`} />
          ))}
        </div>
      )}

      {/* Arrows */}
      {banners.length > 1 && (
        <>
          <button onClick={() => goTo((current - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20">
            <i className="fas fa-chevron-left text-gray-700 text-sm" />
          </button>
          <button onClick={() => goTo((current + 1) % banners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20">
            <i className="fas fa-chevron-right text-gray-700 text-sm" />
          </button>
        </>
      )}
    </div>
  )
}

/* ─── Product Card ─────────────────────────────────────────────────────── */
function ProductCard({ product }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { refresh: refreshCart } = useCart()
  const imageSource = product.images?.[0]?.image_url || product.images?.[0]?.image || product.image_url
  const imgUrl = getValidImageUrl(imageSource)
  const hasProductImage = Boolean(imageSource)
  const defaultPackageId = product.packages?.[0]?.id || null

  const quickAddProductToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      Swal.fire({
        title: 'Đăng nhập',
        text: 'Quý khách cần đăng nhập để thêm sản phẩm vào giỏ hàng.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#D71920',
        confirmButtonText: 'Đăng nhập ngay',
        cancelButtonText: 'Để sau'
      }).then((result) => { if (result.isConfirmed) navigate('/login') })
      return
    }
    try {
      await api.post('/cart/add/', { package_id: defaultPackageId, quantity: 1 })
      Swal.fire({
        title: 'Thành công',
        text: 'Đã thêm sản phẩm vào giỏ hàng.',
        icon: 'success',
        confirmButtonColor: '#D71920',
        timer: 1500,
        showConfirmButton: false
      })
      refreshCart()
    } catch (error) {
      Swal.fire('Lỗi', error.response?.data?.detail || error.message || 'Không thể thêm vào giỏ hàng', 'error')
    }
  }

  const buyProductNow = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      Swal.fire({
        title: 'Đăng nhập',
        text: 'Quý khách cần đăng nhập để thanh toán.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#D71920',
        confirmButtonText: 'Đăng nhập ngay',
        cancelButtonText: 'Để sau'
      }).then((result) => { if (result.isConfirmed) navigate('/login') })
      return
    }
    try {
      const { data: order } = await api.post('/orders/buy_now/', { package_id: defaultPackageId, quantity: 1 })
      navigate(`/user/payment?token=${encodeURIComponent(order.payment_token || order.id)}`)
    } catch (error) {
      Swal.fire('Lỗi', error.response?.data?.detail || error.message || 'Không thể tạo đơn thanh toán', 'error')
    }
  }

  return (
    <div className="card-tis product-card group flex flex-col hover:-translate-y-1 transition-all duration-200">
      <div className="product-card-media relative overflow-hidden bg-gray-100">
        <Link to={`/products/${product.id}`}>
          {hasProductImage ? (
            <img src={imgUrl} alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
              loading="lazy"
              onError={e => { e.currentTarget.closest('.product-card-media')?.classList.add('is-fallback') }}
            />
          ) : (
            <div className="product-card-fallback">
              <img src="/images/logo.png" alt="TIS Broker" />
            </div>
          )}
        </Link>
        {product.category_name && (
          <span className="absolute top-2 left-2 badge-tis-red text-[11px]">{product.category_name}</span>
        )}
        {product.target_audience && (
          <span className={`absolute top-2 right-2 badge-tis text-[11px] ${product.target_audience === 'ent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
            <i className={`fas ${product.target_audience === 'ent' ? 'fa-building' : 'fa-user'} text-[10px]`} />
            {product.target_audience === 'ent' ? 'Doanh nghiệp' : 'Cá nhân'}
          </span>
        )}
      </div>
      <div className="product-card-body p-4 flex flex-col flex-1">
        <h3 className="product-card-title font-bold text-gray-900 mb-2 group-hover:text-tis-red transition-colors leading-snug">
          <Link to={`/products/${product.id}`} className="text-gray-900 group-hover:text-tis-red text-decoration-none">
            {product.name}
          </Link>
        </h3>
        {product.short_description && (
          <p className="product-card-desc text-xs text-gray-400 flex-1 mb-3">{product.short_description}</p>
        )}
        
        <div className="product-card-footer mt-auto">
          <div className="price-tag">
            {product.is_price_hidden ? (
              <>
                <span className="price-label">Phí từ</span>
                <span className="price-amount price-contact">Liên hệ</span>
              </>
            ) : product.base_price ? (
              <>
                <span className="price-label">Phí từ</span>
                <span className="price-amount">{formatMoney(product.base_price)}</span>
              </>
            ) : (
              <span className="text-muted small fw-semibold">Đang cập nhật</span>
            )}
          </div>

          {product.is_price_hidden || !defaultPackageId ? (
            <Link
              to={`/products/${product.id}`}
              className="btn btn-outline-danger btn-sm rounded-pill px-3 self-end"
              style={{ borderColor: '#D71920', color: '#D71920' }}
            >
              Nhận báo giá <i className="fas fa-arrow-right ms-1" />
            </Link>
          ) : (
            <div className="product-card-actions">
              <button
                type="button"
                className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold product-action-add"
                onClick={quickAddProductToCart}
                style={{ borderColor: '#D71920', color: '#D71920' }}
              >
                <i className="fas fa-shopping-cart me-1" />Thêm giỏ hàng
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm rounded-pill px-3 fw-bold product-action-buy text-white"
                onClick={buyProductNow}
                style={{ backgroundColor: '#D71920', borderColor: '#D71920' }}
              >
                Mua ngay
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Stats Strip ──────────────────────────────────────────────────────── */
function StatsStrip() {
  const stats = [
    { to: 20, suffix: '+', label: 'Chuyên gia bảo hiểm' },
    { to: 96, suffix: '%', label: 'Tỷ lệ duy trì' },
    { prefix: 'No.', to: 1, label: 'Broker Hull - P&I tại Việt Nam' },
    { to: 24, suffix: '/7', label: 'Hỗ trợ khách hàng' },
  ]
  return (
    <div className="about-stats grid grid-cols-2 md:grid-cols-4 gap-0 mt-8">
      {stats.map((s, i) => (
        <div key={i} className="text-center">
          <div className="text-3xl font-bold text-tis-red">
            {s.prefix || ''}{s.to}{s.suffix || ''}
          </div>
          <div className="text-sm text-gray-500 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

/* ─── Testimonials ─────────────────────────────────────────────────────── */
const TESTIMONIALS = [
  { name: 'Công ty Logistics An Phát', type: 'Khách hàng doanh nghiệp', rating: 5, comment: 'TIS giúp chúng tôi rà soát rủi ro vận hành và thiết kế chương trình bảo hiểm phù hợp hơn so với gói cũ.' },
  { name: 'Gia đình anh Minh', type: 'Khách hàng cá nhân', rating: 4.5, comment: 'Quy trình tư vấn rõ ràng, chuyên viên giải thích kỹ các điều khoản loại trừ trước khi tham gia.' },
  { name: 'Nhà máy Cơ khí Đông Nam', type: 'Khách hàng sản xuất', rating: 5, comment: 'Điểm mạnh là đội ngũ hỗ trợ bồi thường theo sát hồ sơ, giúp doanh nghiệp tiết kiệm nhiều thời gian.' },
]

function TestimonialCard({ item }) {
  const stars = Array.from({ length: 5 }, (_, i) => (
    <i key={i} className={`fas ${i < Math.floor(item.rating) ? 'fa-star' : i < item.rating ? 'fa-star-half-alt' : 'fa-star text-gray-200'} text-yellow-400 text-xs`} />
  ))
  return (
    <div className="card-tis p-6 flex flex-col">
      <div className="flex gap-0.5 mb-3">{stars}</div>
      <p className="text-gray-600 text-sm leading-relaxed flex-1 italic">"{item.comment}"</p>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="font-bold text-gray-900 text-sm">{item.name}</p>
        <p className="text-gray-400 text-xs mt-0.5">{item.type}</p>
      </div>
    </div>
  )
}

/* ─── HomePage ─────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [products, setProducts] = useState([])
  const [news, setNews]         = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingNews, setLoadingNews]         = useState(true)
  const [audienceFilter, setAudienceFilter]   = useState('all')

  useEffect(() => {
    fetchList('/products/?is_active=true&page_size=12').then(list => {
      setProducts(list)
    }).catch(() => {}).finally(() => setLoadingProducts(false))

    fetchList('/news/?page_size=6').then(list => {
      setNews(list)
    }).catch(() => {}).finally(() => setLoadingNews(false))
  }, [])

  const filtered = products.filter(p =>
    audienceFilter === 'all' ? true :
    audienceFilter === 'ind' ? p.target_audience !== 'ent' :
    p.target_audience === 'ent'
  )

  return (
    <div>
      {/* ── Banner Section ── */}
      <section className="pt-6 pb-10 bg-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <HeroBanner />
        </div>
      </section>

      {/* ── About Section ── */}
      <section className="about-section py-20 bg-white" id="about">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="about-shell grid lg:grid-cols-[minmax(0,1.04fr)_minmax(420px,0.96fr)] gap-8 items-start">
            <div className="about-copy">
              <div className="section-kicker">About TIS </div>
              <h2 className="section-title mb-4">
                Your <br />
                <span className="about-brand-letter">T</span>rustful <span className="about-brand-letter">I</span>nsurance <span className="about-brand-letter">S</span>pecialist
              </h2>
              <p className="text-gray-500 leading-relaxed">
                TIS Broker đồng hành cùng doanh nghiệp và cá nhân trong tư vấn rủi ro, lựa chọn bảo hiểm, xử lý bồi thường và tối ưu chương trình bảo vệ.
              </p>
              <StatsStrip />
            </div>

            <div className="about-feature-grid grid sm:grid-cols-2 gap-4">
              {[
                { icon: 'fa-user-shield',       title: 'Đặt lợi ích khách hàng lên trước', desc: 'Tư vấn độc lập, minh bạch quyền lợi và điều khoản để khách hàng chọn đúng giải pháp.' },
                { icon: 'fa-scale-balanced',    title: 'Đồng hành khi phát sinh bồi thường', desc: 'Hỗ trợ hồ sơ, quy trình và trao đổi với các bên liên quan để bảo vệ quyền lợi hợp lệ.' },
                { icon: 'fa-chart-line',        title: 'Phân tích rủi ro theo ngành', desc: 'Từ xây dựng, logistics, sản xuất đến chăm sóc sức khỏe, chương trình được thiết kế theo thực tế.' },
                { icon: 'fa-headset',           title: 'Hỗ trợ liên tục', desc: 'Đội ngũ chuyên viên tiếp nhận tư vấn, đơn hàng và yêu cầu hỗ trợ trực tuyến tập trung.' },
              ].map((item, i) => (
                <div key={i} className="about-feature-card">
                  <span className="about-feature-icon">
                    <i className={`fas ${item.icon}`} />
                  </span>
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm mb-2">{item.title}</h5>
                    <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Products Section ── */}
      <section className="py-20 bg-gray-50" id="products">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-10">
            <div className="section-kicker justify-center">Sản phẩm</div>
            <h2 className="section-title">Sản phẩm nổi bật</h2>
            <p className="text-gray-500 mt-2">Chọn gói bảo hiểm phù hợp nhất để bảo vệ tương lai của bạn</p>
            <div className="divider-red mx-auto mt-3" />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'ind', label: 'Cá nhân', icon: 'fa-user' },
              { key: 'ent', label: 'Doanh nghiệp', icon: 'fa-building' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setAudienceFilter(tab.key)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  audienceFilter === tab.key
                    ? 'bg-tis-red text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-tis-red hover:text-tis-red'
                }`}
              >
                {tab.icon && <i className={`fas ${tab.icon}`} />}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          {loadingProducts ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden">
                  <div className="skeleton h-48 w-full" />
                  <div className="p-5 space-y-3">
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-6 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <i className="fas fa-box-open text-4xl mb-3" />
              <p>Chưa có sản phẩm nào.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {filtered.length > 8 && (
            <div className="text-center mt-10">
              <Link to="/products" className="btn-tis-outline px-8 py-3">
                Xem tất cả sản phẩm <i className="fas fa-arrow-right ml-2" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Testimonials Section ── */}
      <section className="py-20 bg-white" id="testimonials">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-10">
            <div className="section-kicker justify-content-center">Testimonials</div>
            <h2 className="section-title">Khách hàng tiêu biểu & Đánh giá</h2>
            <p className="text-gray-500 mt-2">Phản hồi từ khách hàng đã triển khai chương trình bảo hiểm cùng TIS.</p>
            <div className="divider-red mx-auto mt-3" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => <TestimonialCard key={i} item={t} />)}
          </div>
        </div>
      </section>

      {/* ── News Section ── */}
      <section className="py-20 bg-gray-50" id="news">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Tin tức & Sự kiện</h2>
              <div className="divider-red mt-2" />
            </div>
            <Link to="/news" className="btn-tis-outline text-sm px-5 py-2">Xem tất cả</Link>
          </div>

          {loadingNews ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden">
                  <div className="skeleton h-48 w-full" />
                  <div className="p-5 space-y-2">
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {news.slice(0, 3).map(item => (
                <Link key={item.id} to={`/news/${item.id}`} className="card-tis group overflow-hidden hover:-translate-y-1 transition-transform duration-200">
                  <div className="h-48 overflow-hidden bg-gray-100">
                    <img
                      src={item.image ? `${item.image}` : 'https://placehold.co/400x250/f8f9fa/6c757d?text=TIS+News'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                      loading="lazy"
                      onError={e => { e.target.src = 'https://placehold.co/400x250/f8f9fa/6c757d?text=TIS+News' }}
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-1 mb-2 text-gray-400 text-xs">
                      <i className="far fa-calendar-alt text-tis-red" />
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : ''}
                    </div>
                    <h3 className="home-news-title font-bold text-gray-900 mb-2 group-hover:text-tis-red transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-gray-500 text-xs line-clamp-2">{truncate(stripHtml(item.content), 100)}</p>
                    <span className="text-tis-red text-xs font-semibold mt-3 flex items-center gap-1">
                      Đọc tiếp <i className="fas fa-arrow-right text-xs" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
