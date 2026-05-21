import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import { formatDate, formatMoney, formatFileSize } from '@/lib/format'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'

const STATUS_CONFIG = {
  pending:    { label: 'Chờ xử lý',    badge: 'bg-amber-100 text-amber-700',  icon: 'fa-clock',         step: 1 },
  submitted:  { label: 'Đã gửi',       badge: 'bg-blue-100 text-blue-700',    icon: 'fa-paper-plane',   step: 1 },
  reviewing:  { label: 'Đang xem xét', badge: 'bg-indigo-100 text-indigo-700', icon: 'fa-search',       step: 2 },
  processing: { label: 'Đang xử lý',   badge: 'bg-purple-100 text-purple-700', icon: 'fa-cog',          step: 3 },
  approved:   { label: 'Đã duyệt',     badge: 'bg-green-100 text-green-700',  icon: 'fa-check-circle',  step: 4 },
  completed:  { label: 'Hoàn thành',    badge: 'bg-green-100 text-green-700',  icon: 'fa-check-double',  step: 5 },
  rejected:   { label: 'Từ chối',       badge: 'bg-red-100 text-red-700',      icon: 'fa-times-circle',  step: -1 },
}

const CLAIM_TYPES = [
  { value: 'health',    label: 'Bảo hiểm sức khỏe' },
  { value: 'accident',  label: 'Tai nạn' },
  { value: 'vehicle',   label: 'Bảo hiểm xe' },
  { value: 'property',  label: 'Tài sản' },
  { value: 'travel',    label: 'Du lịch' },
  { value: 'life',      label: 'Bảo hiểm nhân thọ' },
  { value: 'other',     label: 'Khác' },
]

const TIMELINE_STEPS = [
  { key: 'submitted', label: 'Đã gửi',       icon: 'fa-paper-plane' },
  { key: 'reviewing', label: 'Đang xem xét', icon: 'fa-search' },
  { key: 'processing', label: 'Đang xử lý',  icon: 'fa-cog' },
  { key: 'approved',  label: 'Đã duyệt',     icon: 'fa-check-circle' },
  { key: 'completed', label: 'Hoàn thành',    icon: 'fa-check-double' },
]

