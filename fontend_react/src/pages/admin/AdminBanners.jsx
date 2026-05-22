import { useEffect, useMemo, useState } from 'react'
import api, { fetchList, getErrorMessage, getValidImageUrl } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

const bannerTemplates = [
  {
    value: 'single_left',
    label: 'Nội dung trái',
    hint: 'Một ảnh lớn, tiêu đề và nút đặt bên trái.',
    icon: 'fa-align-left',
  },
  {
    value: 'single_center',
    label: 'Nội dung giữa',
    hint: 'Phù hợp banner thương hiệu hoặc thông báo nổi bật.',
    icon: 'fa-align-center',
  },
  {
    value: 'triple_grid',
    label: 'Khung chiến dịch',
    hint: 'Ảnh chính kèm nhịp khung lưới cho nhiều ưu đãi.',
    icon: 'fa-table-cells-large',
  },
  {
    value: 'carousel',
    label: 'Slider banner',
    hint: 'Dùng cho chuỗi banner thay phiên trên trang chủ.',
    icon: 'fa-clone',
  },
  {
    value: 'custom_html',
    label: 'Overlay tùy chỉnh',
    hint: 'Thêm HTML overlay khi cần bố cục riêng.',
    icon: 'fa-code',
  },
  {
    value: 'wide_product',
    label: 'Khung to dài',
    hint: 'Chữ trái, danh sách dấu tích, nút bo tròn, ảnh sản phẩm bên phải.',
    icon: 'fa-rectangle-ad',
  },
]

const createEmptyForm = () => ({
  title: '',
  show_title: true,
  subtitle: '',
  eyebrow: '',
  button_text: '',
  button_link: '',
  secondary_button_text: '',
  secondary_button_link: '',
  template: 'single_left',
  custom_html: '',
  sort_order: 0,
  is_active: true,
})

const getBannerImage = (banner) => getValidImageUrl(
  banner?.background_image || banner?.image_url || banner?.image,
)

const hasBannerImage = (banner) => Boolean(
  banner?.background_image || banner?.image_url || banner?.image,
)

