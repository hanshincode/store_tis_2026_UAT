import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { fetchOne, getValidImageUrl } from '@/lib/api'

/* ─── Loading Skeleton ──────────────────────────────────────────────────── */
function CategorySkeleton() {
  return (
    <div className="min-h-screen">
      {/* Hero skeleton */}
      <div className="skeleton w-full" style={{ height: 400 }} />
      {/* Intro skeleton */}
      <div className="container mx-auto px-4 max-w-7xl py-16">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="skeleton h-5 w-40 mx-auto" />
          <div className="skeleton h-8 w-96 mx-auto" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-3/4 mx-auto" />
        </div>
      </div>
      {/* Benefits skeleton */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white p-8 space-y-3">
                <div className="skeleton h-12 w-12 rounded-xl" />
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Benefit Card ──────────────────────────────────────────────────────── */
function BenefitCard({ benefit, index }) {
  const iconMap = [
    'fa-shield-halved',
    'fa-hand-holding-dollar',
    'fa-chart-pie',
    'fa-headset',
    'fa-file-signature',
    'fa-scale-balanced',
    'fa-user-shield',
    'fa-clock-rotate-left',
    'fa-umbrella',
  ]
  const icon = benefit.icon || iconMap[index % iconMap.length]

  return (
    <div className="card-tis p-7 text-center hover:-translate-y-1 transition-transform duration-200 group">
      <div className="w-14 h-14 rounded-xl bg-red-50 text-tis-red flex items-center justify-center mx-auto mb-5 group-hover:bg-tis-red group-hover:text-white transition-colors">
        <i className={`fas ${icon} text-2xl`} />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">
        {benefit.title}
      </h3>
      <p className="text-gray-500 text-sm leading-relaxed">
        {benefit.description}
      </p>
    </div>
  )
}

/* ─── Child Category Card ───────────────────────────────────────────────── */
function ChildCategoryCard({ child, parentId }) {
  const imgUrl = getValidImageUrl(child.hero_image_url || child.image || child.icon)

  return (
    <Link
      to={`/products?category=${parentId}&subcategory=${child.id}`}
      className="card-tis group overflow-hidden hover:-translate-y-1 transition-transform duration-200"
    >
      <div className="h-44 overflow-hidden bg-gray-100 flex items-center justify-center">
        {(child.hero_image_url || child.image) ? (
          <img
            src={imgUrl}
            alt={child.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
            onError={e => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-tis-red/5 to-red-50 flex items-center justify-center">
            <i className="fas fa-shield-halved text-4xl text-tis-red/30" />
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-tis-red transition-colors line-clamp-2">
          {child.name}
        </h3>
        {child.short_description && (
          <p className="text-gray-400 text-xs line-clamp-2 mb-3">{child.short_description}</p>
        )}
        <span className="text-tis-red text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
          Xem sản phẩm <i className="fas fa-arrow-right text-xs" />
        </span>
      </div>
    </Link>
  )
}

/* ─── CategoryPage ──────────────────────────────────────────────────────── */
export default function CategoryPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setLoading(true)
    fetchOne(`/categories/${id}/`)
      .then(data => setCategory(data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <CategorySkeleton />
  if (!category) return null

  const heroImg = getValidImageUrl(category.hero_image_url || category.image)
  const benefits = category.benefits || []
  const children = category.children || category.subcategories || []

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden" style={{ minHeight: 400 }}>
        <img
          src={heroImg}
          alt={category.hero_title || category.name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => { e.target.style.display = 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        <div className="relative container mx-auto px-4 max-w-7xl flex items-center" style={{ minHeight: 400 }}>
          <div className="max-w-2xl text-white py-16">
            {/* Breadcrumb */}
            <nav className="text-sm text-white/60 mb-6 flex items-center gap-2">
              <Link to="/" className="hover:text-white transition-colors">
                <i className="fas fa-home mr-1" />Trang chủ
              </Link>
              <span>/</span>
              <span className="text-white font-medium">{category.name}</span>
            </nav>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight drop-shadow-lg">
              {category.hero_title || category.name}
            </h1>
            {(category.hero_subtitle || category.short_description) && (
              <p className="text-lg text-white/85 leading-relaxed max-w-xl drop-shadow">
                {category.hero_subtitle || category.short_description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-8">
              <Link
                to={`/products?category=${id}`}
                className="btn-tis-danger px-7 py-3 text-sm"
              >
                <i className="fas fa-search mr-2" />Xem sản phẩm
              </Link>
              <Link
                to="/contact"
                className="btn-tis bg-white/10 border border-white/30 text-white hover:bg-white/20 px-7 py-3 text-sm backdrop-blur-sm"
              >
                <i className="fas fa-phone-alt mr-2" />Tư vấn ngay
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Intro Section ── */}
      {(category.intro_title || category.intro_description) && (
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <div className="section-kicker justify-center">{category.name}</div>
            <h2 className="section-title mb-6">
              {category.intro_title || `Tại sao chọn ${category.name}?`}
            </h2>
            {category.intro_description && (
              <p className="text-gray-500 leading-relaxed text-base max-w-3xl mx-auto">
                {category.intro_description}
              </p>
            )}
            <div className="divider-red mx-auto mt-6" />
          </div>
        </section>
      )}

      {/* ── Benefits Section ── */}
      {benefits.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-12">
              <div className="section-kicker justify-center">Quyền lợi</div>
              <h2 className="section-title">Điểm nổi bật</h2>
              <div className="divider-red mx-auto mt-3" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((b, i) => (
                <BenefitCard key={i} benefit={b} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Children Categories ── */}
      {children.length > 0 && (
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-12">
              <div className="section-kicker justify-center">Danh mục con</div>
              <h2 className="section-title">Sản phẩm theo nhóm</h2>
              <p className="text-gray-500 mt-2">Chọn nhóm sản phẩm phù hợp với nhu cầu của bạn</p>
              <div className="divider-red mx-auto mt-3" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {children.map(child => (
                <ChildCategoryCard key={child.id} child={child} parentId={id} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Section ── */}
      <section className="py-20 bg-gradient-to-br from-[#D71920] to-[#b01418]">
        <div className="container mx-auto px-4 max-w-4xl text-center text-white">
          <i className="fas fa-shield-halved text-5xl mb-6 opacity-80" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Sẵn sàng bảo vệ tương lai?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto leading-relaxed">
            Khám phá các sản phẩm bảo hiểm {category.name} và tìm giải pháp phù hợp nhất cho bạn.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to={`/products?category=${id}`}
              className="btn-tis bg-white text-tis-red hover:bg-gray-100 px-8 py-3 font-bold text-sm"
            >
              <i className="fas fa-search mr-2" />Xem tất cả sản phẩm
            </Link>
            <Link
              to="/contact"
              className="btn-tis bg-white/10 border border-white/30 text-white hover:bg-white/20 px-8 py-3 font-bold text-sm"
            >
              <i className="fas fa-phone-alt mr-2" />Liên hệ tư vấn
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
