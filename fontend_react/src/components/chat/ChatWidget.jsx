import { useState } from 'react'
import api from '@/lib/api'
import { isValidVietnamPhone } from '@/lib/format'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
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
        note,
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
      <button
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="chat-launcher"
        title="Tư vấn trực tuyến"
        aria-label="Mở chat tư vấn"
      >
        <i className={`fas ${open ? 'fa-times' : 'fa-comments'} text-2xl`} />
      </button>

      {open && (
        <div className="chat-widget">
          <div className="chat-widget-head">
            <div className="flex items-center gap-3">
              <div className="chat-widget-avatar">
                <i className="fas fa-headset" />
              </div>
              <div>
                <div className="chat-widget-title">Tư vấn trực tuyến</div>
                <div className="chat-widget-status">
                  <span />
                  <span>Đang hoạt động</span>
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="chat-widget-close" aria-label="Đóng chat">
              <i className="fas fa-times" />
            </button>
          </div>

          {sent ? (
            <div className="chat-widget-success">
              <div><i className="fas fa-check" /></div>
              <strong>Đã gửi thành công</strong>
              <p>Chuyên viên sẽ liên hệ qua <b>{phone}</b> trong giây lát.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="chat-widget-form">
              <div className="chat-widget-intro">
                <strong>Để lại thông tin liên hệ</strong>
                <p>Chuyên viên TIS sẽ phản hồi sớm nhất để hỗ trợ đúng nhu cầu của bạn.</p>
              </div>

              <div className="chat-widget-fields">
                <label>
                  <span>Họ và tên</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nhập họ và tên" className="input-tis" />
                </label>
                <label>
                  <span>Số điện thoại <b>*</b></span>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Số điện thoại liên hệ" required inputMode="tel" className="input-tis" />
                </label>
                <label>
                  <span>Email</span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email nhận phản hồi" type="email" className="input-tis" />
                </label>
                <label>
                  <span>Nội dung cần tư vấn</span>
                  <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Bạn đang cần hỗ trợ về vấn đề gì?" rows={3} className="input-tis resize-none" />
                </label>
              </div>

              <button type="submit" disabled={loading} className="chat-widget-submit btn-tis-danger disabled:opacity-60">
                {loading
                  ? <><i className="fas fa-spinner fa-spin" /> Đang gửi...</>
                  : <><i className="fas fa-paper-plane" /> Bắt đầu chat</>}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  )
}
