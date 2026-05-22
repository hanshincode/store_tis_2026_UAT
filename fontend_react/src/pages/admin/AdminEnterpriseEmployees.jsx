import { useState, useEffect, useRef } from 'react'
import api, { fetchList, getErrorMessage } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'
import PasswordField from '@/components/ui/PasswordField'

export default function AdminEnterpriseEmployees() {
  const [enterprises, setEnterprises] = useState([])
  const [employees, setEmployees] = useState([])
  const [enterpriseOrders, setEnterpriseOrders] = useState([])
  
  const [selectedEnt, setSelectedEnt] = useState(null)
  const [entSearch, setEntSearch] = useState('')
  const [showEntDropdown, setShowEntDropdown] = useState(false)
  const [loadingEnt, setLoadingEnt] = useState(false)
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)

  // Modals state
  const [employeeModal, setEmployeeModal] = useState({
    show: false,
    id: null,
    form: {
      full_name: '',
      phone: '',
      email: '',
      address: '',
      password: ''
    }
  })

  const [coverageModal, setCoverageModal] = useState({
    show: false,
    employeeId: null,
    form: {
      order_item: '',
      start_date: new Date().toISOString().split('T')[0],
      note: ''
    }
  })

  const [importModal, setImportModal] = useState({
    show: false,
    form: {
      order_item: '',
      file: null
    }
  })

  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowEntDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-search enterprise on typing
  useEffect(() => {
    if (!entSearch.trim()) {
      setEnterprises([])
      return
    }
    const delayDebounce = setTimeout(async () => {
      setLoadingEnt(true)
      try {
        const { data } = await api.get(`/users/enterprise-list/?search=${encodeURIComponent(entSearch.trim())}`)
        const list = Array.isArray(data) ? data : (data.results || [])
        setEnterprises(list)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingEnt(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [entSearch])

  // Select enterprise logic
  const handleSelectEnterprise = (ent) => {
    setSelectedEnt(ent)
    setEntSearch(getEnterpriseLabel(ent))
    setShowEntDropdown(false)
  }

  // Load Workspace when enterprise is chosen
  useEffect(() => {
    if (selectedEnt) {
      loadWorkspace()
    } else {
      setEmployees([])
      setEnterpriseOrders([])
    }
  }, [selectedEnt])

  const loadWorkspace = async () => {
    if (!selectedEnt) return
    setLoadingWorkspace(true)
    try {
      const [empRes, orderRes] = await Promise.all([
        api.get(`/employees/?enterprise=${selectedEnt.id}`),
        api.get(`/orders/enterprise-paid/?enterprise=${selectedEnt.id}`)
      ])
      
      const empData = empRes.data
      setEmployees(Array.isArray(empData) ? empData : (empData.results || []))

      const orderData = orderRes.data
      setEnterpriseOrders(Array.isArray(orderData) ? orderData : (orderData.results || []))
    } catch (err) {
      toast.error('Không thể tải thông tin nhân viên hoặc đơn hàng của doanh nghiệp')
    } finally {
      setLoadingWorkspace(false)
    }
  }

  // Helpers
  const getEnterpriseLabel = (ent) => {
    if (!ent) return ''
    return ent.company_name || ent.full_name || ent.phone || ent.username || `#${ent.id}`
  }

  const getEnterpriseSubtitle = (ent) => {
    if (!ent) return ''
    return [ent.tax_code ? `MST: ${ent.tax_code}` : null, ent.phone, ent.email].filter(Boolean).join(' · ')
  }

  const isOrderApproved = (order) => {
    return order.payment_status === 'paid' && ['confirmed', 'active'].includes(order.status)
  }

  const getRemainingSlots = (item) => {
    const used = Number(item.covered_count || 0)
    return Math.max(Number(item.quantity || 0) - used, 0)
  }

  const flattenOrderItems = (orders) => {
    return orders.flatMap(order => (order.items || []).map(item => ({ order, item })))
  }

  const formatDate = (value) => {
    if (!value) return '--'
    return new Date(value).toLocaleDateString('vi-VN')
  }

  // Employee CRUD Modal opening
  const openEmployeeModal = (emp = null) => {
    if (emp) {
      setEmployeeModal({
        show: true,
        id: emp.id,
        form: {
          full_name: emp.full_name || '',
          phone: emp.phone || '',
          email: emp.email || '',
          address: emp.address || '',
          password: ''
        }
      })
    } else {
      setEmployeeModal({
        show: true,
        id: null,
        form: {
          full_name: '',
          phone: '',
          email: '',
          address: '',
          password: ''
        }
      })
    }
  }

  const handleSaveEmployee = async (e) => {
    e.preventDefault()
    if (!selectedEnt) return

    const payload = {
      enterprise: selectedEnt.id,
      full_name: employeeModal.form.full_name.trim(),
      phone: employeeModal.form.phone.trim(),
      email: employeeModal.form.email.trim(),
      address: employeeModal.form.address.trim()
    }

    if (!employeeModal.id) {
      payload.password = employeeModal.form.password.trim()
    }

    try {
      if (employeeModal.id) {
        await api.patch(`/employees/${employeeModal.id}/`, payload)
        toast.success('Đã cập nhật thông tin nhân viên')
      } else {
        await api.post('/employees/', payload)
        toast.success('Đã thêm nhân viên mới thành công')
      }
      setEmployeeModal(prev => ({ ...prev, show: false }))
      loadWorkspace()
    } catch (err) {
      Swal.fire('Lỗi', getErrorMessage(err, 'Không thể lưu nhân viên'), 'error')
    }
  }

  // Insurance coverage modal opening
  const openCoverageModal = (employeeId) => {
    setCoverageModal({
      show: true,
      employeeId,
      form: {
        order_item: '',
        start_date: new Date().toISOString().split('T')[0],
        note: ''
      }
    })
  }

  const handleSaveCoverage = async (e) => {
    e.preventDefault()
    const { employeeId, form } = coverageModal
    if (!form.order_item) {
      toast.error('Vui lòng chọn gói bảo hiểm trong danh sách đơn đã duyệt')
      return
    }

    try {
      await api.post(`/employees/${employeeId}/add-coverage/`, {
        order_item: form.order_item,
        start_date: form.start_date,
        note: form.note.trim()
      })
      toast.success('Đã gắn gói bảo hiểm cho nhân viên')
      setCoverageModal(prev => ({ ...prev, show: false }))
      loadWorkspace()
    } catch (err) {
      Swal.fire('Lỗi', getErrorMessage(err, 'Không thể gắn gói bảo hiểm'), 'error')
    }
  }

  // Excel template downloader
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/employees/template/', { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'enterprise_employee_template.xlsx'
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Tải template Excel thành công')
    } catch (err) {
      toast.error('Không thể tải template Excel')
    }
  }

  // Excel Import Logic
  const handleImportEmployees = async (e) => {
    e.preventDefault()
    if (!importModal.form.file) {
      toast.error('Vui lòng chọn tệp tin Excel')
      return
    }

    const formData = new FormData()
    formData.append('enterprise', selectedEnt.id)
    if (importModal.form.order_item) {
      formData.append('order_item', importModal.form.order_item)
    }
    formData.append('file', importModal.form.file)

    try {
      const { data } = await api.post('/employees/import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setImportModal(prev => ({ ...prev, show: false }))
      if (data.warning) {
        Swal.fire('Hoàn thành có cảnh báo', data.warning, 'warning')
      } else {
        toast.success(data.message || `Đã import ${data.imported_count || 0} nhân viên thành công`)
      }
      loadWorkspace()
    } catch (err) {
      const detail = getErrorMessage(err, 'Không thể import file Excel')
      const errorsList = err.response?.data?.errors
      const extra = Array.isArray(errorsList) ? `\n${errorsList.slice(0, 5).join('\n')}` : ''
      Swal.fire('Import chưa thành công', `${detail}${extra}`, 'error')
    }
  }

  // Get eligible packages for dropdowns
  const approvedOrderItems = flattenOrderItems(enterpriseOrders).filter(({ order }) => isOrderApproved(order))
  const remainingCoverageSlots = approvedOrderItems.reduce((total, { item }) => total + getRemainingSlots(item), 0)

  return (
    <div className="admin-inbox-page enterprise-employees-page space-y-5">
      <div className="admin-inbox-hero">
        <div>
          <span className="admin-page-kicker">Doanh nghiệp & Nhân sự</span>
          <h1>Nhân viên doanh nghiệp</h1>
          <p>
            Quản lý danh sách nhân sự của doanh nghiệp và phân bổ quyền lợi bảo hiểm từ đơn hàng đã mua.
          </p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="btn-tis btn-tis-ghost text-sm self-start sm:self-auto"
        >
          <i className="fas fa-download mr-2" />
          Tải template Excel
        </button>
      </div>

      <div className="chat-overview">
        <div className="admin-inbox-metric">
          <span>Doanh nghiệp đang chọn</span>
          <strong>{selectedEnt ? getEnterpriseLabel(selectedEnt) : 'Chưa chọn'}</strong>
          <small>Tìm doanh nghiệp bên dưới để mở workspace</small>
        </div>
        <div className="admin-inbox-metric is-live">
          <span>Nhân viên</span>
          <strong>{employees.length}</strong>
          <small>Nhân sự trong doanh nghiệp hiện tại</small>
        </div>
        <div className="admin-inbox-metric">
          <span>Suất còn phân bổ</span>
          <strong>{remainingCoverageSlots}</strong>
          <small>Từ đơn hàng đã duyệt hiệu lực</small>
        </div>
      </div>

      {/* Enterprise Selection card */}
      <div className="admin-card enterprise-picker-card space-y-4">
        <div className="consultation-table-head !p-0 !pb-4 !border-b">
          <div>
            <h2>Chọn doanh nghiệp</h2>
            <p>Tìm theo tên, mã số thuế hoặc số điện thoại để quản lý nhân sự và quyền lợi.</p>
          </div>
        </div>
        
        <div className="relative w-full max-w-xl" ref={dropdownRef}>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <i className="fas fa-building text-gray-400 text-sm" />
            </span>
            <input
              type="text"
              placeholder="Nhập tên doanh nghiệp, MST, số điện thoại..."
              value={entSearch}
              onChange={(e) => {
                setEntSearch(e.target.value)
                setShowEntDropdown(true)
              }}
              onFocus={() => setShowEntDropdown(true)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#D71920] focus:border-[#D71920] focus:bg-white text-xs font-medium transition-all"
            />
            {selectedEnt && (
              <button
                onClick={() => {
                  setSelectedEnt(null)
                  setEntSearch('')
                }}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fas fa-times-circle text-sm" />
              </button>
            )}
          </div>

          {/* Autocomplete list */}
          {showEntDropdown && (entSearch.trim().length > 0) && (
            <div className="absolute z-10 w-full mt-1.5 bg-white/95 backdrop-blur-md border border-gray-200/75 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100 animate-slide-up">
              {loadingEnt ? (
                <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <div className="spinner-tis !w-4 !h-4 !border-2" />
                  Đang tìm kiếm doanh nghiệp...
                </div>
              ) : enterprises.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  Không tìm thấy doanh nghiệp phù hợp
                </div>
              ) : (
                enterprises.map((ent) => (
                  <button
                    key={ent.id}
                    type="button"
                    onClick={() => handleSelectEnterprise(ent)}
                    className="w-full text-left px-4 py-3 hover:bg-red-50/40 text-xs transition flex flex-col gap-1"
                  >
                    <strong className="text-gray-800 font-bold flex items-center gap-1.5">
                      <i className="fas fa-building text-gray-400" />
                      {getEnterpriseLabel(ent)}
                    </strong>
                    <span className="text-gray-500 text-[10px] pl-5">{getEnterpriseSubtitle(ent)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {selectedEnt && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-50">
            <button
              onClick={() => openEmployeeModal()}
              className="px-4 py-2 bg-gradient-to-r from-[#D71920] to-[#f54950] hover:shadow-md hover:shadow-red-500/10 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <i className="fas fa-plus text-xs" /> Thêm nhân viên
            </button>
            <button
              onClick={() => setImportModal({ show: true, form: { order_item: '', file: null } })}
              className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <i className="fas fa-file-excel text-green-600 text-sm" /> Import Excel hàng loạt
            </button>
            <button
              onClick={loadWorkspace}
              disabled={loadingWorkspace}
              className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 ml-auto disabled:opacity-40"
            >
              <i className={`fas fa-sync ${loadingWorkspace ? 'fa-spin' : ''}`} /> Đồng bộ dữ liệu
            </button>
          </div>
        )}
      </div>

      {selectedEnt ? (
        <div className="grid grid-cols-1 gap-6">
          {/* Section 1: Employees List */}
          <div className="admin-card bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-100 bg-gradient-to-b from-white to-gray-50/20">
            <div className="p-5 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-users text-gray-500" /> Danh sách nhân viên ({employees.length})
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              {loadingWorkspace ? (
                <div className="flex justify-center items-center py-16">
                  <div className="spinner-tis" />
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs font-medium">
                  Chưa có nhân viên nào trong doanh nghiệp này. Hãy thêm mới hoặc import.
                </div>
              ) : (
                <table className="admin-table w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/70">
                      <th className="p-4 border-b border-gray-100 font-bold text-gray-500 text-[10px] uppercase tracking-wider">Họ và tên</th>
                      <th className="p-4 border-b border-gray-100 font-bold text-gray-500 text-[10px] uppercase tracking-wider">Số điện thoại</th>
                      <th className="p-4 border-b border-gray-100 font-bold text-gray-500 text-[10px] uppercase tracking-wider">Địa chỉ</th>
                      <th className="p-4 border-b border-gray-100 font-bold text-gray-500 text-[10px] uppercase tracking-wider">Gói bảo hiểm đang gắn</th>
                      <th className="p-4 border-b border-gray-100 font-bold text-gray-500 text-[10px] uppercase tracking-wider">Quyền sửa đổi</th>
                      <th className="p-4 border-b border-gray-100 font-bold text-gray-500 text-[10px] uppercase tracking-wider text-end">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-red-50/10 border-b border-gray-100 last:border-b-0 transition-colors duration-150">
                        <td className="p-4">
                          <div className="font-bold text-gray-800 text-xs">{emp.full_name}</div>
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">{emp.email || '--'}</div>
                        </td>
                        <td className="p-4 text-xs text-gray-600 font-mono font-medium">{emp.phone || '-'}</td>
                        <td className="p-4 text-xs text-gray-600 font-medium">{emp.address || '-'}</td>
                        <td className="p-4 space-y-1.5">
                          {emp.coverages && emp.coverages.length > 0 ? (
                            emp.coverages.map((cov, idx) => (
                              <div key={idx} className="bg-red-50/60 text-[#D71920] border border-red-100/60 rounded-lg p-2 text-xs shadow-sm max-w-xs">
                                <strong className="font-bold block">{cov.product_name || '-'}</strong>
                                <span className="text-[10px] text-gray-500 font-semibold font-mono block mt-1">
                                  Hạn: {formatDate(cov.start_date)} - {formatDate(cov.end_date)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 italic font-medium">Chưa gắn bảo hiểm</span>
                          )}
                        </td>
                        <td className="p-4">
                          {emp.can_edit ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-150">
                              <span className="w-1 h-1 rounded-full bg-green-500" /> Được sửa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200">
                              <span className="w-1 h-1 rounded-full bg-gray-400" /> Khóa sửa
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-end">
                          <div className="flex justify-end items-center gap-2">
                            {emp.can_edit && (
                              <button
                                onClick={() => openEmployeeModal(emp)}
                                className="w-8 h-8 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 flex items-center justify-center shadow-sm transition-all"
                                title="Sửa thông tin"
                              >
                                <i className="fas fa-pen text-[10px]" />
                              </button>
                            )}
                            <button
                              onClick={() => openCoverageModal(emp.id)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100/60 text-[#D71920] rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                            >
                              <i className="fas fa-shield-alt text-[10px]" /> Quyền lợi
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Section 2: Paid Orders */}
          <div className="admin-card bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-100 bg-gradient-to-b from-white to-gray-50/20">
            <div className="p-5 border-b border-gray-100 bg-gray-50/30">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-file-invoice-dollar text-gray-500" /> Đơn hàng doanh nghiệp đã thanh toán
              </h3>
            </div>

            <div className="overflow-x-auto">
              {loadingWorkspace ? (
                <div className="flex justify-center items-center py-12">
                  <div className="spinner-tis" />
                </div>
              ) : enterpriseOrders.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs font-medium">
                  Doanh nghiệp chưa phát sinh đơn hàng đã thanh toán.
                </div>
              ) : (
                <table className="admin-table w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/70">
                      <th className="p-4 border-b border-gray-100 font-bold text-gray-500 text-[10px] uppercase tracking-wider">Mã đơn hàng</th>
                      <th className="p-4 border-b border-gray-100 font-bold text-gray-500 text-[10px] uppercase tracking-wider">Sản phẩm (Số suất)</th>
                      <th className="p-4 border-b border-gray-100 font-bold text-gray-500 text-[10px] uppercase tracking-wider">Tổng thanh toán</th>
                      <th className="p-4 border-b border-gray-100 font-bold text-gray-500 text-[10px] uppercase tracking-wider">Trạng thái duyệt</th>
                      <th className="p-4 border-b border-gray-100 font-bold text-gray-500 text-[10px] uppercase tracking-wider">Ghi chú vận hành</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enterpriseOrders.map((order) => {
                      const approved = isOrderApproved(order)
                      const items = order.items || []

                      return (
                        <tr key={order.id} className="hover:bg-red-50/10 border-b border-gray-100 last:border-b-0 transition-colors duration-150">
                          <td className="p-4">
                            <strong className="text-gray-800 font-bold text-xs block">{order.code || `#${order.id}`}</strong>
                            <span className="text-[10px] text-gray-400 block mt-1 font-mono font-medium">
                              Ngày: {formatDate(order.payment_paid_at || order.created_at)}
                            </span>
                          </td>
                          <td className="p-4 space-y-1.5">
                            {items.map((item, idx) => (
                              <div key={idx} className="text-xs text-gray-600 font-medium">
                                <span className="text-gray-900 font-semibold">{item.product_name}</span> · <span>{item.duration}</span> · SL: <strong className="font-bold text-gray-900 bg-gray-100 border border-gray-200/80 px-1 py-0.5 rounded text-[10px]">{item.quantity} suất</strong> (Đã gắn <strong className="text-[#D71920]">{item.covered_count || 0}</strong>)
                              </div>
                            ))}
                          </td>
                          <td className="p-4 text-xs text-[#D71920] font-bold font-mono">
                            {formatMoney(order.total_amount || 0)}
                          </td>
                          <td className="p-4">
                            {approved ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-150">
                                <span className="w-1 h-1 rounded-full bg-green-500" /> Đã duyệt hiệu lực
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" /> Chờ duyệt hiệu lực
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-[11px] text-gray-400 leading-relaxed font-medium">
                            {approved ? 'Đơn hàng đủ điều kiện phân bổ bảo hiểm cho nhân viên' : 'Giao dịch chưa được leader duyệt hoặc đang xử lý. Nhân viên chưa được cấp gói bảo hiểm.'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-card p-12 text-center text-gray-400 bg-white shadow-sm rounded-xl border border-gray-100 flex flex-col items-center justify-center">
          <i className="fas fa-building text-5xl mb-4 text-gray-200" />
          <p className="text-xs max-w-sm leading-relaxed">
            Vui lòng nhập tìm kiếm và lựa chọn doanh nghiệp từ thanh công cụ ở trên để quản lý danh sách nhân sự, gắn gói bảo hiểm, hoặc thực hiện import tệp Excel.
          </p>
        </div>
      )}

      {/* Create/Edit Employee Modal */}
      {employeeModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">
                {employeeModal.id ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên doanh nghiệp'}
              </h3>
              <button
                onClick={() => setEmployeeModal(prev => ({ ...prev, show: false }))}
                className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 flex items-center justify-center"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
              <div>
                <label className="label-tis block text-xs mb-1">Họ và tên nhân viên</label>
                <input
                  type="text"
                  required
                  value={employeeModal.form.full_name}
                  onChange={(e) => setEmployeeModal({
                    ...employeeModal,
                    form: { ...employeeModal.form, full_name: e.target.value }
                  })}
                  placeholder="Nguyễn Văn A"
                  className="input-tis w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-tis block text-xs mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    required
                    value={employeeModal.form.phone}
                    onChange={(e) => setEmployeeModal({
                      ...employeeModal,
                      form: { ...employeeModal.form, phone: e.target.value }
                    })}
                    placeholder="09XXXXXXXX"
                    className="input-tis w-full font-mono"
                  />
                </div>
                <div>
                  <label className="label-tis block text-xs mb-1">Địa chỉ Email</label>
                  <input
                    type="email"
                    value={employeeModal.form.email}
                    onChange={(e) => setEmployeeModal({
                      ...employeeModal,
                      form: { ...employeeModal.form, email: e.target.value }
                    })}
                    placeholder="email@doanhnghiep.com"
                    className="input-tis w-full"
                  />
                </div>
              </div>

              <div>
                <label className="label-tis block text-xs mb-1">Địa chỉ thường trú</label>
                <input
                  type="text"
                  value={employeeModal.form.address}
                  onChange={(e) => setEmployeeModal({
                    ...employeeModal,
                    form: { ...employeeModal.form, address: e.target.value }
                  })}
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/thành..."
                  className="input-tis w-full"
                />
              </div>

              {!employeeModal.id && (
                <div>
                  <label className="label-tis block text-xs mb-1">Mật khẩu tài khoản (dành cho app di động)</label>
                  <PasswordField
                    required
                    value={employeeModal.form.password}
                    onChange={(e) => setEmployeeModal({
                      ...employeeModal,
                      form: { ...employeeModal.form, password: e.target.value }
                    })}
                    placeholder="Nhập mật khẩu ban đầu"
                    className="input-tis w-full"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEmployeeModal(prev => ({ ...prev, show: false }))}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach Insurance Coverage Modal */}
      {coverageModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Gắn gói bảo hiểm cho nhân viên</h3>
              <button
                onClick={() => setCoverageModal(prev => ({ ...prev, show: false }))}
                className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 flex items-center justify-center"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <form onSubmit={handleSaveCoverage} className="p-6 space-y-4">
              <div>
                <label className="label-tis block text-xs mb-1">Chọn gói bảo hiểm (chỉ hiện đơn đã duyệt)</label>
                <select
                  required
                  value={coverageModal.form.order_item}
                  onChange={(e) => setCoverageModal({
                    ...coverageModal,
                    form: { ...coverageModal.form, order_item: e.target.value }
                  })}
                  className="input-tis w-full"
                >
                  <option value="">-- Chọn gói bảo hiểm --</option>
                  {approvedOrderItems.map(({ order, item }) => (
                    <option key={item.id} value={item.id}>
                      {order.code} · {item.product_name} · {item.duration} (Còn {getRemainingSlots(item)} suất)
                    </option>
                  ))}
                  {approvedOrderItems.length === 0 && (
                    <option value="" disabled>Chưa có đơn đã duyệt để gắn bảo hiểm</option>
                  )}
                </select>
              </div>

              <div>
                <label className="label-tis block text-xs mb-1">Ngày bắt đầu hiệu lực</label>
                <input
                  type="date"
                  required
                  value={coverageModal.form.start_date}
                  onChange={(e) => setCoverageModal({
                    ...coverageModal,
                    form: { ...coverageModal.form, start_date: e.target.value }
                  })}
                  className="input-tis w-full font-mono text-xs"
                />
              </div>

              <div>
                <label className="label-tis block text-xs mb-1">Ghi chú điều trị / thông tin thêm</label>
                <textarea
                  value={coverageModal.form.note}
                  onChange={(e) => setCoverageModal({
                    ...coverageModal,
                    form: { ...coverageModal.form, note: e.target.value }
                  })}
                  placeholder="Ghi chú thêm về điều khoản quyền lợi hoặc thời hạn..."
                  className="input-tis w-full min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCoverageModal(prev => ({ ...prev, show: false }))}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={approvedOrderItems.length === 0}
                  className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40 transition"
                >
                  Gắn bảo hiểm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Import Excel Modal */}
      {importModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Import danh sách nhân sự từ Excel</h3>
              <button
                onClick={() => setImportModal(prev => ({ ...prev, show: false }))}
                className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 flex items-center justify-center"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <form onSubmit={handleImportEmployees} className="p-6 space-y-4">
              <div>
                <label className="label-tis block text-xs mb-1">Gắn gói bảo hiểm đồng loạt (tùy chọn)</label>
                <select
                  value={importModal.form.order_item}
                  onChange={(e) => setImportModal({
                    ...importModal,
                    form: { ...importModal.form, order_item: e.target.value }
                  })}
                  className="input-tis w-full"
                >
                  <option value="">Chỉ import nhân viên, chưa gắn bảo hiểm</option>
                  {approvedOrderItems.map(({ order, item }) => (
                    <option key={item.id} value={item.id}>
                      {order.code} · {item.product_name} · Còn {getRemainingSlots(item)} suất
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-tis block text-xs mb-1">Chọn file Excel dữ liệu (.xlsx)</label>
                <input
                  type="file"
                  required
                  accept=".xlsx, .xls"
                  onChange={(e) => setImportModal({
                    ...importModal,
                    form: { ...importModal.form, file: e.target.files[0] }
                  })}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-tis-red hover:file:bg-red-100 cursor-pointer"
                />
                <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                  Vui lòng sử dụng đúng tệp mẫu Excel do hệ thống cung cấp (tải template phía ngoài) để tránh lỗi định dạng cột dữ liệu.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setImportModal(prev => ({ ...prev, show: false }))}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition"
                >
                  Bắt đầu Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
