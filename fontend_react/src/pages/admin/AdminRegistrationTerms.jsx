import { useState, useEffect } from 'react'
import api, { getErrorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import RichTextEditor from '@/components/admin/RichTextEditor'
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Premium Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-[#D71920]/45 rounded-2xl p-6 md:p-8 shadow-xl text-white animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#D71920]/10 rounded-full blur-2xl -ml-16 -mb-16"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 bg-[#D71920]/20 border border-[#D71920]/35 text-xs text-red-200 font-semibold tracking-wider rounded-full uppercase">
                System Policies
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <i className="fas fa-file-contract text-red-500" /> Quản lý Điều khoản Đăng ký
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Thiết lập tiêu đề, phiên bản và nội dung thỏa thuận sử dụng dịch vụ bắt buộc khi người dùng đăng ký tài khoản.
            </p>
          </div>
          <button
            onClick={loadTerms}
            className="self-start md:self-auto px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white text-sm font-semibold flex items-center gap-1.5 transition duration-300 shadow-md backdrop-blur-sm"
          >
            <i className="fas fa-sync-alt" /> Làm mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Editor: 8 cols */}
        <div className="lg:col-span-7 xl:col-span-8 admin-card p-6 bg-white border border-slate-100 shadow-lg rounded-2xl transition hover:shadow-xl duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-6 pb-3 border-b border-slate-100">
              <span className="w-1.5 h-6 bg-[#D71920] rounded-full"></span>
              <h3 className="text-lg font-bold text-slate-800">
                Nội dung soạn thảo điều khoản
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Tiêu đề điều khoản <span className="text-[#D71920]">*</span>
                  </label>
                  <input
                    type="text"
                    value={terms.title}
                    onChange={(e) => setTerms({ ...terms, title: e.target.value })}
                    placeholder="Điều khoản sử dụng dịch vụ"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#D71920] focus:ring-[#D71920]/10 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 transition-all outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Phiên bản <span className="text-[#D71920]">*</span>
                  </label>
                  <input
                    type="text"
                    value={terms.version}
                    onChange={(e) => setTerms({ ...terms, version: e.target.value })}
                    placeholder="1.0.0"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#D71920] focus:ring-[#D71920]/10 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 transition-all outline-none font-bold text-[#D71920]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Nội dung điều khoản <span className="text-[#D71920]">*</span>
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-[#D71920]/10 focus-within:border-[#D71920] transition-all">
                  <RichTextEditor
                    value={terms.content}
                    onChange={(content) => setTerms({ ...terms, content })}
                    placeholder="Nhập nội dung điều khoản tại đây..."
                  />
                </div>
              </div>

              {/* Toggle switch layout */}
              <div className="flex items-center p-4 bg-slate-50 border border-slate-100 rounded-xl transition-all hover:bg-slate-100/50">
                <label className="flex items-center gap-3.5 cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={terms.is_active}
                    onChange={(e) => setTerms({ ...terms, is_active: e.target.checked })}
                    className="w-5 h-5 rounded text-[#D71920] focus:ring-[#D71920]/10 border-slate-300 transition cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-700 block select-none">
                      Kích hoạt điều khoản đăng ký
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5 select-none">
                      Bắt buộc khách hàng phải tích chọn đồng ý trước khi hoàn tất đăng ký tài khoản mới.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-[#D71920] to-[#f54950] text-white font-bold rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/35 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Đang lưu điều khoản...
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

        {/* Right Preview: 4 cols */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 flex flex-col">
          <div className="admin-card p-6 bg-white border border-slate-100 shadow-lg rounded-2xl flex-grow flex flex-col transition hover:shadow-xl duration-300">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <span className="w-1.5 h-6 bg-[#D71920] rounded-full"></span>
              <h3 className="text-lg font-bold text-slate-800">
                Giao diện hiển thị thực tế
              </h3>
            </div>

            {terms.content ? (
              <div className="relative border border-slate-200 rounded-xl bg-slate-50/50 p-5 shadow-inner flex-grow flex flex-col min-h-[480px]">
                {/* Simulated Document Paper Sheet */}
                <div className="bg-white rounded-lg shadow-md border border-slate-200 p-5 flex-grow flex flex-col relative overflow-hidden select-none max-h-[500px]">
                  
                  {/* Decorative Letterhead */}
                  <div className="text-center pb-3 mb-3 border-b border-dashed border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-[#D71920] tracking-widest mb-1">
                      TIS INSURANCE BROKER
                    </div>
                    <div className="text-[9px] text-slate-400">
                      Cập nhật: {terms.updated_at ? formatDateTime(terms.updated_at) : 'Chưa cập nhật'}
                    </div>
                    
                    {/* Status stamp badge */}
                    <div className="absolute top-2 right-2">
                      {terms.is_active ? (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 rounded">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-150 border border-slate-300 rounded">
                          Bản nháp
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Document Title */}
                  <h2 className="text-sm font-extrabold text-slate-900 mb-3 text-center leading-tight">
                    {terms.title}
                  </h2>
                  
                  {/* Watermark version */}
                  <div className="absolute bottom-4 right-4 text-[42px] font-black text-slate-50 pointer-events-none select-none tracking-widest">
                    V{terms.version}
                  </div>
                  
                  {/* Scrollable contents */}
                  <div className="overflow-y-auto pr-1 flex-grow scrollbar-thin text-xs text-slate-600 leading-relaxed space-y-3 break-words rich-content">
                    <div
                      dangerouslySetInnerHTML={{ __html: terms.content }}
                    />
                  </div>
                  
                  {/* Acceptance mockup */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2 text-[10px] text-slate-400">
                    <div className="w-3.5 h-3.5 border border-[#D71920] bg-[#D71920]/5 rounded flex items-center justify-center text-[8px] text-[#D71920] mt-0.5">
                      <i className="fas fa-check" />
                    </div>
                    <div>
                      Tôi đã đọc, hiểu và đồng ý với toàn bộ nội dung của <strong>{terms.title} (Phiên bản {terms.version})</strong>.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 py-24 text-slate-450">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <i className="fas fa-file-signature text-2xl text-slate-300" />
                </div>
                <p className="text-sm font-semibold">Chưa có nội dung điều khoản</p>
                <p className="text-xs mt-1 text-slate-400">Hãy nhập thông tin & soạn thảo ở khung bên cạnh.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
