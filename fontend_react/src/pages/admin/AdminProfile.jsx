import { useState, useEffect } from 'react'
import api, { getValidImageUrl, getErrorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'

export default function AdminProfile() {
  const { logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Form profile state
  const [form, setForm] = useState({
    username: '',
    phone: '',
    first_name: '',
    last_name: '',
    email: '',
    cccd: '',
    user_type: '',
    company_name: '',
    tax_code: '',
    address: '',
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  // Form password state
  const [passwords, setPasswords] = useState({
    old: '',
    new: '',
    confirm: '',
  })

  const loadProfile = async () => {
    setLoading(true)
    try {
      const user = await api.get('/users/me/')
      const data = user.data
      setProfile(data)
      setForm({
        username: data.username || '',
        phone: data.phone || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        cccd: data.cccd || '',
        user_type: data.user_type || '',
        company_name: data.company_name || '',
        tax_code: data.tax_code || '',
        address: data.address || '',
      })
      setAvatarPreview(data.avatar ? getValidImageUrl(data.avatar) : '')
    } catch {
      toast.error('Lỗi tải thông tin tài khoản')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const getDisplayName = (user) => {
    if (!user) return ''
    return (
      user.full_name ||
      `${user.last_name || ''} ${user.first_name || ''}`.trim() ||
      user.username ||
      user.phone ||
      'TIS Admin'
    )
  }

  const getRoleLabel = (user) => {
    if (!user) return ''
    if (user.is_superuser || user.role === 'super_admin') return 'Super Admin'
    if (user.role === 'admin') return 'Admin'
    if (user.role === 'leader') return 'Leader'
    if (user.role === 'staff') return 'Staff'
    return 'Khách hàng'
  }

  const getUserTypeLabel = (user) => {
    if (!user) return ''
    if (user.user_type === 'enterprise') return 'Doanh nghiệp'
    if (user.user_type === 'individual') return 'Cá nhân'
    return 'Chưa cấu hình'
  }

  const getAvatarLetter = (user) => {
    const name = getDisplayName(user)
    return name ? name.charAt(0).toUpperCase() : 'T'
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    if (!profile) return

    setSavingProfile(true)
    try {
      const fd = new FormData()
      fd.append('phone', form.phone.trim())
      fd.append('first_name', form.first_name.trim())
      fd.append('last_name', form.last_name.trim())
      fd.append('email', form.email.trim())
      fd.append('cccd', form.cccd.trim())
      fd.append('address', form.address.trim())

      if (profile.role === 'customer') {
        fd.append('user_type', form.user_type)
        fd.append('company_name', form.company_name.trim())
        fd.append('tax_code', form.tax_code.trim())
      }

      if (avatarFile) {
        fd.append('avatar', avatarFile)
      }

      const res = await api.patch(`/users/${profile.id}/`, fd)
      setProfile(res.data)
      toast.success('Cập nhật thông tin cá nhân thành công!')
      setAvatarFile(null)
      loadProfile()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Lỗi cập nhật thông tin.'))
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!passwords.old || !passwords.new || !passwords.confirm) {
      toast.error('Vui lòng nhập đầy đủ thông tin mật khẩu')
      return
    }
    if (passwords.new !== passwords.confirm) {
      toast.error('Mật khẩu xác nhận không khớp!')
      return
    }
    if (passwords.new.length < 6) {
      toast.error('Mật khẩu mới phải dài từ 6 ký tự!')
      return
    }

    setSavingPassword(true)
    try {
      await api.post('/users/set_password/', {
        current_password: passwords.old,
        new_password: passwords.new,
      })

      Swal.fire({
        icon: 'success',
        title: 'Thành công',
        text: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.',
        confirmButtonColor: '#D71920',
      }).then(() => {
        logout()
      })
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: getErrorMessage(err, 'Không thể đổi mật khẩu.'),
        confirmButtonColor: '#D71920',
      })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner-tis" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thông tin cá nhân</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý và cập nhật thông tin tài khoản của bạn</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Summary Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="admin-card text-center flex flex-col items-center">
            {/* Avatar */}
            <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-red-500/20 bg-gray-100 flex items-center justify-center font-bold text-3xl text-gray-500 mb-4">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                getAvatarLetter(profile)
              )}
            </div>

            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {getDisplayName(profile)}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{profile?.email || profile?.phone || '--'}</p>
            <span className="inline-block mt-3 px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-100">
              {getRoleLabel(profile)}
            </span>

            {/* Micro Stats */}
            <div className="w-full grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100 text-left">
              <div>
                <span className="text-[11px] font-bold text-gray-400 block uppercase">Email</span>
                <span className="text-xs text-gray-700 font-semibold mt-0.5 block">
                  {profile?.email_verified ? 'Đã xác minh' : 'Chưa xác minh'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 block uppercase">Đăng nhập cuối</span>
                <span className="text-xs text-gray-700 font-semibold mt-0.5 block truncate" title={formatDateTime(profile?.last_login)}>
                  {profile?.last_login ? new Date(profile.last_login).toLocaleDateString('vi-VN') : '--'}
                </span>
              </div>
            </div>
          </div>

          <div className="admin-card">
            <h3 className="font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 text-sm uppercase tracking-wider text-gray-500">
              Thông tin chi tiết
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Tên tài khoản:</span>
                <strong className="text-gray-900">{profile?.username || '--'}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Số điện thoại:</span>
                <strong className="text-gray-900">{profile?.phone || '--'}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Email nhận tin:</span>
                <strong className="text-gray-900 truncate max-w-[180px]">{profile?.email || '--'}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Loại người dùng:</span>
                <strong className="text-gray-900">{getUserTypeLabel(profile)}</strong>
              </div>
              {profile?.user_type === 'enterprise' && (
                <>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Tên công ty:</span>
                    <strong className="text-gray-900">{profile.company_name || '--'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-50">
                    <span className="text-gray-500">Mã số thuế:</span>
                    <strong className="text-gray-900">{profile.tax_code || '--'}</strong>
                  </div>
                </>
              )}
              <div className="flex flex-col py-1">
                <span className="text-gray-500">Địa chỉ liên hệ:</span>
                <strong className="text-gray-900 mt-1 whitespace-pre-line leading-relaxed">
                  {profile?.address || 'Chưa cập nhật'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Edit Form / Password Change */}
        <div className="lg:col-span-8 space-y-6">
          {/* Edit Profile Info */}
          <div className="admin-card">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
              Cập nhật thông tin cá nhân
            </h2>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">Tên đăng nhập</label>
                  <input
                    type="text"
                    disabled
                    value={form.username}
                    className="input-tis w-full bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input-tis w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">Họ và tên đệm</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="input-tis w-full"
                  />
                </div>

                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">Tên</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="input-tis w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">Địa chỉ Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-tis w-full"
                  />
                </div>

                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">Số CCCD / Hộ chiếu</label>
                  <input
                    type="text"
                    value={form.cccd}
                    onChange={(e) => setForm({ ...form, cccd: e.target.value })}
                    className="input-tis w-full"
                  />
                </div>
              </div>

              {profile?.role === 'customer' && (
                <div className="border-t border-gray-100 pt-4 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="label-tis block text-sm font-semibold mb-1">Loại tài khoản</label>
                      <select
                        value={form.user_type}
                        onChange={(e) => setForm({ ...form, user_type: e.target.value })}
                        className="input-tis w-full"
                      >
                        <option value="">Chưa chọn</option>
                        <option value="individual">Cá nhân</option>
                        <option value="enterprise">Doanh nghiệp</option>
                      </select>
                    </div>

                    {form.user_type === 'enterprise' && (
                      <>
                        <div className="md:col-span-1">
                          <label className="label-tis block text-sm font-semibold mb-1">Tên doanh nghiệp</label>
                          <input
                            type="text"
                            value={form.company_name}
                            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                            className="input-tis w-full"
                          />
                        </div>
                        <div>
                          <label className="label-tis block text-sm font-semibold mb-1">Mã số thuế</label>
                          <input
                            type="text"
                            value={form.tax_code}
                            onChange={(e) => setForm({ ...form, tax_code: e.target.value })}
                            className="input-tis w-full"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">Địa chỉ liên hệ</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="input-tis w-full text-sm"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">Hình ảnh đại diện</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    id="prof-avatar-file"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="prof-avatar-file"
                    className="px-4 py-2 border border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition text-xs font-semibold text-gray-600 flex items-center"
                  >
                    <i className="fas fa-camera mr-1.5 text-red-500" /> Chọn ảnh mới
                  </label>
                  {avatarFile && (
                    <span className="text-xs text-gray-400">Đã chọn: {avatarFile.name}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={loadProfile}
                  className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Nhập lại
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn-tis-danger text-sm min-w-[120px] flex items-center justify-center"
                >
                  {savingProfile ? (
                    <>
                      <div className="spinner-tis !w-4 !h-4 !border-2 !border-white mr-2" />
                      Đang lưu
                    </>
                  ) : (
                    'Lưu thông tin'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="admin-card">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
              Thay đổi mật khẩu đăng nhập
            </h2>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  required
                  value={passwords.old}
                  onChange={(e) => setPasswords({ ...passwords, old: e.target.value })}
                  placeholder="••••••••"
                  className="input-tis w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">Mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự"
                    className="input-tis w-full"
                  />
                </div>

                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    placeholder="Xác nhận khớp mật khẩu mới"
                    className="input-tis w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="btn-tis-danger text-sm min-w-[140px] flex items-center justify-center"
                >
                  {savingPassword ? (
                    <>
                      <div className="spinner-tis !w-4 !h-4 !border-2 !border-white mr-2" />
                      Đang xử lý
                    </>
                  ) : (
                    'Thay đổi mật khẩu'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
