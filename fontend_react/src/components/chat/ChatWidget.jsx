import { useState } from 'react'
import api from '@/lib/api'
import { isValidVietnamPhone } from '@/lib/format'

export default function ChatWidget() {
  const [open, setOpen]       = useState(false)
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [email, setEmail]     = useState('')
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValidVietnamPhone(phone)) {
      alert('Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng Việt Nam.')
      return
    }
    setLoading(true)
    try {
      await api.post('/consultations/', {
        customer_name: name,
        customer_contact: phone,
        email: email || undefined,
        note: note,
      })
      setSent(true)
      setTimeout(() => {
        setOpen(false)
        setSent(false)
        setName('')
        setPhone('')
        setEmail('')
        setNote('')
      }, 3000)
    } catch {
      alert('Lỗi kết nối, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Launcher Button */}
      <button
        onClick={() => setOpen(!open)}
        className="chat-launcher"
        title="Tư vấn trực tuyến"
        aria-label="Mở chat tư vấn"
      >
        <i className={`fas ${open ? 'fa-times' : 'fa-comments'} text-2xl`} />
      </button>

      {/* Widget Panel */}
      {open && (
        <div className="chat-widget">
          {/* Header */}
          <div className="bg-tis-red text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-headset text-white" />
              </div>
              <div>
                <div className="font-semibold text-sm">Tư vấn trực tuyến</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-white/80 text-xs">Đang hoạt động</span>
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Body */}
          {sent ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-check text-green-500 text-2xl" />
              </div>
              <p className="font-semibold text-gray-800 mb-1">Đã gửi thành công!</p>
              <p className="text-gray-400 text-sm">Chuyên viên sẽ liên hệ qua <strong>{phone}</strong> trong giây lát.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <p className="text-gray-500 text-xs">Vui lòng để lại thông tin, chúng tôi hỗ trợ bạn sớm nhất.</p>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Họ và tên"
                className="input-tis text-sm py-2"
              />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Số điện thoại *"
                required
                inputMode="tel"
                className="input-tis text-sm py-2"
              />
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                className="input-tis text-sm py-2"
              />
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Bạn cần tư vấn về vấn đề gì?"
                rows={2}
                className="input-tis text-sm py-2 resize-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-tis-danger w-full text-sm py-2.5 disabled:opacity-60"
              >
                {loading
                  ? <><i className="fas fa-spinner fa-spin mr-2" />Đang gửi...</>
                  : <><i className="fas fa-paper-plane mr-2" />Bắt đầu chat</>
                }
              </button>
            </form>
          )}
        </div>
      )}
    </>
  )
}
