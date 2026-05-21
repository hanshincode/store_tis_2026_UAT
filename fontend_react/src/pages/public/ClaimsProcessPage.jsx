import { useState } from 'react'
import { Link } from 'react-router-dom'

/* ─── Steps Data ────────────────────────────────────────────────────────── */
const STEPS = [
  {
    icon: 'fa-bullhorn',
    title: 'Thông báo sự cố',
    description:
      'Ngay khi sự cố xảy ra, Quý khách vui lòng liên hệ TIS Broker qua hotline hoặc email để thông báo. Chuyên viên bồi thường sẽ hướng dẫn các bước ban đầu nhằm giảm thiểu thiệt hại và bảo vệ hiện trường.',
    tips: [
      'Gọi hotline 24/7: 0901 234 567',
      'Gửi email: claims@tisbroker.com',
      'Chụp ảnh hiện trường (nếu có thể)',
    ],
  },
  {
    icon: 'fa-folder-open',
    title: 'Nộp hồ sơ bồi thường',
    description:
      'Thu thập và nộp đầy đủ hồ sơ theo yêu cầu: đơn yêu cầu bồi thường, hợp đồng bảo hiểm, biên bản sự cố, hóa đơn/chứng từ liên quan. TIS Broker sẽ hỗ trợ kiểm tra và hoàn thiện hồ sơ trước khi gửi đến công ty bảo hiểm.',
    tips: [
      'Đơn yêu cầu bồi thường (mẫu sẵn)',
      'Bản sao hợp đồng / giấy chứng nhận bảo hiểm',
      'Biên bản sự cố, ảnh chụp, báo cáo công an (nếu cần)',
      'Hóa đơn, chứng từ thiệt hại',
    ],
  },
  {
    icon: 'fa-magnifying-glass-chart',
    title: 'Thẩm định & Xử lý',
    description:
      'Công ty bảo hiểm tiến hành thẩm định hồ sơ, giám định thiệt hại thực tế. TIS Broker đại diện cho Quý khách theo dõi tiến độ, đàm phán với bên bảo hiểm để đảm bảo quyền lợi được chi trả hợp lý và nhanh chóng.',
    tips: [
      'Giám định viên có thể liên hệ khảo sát thực tế',
      'TIS Broker đàm phán bảo vệ quyền lợi khách hàng',
      'Thời gian thẩm định: 7-15 ngày làm việc',
    ],
  },
  {
    icon: 'fa-money-check-dollar',
    title: 'Thanh toán bồi thường',
    description:
      'Sau khi thẩm định xong, công ty bảo hiểm ra quyết định bồi thường và thanh toán cho Quý khách theo phương thức chuyển khoản. TIS Broker theo dõi đến khi tiền được thanh toán đầy đủ.',
    tips: [
      'Thanh toán qua chuyển khoản ngân hàng',
      'Thời gian thanh toán: 5-10 ngày sau duyệt',
      'TIS Broker xác nhận hoàn tất hồ sơ',
    ],
  },
  {
    icon: 'fa-headset',
    title: 'Hỗ trợ sau bồi thường',
    description:
      'TIS Broker tiếp tục hỗ trợ Quý khách trong các vấn đề phát sinh sau bồi thường: tái tục hợp đồng, điều chỉnh quyền lợi, hoặc tư vấn giảm thiểu rủi ro tương lai.',
    tips: [
      'Tư vấn tái tục với điều kiện tối ưu',
      'Rà soát và nâng cấp chương trình bảo hiểm',
    ],
  },
]

