import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api, { getErrorMessage, getValidImageUrl } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function QuickFormPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [formData, setFormData]   = useState(null)
  const [values, setValues]       = useState({})
  const [files, setFiles]         = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Fetch form data by token
  useEffect(() => {
    if (!token) {
      setError('Thiếu mã token. Vui lòng kiểm tra lại đường link.')
      setLoading(false)
      return
    }
    const fetchForm = async () => {
      try {
        const { data } = await api.get(`/quick-forms/public/`, { params: { token } })
        setFormData(data)
        // Initialize default values
        const defaults = {}
        if (data.subject_fields && Array.isArray(data.subject_fields)) {
          data.subject_fields.forEach(field => {
            defaults[field.name || field.key] = field.default_value || ''
          })
        }
        setValues(defaults)
      } catch (err) {
        const msg = getErrorMessage(err, 'Không thể tải biểu mẫu. Link có thể đã hết hạn.')
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    fetchForm()
  }, [token])

  const handleChange = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  const handleFileChange = (key, fileList) => {
    if (fileList && fileList.length > 0) {
      setFiles(prev => ({ ...prev, [key]: fileList[0] }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData) return

    // Validate required fields
    const fields = formData.subject_fields || []
    for (const field of fields) {
      const key = field.name || field.key
      const isRequired = field.required !== false
      if (isRequired && field.field_type !== 'file' && !values[key]?.toString().trim()) {
        toast.error(`Vui lòng nhập ${field.label || key}`)
        return
      }
      if (isRequired && field.field_type === 'file' && !files[key]) {
        toast.error(`Vui lòng chọn file cho ${field.label || key}`)
        return
      }
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      // Append text values
      Object.entries(values).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          fd.append(key, val)
        }
      })
      // Append files
      Object.entries(files).forEach(([key, file]) => {
        fd.append(key, file)
      })

      fd.append('token', token)
      await api.post(`/quick-forms/submit/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setSubmitted(true)
    } catch (err) {
      const msg = getErrorMessage(err, 'Gửi biểu mẫu thất bại. Vui lòng thử lại.')
      Swal.fire({ icon: 'error', title: 'Có lỗi xảy ra', text: msg, confirmButtonColor: '#D71920' })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading State ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="spinner-tis mx-auto mb-4" />
        <p className="text-gray-500">Đang tải biểu mẫu...</p>
      </div>
    )
  }

  // ── Error State ─────────────────────────────────────────────
  if (error) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-exclamation-triangle text-red-400 text-3xl" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Không thể tải biểu mẫu</h3>
        <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">{error}</p>
        <Link to="/" className="btn-tis-outline px-6 py-2.5">
          <i className="fas fa-home mr-2" /> Về trang chủ
        </Link>
      </div>
    )
  }

  // ── Submitted Success ───────────────────────────────────────
  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-check-circle text-green-500 text-4xl" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Gửi thành công!</h3>
        <p className="text-gray-500 text-sm mb-2">Cảm ơn bạn đã hoàn thành biểu mẫu.</p>
        <p className="text-gray-400 text-xs mb-8">
          Chúng tôi sẽ liên hệ bạn sớm nhất có thể.
        </p>
        <Link to="/" className="btn-tis-danger px-8 py-3">
          <i className="fas fa-home mr-2" /> Về trang chủ
        </Link>
      </div>
    )
  }

  // ── Form Render ─────────────────────────────────────────────
  const fields = formData?.subject_fields || []

  return (
    <div className="max-w-2xl mx-auto">
      {/* Category / Form Info Header */}
      {formData?.category && (
        <div className="bg-gradient-to-r from-[#D71920] to-[#b01418] rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center gap-4">
            {formData.category.image && (
              <img
                src={getValidImageUrl(formData.category.image)}
                alt={formData.category.name}
                className="w-16 h-16 rounded-xl object-cover bg-white/20"
                onError={e => { e.target.style.display = 'none' }}
              />
            )}
            <div>
              <h2 className="text-xl font-bold">{formData.category?.name || 'Biểu mẫu'}</h2>
              {formData.category?.description && (
                <p className="text-white/80 text-sm mt-1">{formData.category.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {!formData?.category && (
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#D71920] to-[#b01418] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <i className="fas fa-file-alt text-white text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{formData?.title || 'Biểu mẫu nhanh'}</h2>
          {formData?.description && (
            <p className="text-gray-500 text-sm mt-1">{formData.description}</p>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="card-tis p-6 space-y-5">
        {fields.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <i className="fas fa-inbox text-3xl mb-2" />
            <p>Biểu mẫu này chưa có trường nào.</p>
          </div>
        )}

        {fields.map((field, idx) => {
          const key = field.name || field.key || `field_${idx}`
          const label = field.label || key
          const isRequired = field.required !== false
          const fieldType = (field.field_type || 'text').toLowerCase()
          const placeholder = field.placeholder || `Nhập ${label.toLowerCase()}`

          return (
            <div key={key}>
              <label className="label-tis">
                {label}
                {isRequired && <span className="text-red-500 ml-0.5">*</span>}
              </label>

              {/* Text / Number / Date */}
              {['text', 'number', 'date', 'email', 'tel'].includes(fieldType) && (
                <input
                  type={fieldType}
                  value={values[key] || ''}
                  onChange={e => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                  required={isRequired}
                  className="input-tis"
                />
              )}

              {/* Textarea */}
              {fieldType === 'textarea' && (
                <textarea
                  value={values[key] || ''}
                  onChange={e => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                  required={isRequired}
                  rows={4}
                  className="input-tis resize-y"
                />
              )}

              {/* Select */}
              {fieldType === 'select' && (
                <select
                  value={values[key] || ''}
                  onChange={e => handleChange(key, e.target.value)}
                  required={isRequired}
                  className="input-tis"
                >
                  <option value="">-- Chọn {label.toLowerCase()} --</option>
                  {(field.options || field.choices || []).map((opt, i) => {
                    const optVal = typeof opt === 'string' ? opt : (opt.value || opt.key)
                    const optLabel = typeof opt === 'string' ? opt : (opt.label || opt.value)
                    return <option key={i} value={optVal}>{optLabel}</option>
                  })}
                </select>
              )}

              {/* File */}
              {fieldType === 'file' && (
                <div>
                  <input
                    type="file"
                    onChange={e => handleFileChange(key, e.target.files)}
                    accept={field.accept || '*'}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-tis-red hover:file:bg-red-100 cursor-pointer"
                  />
                  {files[key] && (
                    <p className="mt-1 text-xs text-gray-500">
                      <i className="fas fa-paperclip mr-1" />
                      {files[key].name} ({(files[key].size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              )}

              {/* Checkbox */}
              {fieldType === 'checkbox' && (
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={values[key] === true || values[key] === 'true'}
                    onChange={e => handleChange(key, e.target.checked)}
                    className="w-4 h-4 rounded accent-[#D71920]"
                  />
                  <span className="text-sm text-gray-700">{field.checkbox_label || label}</span>
                </label>
              )}

              {/* Help text */}
              {field.help_text && (
                <p className="mt-1 text-xs text-gray-400">{field.help_text}</p>
              )}
            </div>
          )
        })}

        {fields.length > 0 && (
          <button
            type="submit"
            disabled={submitting}
            className="btn-tis-danger w-full py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting
              ? <><i className="fas fa-spinner fa-spin mr-2" />Đang gửi...</>
              : <><i className="fas fa-paper-plane mr-2" />Gửi biểu mẫu</>
            }
          </button>
        )}
      </form>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          <i className="fas fa-shield-alt mr-1" />
          Thông tin của bạn được bảo mật bởi TIS Broker
        </p>
      </div>
    </div>
  )
}
