import { useState, useEffect } from 'react'
import api, { fetchList, getValidImageUrl, getErrorMessage } from '@/lib/api'
import { formatMoney, formatDateTime, normalizeList } from '@/lib/format'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'

const CLAIM_STATUS = {
  new: { label: 'Chờ tiếp nhận', badge: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Đang xử lý', badge: 'bg-blue-100 text-blue-800' },
  waiting_documents: { label: 'Chờ bổ sung hồ sơ', badge: 'bg-cyan-100 text-cyan-800' },
  approved: { label: 'Đã duyệt', badge: 'bg-green-100 text-green-800' },
  rejected: { label: 'Từ chối', badge: 'bg-red-100 text-red-800' },
  closed: { label: 'Đã đóng', badge: 'bg-gray-100 text-gray-800' },
}

const LOSS_TYPE = {
  health: 'Sức khỏe / tai nạn',
  vehicle: 'Xe cơ giới',
  property: 'Tài sản',
  marine: 'Hàng hải / vận chuyển',
  liability: 'Trách nhiệm',
  other: 'Khác',
}

export default function AdminClaims() {
  const { user: currentUser } = useAuth()
  const [claims, setClaims] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals state
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState(null)
  const [savingDetail, setSavingDetail] = useState(false)

  // Edit fields
  const [claimStatus, setClaimStatus] = useState('new')
  const [assignedStaff, setAssignedStaff] = useState('')
  const [adminNote, setAdminNote] = useState('')

  // Attachment preview state
  const [previewFile, setPreviewFile] = useState(null) // { url, name, ext }
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const canAssignClaims = () => {
    if (!currentUser) return false
    return (
      currentUser.is_superuser ||
      ['super_admin', 'admin', 'claim'].includes(currentUser.role)
    )
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const claimsData = await fetchList('/claims/')
      setClaims(normalizeList(claimsData))

      // Try fetching staff list
      try {
        const staffRes = await fetchList('/users/staff-list/')
        const filteredStaff = normalizeList(staffRes).filter(
          (u) => ['staff', 'claim'].includes(u.role) && u.is_active
        )
        setStaffList(filteredStaff)
      } catch {
        // Fallback to general staff endpoint if staff-list fails
        const staffRes = await fetchList('/staff/')
        setStaffList(normalizeList(staffRes).filter((u) => u.is_active))
      }
    } catch (err) {
      toast.error('Không thể tải danh sách yêu cầu bồi thường')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  const handleResetSearch = () => {
    setSearchInput('')
    setSearch('')
    setStatusFilter('all')
  }

  const filteredClaims = claims.filter((item) => {
    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) return false

    // Search filter
    if (search) {
      const keyword = search.toLowerCase()
      const code = String(item.code || `#${item.id}`).toLowerCase()
      const customer = String(item.customer_name || '').toLowerCase()
      const contact = String(item.customer_phone || item.customer_email || '').toLowerCase()
      const order = String(item.order_code || '').toLowerCase()
      const product = String(item.product_name || '').toLowerCase()
      return (
        code.includes(keyword) ||
        customer.includes(keyword) ||
        contact.includes(keyword) ||
        order.includes(keyword) ||
        product.includes(keyword)
      )
    }
    return true
  })

  const openDetail = (item) => {
    setSelectedClaim(item)
    setClaimStatus(item.status || 'new')
    setAssignedStaff(item.assigned_staff || '')
    setAdminNote(item.admin_note || '')
    setShowDetailModal(true)
  }

  const handleSaveClaim = async (e) => {
    e.preventDefault()
    if (!selectedClaim) return

    setSavingDetail(true)
    try {
      const payload = {
        status: claimStatus,
        admin_note: adminNote,
      }

      const updated = await api.patch(`/claims/${selectedClaim.id}/`, payload)

      if (
        canAssignClaims() &&
        assignedStaff &&
        Number(assignedStaff) !== Number(selectedClaim.assigned_staff)
      ) {
        await api.post(`/claims/${selectedClaim.id}/assign-staff/`, {
          staff_id: assignedStaff,
        })
      }

      toast.success('Cập nhật hồ sơ bồi thường thành công!')
      setShowDetailModal(false)
      loadData()
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Thất bại',
        text: getErrorMessage(err, 'Không thể cập nhật hồ sơ bồi thường.'),
        confirmButtonColor: '#D71920',
      })
    } finally {
      setSavingDetail(false)
    }
  }

  const getFileExtension = (name = '') => {
    return String(name).split('?')[0].split('#')[0].split('.').pop().toLowerCase()
  }

  const handlePreviewAttachment = (file) => {
    const url = getValidImageUrl(file.file_url || file.file || '')
    if (!url) return
    const name = file.original_name || url.split('/').pop() || 'Tệp đính kèm'
    const ext = getFileExtension(name)
    setPreviewFile({ url, name, ext })
    setShowPreviewModal(true)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yêu cầu bồi thường</h1>
          <p className="text-sm text-gray-500 mt-0.5">{claims.length} yêu cầu</p>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearchSubmit} className="admin-card mb-6 flex flex-wrap gap-3 items-center !p-4">
        <div className="relative flex-grow min-w-[240px]">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo mã hồ sơ, tên, SĐT, mã đơn hàng..."
            className="input-tis pl-10 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-tis text-sm w-auto min-w-[200px]"
        >
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(CLAIM_STATUS).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold shadow-sm transition shrink-0"
          >
            Tìm kiếm
          </button>
          <button
            type="button"
            onClick={handleResetSearch}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-semibold transition shrink-0"
          >
            Đặt lại
          </button>
        </div>
      </form>

      {/* Claims Table */}
      <div className="admin-card overflow-hidden !p-0">
        {loading ? (
          <div className="p-12 text-center">
            <div className="spinner-tis" />
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <i className="fas fa-file-invoice text-4xl mb-3" />
            <p>Không có yêu cầu bồi thường nào phù hợp</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th>Mã hồ sơ</th>
                  <th>Khách hàng</th>
                  <th>Thông tin đơn</th>
                  <th>Tổn thất</th>
                  <th>Phụ trách</th>
                  <th>Trạng thái</th>
                  <th className="text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((item) => {
                  const statusMeta = CLAIM_STATUS[item.status] || {
                    label: item.status,
                    badge: 'bg-gray-100 text-gray-800',
                  }
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td>
                        <div className="font-semibold text-gray-900">
                          {item.code || `#${item.id}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDateTime(item.created_at)}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium text-gray-900">
                          {item.customer_name || 'Khách hàng'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.customer_phone || item.customer_email || '-'}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium text-gray-900 text-xs">
                          {item.order_code || '-'}
                        </div>
                        <div className="text-xs text-gray-400 line-clamp-1">
                          {item.product_name || '-'}
                        </div>
                      </td>
                      <td className="text-sm text-gray-700">
                        {LOSS_TYPE[item.loss_type] || item.loss_type || '-'}
                      </td>
                      <td className="text-sm text-gray-600">
                        {item.assigned_staff_name || 'Chưa phân công'}
                      </td>
                      <td>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${statusMeta.badge}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => openDetail(item)}
                          className="px-3 py-1.5 border border-red-200 text-red-600 rounded text-xs hover:bg-red-50 transition font-medium"
                        >
                          <i className="fas fa-eye mr-1" /> Chi tiết
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Claims Detail Modal */}
      {showDetailModal && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl my-8">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                Chi tiết yêu cầu bồi thường {selectedClaim.code || `#${selectedClaim.id}`}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <i className="fas fa-times text-xl" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSaveClaim}>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <span className="text-xs font-semibold text-gray-400 block mb-1">Khách hàng</span>
                    <strong className="text-gray-900 block text-base">
                      {selectedClaim.customer_name || '-'}
                    </strong>
                    <span className="text-sm text-gray-500 block">
                      {selectedClaim.customer_phone || selectedClaim.customer_email || '-'}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <span className="text-xs font-semibold text-gray-400 block mb-1">Gói bảo hiểm</span>
                    <strong className="text-gray-900 block text-base line-clamp-1">
                      {selectedClaim.product_name || '-'}
                    </strong>
                    <span className="text-sm text-gray-500 block">
                      Đơn hàng: {selectedClaim.order_code || '-'} · Thời hạn: {selectedClaim.duration || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Loại tổn thất</label>
                    <div className="text-sm text-gray-800 font-semibold bg-gray-50 px-3 py-2 rounded">
                      {LOSS_TYPE[selectedClaim.loss_type] || selectedClaim.loss_type || '-'}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Ngày xảy ra tổn thất</label>
                    <div className="text-sm text-gray-800 font-semibold bg-gray-50 px-3 py-2 rounded">
                      {selectedClaim.incident_date
                        ? new Date(selectedClaim.incident_date).toLocaleDateString('vi-VN')
                        : 'Chưa cung cấp'}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Số tiền tổn thất ước tính</label>
                    <div className="text-sm text-gray-800 font-semibold bg-gray-50 px-3 py-2 rounded">
                      {selectedClaim.loss_amount
                        ? `${Number(selectedClaim.loss_amount).toLocaleString('vi-VN')} ${selectedClaim.loss_currency || 'VND'}`
                        : 'Chưa cung cấp'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Thông tin nhận tiền bồi thường</label>
                  <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded min-h-[50px] whitespace-pre-line">
                    {selectedClaim.refund_information || 'Chưa cung cấp'}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Mô tả tổn thất</label>
                  <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded min-h-[80px] whitespace-pre-line">
                    {selectedClaim.description || 'Chưa cung cấp'}
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Hồ sơ chứng từ đính kèm</label>
                  {(selectedClaim.attachments || []).length === 0 ? (
                    <div className="text-sm text-gray-400 italic">Khách hàng chưa đính kèm giấy tờ.</div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {selectedClaim.attachments.map((file, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handlePreviewAttachment(file)}
                          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:border-red-500 hover:text-red-500 transition text-sm bg-white"
                        >
                          <i className="fas fa-paperclip text-red-500" />
                          <span className="max-w-[180px] truncate">
                            {file.original_name || 'Tệp đính kèm'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-gray-200" />

                {/* Operational actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label-tis block text-sm font-semibold mb-1">Trạng thái xử lý</label>
                    <select
                      value={claimStatus}
                      onChange={(e) => setClaimStatus(e.target.value)}
                      className="input-tis w-full"
                    >
                      {Object.entries(CLAIM_STATUS).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label-tis block text-sm font-semibold mb-1">Nhân viên phụ trách</label>
                    <select
                      value={assignedStaff}
                      onChange={(e) => setAssignedStaff(e.target.value)}
                      disabled={!canAssignClaims()}
                      className="input-tis w-full disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Chưa phân công</option>
                      {staffList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.full_name || st.username} ({st.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">
                    Nội dung thông báo / ghi chú gửi khách hàng
                  </label>
                  <textarea
                    rows={3}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Nhập nội dung hướng dẫn bổ sung hoặc lý do duyệt/từ chối để phản hồi cho khách hàng..."
                    className="input-tis w-full"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-white hover:bg-gray-50 transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={savingDetail}
                  className="btn-tis-danger text-sm min-w-[120px] flex items-center justify-center"
                >
                  {savingDetail ? (
                    <>
                      <div className="spinner-tis !w-4 !h-4 !border-2 !border-white mr-2" />
                      Đang lưu...
                    </>
                  ) : (
                    'Lưu thay đổi'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {showPreviewModal && previewFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75">
          <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h4 className="text-md font-bold text-gray-900 truncate pr-8">{previewFile.name}</h4>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <i className="fas fa-times text-xl" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 flex justify-center items-center bg-gray-900 rounded-b-lg">
              {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewFile.ext) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] object-contain rounded"
                />
              ) : previewFile.ext === 'pdf' ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[70vh] border-0 rounded bg-white"
                />
              ) : ['mp4', 'webm', 'mov'].includes(previewFile.ext) ? (
                <video
                  src={previewFile.url}
                  controls
                  playsInline
                  className="w-full max-h-[70vh] rounded bg-black"
                />
              ) : ['mp3', 'wav', 'm4a', 'ogg'].includes(previewFile.ext) ? (
                <audio src={previewFile.url} controls className="w-full max-w-md bg-white p-4 rounded-full" />
              ) : (
                <div className="text-center py-12 text-white">
                  <i className="fas fa-file-alt text-5xl mb-4 text-gray-400" />
                  <p className="font-semibold text-lg mb-4">
                    Trình duyệt không hỗ trợ xem trực tiếp định dạng này.
                  </p>
                  <a
                    href={previewFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-red-600 text-white rounded-full px-6 py-2.5 font-bold hover:bg-red-700 transition"
                  >
                    Tải tệp về máy
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