export default function AdminBanners() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(createEmptyForm)
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('')
  const [mediaType, setMediaType] = useState('image')

  const loadData = async () => {
    setLoading(true)
    try {
      setBanners(await fetchList('/banners/'))
    } catch {
      toast.error('Không thể tải danh sách banner.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl('')
      return undefined
    }

    const objectUrl = URL.createObjectURL(imageFile)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

  useEffect(() => {
    if (!videoFile) {
      setVideoPreviewUrl('')
      return undefined
    }

    const objectUrl = URL.createObjectURL(videoFile)
    setVideoPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [videoFile])

  const stats = useMemo(() => ({
    total: banners.length,
    active: banners.filter((banner) => banner.is_active).length,
    campaign: banners.filter((banner) => banner.template === 'triple_grid').length,
  }), [banners])

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const openModal = (banner = null) => {
    if (banner) {
      setEditing(banner)
      setMediaType(banner.video_file ? 'video' : 'image')
      setForm({
        title: banner.title || '',
        show_title: banner.show_title !== false,
        subtitle: banner.subtitle || '',
        eyebrow: banner.eyebrow || '',
        button_text: banner.button_text || banner.cta_text || '',
        button_link: banner.button_link || banner.cta_url || '',
        secondary_button_text: banner.secondary_button_text || '',
        secondary_button_link: banner.secondary_button_link || '',
        template: banner.template || 'single_left',
        custom_html: banner.custom_html || '',
        sort_order: banner.sort_order ?? 0,
        is_active: banner.is_active !== false,
      })
    } else {
      setEditing(null)
      setMediaType('image')
      setForm(createEmptyForm())
    }

    setImageFile(null)
    setPreviewUrl('')
    setVideoFile(null)
    setVideoPreviewUrl('')
    setShowModal(true)
  }

  const closeModal = () => {
    if (submitting) return
    setShowModal(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (key !== 'clear_video') {
          payload.append(key, value)
        }
      })
      if (mediaType === 'image' && imageFile) payload.append('background_image', imageFile)
      if (mediaType === 'video' && videoFile) {
        payload.append('video_file', videoFile)
      } else if (mediaType === 'image' && (form.clear_video || editing?.video_file)) {
        payload.append('video_file', '')
      }

      if (editing) {
        await api.patch(`/banners/${editing.id}/`, payload)
        toast.success('Đã cập nhật banner.')
      } else {
        await api.post('/banners/', payload)
        toast.success('Đã thêm banner mới.')
      }

      setShowModal(false)
      loadData()
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: getErrorMessage(err),
        confirmButtonColor: '#D71920',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Xóa banner?',
      text: 'Banner sẽ không còn hiển thị sau khi xóa.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#D71920',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    })

    if (!result.isConfirmed) return

    try {
      await api.delete(`/banners/${id}/`)
      toast.success('Đã xóa banner.')
      loadData()
    } catch {
      toast.error('Không thể xóa banner.')
    }
  }

  const toggleActive = async (banner) => {
    try {
      await api.patch(`/banners/${banner.id}/`, { is_active: !banner.is_active })
      toast.success(banner.is_active ? 'Đã ẩn banner.' : 'Đã hiển thị banner.')
      loadData()
    } catch {
      toast.error('Không thể đổi trạng thái banner.')
    }
  }

  return (
    <div className="admin-banner-page">
      <section className="admin-banner-hero">
        <div>
          <span className="section-kicker">Trang chủ</span>
          <h1>Quản lý banner</h1>
          <p>Thêm ảnh, chọn khung hiển thị và sắp xếp chiến dịch nổi bật cho khách hàng.</p>
        </div>
        <button onClick={() => openModal()} className="btn-tis-danger">
          <i className="fas fa-plus" /> Thêm banner
        </button>
      </section>

      <div className="admin-banner-metrics">
        <div><span><i className="fas fa-images" /></span><strong>{stats.total}</strong><small>Tổng banner</small></div>
        <div><span><i className="fas fa-eye" /></span><strong>{stats.active}</strong><small>Đang hiển thị</small></div>
        <div><span><i className="fas fa-table-cells-large" /></span><strong>{stats.campaign}</strong><small>Khung chiến dịch</small></div>
      </div>

      {loading ? (
        <div className="p-8 text-center"><div className="spinner-tis" /></div>
      ) : banners.length === 0 ? (
        <div className="admin-card admin-banner-empty">
          <i className="fas fa-panorama" />
          <h2>Chưa có banner nào</h2>
          <p>Tạo banner đầu tiên để kiểm soát khung nổi bật trên trang chủ.</p>
          <button onClick={() => openModal()} className="btn-tis-danger">Thêm banner</button>
        </div>
      ) : (
        <div className="admin-banner-grid">
          {[...banners].sort((left, right) => (left.sort_order || 0) - (right.sort_order || 0)).map((banner) => {
            const template = bannerTemplates.find((item) => item.value === banner.template) || bannerTemplates[0]
            return (
              <article key={banner.id} className="admin-banner-card">
                <div className="admin-banner-media">
                  {banner.video_file ? (
                    <video
                      src={getValidImageUrl(banner.video_file)}
                      muted
                      loop
                      playsInline
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={getBannerImage(banner)}
                      alt={banner.title || 'Banner'}
                      onError={(event) => {
                        event.currentTarget.src = 'https://placehold.co/1200x560/f3f4f6/d71920?text=TIS+Banner'
                      }}
                    />
                  )}
                  <div className="admin-banner-overlay">
                    <button onClick={() => openModal(banner)} title="Chỉnh sửa banner"><i className="fas fa-pen" /></button>
                    <button onClick={() => handleDelete(banner.id)} title="Xóa banner"><i className="fas fa-trash" /></button>
                  </div>
                  <div className="admin-banner-badges">
                    <span>{template.label}</span>
                    <span>{banner.video_file ? 'Video' : 'Ảnh'}</span>
                    {!banner.is_active && <span className="is-muted">Đang ẩn</span>}
                  </div>
                </div>
                <div className="admin-banner-body">
                  <div>
                    {banner.eyebrow && <small>{banner.eyebrow}</small>}
                    <h2>{banner.title || 'Banner chưa có tiêu đề'}</h2>
                    <p>{banner.subtitle || 'Chưa có mô tả ngắn cho banner này.'}</p>
                  </div>
                  <div className="admin-banner-card-foot">
                    <div>
                      <span>Thứ tự {banner.sort_order ?? 0}</span>
                      <time>{formatDateTime(banner.updated_at || banner.created_at)}</time>
                    </div>
                    <button
                      onClick={() => toggleActive(banner)}
                      className={`admin-banner-switch ${banner.is_active ? 'is-on' : ''}`}
                      aria-label={banner.is_active ? 'Ẩn banner' : 'Hiển thị banner'}
                    >
                      <span />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="admin-banner-modal animate-slide-up">
            <header>
              <div>
                <span className="section-kicker">{editing ? 'Cập nhật' : 'Banner mới'}</span>
                <h2>{editing ? 'Chỉnh sửa banner' : 'Thêm banner mới'}</h2>
              </div>
              <button onClick={closeModal} aria-label="Đóng"><i className="fas fa-times" /></button>
            </header>

            <form id="banner-form" onSubmit={handleSubmit} className="admin-banner-form">
              <section className="admin-banner-compose">
                <div>
                  <label className="label-tis mb-1 block">Loại banner</label>
                  <div className="admin-banner-media-type" role="radiogroup" aria-label="Loại banner">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={mediaType === 'image'}
                      className={`admin-banner-type-option ${mediaType === 'image' ? 'is-selected' : ''}`}
                      onClick={() => {
                        setMediaType('image')
                        setVideoFile(null)
                        setVideoPreviewUrl('')
                        setForm((current) => ({ ...current, clear_video: Boolean(editing?.video_file) }))
                      }}
                    >
                      <i className="fas fa-image" />
                      <span><strong>Banner ảnh</strong><small>Tải ảnh ngang để hiển thị trên trang chủ.</small></span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={mediaType === 'video'}
                      className={`admin-banner-type-option ${mediaType === 'video' ? 'is-selected' : ''}`}
                      onClick={() => {
                        setMediaType('video')
                        setImageFile(null)
                        setPreviewUrl('')
                        setForm((current) => ({ ...current, clear_video: false }))
                      }}
                    >
                      <i className="fas fa-video" />
                      <span><strong>Banner video</strong><small>Tải video riêng, có preview ngay trong khung này.</small></span>
                    </button>
                  </div>
                </div>

                {mediaType === 'image' ? (
                  <div>
                    <label className="label-tis mb-1 block">Ảnh banner</label>
                    <label className="admin-banner-uploader h-48 flex flex-col justify-center items-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-red-500 relative overflow-hidden bg-gray-50">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                        required={!editing || !hasBannerImage(editing)}
                        className="hidden"
                      />
                      {previewUrl || getBannerImage(editing) ? (
                        <img src={previewUrl || getBannerImage(editing)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : null}
                      <div className="z-10 text-center p-4 bg-white/80 rounded-md backdrop-blur-sm m-2">
                        <i className="fas fa-image text-gray-500 text-2xl mb-1 block" />
                        <span className="text-xs font-semibold text-gray-700 block max-w-xs truncate">
                          {imageFile ? imageFile.name : 'Chọn ảnh banner'}
                        </span>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div>
                    <label className="label-tis mb-1 block">Video banner</label>
                    <label className="admin-banner-uploader h-48 flex flex-col justify-center items-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-red-500 relative overflow-hidden bg-gray-50">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(event) => {
                          setVideoFile(event.target.files?.[0] || null)
                          setForm(curr => ({ ...curr, clear_video: false }))
                        }}
                        required={!videoFile && !(editing && editing.video_file && !form.clear_video)}
                        className="hidden"
                      />
                      {videoPreviewUrl || (editing && editing.video_file && !form.clear_video) ? (
                        <video
                          src={videoPreviewUrl || getValidImageUrl(editing?.video_file)}
                          muted
                          loop
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : null}
                      <div className="z-10 text-center p-4 bg-white/80 rounded-md backdrop-blur-sm m-2">
                        <i className="fas fa-video text-gray-500 text-2xl mb-1 block" />
                        <span className="text-xs font-semibold text-gray-700 block max-w-xs truncate">
                          {videoFile ? videoFile.name : ((editing && editing.video_file && !form.clear_video) ? 'Video hiện tại' : 'Chọn video banner')}
                        </span>
                      </div>
                    </label>
                    {(videoFile || (editing && editing.video_file && !form.clear_video)) && (
                      <button
                        type="button"
                        onClick={() => {
                          setVideoFile(null)
                          setVideoPreviewUrl('')
                          setForm(curr => ({ ...curr, clear_video: true }))
                        }}
                        className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <i className="fas fa-trash" /> Xóa video
                      </button>
                    )}
                  </div>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  {mediaType === 'image'
                    ? 'Khuyến nghị ảnh ngang từ 1600 x 720px.'
                    : 'Khuyến nghị video ngang định dạng .mp4 để xem rõ trên trang chủ.'}
                </p>

                <div className="admin-banner-livecopy mt-4 w-full">
                  <small>{form.eyebrow || 'TIS Broker'}</small>
                  {form.show_title && <strong>{form.title || 'Tiêu đề banner sẽ hiển thị ở đây'}</strong>}
                  <span className="whitespace-pre-line">{form.subtitle || 'Phần mô tả ngắn giúp banner rõ mục tiêu hơn.'}</span>
                </div>
              </section>

              <section className="admin-banner-fields">
                <div className="admin-banner-field-grid">
                  <div>
                    <label className="label-tis">Nhãn nhỏ</label>
                    <input value={form.eyebrow} onChange={(event) => updateForm('eyebrow', event.target.value)} className="input-tis" placeholder="Ưu đãi nổi bật" />
                  </div>
                  <div>
                    <label className="label-tis">Thứ tự hiển thị</label>
                    <input type="number" min="0" value={form.sort_order} onChange={(event) => updateForm('sort_order', Number(event.target.value))} className="input-tis" />
                  </div>
                </div>
                <div>
                  <div className="admin-banner-title-row">
                    <label className="label-tis">Tiêu đề <span className="text-red-500">*</span></label>
                    <label className="admin-banner-title-toggle">
                      <input
                        type="checkbox"
                        checked={form.show_title}
                        onChange={(event) => updateForm('show_title', event.target.checked)}
                      />
                      <span>Hiện trên banner</span>
                    </label>
                  </div>
                  <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} className="input-tis" placeholder="Bảo vệ doanh nghiệp trước rủi ro" required />
                </div>
                <div>
                  <label className="label-tis">Mô tả ngắn</label>
                  <textarea value={form.subtitle} onChange={(event) => updateForm('subtitle', event.target.value)} className="input-tis admin-banner-textarea" placeholder="Nội dung đi cùng banner..." />
                </div>

                <div className="admin-banner-field-grid">
                  <div>
                    <label className="label-tis">Nút chính</label>
                    <input value={form.button_text} onChange={(event) => updateForm('button_text', event.target.value)} className="input-tis" placeholder="Xem chi tiết" />
                  </div>
                  <div>
                    <label className="label-tis">Link nút chính</label>
                    <input value={form.button_link} onChange={(event) => updateForm('button_link', event.target.value)} className="input-tis" placeholder="/products hoặc https://..." />
                  </div>
                  <div>
                    <label className="label-tis">Nút phụ</label>
                    <input value={form.secondary_button_text} onChange={(event) => updateForm('secondary_button_text', event.target.value)} className="input-tis" placeholder="Liên hệ tư vấn" />
                  </div>
                  <div>
                    <label className="label-tis">Link nút phụ</label>
                    <input value={form.secondary_button_link} onChange={(event) => updateForm('secondary_button_link', event.target.value)} className="input-tis" placeholder="/contact" />
                  </div>
                </div>

                <div>
                  <label className="label-tis">Chọn khung banner</label>
                  <div className="admin-banner-template-grid">
                    {bannerTemplates.map((template) => (
                      <label key={template.value} className={`admin-banner-template ${form.template === template.value ? 'is-selected' : ''}`}>
                        <input type="radio" checked={form.template === template.value} onChange={() => updateForm('template', template.value)} />
                        <span className={`template-sketch template-sketch-${template.value}`}>
                          <i className={`fas ${template.icon}`} />
                        </span>
                        <strong>{template.label}</strong>
                        <small>{template.hint}</small>
                      </label>
                    ))}
                  </div>
                </div>

                {form.template === 'custom_html' && (
                  <div>
                    <label className="label-tis">HTML overlay tùy chỉnh</label>
                    <textarea value={form.custom_html} onChange={(event) => updateForm('custom_html', event.target.value)} className="input-tis admin-banner-code" placeholder="<div class='banner-offer'>...</div>" />
                  </div>
                )}

                <label className="admin-banner-visibility">
                  <input type="checkbox" checked={form.is_active} onChange={(event) => updateForm('is_active', event.target.checked)} />
                  <span><strong>Hiển thị banner</strong><small>Tắt nếu banner đang soạn hoặc chưa đến thời điểm chạy.</small></span>
                </label>
              </section>
            </form>

            <footer>
              <button onClick={closeModal} className="btn-tis-ghost">Hủy</button>
              <button form="banner-form" type="submit" disabled={submitting} className="btn-tis-danger">
                {submitting ? <><i className="fas fa-spinner fa-spin" /> Đang lưu...</> : <><i className="fas fa-floppy-disk" /> {editing ? 'Cập nhật banner' : 'Thêm banner'}</>}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