/* ─── FAQ Data ──────────────────────────────────────────────────────────── */
const FAQS = [
  {
    question: 'Thời hạn thông báo sự cố là bao lâu?',
    answer:
      'Quý khách nên thông báo trong vòng 24-48 giờ kể từ khi sự cố xảy ra. Đối với một số loại hình bảo hiểm, thời hạn thông báo có thể khác nhau theo điều khoản hợp đồng. Liên hệ TIS Broker ngay để được hướng dẫn cụ thể.',
  },
  {
    question: 'Cần chuẩn bị những giấy tờ gì khi yêu cầu bồi thường?',
    answer:
      'Thông thường cần: đơn yêu cầu bồi thường, bản sao hợp đồng bảo hiểm, biên bản sự cố hoặc báo cáo công an, ảnh chụp thiệt hại, hóa đơn sửa chữa/thay thế. TIS Broker sẽ cung cấp danh mục chi tiết phù hợp với từng trường hợp.',
  },
  {
    question: 'Bao lâu thì nhận được tiền bồi thường?',
    answer:
      'Thời gian trung bình từ 15-30 ngày làm việc kể từ khi hồ sơ đầy đủ. Đối với các vụ phức tạp có thể lâu hơn. TIS Broker cam kết theo sát tiến độ và đẩy nhanh quá trình xử lý.',
  },
  {
    question: 'TIS Broker hỗ trợ những gì trong quá trình bồi thường?',
    answer:
      'TIS Broker hỗ trợ toàn diện: hướng dẫn thu thập hồ sơ, kiểm tra tính hợp lệ, đại diện làm việc với công ty bảo hiểm, đàm phán quyền lợi, và theo dõi đến khi thanh toán hoàn tất. Dịch vụ hoàn toàn miễn phí cho khách hàng.',
  },
  {
    question: 'Trường hợp nào không được bồi thường?',
    answer:
      'Các trường hợp loại trừ thường bao gồm: sự cố do cố ý, chiến tranh, vũ khí hạt nhân, hao mòn tự nhiên, hoặc các trường hợp cụ thể ghi trong điều khoản loại trừ của hợp đồng. Liên hệ TIS Broker để được rà soát trước khi mua bảo hiểm.',
  },
]

