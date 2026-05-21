import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchList } from '@/lib/api'
import { formatDate } from '@/lib/format'

/* ─── Loading Skeleton ──────────────────────────────────────────────────── */
function CmsSkeleton() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b py-10">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="skeleton h-4 w-48 mb-4" />
          <div className="skeleton h-8 w-80 mb-2" />
          <div className="skeleton h-4 w-32" />
        </div>
      </div>
      <div className="container mx-auto px-4 max-w-4xl py-10">
        <div className="card-tis p-8 space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="skeleton h-4 w-full" style={{ width: `${85 + Math.random() * 15}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Error / Not Found ─────────────────────────────────────────────────── */
function NotFound({ slug }) {
  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="w-20 h-20 rounded-2xl bg-red-50 text-tis-red flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-file-circle-exclamation text-3xl" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy trang</h1>
        <p className="text-gray-500 mb-6">
          Trang "<span className="font-mono text-gray-700">{slug}</span>" không tồn tại hoặc đã bị xóa.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="btn-tis-danger px-6 py-2.5 text-sm">
            <i className="fas fa-home mr-2" />Về trang chủ
          </Link>
          <Link to="/contact" className="btn-tis-outline px-6 py-2.5 text-sm">
            <i className="fas fa-paper-plane mr-2" />Liên hệ
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ─── CmsPage ───────────────────────────────────────────────────────────── */
export default function CmsPage() {
  const { slug } = useParams()
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setLoading(true)
    setNotFound(false)
    setPage(null)

    fetchList(`/site-pages/?slug=${encodeURIComponent(slug)}`)
      .then(list => {
        if (list.length > 0) {
          setPage(list[0])
        } else {
          setNotFound(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <CmsSkeleton />
  if (notFound || !page) return <NotFound slug={slug} />

  // Build a nice slug label for breadcrumb
  const breadcrumbLabel = page.title || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b py-10">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-400 mb-4 flex items-center gap-2 flex-wrap">
            <Link to="/" className="hover:text-tis-red transition-colors">
              <i className="fas fa-home mr-1" />Trang chủ
            </Link>
            <span>/</span>
            <span className="text-gray-700 font-medium line-clamp-1">
              {breadcrumbLabel}
            </span>
          </nav>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {page.title}
          </h1>

          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
            {page.updated_at && (
              <span className="flex items-center gap-1.5">
                <i className="far fa-clock text-tis-red" />
                Cập nhật: {formatDate(page.updated_at)}
              </span>
            )}
            {page.created_at && !page.updated_at && (
              <span className="flex items-center gap-1.5">
                <i className="far fa-calendar-alt text-tis-red" />
                {formatDate(page.created_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 max-w-4xl py-10">
        <article className="card-tis p-6 md:p-10">
          {/* Featured image if exists */}
          {(page.image || page.image_url) && (
            <div className="rounded-xl overflow-hidden mb-8 bg-gray-100">
              <img
                src={page.image_url || page.image}
                alt={page.title}
                className="w-full max-h-[400px] object-cover"
                onError={e => { e.target.style.display = 'none' }}
              />
            </div>
          )}

          {/* Page content */}
          {page.content ? (
            <div
              className="prose prose-sm md:prose-base max-w-none text-gray-700 leading-relaxed
                prose-headings:text-gray-900 prose-headings:font-bold
                prose-a:text-tis-red prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-xl prose-img:shadow-sm
                prose-table:border prose-table:border-gray-200
                prose-th:bg-gray-50 prose-th:px-4 prose-th:py-2
                prose-td:px-4 prose-td:py-2 prose-td:border-t prose-td:border-gray-100
                prose-li:marker:text-tis-red
                prose-blockquote:border-l-tis-red prose-blockquote:bg-red-50/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-xl"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          ) : (
            <div className="text-center py-12 text-gray-400">
              <i className="fas fa-file-alt text-4xl mb-3" />
              <p>Nội dung đang được cập nhật.</p>
            </div>
          )}
        </article>

        {/* Back navigation */}
        <div className="mt-8 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-tis-red transition-colors"
          >
            <i className="fas fa-arrow-left" />
            Về trang chủ
          </Link>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-tis-red transition-colors"
          >
            <i className="fas fa-arrow-up" />
            Về đầu trang
          </button>
        </div>
      </div>
    </div>
  )
}
