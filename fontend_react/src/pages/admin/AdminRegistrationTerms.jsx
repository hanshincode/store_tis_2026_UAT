import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

export default function AdminRegistrationTerms() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [terms, setTerms] = useState({
    title: 'Điều khoản đăng ký tài khoản',
    version: '1.0',
    content: '',
    is_active: true,
    updated_at: '',
  })

  const loadTerms = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/registration-terms/current/')
      setTerms({
        title: data.title || 'Điều khoản đăng ký tài khoản',
        version: data.version || '1.0',
        content: data.content || '',
        is_active: data.is_active !== false,
        updated_at: data.updated_at || '',
      })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể tải điều khoản đăng ký.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTerms()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!terms.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề điều khoản.')
      return
    }
    if (!terms.version.trim()) {
      toast.error('Vui lòng nhập phiên bản điều khoản.')
      return
    }
    if (!terms.content.trim()) {
      toast.error('Vui lòng nhập nội dung điều khoản.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: terms.title.trim(),
        version: terms.version.trim(),
        content: terms.content,
        is_active: terms.is_active,
      }

      const { data } = await api.patch('/registration-terms/current/', payload)
      setTerms({
        title: data.title,
        version: data.version,
        content: data.content,
        is_active: data.is_active !== false,
        updated_at: data.updated_at,
      })
      toast.success('Đã lưu điều khoản đăng ký thành công.')
    } catch (err) {
      Swal.fire('Lỗi', getErrorMessage(err, 'Không thể lưu điều khoản đăng ký.'), 'error')
    } finally {
      setSaving(false)
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <i className="fas fa-file-contract text-red-500" /> Quản lý Điều khoản Đăng ký
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Thiết lập tiêu đề, phiên bản và nội dung thỏa thuận đăng ký tài khoản (hỗ trợ mã HTML)
          </p>
        </div>
        <button
          onClick={loadTerms}
          className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-700 text-sm hover:bg-gray-50 flex items-center gap-1 transition"
        >
          <i className="fas fa-sync-alt" /> Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Form Editor */}
        <div className="admin-card p-6 bg-white shadow-sm rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
              Nội dung soạn thảo điều khoản
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="label-tis block text-sm font-semibold mb-1">
                    Tiêu đề điều khoản <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={terms.title}
                    onChange={(e) => setTerms({ ...terms, title: e.target.value })}
                    placeholder="Điều khoản sử dụng dịch vụ"
                    className="input-tis w-full"
                    required
                  />
                </div>

                <div>
                  <label className="label-tis block text-sm font-semibold mb-1">
                    Phiên bản <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={terms.version}
                    onChange={(e) => setTerms({ ...terms, version: e.target.value })}
                    placeholder="1.0.0"
                    className="input-tis w-full font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label-tis block text-sm font-semibold mb-1">
                  Nội dung điều khoản (Hỗ trợ HTML) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={terms.content}
                  onChange={(e) => setTerms({ ...terms, content: e.target.value })}
                  placeholder="Nhập nội dung điều khoản..."
                  rows={12}
                  className="input-tis w-full font-mono text-xs leading-relaxed"
                  required
                />
                <span className="text-xs text-gray-400 mt-1 block">
                  Sử dụng các thẻ HTML cơ bản (như &lt;p&gt;, &lt;h3&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;) để căn chỉnh định dạng văn bản.
                </span>
              </div>

              <div className="flex items-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={terms.is_active}
                    onChange={(e) => setTerms({ ...terms, is_active: e.target.checked })}
                    className="rounded text-red-500 focus:ring-red-500 h-4.5 w-4.5"
                  />
                  <span className="text-sm text-gray-700 font-semibold select-none">
                    Kích hoạt hiển thị khi khách hàng đăng ký tài khoản
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-tis-danger px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm"
                >
                  {saving ? (
                    <>
                      <div className="spinner-tis !w-4 !h-4 !border-2 !border-white" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save" /> Lưu điều khoản
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Preview */}
        <div className="space-y-6 flex flex-col">
          <div className="admin-card p-6 bg-white shadow-sm rounded-xl flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b w-full">
              <h3 className="text-lg font-bold text-gray-800">
                Giao diện hiển thị thực tế
              </h3>
              <div className="text-right text-xs text-gray-400">
                <p>Cập nhật: {terms.updated_at ? formatDateTime(terms.updated_at) : 'Chưa có thông tin'}</p>
                <p>Phiên bản: <strong className="text-red-500">{terms.version}</strong></p>
              </div>
            </div>

            {terms.content ? (
              <div className="border rounded-lg bg-gray-50 p-4 overflow-y-auto max-h-[460px] flex-grow select-none">
                <h2 className="text-lg font-bold text-gray-900 mb-3 text-center">
                  {terms.title}
                </h2>
                <div
                  dangerouslySetInnerHTML={{ __html: terms.content }}
                  className="prose prose-sm max-w-none text-xs text-gray-700 leading-relaxed break-words"
                />
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center border border-dashed rounded-lg bg-gray-50/50 py-24 text-gray-400">
                <i className="fas fa-eye-slash text-4xl mb-2" />
                <p className="text-xs">Chưa có nội dung điều khoản để hiển thị.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
