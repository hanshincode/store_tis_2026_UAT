import { useState, useEffect } from 'react'
import api, { fetchList, getErrorMessage, mediaUrl } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

const SPEC_MAP = { property: 'Tài sản', health: 'Sức khỏe', vehicle: 'Xe cộ', marine: 'Hàng hải' }
const FIELD_TYPE_MAP = { text: 'Text (Chữ ngắn)', number: 'Number (Số)', date: 'Ngày tháng', textarea: 'Nội dung dài', file: 'Tải file đính kèm' }

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [selectedCatId, setSelectedCatId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab] = useState('basic') // 'basic' | 'content' | 'children' | 'benefits' | 'fields'
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Active Category details tabs (for right pane)
  const [detailTab, setDetailTab] = useState('children') // 'children' | 'benefits' | 'fields'

  // Form states
  const emptyForm = {
    name: '', slug: '', specialization_code: 'health',
    hero_title: '', hero_subtitle: '', intro_title: '', intro_description: '', benefits_title: '',
    children: [], benefits: [], subject_fields: [],
  }
  const [form, setForm] = useState(emptyForm)
  const [heroImage, setHeroImage] = useState(null)
  const [iconImage, setIconImage] = useState(null)

  // File preview helpers
  const [heroPreview, setHeroPreview] = useState('')
  const [iconPreview, setIconPreview] = useState('')

  const loadData = async (selectId = null) => {
    setLoading(true)
    try {
      const data = await fetchList('/categories/')
      setCategories(data)
      if (data.length > 0) {
        if (selectId && data.some(c => c.id === selectId)) {
          setSelectedCatId(selectId)
        } else if (!selectedCatId || !data.some(c => c.id === selectedCatId)) {
          setSelectedCatId(data[0].id)
        }
      } else {
        setSelectedCatId(null)
      }
    } catch (err) {
      toast.error('Không thể tải danh sách danh mục')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const selectedCategory = categories.find(c => c.id === selectedCatId)

  // Open Modal
  const openModal = async (id = null) => {
    setModalTab('basic')
    if (id) {
      try {
        const { data: cat } = await api.get(`/categories/${id}/`)
        setEditing(cat)
        setForm({
          name: cat.name || '',
          slug: cat.slug || '',
          specialization_code: cat.specialization_code || 'health',
          hero_title: cat.hero_title || '',
          hero_subtitle: cat.hero_subtitle || '',
          intro_title: cat.intro_title || '',
          intro_description: cat.intro_description || '',
          benefits_title: cat.benefits_title || '',
          children: (cat.children || []).map(c => ({ id: c.id, name: c.name, slug: c.slug, sort_order: c.sort_order || 0 })),
          benefits: (cat.benefits || []).map(b => ({ title: b.title, icon: b.icon || 'fa-shield-halved', description: b.description })),
          subject_fields: (cat.subject_fields || []).map(f => ({ id: f.id, label: f.label, field_key: f.field_key, field_type: f.field_type || 'text', is_required: f.is_required !== false, help_text: f.help_text || '' })),
        })
        setHeroPreview(cat.hero_image_url || '')
        setIconPreview(cat.icon_image_url || '')
      } catch (err) {
        toast.error('Không thể tải chi tiết danh mục')
        return
      }
    } else {
      setEditing(null)
      setForm({
        ...emptyForm,
        subject_fields: [{ label: '', field_key: '', field_type: 'text', is_required: true, help_text: '' }]
      })
      setHeroPreview('')
      setIconPreview('')
    }
    setHeroImage(null)
    setIconImage(null)
    setShowModal(true)
  }

  // Handle files changes
  const handleHeroChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setHeroImage(file)
      setHeroPreview(URL.createObjectURL(file))
    }
  }

  const handleIconChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setIconImage(file)
      setIconPreview(URL.createObjectURL(file))
    }
  }

  // Handle Save
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Vui lòng nhập tên danh mục')
      setModalTab('basic')
      return
    }
    
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      fd.append('slug', form.slug.trim() || slugify(form.name))
      fd.append('specialization_code', form.specialization_code)
      fd.append('hero_title', form.hero_title.trim())
      fd.append('hero_subtitle', form.hero_subtitle.trim())
      fd.append('intro_title', form.intro_title.trim())
      fd.append('intro_description', form.intro_description.trim())
      fd.append('benefits_title', form.benefits_title.trim())
      
      // Clean lists before sending
      const cleanBenefits = form.benefits.filter(b => b.title.trim() || b.description.trim())
      const cleanChildren = form.children.filter(c => c.name.trim())
      const cleanFields = form.subject_fields.filter(f => f.label.trim())

      fd.append('benefits', JSON.stringify(cleanBenefits))
      fd.append('children', JSON.stringify(cleanChildren))
      fd.append('subject_fields', JSON.stringify(cleanFields))

      if (heroImage) fd.append('hero_image', heroImage)
      if (iconImage) fd.append('icon_image', iconImage)

      let resCatId = selectedCatId
      if (editing) {
        await api.patch(`/categories/${editing.id}/`, fd)
        toast.success('Cập nhật danh mục thành công!')
        resCatId = editing.id
      } else {
        const { data } = await api.post('/categories/', fd)
        toast.success('Thêm danh mục mới thành công!')
        resCatId = data.id
      }
      
      setShowModal(false)
      loadData(resCatId)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi lưu dữ liệu',
        text: getErrorMessage(err),
        confirmButtonColor: '#D71920'
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Category
  const handleDelete = async (id) => {
    const r = await Swal.fire({
      title: 'Xóa danh mục?',
      text: 'Mọi sản phẩm liên quan và dữ liệu con sẽ bị ảnh hưởng. Thao tác không thể hoàn tác!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#D71920',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Đồng ý xóa',
      cancelButtonText: 'Hủy bỏ',
    })
    
    if (!r.isConfirmed) return

    try {
      await api.delete(`/categories/${id}/`)
      toast.success('Đã xóa danh mục thành công.')
      loadData()
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Không thể xóa',
        text: getErrorMessage(err) || 'Có thể danh mục này đang có sản phẩm đang sử dụng.',
        confirmButtonColor: '#D71920'
      })
    }
  }

  // Auto-generation helpers
  function slugify(v) {
    return String(v)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
  }

  // Form Fields updates with auto-slug generation
  const handleNameChange = (e) => {
    const val = e.target.value
    const prevSlug = form.slug
    const oldGeneratedSlug = slugify(form.name)
    const newGeneratedSlug = slugify(val)
    
    setForm(prev => ({
      ...prev,
      name: val,
      slug: (!prevSlug || prevSlug === oldGeneratedSlug) ? newGeneratedSlug : prevSlug
    }))
  }

  // Child categories
  const addChild = () => setForm({ ...form, children: [...form.children, { name: '', slug: '', sort_order: form.children.length }] })
  
  const handleChildNameChange = (index, val) => {
    const newChildren = [...form.children]
    const oldName = newChildren[index].name
    const oldSlug = newChildren[index].slug
    
    newChildren[index].name = val
    if (!oldSlug || oldSlug === slugify(oldName)) {
      newChildren[index].slug = slugify(val)
    }
    setForm({ ...form, children: newChildren })
  }

  const updateChild = (index, field, val) => {
    const newChildren = [...form.children]
    newChildren[index] = { ...newChildren[index], [field]: val }
    setForm({ ...form, children: newChildren })
  }

  const removeChild = (index) => setForm({ ...form, children: form.children.filter((_, i) => i !== index) })

  // Benefits
  const addBenefit = () => setForm({ ...form, benefits: [...form.benefits, { title: '', icon: 'fa-shield-halved', description: '' }] })
  
  const updateBenefit = (index, field, val) => {
    const newBenefits = [...form.benefits]
    newBenefits[index] = { ...newBenefits[index], [field]: val }
    setForm({ ...form, benefits: newBenefits })
  }

  const removeBenefit = (index) => setForm({ ...form, benefits: form.benefits.filter((_, i) => i !== index) })

  // Custom Fields
  const addField = () => setForm({ ...form, subject_fields: [...form.subject_fields, { label: '', field_key: '', field_type: 'text', is_required: true, help_text: '' }] })
  
  const handleFieldLabelChange = (index, val) => {
    const newFields = [...form.subject_fields]
    const oldLabel = newFields[index].label
    const oldKey = newFields[index].field_key
    
    newFields[index].label = val
    const generatedKey = slugify(val).replace(/-/g, '_')
    if (!oldKey || oldKey === slugify(oldLabel).replace(/-/g, '_')) {
      newFields[index].field_key = generatedKey
    }
    setForm({ ...form, subject_fields: newFields })
  }

  const updateField = (index, field, val) => {
    const newFields = [...form.subject_fields]
    newFields[index] = { ...newFields[index], [field]: val }
    setForm({ ...form, subject_fields: newFields })
  }

  const removeField = (index) => setForm({ ...form, subject_fields: form.subject_fields.filter((_, i) => i !== index) })

  // Filtering category list
  const filteredCategories = categories.filter(c => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    return (
      c.name.toLowerCase().includes(query) ||
      (SPEC_MAP[c.specialization_code] || '').toLowerCase().includes(query) ||
      c.slug.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thiết lập danh mục sản phẩm</h1>
          <p className="text-sm text-gray-500 mt-1">Cấu hình các loại hình bảo hiểm, trang CMS tĩnh, và các trường khảo sát động</p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-tis-danger text-sm self-start md:self-center flex items-center gap-2"
        >
          <i className="fas fa-plus" /> Thêm danh mục mới
        </button>
      </div>

      {/* Main Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Categories selection list (1/3 width) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="admin-card !p-4 space-y-3">
            <div className="relative">
              <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Tìm danh mục, chuyên ngành..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-tis !pl-10 text-sm"
              />
            </div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="spinner-tis mx-auto" />
                <p className="text-xs text-gray-400 mt-2">Đang tải danh sách...</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="py-12 text-center text-gray-400 border border-dashed rounded-xl">
                <i className="fas fa-tags text-2xl mb-2 text-gray-300" />
                <p className="text-sm">Không tìm thấy danh mục</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {filteredCategories.map(cat => {
                  const isActive = cat.id === selectedCatId
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCatId(cat.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isActive
                          ? 'border-tis-red bg-red-50/40 shadow-sm'
                          : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {cat.icon_image_url ? (
                          <img
                            src={cat.icon_image_url}
                            alt=""
                            className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-gray-100 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-red-50 text-tis-red flex items-center justify-center border border-red-100 font-bold">
                            {cat.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className={`font-semibold text-sm truncate ${isActive ? 'text-tis-red' : 'text-gray-900'}`}>
                            {cat.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400 truncate">
                              {SPEC_MAP[cat.specialization_code] || cat.specialization_code}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {cat.children?.length || 0} mục con
                            </span>
                          </div>
                        </div>
                      </div>
                      <i className={`fas fa-chevron-right text-xs transition-transform ${
                        isActive ? 'text-tis-red translate-x-0.5' : 'text-gray-300 group-hover:text-gray-400'
                      }`} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Category Detail Workspace (2/3 width) */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="admin-card py-24 text-center">
              <div className="spinner-tis mx-auto" />
              <p className="text-sm text-gray-400 mt-3">Đang đồng bộ chi tiết...</p>
            </div>
          ) : !selectedCategory ? (
            <div className="admin-card py-24 text-center border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <i className="fas fa-tags text-2xl text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-800 text-lg">Chưa chọn danh mục</h3>
              <p className="text-sm text-gray-400 max-w-sm mx-auto mt-1">
                Chọn một danh mục bên cột trái hoặc bấm "Thêm danh mục mới" để bắt đầu thiết lập chi tiết.
              </p>
            </div>
          ) : (
            <div className="admin-card space-y-6 !p-6">
              
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div className="flex items-center gap-4">
                  {selectedCategory.icon_image_url ? (
                    <img
                      src={selectedCategory.icon_image_url}
                      alt=""
                      className="w-14 h-14 rounded-xl object-contain bg-gray-50 p-1.5 border shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-red-50 text-tis-red flex items-center justify-center font-bold text-xl border">
                      {selectedCategory.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-bold text-gray-900">{selectedCategory.name}</h2>
                      <span className="badge-tis-info text-xs">
                        {SPEC_MAP[selectedCategory.specialization_code] || selectedCategory.specialization_code}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Slug: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-600">{selectedCategory.slug}</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => openModal(selectedCategory.id)}
                    className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-sm font-semibold flex items-center gap-1.5 text-gray-700"
                  >
                    <i className="fas fa-edit" /> Sửa danh mục
                  </button>
                  <button
                    onClick={() => handleDelete(selectedCategory.id)}
                    className="px-4 py-2 border border-red-200 text-tis-red rounded-xl hover:bg-red-50 transition text-sm font-semibold flex items-center gap-1.5"
                  >
                    <i className="fas fa-trash-alt" /> Xóa
                  </button>
                </div>
              </div>

              {/* Banner/Hero CMS Info Section */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <i className="fas fa-window-maximize text-tis-red" /> Giao diện giới thiệu công cộng
                </h3>
                
                {selectedCategory.hero_image_url ? (
                  <div
                    className="h-32 w-full rounded-xl bg-cover bg-center relative mb-4 overflow-hidden border shadow-inner flex items-end p-4"
                    style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.1)), url(${selectedCategory.hero_image_url})` }}
                  >
                    <div>
                      <h4 className="text-white font-bold text-base line-clamp-1">{selectedCategory.hero_title || selectedCategory.name}</h4>
                      <p className="text-white/80 text-xs line-clamp-1 mt-0.5">{selectedCategory.hero_subtitle}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-20 w-full rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border border-dashed flex items-center justify-center p-3 text-center mb-4">
                    <p className="text-xs text-gray-400">Chưa tải lên ảnh banner giới thiệu</p>
                  </div>
                )}

                {selectedCategory.intro_title && (
                  <div className="space-y-1 mt-2 text-sm bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                    <h5 className="font-semibold text-gray-800 text-xs uppercase tracking-wide">Lời giới thiệu</h5>
                    <p className="font-bold text-gray-900">{selectedCategory.intro_title}</p>
                    {selectedCategory.intro_description && (
                      <p className="text-gray-500 text-xs mt-1 leading-relaxed whitespace-pre-line">
                        {selectedCategory.intro_description}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Tab Selector for lists */}
              <div className="border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setDetailTab('children')}
                  className={`pb-3 px-4 text-sm font-semibold transition-all whitespace-nowrap border-b-2 -mb-px flex items-center gap-2 ${
                    detailTab === 'children'
                      ? 'border-tis-red text-tis-red'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <i className="fas fa-sitemap" /> Danh mục con ({(selectedCategory.children || []).length})
                </button>
                <button
                  onClick={() => setDetailTab('benefits')}
                  className={`pb-3 px-4 text-sm font-semibold transition-all whitespace-nowrap border-b-2 -mb-px flex items-center gap-2 ${
                    detailTab === 'benefits'
                      ? 'border-tis-red text-tis-red'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <i className="fas fa-star" /> Khối lợi ích ({(selectedCategory.benefits || []).length})
                </button>
                <button
                  onClick={() => setDetailTab('fields')}
                  className={`pb-3 px-4 text-sm font-semibold transition-all whitespace-nowrap border-b-2 -mb-px flex items-center gap-2 ${
                    detailTab === 'fields'
                      ? 'border-tis-red text-tis-red'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <i className="fas fa-list-alt" /> Trường khảo sát động ({(selectedCategory.subject_fields || []).length})
                </button>
              </div>

              {/* Tab Contents */}
              <div>
                
                {/* 1. Subcategories List */}
                {detailTab === 'children' && (
                  <div className="space-y-3">
                    {(!selectedCategory.children || selectedCategory.children.length === 0) ? (
                      <div className="text-center py-8 text-gray-400 border border-dashed rounded-xl">
                        <i className="fas fa-sitemap text-xl mb-1" />
                        <p className="text-xs">Chưa cấu hình danh mục con</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedCategory.children.map((child, idx) => (
                          <div key={child.id || idx} className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                            <div className="min-w-0">
                              <span className="text-xs text-gray-400 font-mono">#{child.sort_order}</span>
                              <h5 className="font-semibold text-gray-900 text-sm mt-0.5 truncate">{child.name}</h5>
                              <code className="text-[10px] bg-gray-50 text-gray-500 px-1 rounded block truncate mt-1">
                                slug: {child.slug}
                              </code>
                            </div>
                            <span className={`w-2.5 h-2.5 rounded-full ${child.is_active !== false ? 'bg-green-500' : 'bg-gray-300'}`} title={child.is_active !== false ? 'Đang hoạt động' : 'Tạm ẩn'} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Benefits List */}
                {detailTab === 'benefits' && (
                  <div className="space-y-3">
                    {(!selectedCategory.benefits || selectedCategory.benefits.length === 0) ? (
                      <div className="text-center py-8 text-gray-400 border border-dashed rounded-xl">
                        <i className="fas fa-star text-xl mb-1" />
                        <p className="text-xs">Chưa cấu hình khối lợi ích nổi bật</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedCategory.benefits.map((b, idx) => (
                          <div key={idx} className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-red-50 text-tis-red flex items-center justify-center shrink-0 border border-red-100">
                              <i className={`fas ${b.icon || 'fa-shield-halved'} text-xs`} />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-semibold text-gray-900 text-sm truncate">{b.title}</h5>
                              <p className="text-gray-500 text-xs mt-1 leading-relaxed line-clamp-2">
                                {b.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Subject Fields (Dynamic survey) */}
                {detailTab === 'fields' && (
                  <div className="space-y-3">
                    {(!selectedCategory.subject_fields || selectedCategory.subject_fields.length === 0) ? (
                      <div className="text-center py-8 text-gray-400 border border-dashed rounded-xl">
                        <i className="fas fa-list-alt text-xl mb-1" />
                        <p className="text-xs">Chưa định nghĩa trường khảo sát động nào</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-gray-100 rounded-xl">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Tên nhãn</th>
                              <th>Field Key</th>
                              <th>Kiểu nhập liệu</th>
                              <th>Bắt buộc</th>
                              <th>Gợi ý phụ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedCategory.subject_fields.map((f, idx) => (
                              <tr key={f.id || idx}>
                                <td className="font-semibold text-gray-800 text-sm">{f.label}</td>
                                <td><code className="text-xs text-red-600 bg-red-50/50 px-1.5 py-0.5 rounded font-mono">{f.field_key}</code></td>
                                <td>
                                  <span className="badge-tis-dark text-xs">
                                    {FIELD_TYPE_MAP[f.field_type] || f.field_type}
                                  </span>
                                </td>
                                <td>
                                  {f.is_required !== false ? (
                                    <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Bắt buộc</span>
                                  ) : (
                                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Tùy chọn</span>
                                  )}
                                </td>
                                <td className="text-xs text-gray-500 italic truncate max-w-[120px]">{f.help_text || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </div>

            </div>
          )}
        </div>

      </div>

      {/* TABS CONFIGURATION MODAL (FOR ADD/EDIT) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl animate-slide-up my-6 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editing ? `Chỉnh sửa danh mục: ${editing.name}` : 'Thêm danh mục bảo hiểm mới'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Vui lòng thiết lập đầy đủ cấu hình qua các Tab bên dưới</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <i className="fas fa-times text-sm" />
              </button>
            </div>

            {/* Modal Tab Buttons */}
            <div className="flex border-b bg-gray-50/50 px-5 gap-1.5 overflow-x-auto shrink-0 pt-2">
              <button
                type="button"
                onClick={() => setModalTab('basic')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-all rounded-t-lg flex items-center gap-1.5 ${
                  modalTab === 'basic'
                    ? 'border-tis-red text-tis-red bg-white shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="fas fa-info-circle" /> 1. Thông tin chung
              </button>
              <button
                type="button"
                onClick={() => setModalTab('content')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-all rounded-t-lg flex items-center gap-1.5 ${
                  modalTab === 'content'
                    ? 'border-tis-red text-tis-red bg-white shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="fas fa-heading" /> 2. Nội dung giới thiệu
              </button>
              <button
                type="button"
                onClick={() => setModalTab('children')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-all rounded-t-lg flex items-center gap-1.5 ${
                  modalTab === 'children'
                    ? 'border-tis-red text-tis-red bg-white shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="fas fa-sitemap" /> 3. Danh mục con ({form.children.length})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('benefits')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-all rounded-t-lg flex items-center gap-1.5 ${
                  modalTab === 'benefits'
                    ? 'border-tis-red text-tis-red bg-white shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="fas fa-star" /> 4. Lợi ích ({form.benefits.length})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('fields')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-all rounded-t-lg flex items-center gap-1.5 ${
                  modalTab === 'fields'
                    ? 'border-tis-red text-tis-red bg-white shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="fas fa-list-alt" /> 5. Trường khảo sát ({form.subject_fields.length})
              </button>
            </div>

            {/* Modal Body (Scrollable form contents) */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* TAB 1: BASIC INFO */}
              {modalTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label-tis">Tên danh mục bảo hiểm *</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={handleNameChange}
                        placeholder="Ví dụ: Bảo hiểm sức khỏe"
                        className="input-tis font-semibold text-gray-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="label-tis">Mã liên kết (Slug) *</label>
                      <input
                        type="text"
                        value={form.slug}
                        onChange={e => setForm({ ...form, slug: slugify(e.target.value) })}
                        placeholder="Viết liền không dấu, VD: bao-hiem-suc-khoe"
                        className="input-tis font-mono text-gray-700"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label-tis">Nhóm chuyên ngành staff tư vấn</label>
                      <select
                        value={form.specialization_code}
                        onChange={e => setForm({ ...form, specialization_code: e.target.value })}
                        className="input-tis font-semibold"
                      >
                        {Object.entries(SPEC_MAP).map(([key, val]) => (
                          <option key={key} value={key}>{val} ({key})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Icon Image */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <label className="label-tis !mt-0">Icon đại diện (SVG/PNG)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIconChange}
                        className="input-tis text-xs bg-white mt-1.5"
                      />
                      
                      {iconPreview && (
                        <div className="mt-3 flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100">
                          <img src={iconPreview} alt="" className="w-10 h-10 object-contain bg-gray-50 p-1 rounded border shadow-sm" />
                          <span className="text-xs text-gray-400 font-mono truncate">Xem trước icon đã chọn</span>
                        </div>
                      )}
                    </div>

                    {/* Banner Image */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <label className="label-tis !mt-0">Ảnh Banner giới thiệu</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleHeroChange}
                        className="input-tis text-xs bg-white mt-1.5"
                      />
                      
                      {heroPreview && (
                        <div className="mt-3 flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100">
                          <img src={heroPreview} alt="" className="w-14 h-8 object-cover rounded border shadow-sm" />
                          <span className="text-xs text-gray-400 font-mono truncate">Xem trước ảnh bìa</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CMS CONTENT */}
              {modalTab === 'content' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label-tis">Tiêu đề Banner chính (Hero Title)</label>
                      <input
                        type="text"
                        value={form.hero_title}
                        onChange={e => setForm({ ...form, hero_title: e.target.value })}
                        placeholder="Tiêu đề to hiển thị trên banner"
                        className="input-tis"
                      />
                    </div>
                    <div>
                      <label className="label-tis">Phụ đề Banner (Hero Subtitle)</label>
                      <input
                        type="text"
                        value={form.hero_subtitle}
                        onChange={e => setForm({ ...form, hero_subtitle: e.target.value })}
                        placeholder="Dòng phụ đề nhỏ phía dưới tiêu đề chính"
                        className="input-tis"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <label className="label-tis">Tiêu đề phần Giới thiệu (Intro Title)</label>
                    <input
                      type="text"
                      value={form.intro_title}
                      onChange={e => setForm({ ...form, intro_title: e.target.value })}
                      placeholder="VD: Tại sao chọn gói bảo hiểm sức khỏe TIS?"
                      className="input-tis"
                    />
                  </div>

                  <div>
                    <label className="label-tis">Mô tả giới thiệu chi tiết (Intro Description)</label>
                    <textarea
                      value={form.intro_description}
                      onChange={e => setForm({ ...form, intro_description: e.target.value })}
                      placeholder="Nhập nội dung chi tiết về gói bảo hiểm này để hiển thị trên Landing Page..."
                      className="input-tis resize-none"
                      rows={5}
                    />
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <label className="label-tis">Tiêu đề phần Khối Lợi ích (Benefits section title)</label>
                    <input
                      type="text"
                      value={form.benefits_title}
                      onChange={e => setForm({ ...form, benefits_title: e.target.value })}
                      placeholder="VD: Quyền lợi vượt trội từ chúng tôi"
                      className="input-tis"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: SUBCATEGORIES */}
              {modalTab === 'children' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">Danh sách các danh mục cấp dưới</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Các danh mục con dùng để phân loại sâu hơn cho các gói bảo hiểm</p>
                    </div>
                    <button
                      type="button"
                      onClick={addChild}
                      className="px-3.5 py-1.5 bg-tis-red text-white text-xs font-bold rounded-lg hover:bg-red-700 transition"
                    >
                      <i className="fas fa-plus mr-1" /> Thêm danh mục con
                    </button>
                  </div>

                  {form.children.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 border border-dashed rounded-xl bg-gray-50/30">
                      <i className="fas fa-sitemap text-3xl text-gray-300 mb-2" />
                      <p className="text-sm">Chưa có mục con nào được thêm</p>
                      <button
                        type="button"
                        onClick={addChild}
                        className="text-tis-red font-bold text-xs hover:underline mt-1.5"
                      >
                        Thêm ngay
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {form.children.map((child, idx) => (
                        <div
                          key={idx}
                          className="bg-white border rounded-2xl p-4 shadow-sm border-gray-200 relative group flex flex-col md:flex-row gap-3.5 md:items-center"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-mono text-xs font-bold shrink-0">
                            {idx + 1}
                          </div>
                          
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Tên danh mục con *</label>
                              <input
                                type="text"
                                value={child.name}
                                onChange={e => handleChildNameChange(idx, e.target.value)}
                                placeholder="VD: Bảo hiểm tai nạn cá nhân"
                                className="input-tis text-sm !py-1.5 mt-1"
                                required
                              />
                            </div>
                            <div className="sm:col-span-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Mã Slug *</label>
                              <input
                                type="text"
                                value={child.slug}
                                onChange={e => updateChild(idx, 'slug', slugify(e.target.value))}
                                placeholder="viet-lien-khong-dau"
                                className="input-tis text-sm font-mono !py-1.5 mt-1"
                                required
                              />
                            </div>
                            <div className="sm:col-span-1 flex gap-2 items-center mt-1">
                              <div className="flex-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Sắp xếp</label>
                                <input
                                  type="number"
                                  value={child.sort_order}
                                  onChange={e => updateChild(idx, 'sort_order', Number(e.target.value))}
                                  className="input-tis text-sm !py-1.5 mt-1"
                                />
                              </div>
                              <div className="pt-5 shrink-0">
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none">
                                  <input
                                    type="checkbox"
                                    checked={child.is_active !== false}
                                    onChange={e => updateChild(idx, 'is_active', e.target.checked)}
                                    className="w-4 h-4 accent-tis-red rounded cursor-pointer"
                                  />
                                  Hiện
                                </label>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeChild(idx)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors absolute top-2 right-2 md:relative md:top-auto md:right-auto"
                            title="Xóa danh mục con"
                          >
                            <i className="fas fa-trash-alt text-sm" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: BENEFITS */}
              {modalTab === 'benefits' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">Cấu hình các điểm lợi ích nổi bật</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Giới thiệu các quyền lợi, thế mạnh giúp thu hút khách hàng mua bảo hiểm</p>
                    </div>
                    <button
                      type="button"
                      onClick={addBenefit}
                      className="px-3.5 py-1.5 bg-tis-red text-white text-xs font-bold rounded-lg hover:bg-red-700 transition"
                    >
                      <i className="fas fa-plus mr-1" /> Thêm thẻ lợi ích
                    </button>
                  </div>

                  {form.benefits.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 border border-dashed rounded-xl bg-gray-50/30">
                      <i className="fas fa-star text-3xl text-gray-300 mb-2" />
                      <p className="text-sm">Chưa có thẻ lợi ích nào</p>
                      <button
                        type="button"
                        onClick={addBenefit}
                        className="text-tis-red font-bold text-xs hover:underline mt-1.5"
                      >
                        Thêm ngay
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {form.benefits.map((b, idx) => (
                        <div
                          key={idx}
                          className="bg-white border rounded-2xl p-4 shadow-sm border-gray-200 relative group flex gap-3.5 items-start"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-mono text-xs font-bold shrink-0 mt-1">
                            {idx + 1}
                          </div>
                          
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Tiêu đề ngắn *</label>
                              <input
                                type="text"
                                value={b.title}
                                onChange={e => updateBenefit(idx, 'title', e.target.value)}
                                placeholder="VD: Bồi thường cực nhanh"
                                className="input-tis text-sm !py-1.5 mt-1"
                                required
                              />
                              
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-2 block">Icon Class (FontAwesome)</label>
                              <input
                                type="text"
                                value={b.icon}
                                onChange={e => updateBenefit(idx, 'icon', e.target.value)}
                                placeholder="fa-shield-halved, fa-clock..."
                                className="input-tis text-xs font-mono !py-1.5 mt-1"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Mô tả chi tiết lợi ích *</label>
                              <textarea
                                value={b.description}
                                onChange={e => updateBenefit(idx, 'description', e.target.value)}
                                placeholder="Mô tả cụ thể giúp thu hút khách hàng..."
                                className="input-tis text-sm mt-1 resize-none"
                                rows={3}
                                required
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeBenefit(idx)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors mt-1"
                            title="Xóa lợi ích này"
                          >
                            <i className="fas fa-trash-alt text-sm" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: DYNAMIC FIELDS */}
              {modalTab === 'fields' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">Định nghĩa trường khảo sát động</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">Các trường thông tin khách hàng bắt buộc điền khi tạo hồ sơ yêu cầu bồi thường/tư vấn</p>
                    </div>
                    <button
                      type="button"
                      onClick={addField}
                      className="px-3.5 py-1.5 bg-tis-red text-white text-xs font-bold rounded-lg hover:bg-red-700 transition"
                    >
                      <i className="fas fa-plus mr-1" /> Thêm trường khảo sát
                    </button>
                  </div>

                  {form.subject_fields.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 border border-dashed rounded-xl bg-gray-50/30">
                      <i className="fas fa-list-alt text-3xl text-gray-300 mb-2" />
                      <p className="text-sm">Chưa tạo trường dữ liệu nào</p>
                      <button
                        type="button"
                        onClick={addField}
                        className="text-tis-red font-bold text-xs hover:underline mt-1.5"
                      >
                        Tạo trường đầu tiên
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {form.subject_fields.map((field, idx) => (
                        <div
                          key={idx}
                          className="bg-white border rounded-2xl p-4 shadow-sm border-gray-200 relative group flex gap-3.5 items-start"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-mono text-xs font-bold shrink-0 mt-1">
                            {idx + 1}
                          </div>
                          
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Nhãn hiển thị (Label) *</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={e => handleFieldLabelChange(idx, e.target.value)}
                                placeholder="VD: Biển số xe, Ngày sinh..."
                                className="input-tis text-sm !py-1.5 mt-1 font-semibold"
                                required
                              />

                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-2 block">Mã Key lưu DB *</label>
                              <input
                                type="text"
                                value={field.field_key}
                                onChange={e => updateField(idx, 'field_key', slugify(e.target.value).replace(/-/g, '_'))}
                                placeholder="VD: bien_so_xe, ngay_sinh"
                                className="input-tis text-xs font-mono !py-1.5 mt-1 text-red-600 bg-red-50/20"
                                required
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Kiểu nhập liệu *</label>
                              <select
                                value={field.field_type}
                                onChange={e => updateField(idx, 'field_type', e.target.value)}
                                className="input-tis text-sm !py-1.5 mt-1"
                              >
                                {Object.entries(FIELD_TYPE_MAP).map(([key, val]) => (
                                  <option key={key} value={key}>{val}</option>
                                ))}
                              </select>

                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-2 block">Văn bản gợi ý (Help Text)</label>
                              <input
                                type="text"
                                value={field.help_text}
                                onChange={e => updateField(idx, 'help_text', e.target.value)}
                                placeholder="VD: Nhập biển số viết hoa liền nhau"
                                className="input-tis text-xs !py-1.5 mt-1"
                              />
                            </div>
                            
                            <div className="md:col-span-2 border-t border-gray-100 pt-2 flex items-center justify-between">
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none">
                                <input
                                  type="checkbox"
                                  checked={field.is_required !== false}
                                  onChange={e => updateField(idx, 'is_required', e.target.checked)}
                                  className="w-4 h-4 accent-tis-red rounded cursor-pointer"
                                />
                                Khách hàng bắt buộc phải nhập trường thông tin này
                              </label>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeField(idx)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors mt-1"
                            title="Xóa trường này"
                          >
                            <i className="fas fa-trash-alt text-sm" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </form>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-5 border-t sticky bottom-0 bg-white rounded-b-2xl">
              {/* Quick Tab validation errors or warnings */}
              <div className="text-xs text-gray-400 font-mono">
                {modalTab === 'basic' && 'Bước 1/5: Tên, chuyên ngành & hình ảnh'}
                {modalTab === 'content' && 'Bước 2/5: Tiêu đề & nội dung Landing Page'}
                {modalTab === 'children' && 'Bước 3/5: Danh mục con cấp dưới'}
                {modalTab === 'benefits' && 'Bước 4/5: Khối quyền lợi thu hút khách'}
                {modalTab === 'fields' && 'Bước 5/5: Các trường biểu mẫu động'}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-tis-ghost text-sm px-5 py-2 border border-gray-200 rounded-full text-gray-600"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-tis-danger text-sm px-6 py-2.5 flex items-center gap-2"
                >
                  {submitting ? (
                    <><i className="fas fa-spinner fa-spin" /> Đang đồng bộ...</>
                  ) : (
                    <><i className="fas fa-save" /> {editing ? 'Cập nhật danh mục' : 'Lưu & Khởi tạo'}</>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
