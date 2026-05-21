import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchList } from '@/lib/api'
import { truncate, stripHtml, formatDate } from '@/lib/format'

function NewsCard({ item, featured = false }) {
  const imgUrl = item.image_url || item.image || ''
  const resolvedImg = imgUrl.startsWith('http') ? imgUrl : imgUrl ? `/api${imgUrl}` : 'https://placehold.co/600x400/f8f9fa/6c757d?text=TIS+News'

  if (featured) return (
    <Link to={`/news/${item.id}`} className="card-tis group overflow-hidden flex flex-col lg:flex-row hover:-translate-y-1 transition-transform duration-200">
      <div className="lg:w-1/2 h-56 lg:h-auto overflow-hidden bg-gray-100 flex-shrink-0">
        <img src={resolvedImg} alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
          onError={e => { e.target.src = 'https://placehold.co/600x400/f8f9fa/6c757d?text=TIS+News' }} />
      </div>
      <div className="p-8 flex flex-col justify-between flex-1">
        <div>
          {item.category_name && <span className="badge-tis-red text-xs mb-3 inline-block">{item.category_name}</span>}
          <h2 className="text-xl font-bold text-gray-900 line-clamp-3 mb-3 group-hover:text-tis-red transition-colors leading-snug">{item.title}</h2>
          <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed">{truncate(stripHtml(item.content), 200)}</p>
        </div>
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <i className="far fa-calendar-alt text-tis-red" />
            {item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : ''}
          </div>
          <span className="text-tis-red text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
            Đọc tiếp <i className="fas fa-arrow-right text-xs" />
          </span>
        </div>
      </div>
    </Link>
  )

  return (
    <Link to={`/news/${item.id}`} className="card-tis group overflow-hidden hover:-translate-y-1 transition-transform duration-200">
      <div className="h-48 overflow-hidden bg-gray-100">
        <img src={resolvedImg} alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
          onError={e => { e.target.src = 'https://placehold.co/600x400/f8f9fa/6c757d?text=TIS+News' }} />
      </div>
      <div className="p-5">
        {item.category_name && <span className="badge-tis-red text-xs mb-2 inline-block">{item.category_name}</span>}
        <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-2 group-hover:text-tis-red transition-colors leading-snug">{item.title}</h3>
        <p className="text-gray-400 text-xs line-clamp-2 mb-3">{truncate(stripHtml(item.content), 100)}</p>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs flex items-center gap-1">
            <i className="far fa-calendar-alt text-tis-red text-xs" />
            {item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : ''}
          </span>
          <span className="text-tis-red text-xs font-semibold">Đọc tiếp →</span>
        </div>
      </div>
    </Link>
  )
}

export default function NewsPage() {
  const [news, setNews]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const PER_PAGE = 9

  useEffect(() => {
    fetchList('/news/?page_size=50').then(setNews).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = news.filter(n =>
    !search || n.title?.toLowerCase().includes(search.toLowerCase())
  )
  const total = filtered.length
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b py-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <nav className="text-sm text-gray-400 mb-3">
            <Link to="/" className="hover:text-tis-red">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700 font-medium">Tin tức</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tin tức & Sự kiện</h1>
          <p className="text-gray-500">Cập nhật thông tin bảo hiểm, thị trường và hoạt động TIS Broker</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-10">
        {/* Search */}
        <div className="mb-8 max-w-md">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm kiếm tin tức..."
              className="input-tis pl-11"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="skeleton h-48 w-full" />
                <div className="p-5 space-y-2">
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <i className="fas fa-newspaper text-5xl mb-4" />
            <p>Không tìm thấy tin tức nào.</p>
          </div>
        ) : (
          <>
            {/* Featured (first article) */}
            {page === 1 && paginated[0] && (
              <div className="mb-8">
                <NewsCard item={paginated[0]} featured />
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(page === 1 ? paginated.slice(1) : paginated).map(item => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:border-tis-red hover:text-tis-red disabled:opacity-40 transition-colors">
                  <i className="fas fa-chevron-left text-sm" />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${page === i + 1 ? 'bg-tis-red text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:border-tis-red hover:text-tis-red'}`}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:border-tis-red hover:text-tis-red disabled:opacity-40 transition-colors">
                  <i className="fas fa-chevron-right text-sm" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
