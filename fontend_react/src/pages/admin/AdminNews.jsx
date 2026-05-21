import { useState, useEffect } from 'react'
import api, { fetchList, getValidImageUrl, getErrorMessage } from '@/lib/api'
import { formatDateTime, normalizeList } from '@/lib/format'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminNews() {
  const [newsList, setNewsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const emptyForm = { title: '', content: '' }
  const [form, setForm] = useState(emptyForm)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await fetchList('/news/')
      const sorted = normalizeList(data).sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )
      setNewsList(sorted)
    } catch (err) {
      toast.error('Không thể tải danh sách tin tức')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Strip HTML helper
  const stripHtml = (html = '') => {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return (doc.body.textContent || doc.body.innerText || '').replace(/\s+/g, ' ').trim()
  }

  // Filter
  const filtered = newsList.filter((item) => {
    if (!search) return true
    const keyword = search.toLowerCase()
    const plainText = stripHtml(item.content || '').toLowerCase()
    return (
      item.title?.toLowerCase().includes(keyword) ||
      plainText.includes(keyword) ||
      String(item.id).includes(keyword)
    )
  })

  const openModal = (item = null) => {
    if (item) {
      setEditing(item)
      setForm({
        title: item.title || '',
        content: item.content || '',
      })
      setImagePreview(item.image ? getValidImageUrl(item.image) : '')
    } else {
      setEditing(null)
      setForm(emptyForm)
      setImagePreview('')
    }
    setImageFile(null)
    setShowModal(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài viết')
      return
    }
    if (!form.content.trim()) {
      toast.error('Vui lòng nhập nội dung bài viết')
      return
    }
    if (!editing && !imageFile) {
      toast.error('Vui lòng chọn ảnh bìa cho bài viết mới')
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title.trim())
      fd.append('content', form.content.trim())
      if (imageFile) {
        fd.append('image', imageFile)
      }

      if (editing) {
        await api.patch(`/news/${editing.id}/`, fd)
        toast.success('Cập nhật tin tức thành công!')
      } else {
        await api.post('/news/', fd)
        toast.success('Đăng bài viết mới thành công!')
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: getErrorMessage(err, 'Không thể lưu bài viết.'),
        confirmButtonColor: '#D71920',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    const r = await Swal.fire({
      title: 'Xóa bài viết?',
      text: 'Bài viết sẽ bị xóa khỏi trang tin tức công khai và hành động này không thể hoàn tác.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#D71920',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    })
    if (!r.isConfirmed) return

    try {
      await api.delete(`/news/${id}/`)
      toast.success('Đã xóa bài viết.')
      loadData()
    } catch (err) {
      toast.error('Không thể xóa bài viết.')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý tin tức</h1>
          <p className="text-sm text-gray-500 mt-0.5">{newsList.length} bài viết</p>
        </div>
        <button onClick={() => openModal()} className="btn-tis-danger text-sm">
          <i className="fas fa-plus mr-2" /> Đăng bài mới
        </button>
      </div>

      {/* Filter search */}
      <div className="admin-card mb-6 !p-4">
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm tiêu đề hoặc nội dung bài viết..."
            className="input-tis pl-10 text-sm"
          />
        </div>
      </div>

      {/* Grid list */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="spinner-tis" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-card text-center py-12 text-gray-400">
          <i className="far fa-newspaper text-4xl mb-3" />
          <p className="text-lg font-medium">Không tìm thấy bài viết phù hợp</p>
          <p className="text-sm mt-1">Hãy thử tìm với từ khóa khác hoặc thêm bài viết mới.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => {
            const image = item.image
              ? getValidImageUrl(item.image)
              : 'https://placehold.co/640x360/f8f9fa/d71920?text=TIS+Broker'
            const previewText = stripHtml(item.content || '')
            return (
              <div
                key={item.id}
                className="admin-card overflow-hidden flex flex-col border border-gray-100 hover:shadow-md transition-shadow duration-300"
              >
                <div className="relative h-48 bg-gray-50 overflow-hidden">
                  <img
                    src={image}
                    alt={item.title || 'Tin tức'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src =
                        'https://placehold.co/640x360/f8f9fa/d71920?text=TIS+Broker'
                    }}
                  />
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    #{item.id}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-gray-400 mb-2 flex items-center">
                      <i className="far fa-calendar-alt mr-1.5" />
                      {formatDateTime(item.created_at)}
                    </div>
                    <h5
                      className="font-bold text-gray-900 line-clamp-2 mb-2 text-base"
                      title={item.title}
                    >
                      {item.title || 'Không có tiêu đề'}
                    </h5>
                    <p className="text-gray-500 text-sm line-clamp-3 mb-4">
                      {previewText || 'Chưa có nội dung tóm tắt.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                    <a
                      href={`/news/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50 transition flex items-center"
                    >
                      <i className="fas fa-eye mr-1" /> Xem
                    </a>
                    <button
                      onClick={() => openModal(item)}
                      className="px-3 py-1.5 border border-blue-100 text-blue-600 rounded text-xs hover:bg-blue-50 transition flex items-center"
                    >
                      <i className="fas fa-pen mr-1" /> Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1.5 border border-red-100 text-red-600 rounded text-xs hover:bg-red-50 transition flex items-center"
                    >
                      <i className="fas fa-trash mr-1" /> Xóa
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CRUD Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {editing ? 'Chỉnh sửa bài viết' : 'Đăng bài mới'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <i className="fas fa-times text-xl" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">
                    Tiêu đề bài viết <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Nhập tiêu đề bài viết"
                    className="input-tis w-full"
                  />
                </div>

                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">
                    Nội dung bài viết (Hỗ trợ định dạng HTML) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={12}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Nhập nội dung chi tiết bài viết dưới dạng văn bản hoặc mã HTML..."
                    className="input-tis w-full font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">
                    Ảnh bìa bài viết {!editing && <span className="text-red-500">*</span>}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      id="news-image-input"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="news-image-input"
                      className="px-4 py-2 border border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition text-sm text-gray-600 flex items-center"
                    >
                      <i className="fas fa-upload mr-2 text-red-500" /> Chọn ảnh bìa
                    </label>
                    <span className="text-xs text-gray-400">Hỗ trợ file ảnh dưới 5MB</span>
                  </div>

                  {imagePreview && (
                    <div className="mt-3 relative w-48 h-28 border border-gray-200 rounded overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Ảnh xem trước"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview('')
                        }}
                        className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition"
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-tis-danger text-sm min-w-[100px] flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <div className="spinner-tis !w-4 !h-4 !border-2 !border-white mr-2" />
                      Đang lưu
                    </>
                  ) : (
                    'Lưu bài viết'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
