import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api, { fetchList, getValidImageUrl } from '@/lib/api'
import { formatMoney, normalizeList, normalizeSearchText } from '@/lib/format'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import Swal from 'sweetalert2'

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
            {product.target_audience === 'ent' ? 'DN' : 'Cá nhân'}
          </span>
        )}
      </div>
      <div className="product-card-body p-4 flex flex-col flex-1">
        <h3 className="product-card-title font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-tis-red transition-colors leading-snug">
          <Link to={`/products/${product.id}`} className="text-gray-900 group-hover:text-tis-red text-decoration-none">
            {product.name}
          </Link>
        </h3>
        {product.short_description && (
          <p className="product-card-desc text-xs text-gray-400 line-clamp-2 flex-1 mb-3">{product.short_description}</p>
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
                <i className="fas fa-shopping-cart me-1" />Thêm
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

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts]   = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]     = useState(true)

  // Filter states from URL
  const search    = searchParams.get('search') || ''
  const catId     = searchParams.get('category') || ''
  const subCatId  = searchParams.get('subcategory') || ''
  const audience  = searchParams.get('audience') || 'all'
  const sortBy    = searchParams.get('sort') || 'default'
  const [localSearch, setLocalSearch] = useState(search)

  useEffect(() => { setLocalSearch(search) }, [search])

  useEffect(() => {
    fetchList('/categories/').then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (search) params.search = search
    if (catId)  params.category = catId
    fetchList('/products/', params).then(list => {
      setProducts(list)
    }).catch(() => setProducts([])).finally(() => setLoading(false))
  }, [search, catId])

  const setParam = (key, value) => {
    const p = new URLSearchParams(searchParams)
    if (value && value !== 'all') p.set(key, value)
    else p.delete(key)
    setSearchParams(p, { replace: true })
  }

  // Client-side filter
  const filtered = products.filter(p => {
    if (subCatId && p.sub_category != subCatId) return false
    if (audience === 'ind' && p.target_audience === 'ent') return false
    if (audience === 'ent' && p.target_audience !== 'ent') return false
    return true
  }).sort((a, b) => {
    if (sortBy === 'price_asc')  return (a.base_price || 0) - (b.base_price || 0)
    if (sortBy === 'price_desc') return (b.base_price || 0) - (a.base_price || 0)
    if (sortBy === 'name')       return (a.name || '').localeCompare(b.name || '')
    return 0
  })

  const selectedCat = categories.find(c => String(c.id) === catId)

  const handleSearch = (e) => {
    e.preventDefault()
    setParam('search', localSearch)
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <nav className="text-sm text-gray-400 mb-3">
            <Link to="/" className="hover:text-tis-red">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700 font-medium">Sản phẩm bảo hiểm</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedCat ? selectedCat.name : 'Tất cả sản phẩm bảo hiểm'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} sản phẩm {catId ? `trong danh mục "${selectedCat?.name || ''}"` : ''}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-8">
        {/* ── Filters Row ── */}
        <div className="product-filter-panel bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8 flex flex-wrap gap-4 items-center">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1">
              <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="input-tis pl-10 py-2 text-sm"
              />
            </div>
            <button type="submit" className="btn-tis-danger px-4 py-2 text-sm">Tìm</button>
          </form>

          {/* Category Filter */}
          <select
            value={catId}
            onChange={e => setParam('category', e.target.value)}
            className="input-tis py-2 text-sm w-auto min-w-[160px]"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Audience */}
          <div className="product-audience-tabs flex rounded-xl border border-gray-200 overflow-hidden">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'ind', label: 'Cá nhân', icon: 'fa-user' },
              { key: 'ent', label: 'Doanh nghiệp', icon: 'fa-building' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setParam('audience', tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all ${
                  audience === tab.key
                    ? 'bg-tis-red text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.icon && <i className={`fas ${tab.icon} text-xs`} />}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setParam('sort', e.target.value)}
            className="input-tis py-2 text-sm w-auto min-w-[150px]"
          >
            <option value="default">Mặc định</option>
            <option value="price_asc">Giá thấp → cao</option>
            <option value="price_desc">Giá cao → thấp</option>
            <option value="name">Tên A→Z</option>
          </select>
        </div>

        {/* ── Category Tabs (sub-category quick filter) ── */}
        {selectedCat?.children?.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            <button
              onClick={() => setParam('subcategory', '')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!subCatId ? 'bg-tis-red text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-tis-red'}`}
            >
              Tất cả
            </button>
            {selectedCat.children.map(c => (
              <button
                key={c.id}
                onClick={() => setParam('subcategory', String(c.id))}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${subCatId === String(c.id) ? 'bg-tis-red text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-tis-red'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Product Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="skeleton h-44 w-full" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-5 w-1/2 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <i className="fas fa-box-open text-5xl mb-4" />
            <p className="text-lg font-medium">Không tìm thấy sản phẩm nào</p>
            <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            <button onClick={() => setSearchParams({})} className="btn-tis-outline mt-6 text-sm px-6 py-2">
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
