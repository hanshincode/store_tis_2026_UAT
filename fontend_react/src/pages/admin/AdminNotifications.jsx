import { useState, useEffect } from 'react'
import api, { fetchList, getErrorMessage } from '@/lib/api'
import { formatDateTime, normalizeList } from '@/lib/format'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const emptyForm = {
    title: '',
    message: '',
    link_url: '',
    audience: 'all', // all, customers, internal
    is_active: true,
  }
  const [form, setForm] = useState(emptyForm)

  const loadData = async () => {
    setLoading(true)
    try {
      // original used /notifications/?include_all=1
      const data = await fetchList('/notifications/?include_all=1')
      setNotifications(normalizeList(data))
    } catch {
      toast.error('Không thể tải danh sách thông báo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề thông báo')
      return
    }
    if (!form.message.trim()) {
      toast.error('Vui lòng nhập nội dung thông báo')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/notifications/', {
        title: form.title.trim(),
        message: form.message.trim(),
        link_url: form.link_url.trim() || null,
        audience: form.audience,
        is_active: form.is_active,
      })
      toast.success('Gửi thông báo thành công!')
      setForm(emptyForm)
      loadData()
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: getErrorMessage(err, 'Không thể gửi thông báo.'),
        confirmButtonColor: '#D71920',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getAudienceLabel = (aud) => {
    switch (aud) {
      case 'all':
        return 'Tất cả người dùng'
      case 'customers':
        return 'Chỉ khách hàng'
      case 'internal':
        return 'Nội bộ (Nhân viên)'
      default:
        return aud
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thông báo hệ thống</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tạo và gửi thông báo tới người dùng ứng dụng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-5">
          <div className="admin-card">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
              Gửi thông báo mới
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Nhập tiêu đề thông báo"
                  className="input-tis w-full"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Nội dung <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Nhập nội dung chi tiết thông báo..."
                  className="input-tis w-full text-sm"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Đường dẫn liên kết (Tùy chọn)
                </label>
                <input
                  type="url"
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="https://example.com/details"
                  className="input-tis w-full text-sm"
                />
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">Đối tượng nhận</label>
                <select
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  className="input-tis w-full text-sm"
                >
                  <option value="all">Tất cả người dùng</option>
                  <option value="customers">Khách hàng</option>
                  <option value="internal">Nhân sự nội bộ</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="notif-active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded text-red-600 focus:ring-red-500 h-4 w-4 border-gray-300"
                />
                <label htmlFor="notif-active" className="text-sm font-semibold text-gray-700 select-none">
                  Kích hoạt hiển thị lập tức
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-tis-danger w-full text-sm py-2.5 flex items-center justify-center font-bold"
                >
                  {submitting ? (
                    <>
                      <div className="spinner-tis !w-4 !h-4 !border-2 !border-white mr-2" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane mr-2" /> Gửi thông báo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: History List */}
        <div className="lg:col-span-7">
          <div className="admin-card">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
              <span>Lịch sử thông báo</span>
              <button
                onClick={loadData}
                disabled={loading}
                className="text-gray-400 hover:text-red-500 transition text-sm flex items-center gap-1 font-medium"
              >
                <i className={`fas fa-sync-alt ${loading ? 'animate-spin' : ''}`} /> Tải lại
              </button>
            </h2>

            {loading ? (
              <div className="py-12 text-center">
                <div className="spinner-tis" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <i className="far fa-bell-slash text-4xl mb-3" />
                <p>Chưa có thông báo nào được gửi.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border border-gray-100 rounded-lg hover:border-gray-200 hover:shadow-sm transition bg-white"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">
                          {item.title || 'Không có tiêu đề'}
                        </h3>
                        <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-2">
                          <span>
                            <i className="far fa-calendar-alt mr-1" />
                            {formatDateTime(item.created_at)}
                          </span>
                          <span>•</span>
                          <span className="font-medium text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">
                            {getAudienceLabel(item.audience)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          item.is_active
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {item.is_active ? 'Đang bật' : 'Tắt'}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mt-3 whitespace-pre-wrap leading-relaxed">
                      {item.message}
                    </p>

                    {item.link_url && (
                      <div className="mt-3 text-xs flex items-center gap-1.5 text-red-600 hover:underline">
                        <i className="fas fa-link text-[10px]" />
                        <a href={item.link_url} target="_blank" rel="noopener noreferrer">
                          {item.link_url}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
