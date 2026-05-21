import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { formatDate } from '@/lib/format'
import toast from 'react-hot-toast'
import Swal from 'sweetalert2'

export default function UserDashboard() {
  const { user, fetchMe } = useAuth()

  // Profile edit state
  const [editing, setEditing] = useState(false)
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '' })
  const [saving, setSaving] = useState(false)

  // Password change state
  const [showPassword, setShowPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [changingPassword, setChangingPassword] = useState(false)

  // Stats
  const [stats, setStats] = useState({ orders: 0, pendingClaims: 0 })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
      })
    }
  }, [user])

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    setLoadingStats(true)
    try {
      const [ordersRes, claimsRes] = await Promise.allSettled([
        api.get('/orders/'),
        api.get('/claims/'),
      ])
      const orders = ordersRes.status === 'fulfilled'
        ? (Array.isArray(ordersRes.value.data) ? ordersRes.value.data : ordersRes.value.data?.results || [])
        : []
      const claims = claimsRes.status === 'fulfilled'
        ? (Array.isArray(claimsRes.value.data) ? claimsRes.value.data : claimsRes.value.data?.results || [])
        : []
      setStats({
        orders: orders.length,
        pendingClaims: claims.filter(c => c.status === 'pending' || c.status === 'submitted').length,
      })
    } catch {
      // silently fail stats
    } finally {
      setLoadingStats(false)
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch('/users/me/', profileForm)
      await fetchMe()
      toast.success('Cập nhật hồ sơ thành công!')
      setEditing(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể cập nhật hồ sơ.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (passwordForm.new_password.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.')
      return
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Mật khẩu xác nhận không khớp.')
      return
    }
    setChangingPassword(true)
    try {
      await api.post('/change-password/', {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      })
      toast.success('Đổi mật khẩu thành công!')
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
      setShowPassword(false)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể đổi mật khẩu. Vui lòng kiểm tra mật khẩu cũ.'))
    } finally {
      setChangingPassword(false)
    }
  }

  function getRoleLabel(role) {
    const map = {
      customer: 'Khách hàng',
      admin: 'Quản trị viên',
      super_admin: 'Super Admin',
      staff: 'Nhân viên',
      leader: 'Trưởng nhóm',
    }
    return map[role] || role || 'Khách hàng'
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner-tis" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ của tôi</h1>
        <p className="text-gray-500 text-sm mt-1">Quản lý thông tin cá nhân và bảo mật tài khoản</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="admin-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <i className="fas fa-file-invoice text-xl" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {loadingStats ? <span className="skeleton inline-block w-8 h-6" /> : stats.orders}
            </p>
            <p className="text-xs text-gray-500">Đơn hàng</p>
          </div>
        </div>

        <div className="admin-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <i className="fas fa-clock text-xl" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {loadingStats ? <span className="skeleton inline-block w-8 h-6" /> : stats.pendingClaims}
            </p>
            <p className="text-xs text-gray-500">Yêu cầu bồi thường đang chờ</p>
          </div>
        </div>

        <div className="admin-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <i className="fas fa-calendar-check text-xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {user.date_joined ? formatDate(user.date_joined) : '—'}
            </p>
            <p className="text-xs text-gray-500">Ngày tham gia</p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">
            <i className="fas fa-user-circle text-tis-red mr-2" />
            Thông tin cá nhân
          </h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-tis btn-tis-outline text-sm px-4 py-2">
              <i className="fas fa-pen" /> Chỉnh sửa
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-tis">Họ</label>
                <input
                  value={profileForm.last_name}
                  onChange={e => setProfileForm(f => ({ ...f, last_name: e.target.value }))}
                  className="input-tis"
                  placeholder="Nguyễn"
                />
              </div>
              <div>
                <label className="label-tis">Tên</label>
                <input
                  value={profileForm.first_name}
                  onChange={e => setProfileForm(f => ({ ...f, first_name: e.target.value }))}
                  className="input-tis"
                  placeholder="Văn A"
                />
              </div>
            </div>
            <div>
              <label className="label-tis">Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                className="input-tis"
                placeholder="email@example.com"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-tis btn-tis-danger px-6 py-2.5">
                {saving ? <><i className="fas fa-spinner fa-spin mr-2" />Đang lưu...</> : <><i className="fas fa-check mr-2" />Lưu thay đổi</>}
              </button>
              <button type="button" onClick={() => { setEditing(false); setProfileForm({ first_name: user.first_name || '', last_name: user.last_name || '', email: user.email || '' }) }} className="btn-tis btn-tis-ghost px-6 py-2.5">
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-tis-red to-tis-red-dark text-white flex items-center justify-center text-3xl font-bold flex-shrink-0 shadow-lg">
              {(user.first_name || user.last_name || 'U')[0].toUpperCase()}
            </div>
            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 flex-1">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Họ và tên</p>
                <p className="text-gray-900 font-medium">{user.last_name} {user.first_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Số điện thoại</p>
                <p className="text-gray-900 font-medium">{user.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Email</p>
                <p className="text-gray-900 font-medium">{user.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Vai trò</p>
                <span className="badge-tis badge-tis-info">{getRoleLabel(user.role)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            <i className="fas fa-lock text-tis-red mr-2" />
            Đổi mật khẩu
          </h2>
          {!showPassword && (
            <button onClick={() => setShowPassword(true)} className="btn-tis btn-tis-outline text-sm px-4 py-2">
              <i className="fas fa-key" /> Đổi mật khẩu
            </button>
          )}
        </div>

        {showPassword ? (
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="label-tis">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={passwordForm.old_password}
                onChange={e => setPasswordForm(f => ({ ...f, old_password: e.target.value }))}
                className="input-tis"
                placeholder="Nhập mật khẩu hiện tại"
                required
              />
            </div>
            <div>
              <label className="label-tis">Mật khẩu mới</label>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))}
                className="input-tis"
                placeholder="Tối thiểu 6 ký tự"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="label-tis">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={e => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))}
                className="input-tis"
                placeholder="Nhập lại mật khẩu mới"
                required
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={changingPassword} className="btn-tis btn-tis-danger px-6 py-2.5">
                {changingPassword ? <><i className="fas fa-spinner fa-spin mr-2" />Đang xử lý...</> : <><i className="fas fa-shield-alt mr-2" />Đổi mật khẩu</>}
              </button>
              <button type="button" onClick={() => { setShowPassword(false); setPasswordForm({ old_password: '', new_password: '', confirm_password: '' }) }} className="btn-tis btn-tis-ghost px-6 py-2.5">
                Hủy
              </button>
            </div>
          </form>
        ) : (
          <p className="text-gray-500 text-sm">
            Đổi mật khẩu định kỳ giúp bảo vệ tài khoản của bạn an toàn hơn.
          </p>
        )}
      </div>
    </div>
  )
}
