import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { fetchOne, fetchList, getValidImageUrl } from '@/lib/api'
import { formatDate, formatMoney, truncate, stripHtml } from '@/lib/format'

/* ─── Loading Skeleton ──────────────────────────────────────────────────── */
function DetailSkeleton() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="skeleton h-4 w-48 mb-4" />
          <div className="skeleton h-8 w-full mb-2" />
          <div className="skeleton h-8 w-3/4 mb-4" />
          <div className="flex items-center gap-4">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-4 w-20" />
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 max-w-4xl py-10">
        <div className="skeleton w-full rounded-2xl mb-8" style={{ height: 420 }} />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton h-4 w-full" />
          ))}
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
    </div>
  )
}

/* ─── Related News Card ─────────────────────────────────────────────────── */
function RelatedCard({ item }) {
  const imgUrl = item.image_url || item.image || ''
  const resolvedImg = imgUrl.startsWith('http')
    ? imgUrl
    : imgUrl
      ? `/api${imgUrl}`
      : 'https://placehold.co/400x250/f8f9fa/6c757d?text=TIS+News'

  return (
    <Link
      to={`/news/${item.id}`}
      className="card-tis group overflow-hidden hover:-translate-y-1 transition-transform duration-200"
    >
      <div className="h-44 overflow-hidden bg-gray-100">
        <img
          src={resolvedImg}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
          loading="lazy"
          onError={e => { e.target.src = 'https://placehold.co/400x250/f8f9fa/6c757d?text=TIS+News' }}
        />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-1 mb-2 text-gray-400 text-xs">
          <i className="far fa-calendar-alt text-tis-red" />
          {formatDate(item.created_at)}
        </div>
        <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-2 group-hover:text-tis-red transition-colors leading-snug">
          {item.title}
        </h3>
        <p className="text-gray-400 text-xs line-clamp-2">
          {truncate(stripHtml(item.content), 100)}
        </p>
        <span className="text-tis-red text-xs font-semibold mt-3 flex items-center gap-1">
          Đọc tiếp <i className="fas fa-arrow-right text-xs" />
        </span>
      </div>
    </Link>
  )
}

