import { useState, useEffect } from 'react'
import api, { fetchList, getErrorMessage } from '@/lib/api'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'
import PasswordField from '@/components/ui/PasswordField'

export default function AdminStaff() {
  const [staffUsers, setStaffUsers] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)

  // Add form state
  const [addForm, setAddForm] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role: 'staff',
    manager: '',
    specialized_categories: []
  })
  const [addSubmitting, setAddSubmitting] = useState(false)

  // Edit / Role Rules state
  const [editForm, setEditForm] = useState({
    id: '',
    full_name: '',
    role: 'staff',
    manager: '',
    is_active: true,
    specialized_categories: []
  })
  const [editSubmitting, setEditSubmitting] = useState(false)

  const ROLE_META = {
    super_admin: { label: 'Super Admin', badge: 'bg-gray-900 text-white' },
    admin: { label: 'Admin', badge: 'bg-red-100 text-red-800 border border-red-200' },
    leader: { label: 'Leader', badge: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
    staff: { label: 'Staff', badge: 'bg-blue-100 text-blue-800 border border-blue-200' },
    claim: { label: 'Claim', badge: 'bg-cyan-100 text-cyan-800 border border-cyan-200' },
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [staffData, catsData] = await Promise.all([
        fetchList('/users/staff-list/'),
        fetchList('/categories/')
      ])
      setStaffUsers(staffData)
      setCategories(catsData)
    } catch (err) {
      toast.error('Không thể tải dữ liệu nhân sự')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleToggleStatus = async (id) => {
    try {
      await api.post(`/users/${id}/toggle-status/`)
      toast.success('Đã cập nhật trạng thái hoạt động')
      setStaffUsers(prev => prev.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể cập nhật trạng thái'))
    }
  }

  const handleAddCategoryChange = (catId, checked) => {
    setAddForm(prev => {
      const current = prev.specialized_categories
      const updated = checked 
        ? [...current, catId] 
        : current.filter(id => id !== catId)
      return { ...prev, specialized_categories: updated }
    })
  }

  const handleEditCategoryChange = (catId, checked) => {
    setEditForm(prev => {
      const current = prev.specialized_categories
      const updated = checked 
        ? [...current, catId] 
        : current.filter(id => id !== catId)
      return { ...prev, specialized_categories: updated }
    })
  }

  const handleCreateStaff = async (e) => {
    e.preventDefault()
    if (['leader', 'staff'].includes(addForm.role) && addForm.specialized_categories.length === 0) {
      toast.error('Vui lòng chọn ít nhất một danh mục phân quyền')
      return
    }

    setAddSubmitting(true)
    try {
      await api.post('/users/create-staff/', addForm)
      toast.success('Đã tạo tài khoản nhân sự mới')
      setShowAddModal(false)
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tạo tài khoản nhân sự'))
    } finally {
      setAddSubmitting(false)
    }
  }

  const handleOpenEditRole = (user) => {
    setEditForm({
      id: user.id,
      full_name: user.full_name || user.username || '',
      role: ['leader', 'admin', 'claim', 'staff'].includes(user.role) ? user.role : 'staff',
      manager: user.manager || '',
      is_active: !!user.is_active,
      specialized_categories: user.specialized_categories || []
    })
    setShowRoleModal(true)
  }

  const handleSaveRoleRules = async (e) => {
    e.preventDefault()
    if (['leader', 'staff'].includes(editForm.role) && editForm.specialized_categories.length === 0) {
      toast.error('Leader/Staff cần ít nhất một danh mục phân quyền')
      return
    }

    setEditSubmitting(true)
    try {
      const { id, role, is_active, manager, specialized_categories } = editForm
      await api.patch(`/users/${id}/role-rules/`, {
        role,
        is_active,
        manager,
        specialized_categories
      })
      toast.success('Đã cập nhật phân quyền nhân sự')
      setShowRoleModal(false)
      loadData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể lưu phân quyền'))
    } finally {
      setEditSubmitting(false)
    }
  }

  const leaders = staffUsers.filter(u => u.role === 'leader' && u.is_active)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phân quyền nhân sự</h1>
          <p className="text-sm text-gray-500">Admin quản lý vai trò và danh mục phụ trách cho Leader/Staff/Claim.</p>
        </div>
        <button
          onClick={() => {
            setAddForm({
              username: '',
              full_name: '',
              email: '',
              password: '',
              role: 'staff',
              manager: '',
              specialized_categories: []
            })
            setShowAddModal(true)
          }}
          className="btn-tis btn-tis-danger text-sm"
        >
          <i className="fas fa-user-plus mr-2" />
          Thêm nhân sự
        </button>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <i className="fas fa-spinner fa-spin text-3xl text-tis-red" />
          </div>
        ) : staffUsers.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <i className="fas fa-user-tie text-4xl mb-3 text-gray-300 block" />
            Chưa có nhân sự nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Tài khoản</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Họ tên</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Email</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Vai trò</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Phụ trách</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm">Trạng thái</th>
                  <th className="p-4 border-b font-semibold text-gray-700 text-sm text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {staffUsers.map(user => {
                  const roleMeta = ROLE_META[user.role] || { label: user.role, badge: 'bg-gray-100 text-gray-800' }
                  const isSuper = user.is_superuser || user.role === 'super_admin'
                  const specializedNames = user.specialized_category_names || []

                  return (
                    <tr key={user.id} className="hover:bg-gray-50 border-b last:border-b-0">
                      <td className="p-4 font-semibold text-gray-900">{user.username || user.phone}</td>
                      <td className="p-4 text-sm text-gray-700">{user.full_name || 'Chưa cập nhật'}</td>
                      <td className="p-4 text-sm text-gray-600">{user.email || '--'}</td>
                      <td className="p-4 text-xs font-semibold">
                        <span className={`px-2.5 py-1 rounded-full ${roleMeta.badge}`}>
                          {roleMeta.label}
                        </span>
                      </td>
                      <td className="p-4 text-xs max-w-xs">
                        {isSuper ? (
                          <span className="text-gray-400 italic">Toàn quyền hệ thống</span>
                        ) : user.role === 'claim' ? (
                          <span className="text-gray-400 italic">Xử lý bồi thường</span>
                        ) : specializedNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {specializedNames.map((name, i) => (
                              <span key={i} className="bg-gray-100 border text-gray-700 px-2 py-0.5 rounded">
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-red-500 italic">Chưa phân danh mục</span>
                        )}
                      </td>
                      <td className="p-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={user.is_active}
                            disabled={isSuper}
                            onChange={() => handleToggleStatus(user.id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-tis-red disabled:opacity-50"></div>
                        </label>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          disabled={isSuper}
                          onClick={() => handleOpenEditRole(user)}
                          className="btn-tis btn-tis-ghost text-xs text-blue-600 hover:bg-blue-50"
                        >
                          <i className="fas fa-user-shield mr-1" />
                          Phân quyền
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

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Thêm nhân sự mới</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times text-lg" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="label-tis">Tài khoản SĐT</label>
                <input
                  type="text"
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  placeholder="SĐT đăng nhập"
                  className="input-tis"
                  required
                />
              </div>

              <div>
                <label className="label-tis">Họ tên nhân viên</label>
                <input
                  type="text"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="input-tis"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-tis">Email nội bộ</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="ten@tisbroker.com"
                    className="input-tis"
                  />
                </div>
                <div>
                  <label className="label-tis">Mật khẩu</label>
                  <PasswordField
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    placeholder="******"
                    className="input-tis"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label-tis">Vai trò</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value, specialized_categories: [] })}
                  className="input-tis"
                >
                  <option value="staff">Staff - Chat và tạo bill</option>
                  <option value="claim">Claim - Xử lý bồi thường</option>
                  <option value="leader">Leader - Phân công staff theo danh mục</option>
                  <option value="admin">Admin - Toàn quyền hệ thống</option>
                </select>
              </div>

              {addForm.role === 'staff' && leaders.length > 0 && (
                <div>
                  <label className="label-tis">Leader quản lý</label>
                  <select
                    value={addForm.manager}
                    onChange={(e) => setAddForm({ ...addForm, manager: e.target.value })}
                    className="input-tis"
                  >
                    <option value="">Chọn leader quản lý...</option>
                    {leaders.map(l => (
                      <option key={l.id} value={l.id}>{l.full_name || l.username}</option>
                    ))}
                  </select>
                </div>
              )}

              {['leader', 'staff'].includes(addForm.role) && (
                <div className="border rounded-xl p-4 bg-gray-50 space-y-2">
                  <span className="label-tis">Danh mục phân quyền</span>
                  <p className="text-[11px] text-gray-500">Chọn danh mục nghiệp vụ nhân sự phụ trách</p>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {categories.map(cat => (
                      <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addForm.specialized_categories.includes(cat.id)}
                          onChange={(e) => handleAddCategoryChange(cat.id, e.target.checked)}
                          className="w-4 h-4 accent-tis-red"
                        />
                        {cat.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex justify-end gap-3 bg-white">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-tis btn-tis-ghost border px-5 py-2 text-sm rounded-full"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="btn-tis btn-tis-danger text-sm px-6 py-2.5"
                >
                  {addSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role/Rules Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Phân quyền / Vai trò</h3>
                <p className="text-xs text-gray-500">{editForm.full_name}</p>
              </div>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times text-lg" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleRules} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="label-tis">Vai trò</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value, specialized_categories: [] })}
                  className="input-tis"
                >
                  <option value="staff">Staff - Chat và tạo bill</option>
                  <option value="claim">Claim - Xử lý bồi thường</option>
                  <option value="leader">Leader - Phân công staff theo danh mục</option>
                  <option value="admin">Admin - Toàn quyền hệ thống</option>
                </select>
              </div>

              {editForm.role === 'staff' && leaders.length > 0 && (
                <div>
                  <label className="label-tis">Leader quản lý</label>
                  <select
                    value={editForm.manager}
                    onChange={(e) => setEditForm({ ...editForm, manager: e.target.value })}
                    className="input-tis"
                  >
                    <option value="">Chọn leader quản lý...</option>
                    {leaders.map(l => (
                      <option key={l.id} value={l.id}>{l.full_name || l.username}</option>
                    ))}
                  </select>
                </div>
              )}

              {['leader', 'staff'].includes(editForm.role) && (
                <div className="border rounded-xl p-4 bg-gray-50 space-y-2">
                  <span className="label-tis">Danh mục phụ trách</span>
                  <p className="text-[11px] text-gray-500">Leader quản lý danh mục; Staff chat/tạo bill trong phạm vi.</p>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {categories.map(cat => (
                      <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.specialized_categories.includes(cat.id)}
                          onChange={(e) => handleEditCategoryChange(cat.id, e.target.checked)}
                          className="w-4 h-4 accent-tis-red"
                        />
                        {cat.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="w-4 h-4 accent-tis-red cursor-pointer"
                />
                <label htmlFor="edit-is-active" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Tài khoản đang hoạt động
                </label>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3 bg-white">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="btn-tis btn-tis-ghost border px-5 py-2 text-sm rounded-full"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="btn-tis btn-tis-danger text-sm px-6 py-2.5"
                >
                  {editSubmitting ? 'Đang lưu...' : 'Lưu phân quyền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