/* ─── Timeline Step Component ───────────────────────────────────────────── */
function TimelineStep({ step, index, isLast }) {
  return (
    <div className="relative flex gap-6 md:gap-8">
      {/* Timeline Line & Dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-12 h-12 rounded-xl bg-tis-red text-white flex items-center justify-center shadow-lg shadow-red-200 z-10">
          <i className={`fas ${step.icon} text-lg`} />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-tis-red/40 to-gray-200 mt-2" />
        )}
      </div>

      {/* Content */}
      <div className={`pb-12 ${isLast ? 'pb-0' : ''}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold text-tis-red bg-red-50 px-2.5 py-1 rounded-full">
            Bước {index + 1}
          </span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed mb-4 max-w-xl">
          {step.description}
        </p>
        {step.tips && step.tips.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            {step.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <i className="fas fa-check-circle text-green-500 mt-0.5 flex-shrink-0" />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── FAQ Accordion Item ────────────────────────────────────────────────── */
function FaqItem({ faq, isOpen, toggle }) {
  return (
    <div className={`card-tis overflow-hidden transition-all ${isOpen ? 'ring-1 ring-tis-red/20' : ''}`}>
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-bold text-gray-900 text-sm pr-4 flex items-start gap-3">
          <i className={`fas fa-circle-question text-tis-red mt-0.5 flex-shrink-0`} />
          {faq.question}
        </span>
        <i className={`fas fa-chevron-down text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-tis-red' : ''}`} />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: isOpen ? 300 : 0, opacity: isOpen ? 1 : 0 }}
      >
        <div className="px-5 pb-5 pl-14 text-gray-500 text-sm leading-relaxed">
          {faq.answer}
        </div>
      </div>
    </div>
  )
}

/* ─── ClaimsProcessPage ─────────────────────────────────────────────────── */
export default function ClaimsProcessPage() {
  const [openFaq, setOpenFaq] = useState(0)

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? -1 : index)
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ── */}
      <section className="bg-gradient-to-br from-[#D71920] to-[#b01418] text-white py-20 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />

        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          {/* Breadcrumb */}
          <nav className="text-sm text-white/60 mb-6 flex items-center gap-2">
            <Link to="/" className="hover:text-white transition-colors">
              <i className="fas fa-home mr-1" />Trang chủ
            </Link>
            <span>/</span>
            <span className="text-white font-medium">Quy trình bồi thường</span>
          </nav>

          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <i className="fas fa-file-invoice-dollar text-xl" />
              </div>
              <span className="text-white/70 text-sm font-semibold uppercase tracking-wider">Claims Process</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              Quy trình bồi thường bảo hiểm
            </h1>
            <p className="text-white/80 text-lg leading-relaxed">
              TIS Broker đồng hành cùng Quý khách trong toàn bộ quy trình bồi thường — từ thông báo sự cố đến khi nhận được thanh toán đầy đủ.
            </p>
            <div className="flex items-center gap-4 mt-8">
              <a
                href="tel:0901234567"
                className="btn-tis bg-white text-tis-red hover:bg-gray-100 px-7 py-3 text-sm font-bold"
              >
                <i className="fas fa-phone-alt mr-2" />Hotline bồi thường
              </a>
              <Link
                to="/contact"
                className="btn-tis bg-white/10 border border-white/30 text-white hover:bg-white/20 px-7 py-3 text-sm font-bold backdrop-blur-sm"
              >
                <i className="fas fa-paper-plane mr-2" />Gửi yêu cầu
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Timeline Section ── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-14">
            <div className="section-kicker justify-center">Quy trình</div>
            <h2 className="section-title">Các bước bồi thường</h2>
            <p className="text-gray-500 mt-2 max-w-xl mx-auto">
              Quy trình minh bạch, rõ ràng giúp Quý khách yên tâm khi cần bảo hiểm chi trả
            </p>
            <div className="divider-red mx-auto mt-3" />
          </div>

          <div className="max-w-2xl mx-auto">
            {STEPS.map((step, i) => (
              <TimelineStep
                key={i}
                step={step}
                index={i}
                isLast={i === STEPS.length - 1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Benefits ── */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: 'fa-clock', title: '24/7 Tiếp nhận', desc: 'Hotline bồi thường hoạt động liên tục, sẵn sàng hỗ trợ mọi lúc' },
              { icon: 'fa-shield-halved', title: 'Bảo vệ quyền lợi', desc: 'Đàm phán chuyên nghiệp với công ty bảo hiểm, đảm bảo chi trả công bằng' },
              { icon: 'fa-hand-holding-dollar', title: 'Miễn phí dịch vụ', desc: 'Chi phí hỗ trợ bồi thường đã bao gồm trong phí bảo hiểm' },
              { icon: 'fa-chart-line', title: 'Theo dõi trực tuyến', desc: 'Cập nhật tiến độ hồ sơ bồi thường qua hệ thống TIS' },
            ].map((item, i) => (
              <div key={i} className="card-tis p-6 text-center hover:-translate-y-1 transition-transform duration-200">
                <div className="w-12 h-12 rounded-xl bg-red-50 text-tis-red flex items-center justify-center mx-auto mb-4">
                  <i className={`fas ${item.icon} text-xl`} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">{item.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <div className="section-kicker justify-center">FAQ</div>
            <h2 className="section-title">Câu hỏi thường gặp</h2>
            <p className="text-gray-500 mt-2">
              Giải đáp các thắc mắc phổ biến về quy trình bồi thường bảo hiểm
            </p>
            <div className="divider-red mx-auto mt-3" />
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <FaqItem
                key={i}
                faq={faq}
                isOpen={openFaq === i}
                toggle={() => toggleFaq(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-20 bg-gradient-to-br from-[#D71920] to-[#b01418]">
        <div className="container mx-auto px-4 max-w-4xl text-center text-white">
          <i className="fas fa-headset text-5xl mb-6 opacity-80" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Cần hỗ trợ bồi thường?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto leading-relaxed">
            Đội ngũ chuyên viên bồi thường TIS Broker sẵn sàng hỗ trợ Quý khách 24/7. Liên hệ ngay để được tư vấn miễn phí.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/contact"
              className="btn-tis bg-white text-tis-red hover:bg-gray-100 px-8 py-3 font-bold text-sm"
            >
              <i className="fas fa-paper-plane mr-2" />Liên hệ ngay
            </Link>
            <a
              href="tel:0901234567"
              className="btn-tis bg-white/10 border border-white/30 text-white hover:bg-white/20 px-8 py-3 font-bold text-sm"
            >
              <i className="fas fa-phone-alt mr-2" />0901 234 567
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
