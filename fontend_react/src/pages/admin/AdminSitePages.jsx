import { useState, useEffect } from 'react'
import api, { fetchList, getValidImageUrl, getErrorMessage } from '@/lib/api'
import { formatDateTime, normalizeList } from '@/lib/format'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminSitePages() {
  const [activeTab, setActiveTab] = useState('cms') // cms / menu
  const [pages, setPages] = useState([])
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)

  // CMS Page Modal State
  const [showPageModal, setShowPageModal] = useState(false)
  const [editingPage, setEditingPage] = useState(null)
  const [submittingPage, setSubmittingPage] = useState(false)
  const [pageForm, setPageForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    is_published: true,
  })
  const [pageImage, setPageImage] = useState(null)
  const [pageImagePreview, setPageImagePreview] = useState('')

  // Menu Header Modal State
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [editingMenu, setEditingMenu] = useState(null)
  const [submittingMenu, setSubmittingMenu] = useState(false)
  const [menuForm, setMenuForm] = useState({
    label: '',
    page: '',
    sort_order: 0,
    is_active: true,
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [pagesRes, menusRes] = await Promise.all([
        fetchList('/site-pages/'),
        fetchList('/header-menu-items/'),
      ])
      setPages(normalizeList(pagesRes))
      setMenus(normalizeList(menusRes))
    } catch {
      toast.error('Lỗi tải cấu hình trang và menu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // slug helper
  const handleTitleChange = (val) => {
    const slugified = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/([^a-z0-9\s-]|_)+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    
    setPageForm((prev) => ({
      ...prev,
      title: val,
      slug: prev.slug === '' || prev.slug === prev.title.toLowerCase() ? slugified : prev.slug,
    }))
  }

  // --- CMS Page CRUD ---
  const openPageModal = (page = null) => {
    if (page) {
      setEditingPage(page)
      setPageForm({
        title: page.title || '',
        slug: page.slug || '',
        excerpt: page.excerpt || '',
        content: page.content || '',
        is_published: page.is_published !== false,
      })
      setPageImagePreview(page.image_url ? getValidImageUrl(page.image_url) : '')
    } else {
      setEditingPage(null)
      setPageForm({ title: '', slug: '', excerpt: '', content: '', is_published: true })
      setPageImagePreview('')
    }
    setPageImage(null)
    setShowPageModal(true)
  }

  const handlePageImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPageImage(file)
    setPageImagePreview(URL.createObjectURL(file))
  }

  const handlePageSubmit = async (e) => {
    e.preventDefault()
    if (!pageForm.title.trim() || !pageForm.slug.trim()) {
      toast.error('Vui lòng điền đầy đủ tiêu đề và slug')
      return
    }

    setSubmittingPage(true)
    try {
      const fd = new FormData()
      fd.append('title', pageForm.title.trim())
      fd.append('slug', pageForm.slug.trim())
      fd.append('excerpt', pageForm.excerpt.trim())
      fd.append('content', pageForm.content.trim())
      fd.append('is_published', pageForm.is_published ? 'true' : 'false')
      if (pageImage) {
        fd.append('image', pageImage)
      }

      if (editingPage) {
        // original targets site-pages by slug!
        await api.patch(`/site-pages/${editingPage.slug}/`, fd)
        toast.success('Đã cập nhật trang tĩnh!')
      } else {
        await api.post('/site-pages/', fd)
        toast.success('Đã thêm trang tĩnh mới!')
      }
      setShowPageModal(false)
      loadData()
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: getErrorMessage(err, 'Không thể lưu trang nội dung.'),
        confirmButtonColor: '#D71920',
      })
    } finally {
      setSubmittingPage(false)
    }
  }

  const handlePageDelete = async (slug) => {
    const r = await Swal.fire({
      title: 'Xóa trang này?',
      text: 'Trang tĩnh sẽ bị xóa hoàn toàn khỏi hệ thống.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#D71920',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    })
    if (!r.isConfirmed) return

    try {
      await api.delete(`/site-pages/${slug}/`)
      toast.success('Đã xóa trang tĩnh.')
      loadData()
    } catch (err) {
      toast.error('Không thể xóa trang tĩnh.')
    }
  }

  // --- Menu Header CRUD ---
  const openMenuModal = (menu = null) => {
    if (menu) {
      setEditingMenu(menu)
      setMenuForm({
        label: menu.label || '',
        page: menu.page || '',
        sort_order: menu.sort_order || 0,
        is_active: menu.is_active !== false,
      })
    } else {
      setEditingMenu(null)
      setMenuForm({ label: '', page: pages[0]?.id || '', sort_order: 0, is_active: true })
    }
    setShowMenuModal(true)
  }

  const handleMenuSubmit = async (e) => {
    e.preventDefault()
    if (!menuForm.label.trim()) {
      toast.error('Vui lòng nhập nhãn menu')
      return
    }

    setSubmittingMenu(true)
    try {
      const payload = {
        label: menuForm.label.trim(),
        link_type: 'page',
        page: menuForm.page || null,
        sort_order: Number(menuForm.sort_order || 0),
        is_active: menuForm.is_active,
      }

      if (editingMenu) {
        await api.patch(`/header-menu-items/${editingMenu.id}/`, payload)
        toast.success('Đã cập nhật liên kết menu!')
      } else {
        await api.post('/header-menu-items/', payload)
        toast.success('Đã thêm liên kết menu mới!')
      }
      setShowMenuModal(false)
      loadData()
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: getErrorMessage(err, 'Không thể lưu liên kết menu.'),
        confirmButtonColor: '#D71920',
      })
    } finally {
      setSubmittingMenu(false)
    }
  }

  const handleMenuDelete = async (id) => {
    const r = await Swal.fire({
      title: 'Xóa menu này?',
      text: 'Liên kết này sẽ bị xóa khỏi thanh điều hướng.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#D71920',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    })
    if (!r.isConfirmed) return

    try {
      await api.delete(`/header-menu-items/${id}/`)
      toast.success('Đã xóa liên kết menu.')
      loadData()
    } catch (err) {
      toast.error('Không thể xóa liên kết menu.')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý giao diện và trang</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tùy biến cấu trúc trang tĩnh (CMS) và thanh menu điều hướng</p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-gray-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('cms')}
          className={`px-4 py-2 text-sm font-semibold transition border-b-2 -mb-[2px] ${
            activeTab === 'cms'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className="fas fa-file-alt mr-1.5" /> Trang nội dung (CMS)
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 text-sm font-semibold transition border-b-2 -mb-[2px] ${
            activeTab === 'menu'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <i className="fas fa-bars mr-1.5" /> Menu Header tùy chỉnh
        </button>
      </div>

      {/* Dynamic Content */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="spinner-tis" />
        </div>
      ) : activeTab === 'cms' ? (
        /* CMS Tab */
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-950">Danh sách trang tĩnh</h2>
            <button onClick={() => openPageModal()} className="btn-tis-danger text-xs">
              <i className="fas fa-plus mr-1" /> Thêm trang CMS
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.length === 0 ? (
              <div className="col-span-full admin-card text-center py-12 text-gray-400">
                Chưa có trang CMS nào. Click button để bắt đầu thêm.
              </div>
            ) : (
              pages.map((page) => (
                <div key={page.slug} className="admin-card flex flex-col justify-between border border-gray-100 hover:shadow-sm transition">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <strong className="text-gray-950 font-bold block mb-1 text-base">
                        {page.title}
                      </strong>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        page.is_published ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {page.is_published ? 'Hiển thị' : 'Ẩn'}
                      </span>
                    </div>
                    <code className="text-xs text-gray-400 block mb-2 font-mono">
                      /page/{page.slug}
                    </code>
                    {page.excerpt && (
                      <p className="text-sm text-gray-500 line-clamp-2 mt-2 leading-relaxed">
                        {page.excerpt}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                    <a
                      href={`/page/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1.5 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50 transition"
                      title="Xem công khai"
                    >
                      <i className="fas fa-eye" />
                    </a>
                    <button
                      onClick={() => openPageModal(page)}
                      className="px-3 py-1.5 border border-blue-100 text-blue-600 rounded text-xs hover:bg-blue-50 transition flex items-center"
                    >
                      <i className="fas fa-pen mr-1" /> Sửa
                    </button>
                    <button
                      onClick={() => handlePageDelete(page.slug)}
                      className="px-3 py-1.5 border border-red-100 text-red-600 rounded text-xs hover:bg-red-50 transition flex items-center"
                    >
                      <i className="fas fa-trash mr-1" /> Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Menu Header Tab */
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-950">Cấu hình liên kết Header Menu</h2>
            <button onClick={() => openMenuModal()} className="btn-tis-danger text-xs">
              <i className="fas fa-plus mr-1" /> Thêm nút Menu
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menus.length === 0 ? (
              <div className="col-span-full admin-card text-center py-12 text-gray-400">
                Chưa cấu hình liên kết menu nào.
              </div>
            ) : (
              menus
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                .map((menu) => {
                  const targetPage = pages.find((p) => String(p.id) === String(menu.page))
                  return (
                    <div key={menu.id} className="admin-card flex items-center justify-between border border-gray-100 hover:shadow-sm transition">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-gray-900 font-bold">{menu.label}</strong>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            menu.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {menu.is_active ? 'Đang hoạt động' : 'Đang khóa'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Trang đích: <span className="font-semibold text-gray-600">{targetPage ? targetPage.title : 'N/A'}</span> · Thứ tự sắp xếp: <span className="font-mono">{menu.sort_order || 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openMenuModal(menu)}
                          className="px-2 py-1.5 border border-blue-100 text-blue-600 rounded hover:bg-blue-50 transition"
                          title="Chỉnh sửa"
                        >
                          <i className="fas fa-pen" />
                        </button>
                        <button
                          onClick={() => handleMenuDelete(menu.id)}
                          className="px-2 py-1.5 border border-red-100 text-red-600 rounded hover:bg-red-50 transition"
                          title="Xóa"
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      )}

      {/* --- CMS Page Modal --- */}
      {showPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl my-8">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {editingPage ? 'Cập nhật trang tĩnh' : 'Tạo trang tĩnh mới'}
              </h3>
              <button
                onClick={() => setShowPageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-xl" />
              </button>
            </div>

            <form onSubmit={handlePageSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label-tis block text-sm font-semibold mb-1">
                      Tiêu đề trang <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={pageForm.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Nhập tiêu đề (Ví dụ: Về chúng tôi)"
                      className="input-tis w-full"
                    />
                  </div>

                  <div>
                    <label className="label-tis block text-sm font-semibold mb-1">
                      Đường dẫn tĩnh (Slug) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={pageForm.slug}
                      onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })}
                      placeholder="ve-chung-toi"
                      className="input-tis w-full font-mono text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">
                    Tóm tắt ngắn (Excerpt)
                  </label>
                  <input
                    type="text"
                    value={pageForm.excerpt}
                    onChange={(e) => setPageForm({ ...pageForm, excerpt: e.target.value })}
                    placeholder="Mô tả ngắn hiển thị ở ngoài danh sách hoặc tìm kiếm..."
                    className="input-tis w-full text-sm"
                  />
                </div>

                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">
                    Nội dung trang (Hỗ trợ định dạng HTML)
                  </label>
                  <textarea
                    rows={10}
                    value={pageForm.content}
                    onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })}
                    placeholder="Điền nội dung chi tiết bài viết (chấp nhận thẻ HTML)..."
                    className="input-tis w-full font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">Ảnh đại diện trang</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      id="page-image-input"
                      onChange={handlePageImageChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="page-image-input"
                      className="px-4 py-2 border border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition text-sm text-gray-600 flex items-center"
                    >
                      <i className="fas fa-image mr-2 text-red-500" /> Chọn ảnh
                    </label>
                    <span className="text-xs text-gray-400">Được hiển thị trong phần đầu bài viết</span>
                  </div>

                  {pageImagePreview && (
                    <div className="mt-3 relative w-40 h-24 border border-gray-200 rounded overflow-hidden">
                      <img
                        src={pageImagePreview}
                        alt="Ảnh minh họa"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPageImage(null)
                          setPageImagePreview('')
                        }}
                        className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="page-published"
                    checked={pageForm.is_published}
                    onChange={(e) => setPageForm({ ...pageForm, is_published: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4 border-gray-300"
                  />
                  <label htmlFor="page-published" className="text-sm font-semibold text-gray-700 select-none">
                    Công khai hiển thị trên Website công cộng
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setShowPageModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingPage}
                  className="btn-tis-danger text-sm min-w-[100px] flex items-center justify-center"
                >
                  {submittingPage ? (
                    <>
                      <div className="spinner-tis !w-4 !h-4 !border-2 !border-white mr-2" />
                      Đang lưu
                    </>
                  ) : (
                    'Lưu trang'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Menu Header Modal --- */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {editingMenu ? 'Cập nhật liên kết Menu' : 'Thêm liên kết Menu mới'}
              </h3>
              <button
                onClick={() => setShowMenuModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-xl" />
              </button>
            </div>

            <form onSubmit={handleMenuSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">
                    Nhãn nút (Menu Label) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={menuForm.label}
                    onChange={(e) => setMenuForm({ ...menuForm, label: e.target.value })}
                    placeholder="Ví dụ: Khuyến mãi, Giới thiệu"
                    className="input-tis w-full"
                  />
                </div>

                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">Liên kết tới trang tĩnh</label>
                  <select
                    value={menuForm.page}
                    onChange={(e) => setMenuForm({ ...menuForm, page: e.target.value })}
                    className="input-tis w-full text-sm"
                  >
                    <option value="">-- Chọn một trang CMS --</option>
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} (/page/{p.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">
                    Thứ tự hiển thị (Từ bé đến lớn)
                  </label>
                  <input
                    type="number"
                    value={menuForm.sort_order}
                    onChange={(e) => setMenuForm({ ...menuForm, sort_order: Number(e.target.value) })}
                    className="input-tis w-full text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="menu-active"
                    checked={menuForm.is_active}
                    onChange={(e) => setMenuForm({ ...menuForm, is_active: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4 border-gray-300"
                  />
                  <label htmlFor="menu-active" className="text-sm font-semibold text-gray-700 select-none">
                    Kích hoạt hiển thị lập tức trên Header
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setShowMenuModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingMenu}
                  className="btn-tis-danger text-sm min-w-[100px] flex items-center justify-center"
                >
                  {submittingMenu ? (
                    <>
                      <div className="spinner-tis !w-4 !h-4 !border-2 !border-white mr-2" />
                      Đang lưu
                    </>
                  ) : (
                    'Lưu liên kết'
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
