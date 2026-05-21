import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { fetchList, getErrorMessage } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminConsultations() {
  const navigate = useNavigate()
  const { user: currentAdminUser } = useAuth()
  
  const [consultations, setConsultations] = useState([])
  const [staffList, setStaffList] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showQuickFormModal, setShowQuickFormModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Quick Form State
  const [quickForm, setQuickForm] = useState({
    category: '',
    customer_name: '',
    phone: '',
    email: '',
    expires_days: '7'
  })
  const [generatedLink, setGeneratedLink] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [consData, staffData, catsData] = await Promise.all([
        fetchList('/consultations/'),
        fetchList('/users/staff-list/'),
        fetchList('/categories/')
      ])
      
      setConsultations(consData)
      setStaffList(staffData.filter(s => s.role === 'staff' && s.is_active))
      
      // Filter categories if the user has specialized categories
      let filteredCats = catsData
      if (currentAdminUser && ['leader', 'staff'].includes(currentAdminUser.role)) {
        const allowed = new Set((currentAdminUser.specialized_categories || []).map(String))
        filteredCats = catsData.filter(c => allowed.has(String(c.id)))
      }
      setCategories(filteredCats)
      if (filteredCats.length > 0) {
        setQuickForm(prev => ({ ...prev, category: filteredCats[0].id }))
      }
    } catch (err) {
      console.error(err)
      toast.error('Không thể tải dữ liệu tư vấn')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentAdminUser])

  const handleAssignStaff = async (id, staffId) => {
    if (!staffId) return
    try {
      await api.post(`/consultations/${id}/assign-staff/`, { staff_id: staffId })
      toast.success('Đã chỉ định nhân viên')
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể chỉ định nhân viên'))
    }
  }

  const handleAccept = async (id) => {
    try {
      await api.post(`/consultations/${id}/assign_processor/`)
      toast.success('Đã tiếp nhận yêu cầu')
      navigate(`/admin/chat?id=${id}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tiếp nhận yêu cầu'))
    }
  }

  const handleCreateQuickForm = async (e) => {
    e.preventDefault()
    if (!quickForm.category) {
      toast.error('Vui lòng chọn danh mục')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await api.post('/quick-forms/', {
        category: quickForm.category,
        customer_name: quickForm.customer_name.trim(),
        phone: quickForm.phone.trim(),
        email: quickForm.email.trim(),
        expires_days: Number(quickForm.expires_days)
      })
      setGeneratedLink(data.form_url)
      toast.success('Tạo link form nhanh thành công')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tạo link form nhanh'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink)
      toast.success('Đã sao chép link')
    } catch (err) {
      toast.error('Sao chép thất bại. Vui lòng copy thủ công.')
    }
  }

  const openCreateModal = () => {
    setGeneratedLink('')
    setQuickForm({
      category: categories[0]?.id || '',
      customer_name: '',
      phone: '',
      email: '',
      expires_days: '7'
    })
    setShowQuickFormModal(true)
  }

  const isLeader = currentAdminUser?.role === 'leader'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý tư vấn</h1>
          <p className="text-sm text-gray-500">Tiếp nhận và phân công khách hàng yêu cầu tư vấn</p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-tis btn-tis-danger text-sm self-start sm:self-auto"
        >
          <i className="fas fa-link mr-2" />
          Tạo link form nhanh
        </button>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <i className="fas fa-spinner fa-spin text-3xl text-tis-red" />
          </div>
        ) : consultations.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <i className="fas fa-comments text-4xl mb-3 text-gray-300 block" />
            Không có yêu cầu tư vấn nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Khách hàng</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Liên hệ</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Danh mục / Sản phẩm</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Người xử lý</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Trạng thái</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((item) => {
                  const processorName = item.processor_name || item.assigned_staff_name || ''
                  const hasHandler = Boolean(item.processor || item.assigned_staff || processorName || item.status === 'processed')
                  const handlerLabel = item.processor_name ? 'Đã tiếp nhận' : (item.assigned_staff_name ? 'Được chỉ định' : 'Đang xử lý')
                  
                  let statusText = 'Mới'
                  let statusClass = 'bg-yellow-100 text-yellow-800'
                  if (item.status === 'archived') {
                    statusText = 'Lưu trữ'
                    statusClass = 'bg-gray-100 text-gray-800'
                  } else if (item.status === 'processed' || hasHandler) {
                    statusText = 'Đang xử lý'
                    statusClass = 'bg-green-100 text-green-800'
                  }

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 border-b last:border-b-0">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">{item.customer_name || 'Khách hàng'}</div>
                        <div className="text-xs text-gray-400">#{item.id}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        <div>{item.customer_contact || '-'}</div>
                        {item.email && <div className="text-xs text-gray-400 mt-1">{item.email}</div>}
                      </td>
                      <td className="p-4 text-sm text-gray-700">{item.product_name || item.category_name || 'Chung'}</td>
                      <td className="p-4">
                        {processorName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-red-50 text-tis-red font-bold flex items-center justify-center text-xs">
                              {processorName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{processorName}</div>
                              <div className="text-[10px] text-gray-500">{handlerLabel}</div>
                            </div>
                          </div>
                        ) : hasHandler ? (
                          <span className="text-xs text-gray-400 italic">Đang xử lý</span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa có</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {hasHandler ? (
                            <button
                              onClick={() => navigate(`/admin/chat?id=${item.id}`)}
                              className="btn-tis bg-green-500 text-white hover:bg-green-600 text-xs px-3 py-1.5 rounded-full"
                            >
                              <i className="fab fa-facebook-messenger mr-1" />
                              Chat
                            </button>
                          ) : isLeader ? (
                            <span className="text-xs text-gray-400">Chờ phân công</span>
                          ) : (
                            <button
                              onClick={() => handleAccept(item.id)}
                              className="btn-tis btn-tis-danger text-xs px-3 py-1.5"
                            >
                              <i className="fas fa-hand-paper mr-1" />
                              Tiếp nhận
                            </button>
                          )}

                          {staffList.length > 0 && (
                            <div className="flex items-center">
                              <select
                                value={item.assigned_staff || ''}
                                onChange={(e) => handleAssignStaff(item.id, e.target.value)}
                                className="input-tis text-xs py-1 px-2 pr-8 w-36 rounded-l-full border-r-0 focus:ring-0"
                              >
                                <option value="">Giao nhân viên...</option>
                                {staffList.map(staff => (
                                  <option key={staff.id} value={staff.id}>
                                    {staff.full_name || staff.username}
                                  </option>
                                ))}
                              </select>
                              <div className="bg-gray-100 border border-gray-200 border-l-0 text-gray-500 rounded-r-full px-2 py-1 text-xs">
                                <i className="fas fa-user-check" />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Form Modal */}
      {showQuickFormModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Tạo link form nhanh</h3>
              <button
                onClick={() => setShowQuickFormModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times" />
              </button>
            </div>
            
            <form onSubmit={handleCreateQuickForm} className="p-6 space-y-4">
              <div>
                <label className="label-tis">Danh mục yêu cầu cập nhật</label>
                <select
                  value={quickForm.category}
                  onChange={(e) => setQuickForm({ ...quickForm, category: e.target.value })}
                  className="input-tis"
                  required
                >
                  <option value="">Chọn danh mục...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-tis">Tên khách hàng (nếu có)</label>
                <input
                  type="text"
                  value={quickForm.customer_name}
                  onChange={(e) => setQuickForm({ ...quickForm, customer_name: e.target.value })}
                  className="input-tis"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-tis">SĐT gợi ý</label>
                  <input
                    type="tel"
                    value={quickForm.phone}
                    onChange={(e) => setQuickForm({ ...quickForm, phone: e.target.value })}
                    className="input-tis"
                    placeholder="0901234567"
                  />
                </div>
                <div>
                  <label className="label-tis">Email gợi ý</label>
                  <input
                    type="email"
                    value={quickForm.email}
                    onChange={(e) => setQuickForm({ ...quickForm, email: e.target.value })}
                    className="input-tis"
                    placeholder="khach@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="label-tis">Hiệu lực link</label>
                <select
                  value={quickForm.expires_days}
                  onChange={(e) => setQuickForm({ ...quickForm, expires_days: e.target.value })}
                  className="input-tis"
                >
                  <option value="3">3 ngày</option>
                  <option value="7">7 ngày</option>
                  <option value="14">14 ngày</option>
                  <option value="30">30 ngày</option>
                </select>
              </div>

              {generatedLink && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4">
                  <div className="text-sm font-semibold text-green-800 mb-2">Link form nhanh đã sẵn sàng:</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedLink}
                      readOnly
                      className="input-tis text-xs flex-1 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="btn-tis bg-green-600 text-white text-xs px-3 py-2 hover:bg-green-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowQuickFormModal(false)}
                  className="btn-tis btn-tis-ghost text-sm px-4 py-2 border rounded-full"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-tis btn-tis-danger text-sm px-6 py-2.5"
                >
                  {submitting ? 'Đang tạo...' : 'Tạo link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
