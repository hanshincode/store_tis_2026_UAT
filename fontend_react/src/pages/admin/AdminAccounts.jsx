import { useState, useEffect } from 'react'
import api, { fetchList, fetchOne, getErrorMessage, DOMAIN } from '@/lib/api'
import { formatMoney, formatDateTime } from '@/lib/format'
import { useAuth } from '@/context/AuthContext'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminAccounts() {
  const { user: currentUser } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // Modals
  const [detailModalUser, setDetailModalUser] = useState(null)
  const [detailOverview, setDetailOverview] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)

  const [editModalUser, setEditModalUser] = useState(null)
  const [editForm, setEditForm] = useState({
    id: '',
    phone: '',
    email: '',
    last_name: '',
    first_name: '',
    user_type: '',
    company_name: '',
    tax_code: '',
    cccd: '',
    address: ''
  })
  const [editSubmitting, setEditSubmitting] = useState(false)

  const canManageAccounts = currentUser?.is_superuser || ['super_admin', 'admin'].includes(currentUser?.role)

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const data = await fetchList('/users/')
      setAccounts(data)
    } catch (err) {
      toast.error('Không thể tải danh sách tài khoản')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const getAccountName = (user) => {
    const fullName = `${user.last_name || ''} ${user.first_name || ''}`.trim()
    if (user.user_type === 'enterprise') return user.company_name || fullName || user.phone || user.username || `#${user.id}`
    return fullName || user.phone || user.username || `#${user.id}`
  }

  const getRoleLabel = (role) => {
    return {
      super_admin: 'Super Admin',
      admin: 'Admin',
      leader: 'Leader',
      staff: 'Staff',
      customer: 'Khách hàng'
    }[role] || role || '--'
  }

  const getTypeLabel = (user) => {
    if (user.role !== 'customer') return getRoleLabel(user.role)
    return user.user_type === 'enterprise' ? 'Doanh nghiệp' : 'Cá nhân'
  }

  const getAvatarUrl = (user) => {
    if (user.avatar) {
      return user.avatar.startsWith('http') ? user.avatar : `${DOMAIN}/media/${user.avatar.replace(/^\/media\//, '')}`
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(getAccountName(user))}&background=d71920&color=fff`
  }

  // Filter accounts
  const filtered = accounts.filter(user => {
    const haystack = [
      user.username, user.phone, user.email, user.first_name, user.last_name,
      user.full_name, user.company_name, user.tax_code, getAccountName(user)
    ].join(' ').toLowerCase()
    
    const matchesSearch = haystack.includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Detail Modal Actions
  const handleOpenDetail = async (user) => {
    setDetailModalUser(user)
    setDetailLoading(true)
    setDetailOverview(null)
    try {
      const data = await fetchOne(`/users/${user.id}/account-overview/`)
      setDetailOverview(data)
    } catch (err) {
      toast.error('Không thể tải chi tiết tài khoản')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDownloadPdf = async (userId) => {
    setPdfExporting(true)
    try {
      const token = sessionStorage.getItem('access_token')
      const response = await fetch(`${api.defaults.baseURL || '/api'}/users/${userId}/terms-acceptance-pdf/`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (!response.ok) {
        throw new Error('Lỗi tải PDF')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `bien-ban-chap-nhan-dieu-khoan-${userId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Đã tải xuống biên bản PDF')
    } catch (err) {
      toast.error('Không thể xuất PDF biên bản.')
    } finally {
      setPdfExporting(false)
    }
  }

  // Edit Modal Actions
  const handleOpenEdit = (user) => {
    setEditModalUser(user)
    setEditForm({
      id: user.id,
      phone: user.phone || '',
      email: user.email || '',
      last_name: user.last_name || '',
      first_name: user.first_name || '',
      user_type: user.user_type || '',
      company_name: user.company_name || '',
      tax_code: user.tax_code || '',
      cccd: user.cccd || '',
      address: user.address || ''
    })
  }

  const handleEditChange = (field, val) => {
    setEditForm(prev => {
      const updated = { ...prev, [field]: val }
      if (field === 'user_type' && val !== 'enterprise') {
        updated.company_name = ''
        updated.tax_code = ''
      }
      return updated
    })
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    setEditSubmitting(true)
    try {
      const { id, ...payload } = editForm
      const { data } = await api.patch(`/users/${id}/`, payload)
      toast.success('Đã cập nhật tài khoản')
      setAccounts(prev => prev.map(a => a.id === id ? data : a))
      setEditModalUser(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể cập nhật tài khoản'))
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleRequireReverification = async (user) => {
    const result = await Swal.fire({
      title: 'Yêu cầu xác minh lại?',
      text: `Hệ thống sẽ khóa ${getAccountName(user)} và gửi email yêu cầu xác minh lại.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Khóa và gửi email',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#D71920',
    })
    if (!result.isConfirmed) return

    try {
      const { data } = await api.post(`/users/${user.id}/require-reverification/`)
      toast.success('Đã yêu cầu xác minh lại')
      setAccounts(prev => prev.map(a => a.id === user.id ? data.account : a))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể khóa xác minh tài khoản'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý tài khoản</h1>
          <p className="text-sm text-gray-500">Theo dõi toàn bộ account, xác minh, đơn hàng và trạng thái hoạt động.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên, SĐT, email..."
            className="input-tis py-2 px-4 text-sm w-full sm:w-64"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-tis py-2 px-4 text-sm w-full sm:w-48"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="customer">Khách hàng</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <i className="fas fa-spinner fa-spin text-3xl text-tis-red" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <i className="fas fa-users text-4xl mb-3 text-gray-300 block" />
            Không tìm thấy tài khoản phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Tài khoản</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Liên hệ</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Vai trò</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Xác minh</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Trạng thái</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Ngày tạo</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 border-b last:border-b-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getAvatarUrl(user)}
                          className="rounded-full border object-cover"
                          width="40"
                          height="40"
                          onError={e => { e.target.src = 'https://placehold.co/100x100?text=User' }}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{getAccountName(user)}</div>
                          <div className="text-xs text-gray-400 truncate">@{user.username || '--'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      <div>{user.phone || 'Chưa có SĐT'}</div>
                      <div className="text-xs text-gray-400">{user.email || 'Chưa có email'}</div>
                    </td>
                    <td className="p-4">
                      <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-full font-medium border border-gray-200">
                        {getTypeLabel(user)}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-semibold">
                      {user.email_verified ? (
                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">Đã xác minh</span>
                      ) : (
                        <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">Chưa xác minh</span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-semibold">
                      {user.is_active ? (
                        <span className="text-green-700 bg-green-100 px-2.5 py-1 rounded-full">Hoạt động</span>
                      ) : (
                        <span className="text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">Đang khóa</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-gray-500">{formatDateTime(user.date_joined)}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetail(user)}
                          title="Xem chi tiết"
                          className="btn-tis btn-tis-ghost text-xs p-2 rounded-lg text-blue-500 hover:bg-blue-50"
                        >
                          <i className="fas fa-eye" />
                        </button>
                        {canManageAccounts && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(user)}
                              title="Chỉnh sửa"
                              className="btn-tis btn-tis-ghost text-xs p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                            >
                              <i className="fas fa-edit" />
                            </button>
                            <button
                              onClick={() => handleRequireReverification(user)}
                              title="Khóa & yêu cầu xác minh lại"
                              className="btn-tis btn-tis-ghost text-xs p-2 rounded-lg text-yellow-600 hover:bg-yellow-50"
                            >
                              <i className="fas fa-user-lock" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Account Detail Modal */}
      {detailModalUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-xl overflow-hidden my-8 animate-slide-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Chi tiết tài khoản</h3>
                <p className="text-xs text-gray-500">#{detailModalUser.id} - @{detailModalUser.username}</p>
              </div>
              <button
                onClick={() => setDetailModalUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-lg" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {detailLoading ? (
                <div className="flex justify-center items-center py-20">
                  <i className="fas fa-spinner fa-spin text-2xl text-tis-red" />
                </div>
              ) : detailOverview ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Account overview card */}
                  <div className="lg:col-span-4 border rounded-2xl p-6 bg-gray-50/50 space-y-4">
                    <div className="text-center pb-4 border-b">
                      <img
                        src={getAvatarUrl(detailOverview.account)}
                        className="rounded-full border object-cover mx-auto mb-3"
                        width="80"
                        height="80"
                      />
                      <h4 className="font-bold text-gray-900">{getAccountName(detailOverview.account)}</h4>
                      <p className="text-xs text-gray-500">{getTypeLabel(detailOverview.account)}</p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">Số điện thoại</span>
                        <strong className="text-gray-800">{detailOverview.account.phone || '--'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">Email</span>
                        <strong className="text-gray-800">{detailOverview.account.email || '--'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">Mã số thuế</span>
                        <strong className="text-gray-800">{detailOverview.account.tax_code || '--'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">CCCD/CMND</span>
                        <strong className="text-gray-800">{detailOverview.account.cccd || '--'}</strong>
                      </div>
                      <div className="flex flex-col py-1 border-b border-gray-100">
                        <span className="text-gray-500 mb-0.5">Địa chỉ</span>
                        <strong className="text-gray-800">{detailOverview.account.address || '--'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">Xác minh email</span>
                        <strong className={detailOverview.account.email_verified ? 'text-green-600' : 'text-yellow-600'}>
                          {detailOverview.account.email_verified ? 'Đã xác minh' : 'Chưa xác minh'}
                        </strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">Trạng thái</span>
                        <strong className={detailOverview.account.is_active ? 'text-green-600' : 'text-red-500'}>
                          {detailOverview.account.is_active ? 'Hoạt động' : 'Đang khóa'}
                        </strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100">
                        <span className="text-gray-500">Ngày tạo</span>
                        <span className="text-gray-800 text-xs">{formatDateTime(detailOverview.account.date_joined)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Đăng nhập cuối</span>
                        <span className="text-gray-800 text-xs">{formatDateTime(detailOverview.account.last_login)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats & History */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* Stat boxes */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="border rounded-xl p-4 text-center bg-gray-50">
                        <i className="fas fa-file-invoice-dollar text-tis-red text-xl mb-1" />
                        <div className="text-[10px] text-gray-500 uppercase font-semibold">Đơn hàng</div>
                        <div className="font-bold text-gray-900 mt-1">{detailOverview.stats?.orders_count || 0}</div>
                      </div>
                      <div className="border rounded-xl p-4 text-center bg-gray-50">
                        <i className="fas fa-wallet text-tis-red text-xl mb-1" />
                        <div className="text-[10px] text-gray-500 uppercase font-semibold">Tổng giá trị</div>
                        <div className="font-bold text-gray-900 mt-1">{formatMoney(detailOverview.stats?.orders_total || 0)}</div>
                      </div>
                      <div className="border rounded-xl p-4 text-center bg-gray-50">
                        <i className="fas fa-headset text-tis-red text-xl mb-1" />
                        <div className="text-[10px] text-gray-500 uppercase font-semibold">Yêu cầu tư vấn</div>
                        <div className="font-bold text-gray-900 mt-1">{detailOverview.stats?.consultations_count || 0}</div>
                      </div>
                      <div className="border rounded-xl p-4 text-center bg-gray-50">
                        <i className="fas fa-comments text-tis-red text-xl mb-1" />
                        <div className="text-[10px] text-gray-500 uppercase font-semibold">Tin nhắn</div>
                        <div className="font-bold text-gray-900 mt-1">{detailOverview.stats?.messages_count || 0}</div>
                      </div>
                    </div>

                    {/* Orders */}
                    <div className="border rounded-xl p-4">
                      <h4 className="font-bold text-gray-900 mb-3 text-sm flex items-center">
                        <i className="fas fa-shopping-bag mr-2 text-tis-red" /> Đơn hàng gần nhất
                      </h4>
                      {detailOverview.orders?.length === 0 ? (
                        <p className="text-gray-400 text-xs italic">Chưa có đơn hàng nào.</p>
                      ) : (
                        <div className="overflow-x-auto text-xs">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b">
                                <th className="pb-2 font-semibold text-gray-500">Mã đơn</th>
                                <th className="pb-2 font-semibold text-gray-500">Ngày tạo</th>
                                <th className="pb-2 font-semibold text-gray-500">Tổng tiền</th>
                                <th className="pb-2 font-semibold text-gray-500">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailOverview.orders.map(order => (
                                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                                  <td className="py-2 font-bold text-tis-red">{order.code || `#${order.id}`}</td>
                                  <td className="py-2 text-gray-600">{formatDateTime(order.created_at)}</td>
                                  <td className="py-2 font-semibold text-gray-800">{formatMoney(order.total_amount || 0)}</td>
                                  <td className="py-2"><span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">{order.status || '--'}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Consultations */}
                    <div className="border rounded-xl p-4">
                      <h4 className="font-bold text-gray-900 mb-3 text-sm flex items-center">
                        <i className="fas fa-headset mr-2 text-tis-red" /> Yêu cầu tư vấn gần nhất
                      </h4>
                      {detailOverview.consultations?.length === 0 ? (
                        <p className="text-gray-400 text-xs italic">Chưa có yêu cầu tư vấn nào.</p>
                      ) : (
                        <div className="space-y-2">
                          {detailOverview.consultations.map(item => (
                            <div key={item.id} className="border rounded-lg p-3 text-xs flex justify-between items-start bg-gray-50/50">
                              <div>
                                <div className="font-semibold text-gray-800">#{item.id} - {item.product_name || 'Hỗ trợ tư vấn'}</div>
                                <div className="text-gray-400 mt-1">{formatDateTime(item.created_at)} · {item.customer_contact || ''}</div>
                                {item.note && <div className="text-gray-600 mt-2 bg-white p-2 rounded border">{item.note}</div>}
                              </div>
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">{item.status || '--'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Terms Record */}
                    {(detailOverview.account.registration_terms_accepted_at || detailOverview.account.registration_signature_data) ? (
                      <div className="border border-green-200 rounded-xl p-4 bg-green-50/20">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-2 border-b">
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm flex items-center">
                              <i className="fas fa-file-contract mr-2 text-green-600" /> Biên bản chấp nhận điều khoản
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">{detailOverview.account.registration_terms_title || 'Điều khoản đăng ký tài khoản'}</p>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded-full">
                              Đã ký xác nhận
                            </span>
                            <button
                              type="button"
                              disabled={pdfExporting}
                              onClick={() => handleDownloadPdf(detailOverview.account.id)}
                              className="btn-tis bg-green-600 text-white hover:bg-green-700 text-xs px-3 py-1.5 rounded-full"
                            >
                              {pdfExporting ? <i className="fas fa-spinner fa-spin mr-1" /> : <i className="fas fa-file-pdf mr-1" />}
                              Xuất PDF
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
                          <div className="border rounded bg-white p-2 text-center">
                            <span className="text-gray-400 block mb-1">Thời gian ký</span>
                            <strong className="text-gray-700">{formatDateTime(detailOverview.account.registration_terms_accepted_at)}</strong>
                          </div>
                          <div className="border rounded bg-white p-2 text-center">
                            <span className="text-gray-400 block mb-1">Phiên bản</span>
                            <strong className="text-gray-700">{detailOverview.account.registration_terms_version || '--'}</strong>
                          </div>
                          <div className="border rounded bg-white p-2 text-center">
                            <span className="text-gray-400 block mb-1">IP xác nhận</span>
                            <strong className="text-gray-700">{detailOverview.account.registration_signature_ip || '--'}</strong>
                          </div>
                        </div>

                        {detailOverview.account.registration_terms_snapshot && (
                          <div className="mb-4">
                            <label className="text-xs font-semibold text-gray-500 block mb-1">Nội dung điều khoản đã ký</label>
                            <div
                              className="max-h-32 overflow-y-auto bg-white border rounded p-3 text-[11px] text-gray-600"
                              dangerouslySetInnerHTML={{ __html: detailOverview.account.registration_terms_snapshot }}
                            />
                          </div>
                        )}

                        {detailOverview.account.registration_signature_data && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">Chữ ký xác nhận</label>
                            <div className="bg-white border rounded p-2 inline-block">
                              <img
                                src={detailOverview.account.registration_signature_data}
                                alt="Chữ ký xác nhận điều khoản"
                                className="h-16 object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="border border-dashed rounded-xl p-4 text-center text-gray-400 text-xs">
                        Tài khoản này chưa có biên bản chấp nhận điều khoản đăng ký.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setDetailModalUser(null)}
                className="btn-tis btn-tis-ghost border px-5 py-2 text-sm rounded-full"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Edit Modal */}
      {editModalUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Chỉnh sửa tài khoản</h3>
              <button
                onClick={() => setEditModalUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-tis">Số điện thoại</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => handleEditChange('phone', e.target.value)}
                      className="input-tis"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-tis">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => handleEditChange('email', e.target.value)}
                      className="input-tis"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-tis">Họ</label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => handleEditChange('last_name', e.target.value)}
                      className="input-tis"
                    />
                  </div>
                  <div>
                    <label className="label-tis">Tên</label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => handleEditChange('first_name', e.target.value)}
                      className="input-tis"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-tis">Loại khách hàng</label>
                    <select
                      value={editForm.user_type}
                      onChange={(e) => handleEditChange('user_type', e.target.value)}
                      className="input-tis"
                    >
                      <option value="">Chưa chọn</option>
                      <option value="individual">Cá nhân</option>
                      <option value="enterprise">Doanh nghiệp</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-tis">CCCD/CMND</label>
                    <input
                      type="text"
                      value={editForm.cccd}
                      onChange={(e) => handleEditChange('cccd', e.target.value)}
                      className="input-tis"
                    />
                  </div>
                </div>

                {editForm.user_type === 'enterprise' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label-tis">Tên doanh nghiệp</label>
                      <input
                        type="text"
                        value={editForm.company_name}
                        onChange={(e) => handleEditChange('company_name', e.target.value)}
                        className="input-tis"
                        required
                      />
                    </div>
                    <div>
                      <label className="label-tis">Mã số thuế</label>
                      <input
                        type="text"
                        value={editForm.tax_code}
                        onChange={(e) => handleEditChange('tax_code', e.target.value)}
                        className="input-tis"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="label-tis">Địa chỉ</label>
                  <textarea
                    value={editForm.address}
                    onChange={(e) => handleEditChange('address', e.target.value)}
                    rows="3"
                    className="input-tis"
                  />
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalUser(null)}
                  className="btn-tis btn-tis-ghost border px-5 py-2 text-sm rounded-full"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="btn-tis btn-tis-danger text-sm px-6 py-2.5"
                >
                  {editSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