export default function UserClaims() {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    claim_type: 'health',
    description: '',
    amount: '',
  })
  const [files, setFiles] = useState([])

  // Detail view
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    loadClaims()
  }, [])

  async function loadClaims() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/claims/')
      const list = Array.isArray(data) ? data : data?.results || []
      setClaims(list)
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải danh sách yêu cầu bồi thường.'))
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setFormData({ claim_type: 'health', description: '', amount: '' })
    setFiles([])
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setFormData({ claim_type: 'health', description: '', amount: '' })
    setFiles([])
  }

  function handleFileChange(e) {
    const selectedFiles = Array.from(e.target.files || [])
    // Limit to 5 files, max 10MB each
    const valid = selectedFiles.filter(f => f.size <= 10 * 1024 * 1024)
    if (valid.length !== selectedFiles.length) {
      toast.error('Mỗi file không được vượt quá 10MB.')
    }
    setFiles(prev => [...prev, ...valid].slice(0, 5))
  }

  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.description.trim()) {
      toast.error('Vui lòng nhập mô tả yêu cầu.')
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('claim_type', formData.claim_type)
      fd.append('description', formData.description)
      if (formData.amount) fd.append('amount', formData.amount)
      files.forEach((file, i) => {
        fd.append('files', file)
      })

      await api.post('/claims/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Đã gửi yêu cầu bồi thường thành công!')
      closeModal()
      loadClaims()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể gửi yêu cầu bồi thường.'))
    } finally {
      setSubmitting(false)
    }
  }

  function getStatusBadge(status) {
    const cfg = STATUS_CONFIG[status] || { label: status, badge: 'bg-gray-100 text-gray-600', icon: 'fa-question' }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badge}`}>
        <i className={`fas ${cfg.icon} text-[10px]`} />
        {cfg.label}
      </span>
    )
  }

  function getClaimTypeLabel(type) {
    const found = CLAIM_TYPES.find(ct => ct.value === type)
    return found?.label || type || 'Khác'
  }

  function openDetail(claim) {
    setSelectedClaim(claim)
    setShowDetail(true)
  }

  function getCurrentStep(status) {
    const cfg = STATUS_CONFIG[status]
    return cfg?.step || 0
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-56 skeleton rounded-lg" />
        <div className="admin-card p-0">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-50">
              <div className="skeleton h-5 w-8 rounded" />
              <div className="skeleton h-5 flex-1 rounded" />
              <div className="skeleton h-5 w-24 rounded" />
              <div className="skeleton h-5 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900">Yêu cầu bồi thường</h1>
        <div className="admin-card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-400 text-2xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Lỗi tải dữ liệu</h3>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button onClick={loadClaims} className="btn-tis btn-tis-outline text-sm px-5 py-2">
            <i className="fas fa-redo mr-2" />Thử lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yêu cầu bồi thường</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý các yêu cầu bồi thường bảo hiểm</p>
        </div>
        <button onClick={openCreateModal} className="btn-tis btn-tis-danger text-sm px-5 py-2.5">
          <i className="fas fa-plus mr-2" />Tạo yêu cầu bồi thường mới
        </button>
      </div>

      {/* Claims Table */}
      {claims.length === 0 ? (
        <div className="admin-card text-center py-16">
          <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-file-medical text-gray-300 text-3xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có yêu cầu nào</h3>
          <p className="text-gray-400 text-sm mb-6">Bạn chưa gửi yêu cầu bồi thường nào.</p>
          <button onClick={openCreateModal} className="btn-tis btn-tis-danger px-6 py-2.5">
            <i className="fas fa-plus mr-2" />Tạo yêu cầu mới
          </button>
        </div>
      ) : (
        <div className="admin-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Loại</th>
                  <th>Ngày gửi</th>
                  <th>Trạng thái</th>
                  <th>Số tiền</th>
                  <th className="text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim, idx) => (
                  <tr key={claim.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="font-mono text-xs text-gray-400">#{claim.id || idx + 1}</td>
                    <td>
                      <span className="text-sm font-medium text-gray-900">{getClaimTypeLabel(claim.claim_type || claim.type)}</span>
                    </td>
                    <td className="text-sm text-gray-600">{formatDate(claim.created_at || claim.submitted_at)}</td>
                    <td>{getStatusBadge(claim.status)}</td>
                    <td className="text-sm font-semibold text-gray-900">
                      {claim.amount ? formatMoney(claim.amount) : '—'}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => openDetail(claim)}
                        className="btn-tis btn-tis-ghost text-xs px-3 py-1.5"
                      >
                        <i className="fas fa-eye mr-1" />Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            Tổng cộng {claims.length} yêu cầu
          </div>
        </div>
      )}

      {/* Create Claim Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900">
                <i className="fas fa-file-medical text-tis-red mr-2" />
                Tạo yêu cầu bồi thường
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <i className="fas fa-times text-lg" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Claim Type */}
              <div>
                <label className="label-tis">Loại yêu cầu</label>
                <select
                  value={formData.claim_type}
                  onChange={e => setFormData(f => ({ ...f, claim_type: e.target.value }))}
                  className="input-tis"
                  required
                >
                  {CLAIM_TYPES.map(ct => (
                    <option key={ct.value} value={ct.value}>{ct.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="label-tis">Mô tả chi tiết</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  className="input-tis resize-none"
                  rows={4}
                  placeholder="Mô tả sự kiện bảo hiểm, thời gian, địa điểm, thiệt hại..."
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="label-tis">Số tiền yêu cầu bồi thường (VNĐ)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
                  className="input-tis"
                  placeholder="Ví dụ: 5000000"
                  min={0}
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="label-tis">Tài liệu đính kèm</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-tis-red/40 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    id="claim-files"
                  />
                  <label htmlFor="claim-files" className="cursor-pointer">
                    <i className="fas fa-cloud-upload-alt text-gray-300 text-3xl mb-2" />
                    <p className="text-sm text-gray-500">Nhấn để chọn file hoặc kéo thả vào đây</p>
                    <p className="text-xs text-gray-400 mt-1">Hỗ trợ: Ảnh, PDF, Word. Tối đa 5 file, mỗi file ≤ 10MB</p>
                  </label>
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <i className={`fas ${file.type.startsWith('image') ? 'fa-image text-blue-400' : 'fa-file-alt text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{file.name}</p>
                          <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-tis btn-tis-danger flex-1 py-2.5"
                >
                  {submitting ? (
                    <><i className="fas fa-spinner fa-spin mr-2" />Đang gửi...</>
                  ) : (
                    <><i className="fas fa-paper-plane mr-2" />Gửi yêu cầu</>
                  )}
                </button>
                <button type="button" onClick={closeModal} className="btn-tis btn-tis-ghost px-6 py-2.5">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Detail Modal */}
      {showDetail && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900">
                Chi tiết yêu cầu #{selectedClaim.id}
              </h3>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <i className="fas fa-times text-lg" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Trạng thái hiện tại</span>
                {getStatusBadge(selectedClaim.status)}
              </div>

              {/* Status Timeline */}
              {selectedClaim.status !== 'rejected' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Tiến trình xử lý</h4>
                  <div className="relative">
                    {TIMELINE_STEPS.map((step, i) => {
                      const currentStep = getCurrentStep(selectedClaim.status)
                      const stepNum = STATUS_CONFIG[step.key]?.step || i + 1
                      const isActive = stepNum <= currentStep
                      const isCurrent = stepNum === currentStep

                      return (
                        <div key={step.key} className="flex items-start gap-3 relative">
                          {/* Line connector */}
                          {i < TIMELINE_STEPS.length - 1 && (
                            <div className={`absolute left-4 top-8 w-0.5 h-8 ${isActive ? 'bg-green-400' : 'bg-gray-200'}`} />
                          )}
                          {/* Step dot */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                            isCurrent
                              ? 'bg-tis-red text-white shadow-md ring-4 ring-red-100'
                              : isActive
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-100 text-gray-400'
                          }`}>
                            <i className={`fas ${isActive ? 'fa-check' : step.icon}`} />
                          </div>
                          {/* Step label */}
                          <div className="pb-8">
                            <p className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                              {step.label}
                            </p>
                            {isCurrent && (
                              <p className="text-xs text-tis-red mt-0.5">Đang ở bước này</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Rejected reason */}
              {selectedClaim.status === 'rejected' && (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-700 mb-1">
                    <i className="fas fa-times-circle mr-1" /> Yêu cầu bị từ chối
                  </p>
                  <p className="text-sm text-red-600">{selectedClaim.rejection_reason || selectedClaim.note || 'Không có lý do cụ thể.'}</p>
                </div>
              )}

              {/* Claim Info */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Loại yêu cầu</span>
                  <span className="font-medium text-gray-900">{getClaimTypeLabel(selectedClaim.claim_type || selectedClaim.type)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ngày gửi</span>
                  <span className="text-gray-900">{formatDate(selectedClaim.created_at || selectedClaim.submitted_at)}</span>
                </div>
                {selectedClaim.amount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Số tiền yêu cầu</span>
                    <span className="font-bold text-tis-red">{formatMoney(selectedClaim.amount)}</span>
                  </div>
                )}
                {selectedClaim.approved_amount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Số tiền được duyệt</span>
                    <span className="font-bold text-green-600">{formatMoney(selectedClaim.approved_amount)}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Mô tả</h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed">
                  {selectedClaim.description || '—'}
                </p>
              </div>

              {/* Attachments */}
              {selectedClaim.files && selectedClaim.files.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Tài liệu đính kèm</h4>
                  <div className="space-y-2">
                    {selectedClaim.files.map((file, i) => (
                      <a
                        key={i}
                        href={file.url || file.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <i className="fas fa-file-alt text-gray-400" />
                        <span className="text-sm text-blue-600 hover:underline truncate">
                          {file.name || file.filename || `Tài liệu ${i + 1}`}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin notes */}
              {selectedClaim.admin_note && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Ghi chú từ nhân viên</h4>
                  <p className="text-sm text-gray-600 bg-blue-50 rounded-xl p-4">
                    {selectedClaim.admin_note}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end rounded-b-2xl">
              <button onClick={() => setShowDetail(false)} className="btn-tis btn-tis-ghost text-sm px-5 py-2">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
