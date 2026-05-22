import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { getErrorMessage } from '@/lib/api'
import { isValidVietnamPhone } from '@/lib/format'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Swal from 'sweetalert2'
import { COMPANY_CONTACT_CHANNELS, COMPANY_EMAIL } from '@/lib/company'

const OFFICE_ADDRESS = '71 Hoàng Văn Thái, Khu đô thị Phú Mỹ Hưng, Tân Mỹ, Hồ Chí Minh 700000, Việt Nam'
const OFFICE_MAP_URL = 'https://maps.app.goo.gl/ZtRXvADGdMeqetCQ8'
const OFFICE_MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(OFFICE_ADDRESS)}&output=embed`

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

/* ─── Validation Schema ─────────────────────────────────────────────────── */
const contactSchema = z.object({
  name: z.string().min(2, 'Vui lòng nhập họ tên (ít nhất 2 ký tự)'),
  phone: z.string().min(1, 'Vui lòng nhập số điện thoại').refine(
    v => isValidVietnamPhone(v),
    'Số điện thoại không hợp lệ'
  ),
  email: z.string().min(1, 'Vui lòng nhập email để nhận xác nhận').email('Email không hợp lệ'),
  note: z.string().max(1000, 'Nội dung tối đa 1000 ký tự').optional(),
})

/* ─── Contact Info Item ─────────────────────────────────────────────────── */
function InfoItem({ icon, title, children }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl bg-red-50 text-tis-red flex items-center justify-center flex-shrink-0">
        <i className={`fas ${icon} text-lg`} />
      </div>
      <div>
        <div className="font-bold text-gray-900 text-sm mb-0.5">{title}</div>
        <div className="text-gray-500 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

/* ─── ContactPage ───────────────────────────────────────────────────────── */
export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', phone: '', email: '', note: '' },
  })

  const onSubmit = async (formData) => {
    setSubmitting(true)
    try {
      const { data: result } = await api.post('/consultations/', {
        customer_name: formData.name,
        customer_contact: formData.phone,
        email: formData.email,
        note: formData.note || '',
        send_customer_email: true,
      })
      reset()
      const safeName = escapeHtml(formData.name)
      const safePhone = escapeHtml(formData.phone)
      const safeEmail = escapeHtml(formData.email)
      const safeNote = escapeHtml(formData.note || 'Không có')
      const emailNotice = result?.customer_email_sent
        ? 'Email xác nhận đã được gửi tới địa chỉ bạn cung cấp.'
        : 'Yêu cầu đã được ghi nhận. Email xác nhận sẽ được gửi khi hệ thống email hoạt động.'
      Swal.fire({
        icon: 'success',
        title: 'Gửi thành công!',
        html: `<div class="text-left"><p>Cảm ơn <b>${safeName}</b> đã liên hệ.</p><p class="text-sm text-gray-500 mt-2">Chuyên viên TIS sẽ phản hồi qua <b>${safePhone}</b> trong thời gian sớm nhất.</p><div class="mt-3 rounded-lg bg-gray-50 p-3 text-sm"><div><b>Email:</b> ${safeEmail}</div><div><b>Nội dung:</b> ${safeNote}</div></div><p class="text-xs text-gray-400 mt-2">${escapeHtml(emailNotice)}</p></div>`,
        confirmButtonColor: '#D71920',
        confirmButtonText: 'Hoàn tất',
      })
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gửi thất bại',
        text: getErrorMessage(err, 'Không thể gửi yêu cầu. Vui lòng thử lại sau.'),
        confirmButtonColor: '#D71920',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#D71920] to-[#b01418] text-white py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-white/60 mb-4 flex items-center gap-2">
            <Link to="/" className="hover:text-white transition-colors">
              <i className="fas fa-home mr-1" />Trang chủ
            </Link>
            <span>/</span>
            <span className="text-white font-medium">Liên hệ</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Liên hệ với chúng tôi</h1>
          <p className="text-white/80 max-w-xl">
            Hãy để lại thông tin, đội ngũ chuyên viên TIS Broker sẽ tư vấn và hỗ trợ bạn nhanh nhất.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 max-w-7xl py-12">
        <div className="grid lg:grid-cols-5 gap-10">
          {/* ── Left: Contact Info ── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-tis p-7 space-y-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                <i className="fas fa-building text-tis-red mr-2" />
                TIS Insurance Broker
              </h2>

              <InfoItem icon="fa-map-marker-alt" title="Địa chỉ">
                {OFFICE_ADDRESS}
              </InfoItem>

              <InfoItem icon="fa-phone-alt" title="Điện thoại">
                <a href="tel:02839111222" className="hover:text-tis-red transition-colors">
                  (028) 3911 1222
                </a>
                <br />
                <a href="tel:0901234567" className="hover:text-tis-red transition-colors">
                  Hotline: 0901 234 567
                </a>
              </InfoItem>

              <InfoItem icon="fa-envelope" title="Email">
                <a href={`mailto:${COMPANY_EMAIL}`} className="hover:text-tis-red transition-colors">
                  {COMPANY_EMAIL}
                </a>
              </InfoItem>

              <InfoItem icon="fa-clock" title="Giờ làm việc">
                Thứ 2 – Thứ 6: 08:00 – 17:30<br />
                Thứ 7: 08:00 – 12:00<br />
                <span className="text-gray-400 text-xs">Chủ nhật & Lễ: Nghỉ</span>
              </InfoItem>
            </div>

            {/* Social Links */}
            <div className="card-tis p-6">
              <h3 className="font-bold text-gray-900 text-sm mb-4">Kết nối với TIS</h3>
              <div className="flex items-center gap-3">
                {COMPANY_CONTACT_CHANNELS.map((s) => (
                  <a
                    key={s.key}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-10 h-10 rounded-full bg-gray-100 ${s.className} hover:text-white text-gray-500 flex items-center justify-center transition-all`}
                    title={s.label}
                  >
                    <i className={`${s.icon} text-sm`} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Contact Form ── */}
          <div className="lg:col-span-3">
            <div className="card-tis p-7 md:p-9 relative overflow-hidden transition-all hover:shadow-xl duration-300">
              {/* Premium top accent line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D71920] to-[#f54950]" />
              
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D71920]/10 to-[#f54950]/5 text-[#D71920] flex items-center justify-center flex-shrink-0 shadow-sm border border-[#D71920]/10">
                  <i className="fas fa-paper-plane text-lg" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 leading-tight">Gửi yêu cầu tư vấn</h2>
                  <p className="text-xs text-gray-400 mt-1">Chuyên viên sẽ liên hệ với bạn sau</p>
                </div>
              </div>
              
              <div className="h-px bg-slate-100 my-5" />

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Họ và tên <span className="text-[#D71920]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <i className="far fa-user text-sm" />
                    </span>
                    <input
                      {...register('name')}
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${errors.name ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : 'border-slate-200 focus:border-[#D71920] focus:ring-[#D71920]/10'} rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 transition-all outline-none`}
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1 font-medium"><i className="fas fa-exclamation-circle mr-1" />{errors.name.message}</p>
                  )}
                </div>

                {/* Phone & Email Row */}
                <div className="grid md:grid-cols-2 gap-5">
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                      Số điện thoại <span className="text-[#D71920]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i className="fas fa-phone-alt text-sm" />
                      </span>
                      <input
                        {...register('phone')}
                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${errors.phone ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : 'border-slate-200 focus:border-[#D71920] focus:ring-[#D71920]/10'} rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 transition-all outline-none`}
                        placeholder="09xx xxx xxx"
                        inputMode="tel"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1 font-medium"><i className="fas fa-exclamation-circle mr-1" />{errors.phone.message}</p>
                    )}
                  </div>
                  
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                      Email <span className="text-[#D71920]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <i className="far fa-envelope text-sm" />
                      </span>
                      <input
                        {...register('email')}
                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : 'border-slate-200 focus:border-[#D71920] focus:ring-[#D71920]/10'} rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 transition-all outline-none`}
                        placeholder="email@gmail.com"
                        type="email"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1 font-medium"><i className="fas fa-exclamation-circle mr-1" />{errors.email.message}</p>
                    )}
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Nội dung tin nhắn</label>
                  <div className="relative">
                    <span className="absolute top-3 left-0 pl-3.5 flex items-start text-slate-400 pointer-events-none">
                      <i className="far fa-edit text-sm" />
                    </span>
                    <textarea
                      {...register('note')}
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${errors.note ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-[#D71920] focus:ring-[#D71920]/10'} rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-4 transition-all outline-none resize-none`}
                      rows={5}
                      placeholder="Mô tả yêu cầu bảo hiểm hoặc câu hỏi của bạn..."
                    />
                  </div>
                  {errors.note && (
                    <p className="text-red-500 text-xs mt-1 font-medium"><i className="fas fa-exclamation-circle mr-1" />{errors.note.message}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#D71920] to-[#f54950] text-white font-bold rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/35 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 transition-all duration-200 flex items-center justify-center gap-2 mt-4 text-sm cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2" />Đang gửi...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane mr-2" />Gửi yêu cầu tư vấn
                    </>
                  )}
                </button>

                <p className="text-xs text-slate-400 text-center mt-3">
                  <i className="fas fa-lock mr-1" />
                  Thông tin của bạn được bảo mật theo{' '}
                  <Link to="/terms" className="text-[#D71920] hover:underline font-semibold">chính sách bảo mật</Link>
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* ── Map ── */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fas fa-map-location-dot text-tis-red mr-2" />
            Vị trí văn phòng
          </h2>
          <div className="card-tis overflow-hidden">
            <div className="relative">
              <iframe
                title="TIS Insurance Broker location"
                src={OFFICE_MAP_EMBED_URL}
                className="block w-full border-0"
                style={{ height: 350 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <div className="absolute left-4 right-4 bottom-4 md:right-auto max-w-md rounded-xl border border-gray-100 bg-white/95 p-4 shadow-lg backdrop-blur">
                <p className="text-gray-900 font-bold">TIS Insurance Broker</p>
                <p className="text-gray-500 text-sm mt-1">{OFFICE_ADDRESS}</p>
                <a
                  href={OFFICE_MAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-tis-outline text-xs px-4 py-2 mt-3"
                >
                  <i className="fas fa-directions mr-1" />Chỉ đường
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