/* ─── NewsDetailPage ────────────────────────────────────────────────────── */
function InterestedProductCard({ product }) {
  const imageSource = product.images?.[0]?.image_url || product.images?.[0]?.image || product.image_url
  const imgUrl = getValidImageUrl(imageSource)

  return (
    <Link
      to={`/products/${product.id}`}
      className="card-tis product-card group flex flex-col overflow-hidden hover:-translate-y-1 transition-all duration-200"
    >
      <div className="product-card-media relative overflow-hidden bg-gray-100">
        {imageSource ? (
          <img src={imgUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" loading="lazy" />
        ) : (
          <div className="product-card-fallback">
            <img src="/images/logo.png" alt="TIS Broker" />
          </div>
        )}
        {product.category_name && (
          <span className="absolute top-2 left-2 badge-tis-red text-[11px]">{product.category_name}</span>
        )}
      </div>
      <div className="product-card-body p-4 flex flex-col flex-1">
        <h3 className="product-card-title font-bold text-gray-900 mb-2 group-hover:text-tis-red transition-colors leading-snug">
          {product.name}
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
          <span className="btn btn-outline-danger btn-sm rounded-pill px-3 self-end" style={{ borderColor: '#D71920', color: '#D71920' }}>
            Xem chi tiết <i className="fas fa-arrow-right ms-1" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function NewsDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [related, setRelated] = useState([])
  const [interestedProducts, setInterestedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingRelated, setLoadingRelated] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setLoading(true)
    fetchOne(`/news/${id}/`)
      .then(data => setArticle(data))
      .catch(() => navigate('/news'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    setLoadingRelated(true)
    setLoadingProducts(true)
    Promise.all([
      fetchList('/news/?page_size=5').catch(() => []),
      fetchList('/products/?page_size=4').catch(() => []),
    ])
      .then(([newsList, productList]) => {
        const filtered = newsList.filter(n => String(n.id) !== String(id))
        setRelated(filtered.slice(0, 4))
        setInterestedProducts(productList.slice(0, 4))
      })
      .finally(() => {
        setLoadingRelated(false)
        setLoadingProducts(false)
      })
  }, [id])

  if (loading) return <DetailSkeleton />
  if (!article) return null

  const imgUrl = article.image_url || article.image || ''
  const resolvedImg = imgUrl.startsWith('http')
    ? imgUrl
    : imgUrl
      ? `/api${imgUrl}`
      : null

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-400 mb-4 flex items-center gap-2 flex-wrap">
            <Link to="/" className="hover:text-tis-red transition-colors">
              <i className="fas fa-home mr-1" />Trang chủ
            </Link>
            <span>/</span>
            <Link to="/news" className="hover:text-tis-red transition-colors">
              Tin tức
            </Link>
            <span>/</span>
            <span className="text-gray-600 font-medium line-clamp-1">
              {truncate(article.title, 50)}
            </span>
          </nav>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug mb-4">
            {article.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 flex-wrap text-sm text-gray-400">
            {article.created_at && (
              <span className="flex items-center gap-1.5">
                <i className="far fa-calendar-alt text-tis-red" />
                {formatDate(article.created_at)}
              </span>
            )}
            {article.author_name && (
              <span className="flex items-center gap-1.5">
                <i className="far fa-user text-tis-red" />
                {article.author_name}
              </span>
            )}
            {article.category_name && (
              <span className="badge-tis-red text-xs">{article.category_name}</span>
            )}
          </div>
        </div>
      </div>

      {/* Article Body */}
      <div className="container mx-auto px-4 max-w-4xl py-10">
        {/* Featured Image */}
        {resolvedImg && (
          <div className="rounded-2xl overflow-hidden mb-8 bg-gray-100">
            <img
              src={resolvedImg}
              alt={article.title}
              className="w-full max-h-[500px] object-cover"
              onError={e => {
                e.target.style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Content */}
        <article className="card-tis p-6 md:p-10">
          <div
            className="prose prose-sm md:prose-base max-w-none text-gray-700 leading-relaxed
              prose-headings:text-gray-900 prose-headings:font-bold
              prose-a:text-tis-red prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl prose-img:shadow-sm"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>

        {/* Share Actions */}
        <div className="flex items-center justify-between mt-6 p-4 bg-white rounded-xl border border-gray-100">
          <span className="text-sm text-gray-500">
            <i className="fas fa-share-alt mr-2 text-tis-red" />Chia sẻ bài viết
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                  .catch(() => {})
              }}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-tis-red hover:text-white text-gray-500 flex items-center justify-center transition-colors"
              title="Sao chép liên kết"
            >
              <i className="fas fa-link text-sm" />
            </button>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link
            to="/news"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-tis-red transition-colors"
          >
            <i className="fas fa-arrow-left" />
            Quay lại danh sách tin tức
          </Link>
        </div>
      </div>

      {/* Related News */}
      {related.length > 0 && (
        <section className="py-16 bg-white border-t">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Tin tức liên quan</h2>
                <div className="divider-red mt-2" />
              </div>
              <Link to="/news" className="btn-tis-outline text-sm px-5 py-2">
                Xem tất cả
              </Link>
            </div>

            {loadingRelated ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden">
                    <div className="skeleton h-44 w-full" />
                    <div className="p-5 space-y-2">
                      <div className="skeleton h-4 w-full" />
                      <div className="skeleton h-4 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {related.map(item => (
                  <RelatedCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Interested Products */}
      {(loadingProducts || interestedProducts.length > 0) && (
        <section className="py-16 bg-gray-50 border-t">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Sản phẩm bạn có thể quan tâm</h2>
                <div className="divider-red mt-2" />
              </div>
              <Link to="/products" className="btn-tis-outline text-sm px-5 py-2">
                Xem tất cả
              </Link>
            </div>

            {loadingProducts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden">
                    <div className="skeleton h-44 w-full" />
                    <div className="p-5 space-y-2">
                      <div className="skeleton h-4 w-full" />
                      <div className="skeleton h-4 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {interestedProducts.map(product => (
                  <InterestedProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
