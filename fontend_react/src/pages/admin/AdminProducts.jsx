import { useState, useEffect } from 'react'
import api, { fetchList, getValidImageUrl, getErrorMessage } from '@/lib/api'
import { formatMoney, formatDateTime, normalizeList } from '@/lib/format'
import ProductImageAlbum, { createStoredProductImageItem } from '@/components/admin/ProductImageAlbum'
import RichTextEditor from '@/components/admin/RichTextEditor'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminProducts() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [providers, setProviders]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [catFilter, setCatFilter]   = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const emptyForm = { name: '', short_description: '', description: '', category: '', provider_name: '', target_audience: 'ind', base_price: '', is_price_hidden: false, is_active: true }
  const [form, setForm] = useState(emptyForm)
  const [imageItems, setImageItems] = useState([])
  const [deletedImageIds, setDeletedImageIds] = useState([])

  const loadData = async () => {
    setLoading(true)
    try {
      const [p, c, prov] = await Promise.all([
        fetchList('/products/'),
        fetchList('/categories/'),
        fetchList('/insurance-providers/'),
      ])
      setProducts(p); setCategories(c); setProviders(prov)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const filtered = products.filter(p => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter && String(p.category) !== catFilter) return false
    return true
  })
  const activeCount = products.filter(p => p.is_active !== false).length
  const hiddenCount = products.length - activeCount
  const quoteCount = products.filter(p => p.is_price_hidden).length
  const selectedCategoryName = categories.find(c => String(c.id) === catFilter)?.name

  const releaseNewImagePreviews = (items) => {
    items.forEach(item => {
      if (item.file && item.preview) URL.revokeObjectURL(item.preview)
    })
  }

  const closeModal = () => {
    releaseNewImagePreviews(imageItems)
    setImageItems([])
    setDeletedImageIds([])
    setShowModal(false)
  }

  const openModal = (product = null) => {
    releaseNewImagePreviews(imageItems)
    if (product) {
      setEditing(product)
      setForm({
        name: product.name || '', short_description: product.short_description || '',
        description: product.description || '', category: product.category || '',
        provider_name: product.provider_name || '', target_audience: product.target_audience || 'ind',
        base_price: product.base_price || '', is_price_hidden: product.is_price_hidden || false,
        is_active: product.is_active !== false,
      })
    } else {
      setEditing(null)
      setForm(emptyForm)
    }
    setDeletedImageIds([])
    setImageItems((product?.images || [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(image => createStoredProductImageItem(image, getValidImageUrl(image.image_url || image.image))))
    setShowModal(true)
  }

  const saveImageOrder = async (savedProduct, albumItems) => {
    const savedImages = savedProduct?.images || []
    if (!savedProduct?.id || savedImages.length < 2) return

    const existingIds = new Set(albumItems.filter(item => item.id).map(item => item.id))
    const addedImageIds = savedImages
      .filter(image => !existingIds.has(image.id))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(image => image.id)
    let nextAddedIndex = 0
    const imageIds = albumItems
      .map(item => item.id || addedImageIds[nextAddedIndex++])
      .filter(Boolean)

    if (imageIds.length > 1) {
      await api.post(`/products/${savedProduct.id}/reorder-images/`, { image_ids: imageIds })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên sản phẩm'); return }
    setSubmitting(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v) })
      imageItems.filter(item => item.file).forEach(item => fd.append('uploaded_images', item.file))
      deletedImageIds.forEach(id => fd.append('deleted_image_ids', id))

      let response
      if (editing) {
        response = await api.patch(`/products/${editing.id}/`, fd)
        toast.success('Cập nhật sản phẩm thành công!')
      } else {
        response = await api.post('/products/', fd)
        toast.success('Thêm sản phẩm mới thành công!')
      }
      await saveImageOrder(response.data, imageItems)
      closeModal()
      loadData()
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: getErrorMessage(err, 'Không thể lưu sản phẩm.'), confirmButtonColor: '#D71920' })
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    const r = await Swal.fire({
      title: 'Xóa sản phẩm?', text: 'Hành động không thể hoàn tác!', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#D71920', confirmButtonText: 'Xóa', cancelButtonText: 'Hủy',
    })
    if (!r.isConfirmed) return
    try { await api.delete(`/products/${id}/`); toast.success('Đã xóa sản phẩm.'); loadData() }
    catch { toast.error('Không thể xóa sản phẩm.') }
  }

  const toggleActive = async (product) => {
    try {
      await api.patch(`/products/${product.id}/`, { is_active: !product.is_active })
      toast.success(product.is_active ? 'Đã ẩn sản phẩm' : 'Đã hiển thị sản phẩm')
      loadData()
    } catch { toast.error('Lỗi cập nhật') }
  }

  return (
    <div className="admin-products-page">
      {/* Header */}
      <div className="admin-products-hero">
        <div className="min-w-0">
          <div className="section-kicker">Product Catalog</div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý sản phẩm</h1>
          <p className="text-sm text-gray-400 mt-0.5">{products.length} sản phẩm</p>
        </div>
        <button onClick={() => openModal()} className="btn-tis-danger text-sm flex-shrink-0">
          <i className="fas fa-plus" /> Thêm sản phẩm
        </button>
      </div>

      <div className="admin-products-metrics">
        <div className="admin-product-metric">
          <span><i className="fas fa-box-open" /></span>
          <div><strong>{products.length}</strong><small>Tổng sản phẩm</small></div>
        </div>
        <div className="admin-product-metric">
          <span><i className="fas fa-eye" /></span>
          <div><strong>{activeCount}</strong><small>Đang hiển thị</small></div>
        </div>
        <div className="admin-product-metric">
          <span><i className="fas fa-eye-slash" /></span>
          <div><strong>{hiddenCount}</strong><small>Đang ẩn</small></div>
        </div>
        <div className="admin-product-metric">
          <span><i className="fas fa-comment-dollar" /></span>
          <div><strong>{quoteCount}</strong><small>Cần báo giá</small></div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card admin-products-toolbar">
        <div className="admin-product-search-field relative flex-1 min-w-[200px]">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm sản phẩm..." className="input-tis pl-10 text-sm" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input-tis text-sm w-auto min-w-[180px]">
          <option value="">Tất cả danh mục</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(search || catFilter) && (
          <button
            type="button"
            onClick={() => { setSearch(''); setCatFilter('') }}
            className="btn-tis-ghost admin-products-reset"
          >
            <i className="fas fa-rotate-left" /> Bỏ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="admin-card admin-products-table-card">
        <div className="admin-products-table-head">
          <div>
            <h2>Danh sách sản phẩm</h2>
            <p>
              {filtered.length} kết quả
              {selectedCategoryName ? ` trong ${selectedCategoryName}` : ''}
              {search ? ` cho "${search}"` : ''}
            </p>
          </div>
          <span className="badge-tis badge-tis-info">
            <i className="fas fa-layer-group" /> {categories.length} danh mục
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center"><div className="spinner-tis" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <i className="fas fa-box-open text-4xl mb-3" />
            <p>Không có sản phẩm nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>Sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Đối tượng</th>
                  <th>Giá</th>
                  <th>Đơn vị cung cấp</th>
                  <th className="text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td className="text-gray-400">{p.id}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <img src={getValidImageUrl(p.images?.[0]?.image_url || p.images?.[0]?.image)} alt=""
                          className="admin-product-thumb object-cover bg-gray-100 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="admin-product-name font-semibold text-gray-900 text-sm max-w-[340px]">{p.name}</p>
                          <p className="text-xs text-gray-400 line-clamp-2 max-w-[340px]">
                            {p.short_description || 'Chưa có mô tả ngắn'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge-tis-dark text-xs">{p.category_name || '—'}</span></td>
                    <td>
                      <span className={`badge-tis text-xs ${p.target_audience === 'ent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {p.target_audience === 'ent' ? 'DN' : 'Cá nhân'}
                      </span>
                    </td>
                    <td className="font-bold text-sm">{p.is_price_hidden ? <span className="text-gray-400">Liên hệ</span> : formatMoney(p.base_price)}</td>
                    <td>
                      <div className="admin-product-provider">
                        <strong>{p.provider_name || 'Chưa khai báo'}</strong>
                        <button onClick={() => toggleActive(p)}
                          className={`admin-product-state ${p.is_active ? 'is-active' : 'is-hidden'}`}
                          title="Đổi trạng thái hiển thị">
                          <span />
                          {p.is_active ? 'Hiện' : 'Ẩn'}
                        </button>
                      </div>
                    </td>
                    <td className="text-right">
                      <button onClick={() => openModal(p)} className="admin-row-action is-edit" title="Sửa">
                        <i className="fas fa-pen text-sm" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="admin-row-action is-delete" title="Xóa">
                        <i className="fas fa-trash-alt text-sm" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <i className="fas fa-times text-sm" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[74vh] overflow-y-auto">
              <div>
                <label className="label-tis">Tên sản phẩm <span className="text-red-400">*</span></label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="input-tis" placeholder="Bảo hiểm xe ô tô..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-tis">Danh mục</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-tis">
                    <option value="">Chọn danh mục</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-tis">Nhà cung cấp</label>
                  <select value={form.provider_name} onChange={e => setForm({...form, provider_name: e.target.value})} className="input-tis">
                    <option value="">Chọn nhà cung cấp</option>
                    {providers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-tis">Đối tượng</label>
                  <select value={form.target_audience} onChange={e => setForm({...form, target_audience: e.target.value})} className="input-tis">
                    <option value="ind">Cá nhân</option>
                    <option value="ent">Doanh nghiệp</option>
                  </select>
                </div>
                <div>
                  <label className="label-tis">Giá cơ bản (VNĐ)</label>
                  <input type="number" value={form.base_price} onChange={e => setForm({...form, base_price: e.target.value})}
                    className="input-tis" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="label-tis">Mô tả ngắn</label>
                <textarea value={form.short_description} onChange={e => setForm({...form, short_description: e.target.value})}
                  className="input-tis resize-none" rows={2} />
              </div>
              <div>
                <label className="label-tis">Mô tả chi tiết</label>
                <RichTextEditor
                  value={form.description}
                  onChange={description => setForm({ ...form, description })}
                  placeholder="Soạn mô tả sản phẩm, thêm hình ảnh và định dạng nội dung tại đây..."
                />
              </div>
              <div>
                <label className="label-tis">Hình ảnh sản phẩm</label>
                <ProductImageAlbum
                  items={imageItems}
                  onChange={setImageItems}
                  onRemoveStored={id => setDeletedImageIds(current => current.includes(id) ? current : [...current, id])}
                />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_price_hidden}
                    onChange={e => setForm({...form, is_price_hidden: e.target.checked})}
                    className="w-4 h-4 rounded accent-[#D71920]" />
                  <span className="text-sm text-gray-700">Ẩn giá (Liên hệ)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active}
                    onChange={e => setForm({...form, is_active: e.target.checked})}
                    className="w-4 h-4 rounded accent-[#D71920]" />
                  <span className="text-sm text-gray-700">Hiển thị</span>
                </label>
              </div>
            </form>
            <div className="flex items-center justify-end gap-3 p-5 border-t">
              <button onClick={closeModal} className="btn-tis-ghost text-sm px-5 py-2 border border-gray-200 rounded-full">Hủy</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-tis-danger text-sm px-6 py-2.5">
                {submitting ? <><i className="fas fa-spinner fa-spin mr-2" />Đang lưu...</> : <><i className="fas fa-save mr-2" />{editing ? 'Cập nhật' : 'Thêm mới'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
