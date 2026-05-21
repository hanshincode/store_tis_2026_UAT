import { useState, useEffect } from 'react'
import api, { fetchList, getErrorMessage, getValidImageUrl } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminBanners() {
  const [banners, setBanners]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const emptyForm = { title: '', subtitle: '', cta_text: '', cta_url: '', sort_order: 0, is_active: true }
  const [form, setForm]   = useState(emptyForm)
  const [imageFile, setImageFile] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try { setBanners(await fetchList('/banners/')) } catch {} finally { setLoading(false) }
  }
  useEffect(() => { loadData() }, [])

  const openModal = (banner = null) => {
    if (banner) {
      setEditing(banner)
      setForm({ title: banner.title || '', subtitle: banner.subtitle || '', cta_text: banner.cta_text || '', cta_url: banner.cta_url || '', sort_order: banner.sort_order ?? 0, is_active: banner.is_active !== false })
    } else { setEditing(null); setForm(emptyForm) }
    setImageFile(null)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (imageFile) fd.append('image', imageFile)
      if (editing) { await api.patch(`/banners/${editing.id}/`, fd); toast.success('Đã cập nhật banner!') }
      else { await api.post('/banners/', fd); toast.success('Đã thêm banner mới!') }
      setShowModal(false); loadData()
    } catch (err) { Swal.fire({ icon: 'error', title: 'Lỗi', text: getErrorMessage(err), confirmButtonColor: '#D71920' }) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    const r = await Swal.fire({ title: 'Xóa banner?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#D71920', confirmButtonText: 'Xóa', cancelButtonText: 'Hủy' })
    if (!r.isConfirmed) return
    try { await api.delete(`/banners/${id}/`); toast.success('Đã xóa banner.'); loadData() }
    catch { toast.error('Không thể xóa banner.') }
  }

  const toggleActive = async (banner) => {
    try { await api.patch(`/banners/${banner.id}/`, { is_active: !banner.is_active }); toast.success(banner.is_active ? 'Đã ẩn' : 'Đã hiển thị'); loadData() }
    catch { toast.error('Lỗi') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Quản lý Banners</h1><p className="text-sm text-gray-400 mt-0.5">{banners.length} banners</p></div>
        <button onClick={() => openModal()} className="btn-tis-danger text-sm"><i className="fas fa-plus" /> Thêm banner</button>
      </div>

      {loading ? <div className="p-8 text-center"><div className="spinner-tis" /></div> : banners.length === 0 ? (
        <div className="admin-card text-center py-12 text-gray-400"><i className="fas fa-images text-4xl mb-3" /><p>Chưa có banner nào.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {banners.sort((a,b) => (a.sort_order||0) - (b.sort_order||0)).map(b => (
            <div key={b.id} className="admin-card overflow-hidden group">
              <div className="relative h-44 bg-gray-100">
                <img src={getValidImageUrl(b.image_url || b.image)} alt={b.title || 'Banner'}
                  className="w-full h-full object-cover" onError={e => { e.target.src = 'https://placehold.co/600x300/f3f4f6/d71920?text=Banner' }} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={() => openModal(b)} className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-50 shadow"><i className="fas fa-pen text-sm" /></button>
                  <button onClick={() => handleDelete(b.id)} className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 shadow"><i className="fas fa-trash text-sm" /></button>
                </div>
                {!b.is_active && <span className="absolute top-2 left-2 badge-tis bg-gray-800 text-white">Ẩn</span>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm truncate">{b.title || 'Không có tiêu đề'}</h4>
                    {b.subtitle && <p className="text-xs text-gray-400 truncate mt-0.5">{b.subtitle}</p>}
                  </div>
                  <button onClick={() => toggleActive(b)} className={`ml-2 w-10 h-5 rounded-full transition-colors relative ${b.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${b.is_active ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span>Thứ tự: {b.sort_order ?? 0}</span>
                  {b.cta_url && <a href={b.cta_url} target="_blank" rel="noopener" className="text-tis-red hover:underline">Xem link →</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold">{editing ? 'Chỉnh sửa banner' : 'Thêm banner mới'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><i className="fas fa-times text-sm" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label-tis">Hình ảnh banner <span className="text-red-400">*</span></label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="input-tis text-sm" required={!editing} />
                {editing && <img src={getValidImageUrl(editing.image_url || editing.image)} alt="" className="w-full h-32 object-cover rounded-xl mt-2" />}
                <p className="text-xs text-gray-400 mt-1">Khuyến nghị: 1200x500px, dung lượng &lt; 1MB</p>
              </div>
              <div><label className="label-tis">Tiêu đề</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-tis" placeholder="Tiêu đề banner" /></div>
              <div><label className="label-tis">Phụ đề</label><input value={form.subtitle} onChange={e => setForm({...form, subtitle: e.target.value})} className="input-tis" placeholder="Mô tả ngắn" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-tis">CTA Text</label><input value={form.cta_text} onChange={e => setForm({...form, cta_text: e.target.value})} className="input-tis" placeholder="Xem chi tiết" /></div>
                <div><label className="label-tis">CTA URL</label><input value={form.cta_url} onChange={e => setForm({...form, cta_url: e.target.value})} className="input-tis" placeholder="https://..." /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-tis">Thứ tự hiển thị</label><input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: Number(e.target.value)})} className="input-tis" /></div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-4 h-4 accent-[#D71920]" /><span className="text-sm">Hiển thị</span></label>
                </div>
              </div>
            </form>
            <div className="flex items-center justify-end gap-3 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="btn-tis-ghost text-sm px-5 py-2 border border-gray-200 rounded-full">Hủy</button>
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
