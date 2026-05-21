import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchList } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { COMPANY_EMAIL, COMPANY_LINKEDIN_URL, COMPANY_ZALO_URL } from '@/lib/company'

/* ─── Default Content Sections ──────────────────────────────────────────── */
const DEFAULT_SECTIONS = [
  {
    id: 'gioi-thieu',
    title: 'Giới thiệu',
    icon: 'fa-info-circle',
    content: `
      <p>Chào mừng Quý khách đến với TIS Insurance Broker ("TIS Broker", "chúng tôi"). Bằng việc truy cập và sử dụng website này, Quý khách đồng ý tuân thủ và chịu ràng buộc bởi các Điều khoản sử dụng dưới đây.</p>
      <p>TIS Broker là đơn vị môi giới bảo hiểm được cấp phép hoạt động tại Việt Nam, chuyên tư vấn và cung cấp giải pháp bảo hiểm cho cá nhân và doanh nghiệp.</p>
      <p>Các điều khoản này có hiệu lực kể từ ngày Quý khách truy cập website và sẽ được cập nhật định kỳ. Phiên bản mới nhất luôn được đăng tải tại trang này.</p>
    `,
  },
  {
    id: 'dieu-khoan-su-dung',
    title: 'Điều khoản sử dụng',
    icon: 'fa-file-contract',
    content: `
      <h4>1.1. Quyền truy cập</h4>
      <p>Quý khách được phép truy cập, xem và in nội dung từ website này cho mục đích cá nhân, phi thương mại. Không được sao chép, phân phối hoặc sử dụng nội dung cho mục đích thương mại khi chưa có sự đồng ý bằng văn bản.</p>
      <h4>1.2. Tài khoản người dùng</h4>
      <p>Khi đăng ký tài khoản, Quý khách có trách nhiệm:</p>
      <ul>
        <li>Cung cấp thông tin chính xác, đầy đủ và cập nhật</li>
        <li>Bảo mật thông tin đăng nhập, mật khẩu</li>
        <li>Chịu trách nhiệm cho mọi hoạt động diễn ra trên tài khoản</li>
        <li>Thông báo ngay cho TIS Broker nếu phát hiện truy cập trái phép</li>
      </ul>
      <h4>1.3. Hành vi bị cấm</h4>
      <p>Quý khách không được:</p>
      <ul>
        <li>Sử dụng website cho mục đích bất hợp pháp</li>
        <li>Cung cấp thông tin sai lệch hoặc gây nhầm lẫn</li>
        <li>Can thiệp vào hoạt động kỹ thuật của website</li>
        <li>Thu thập thông tin người dùng khác trái phép</li>
      </ul>
    `,
  },
  {
    id: 'chinh-sach-bao-mat',
    title: 'Chính sách bảo mật',
    icon: 'fa-shield-halved',
    content: `
      <h4>2.1. Thông tin thu thập</h4>
      <p>Chúng tôi thu thập các thông tin cần thiết khi Quý khách:</p>
      <ul>
        <li>Đăng ký tài khoản: họ tên, email, số điện thoại</li>
        <li>Yêu cầu tư vấn: thông tin liên hệ, nhu cầu bảo hiểm</li>
        <li>Đặt mua sản phẩm: thông tin thanh toán, địa chỉ</li>
        <li>Truy cập website: cookies, IP, thông tin thiết bị</li>
      </ul>
      <h4>2.2. Mục đích sử dụng</h4>
      <p>Thông tin được sử dụng để:</p>
      <ul>
        <li>Cung cấp dịch vụ tư vấn và sản phẩm bảo hiểm</li>
        <li>Xử lý đơn hàng và yêu cầu bồi thường</li>
        <li>Gửi thông báo, tin tức liên quan (khi được đồng ý)</li>
        <li>Cải thiện chất lượng dịch vụ và trải nghiệm người dùng</li>
      </ul>
      <h4>2.3. Bảo vệ thông tin</h4>
      <p>TIS Broker cam kết áp dụng các biện pháp bảo mật tiêu chuẩn ngành để bảo vệ thông tin cá nhân, bao gồm mã hóa SSL, kiểm soát truy cập, và sao lưu dữ liệu định kỳ.</p>
    `,
  },
  {
    id: 'quyen-va-nghia-vu',
    title: 'Quyền và nghĩa vụ',
    icon: 'fa-scale-balanced',
    content: `
      <h4>3.1. Quyền của khách hàng</h4>
      <ul>
        <li>Được tư vấn minh bạch, trung thực về sản phẩm bảo hiểm</li>
        <li>Được bảo mật thông tin cá nhân theo quy định</li>
        <li>Được hỗ trợ trong quá trình yêu cầu bồi thường</li>
        <li>Được yêu cầu chỉnh sửa hoặc xóa thông tin cá nhân</li>
        <li>Được khiếu nại nếu không hài lòng với dịch vụ</li>
      </ul>
      <h4>3.2. Nghĩa vụ của khách hàng</h4>
      <ul>
        <li>Cung cấp thông tin chính xác và đầy đủ</li>
        <li>Thanh toán đúng hạn các khoản phí bảo hiểm</li>
        <li>Thông báo kịp thời khi có sự cố hoặc thay đổi</li>
        <li>Tuân thủ điều khoản hợp đồng bảo hiểm</li>
      </ul>
      <h4>3.3. Trách nhiệm của TIS Broker</h4>
      <ul>
        <li>Tư vấn phù hợp với nhu cầu và khả năng tài chính</li>
        <li>Đàm phán quyền lợi tốt nhất cho khách hàng</li>
        <li>Hỗ trợ toàn diện trong quy trình bồi thường</li>
        <li>Bảo mật thông tin và tuân thủ pháp luật</li>
      </ul>
    `,
  },
  {
    id: 'lien-he',
    title: 'Liên hệ',
    icon: 'fa-envelope',
    content: `
      <p>Nếu Quý khách có bất kỳ câu hỏi nào về Điều khoản sử dụng hoặc Chính sách bảo mật, vui lòng liên hệ:</p>
      <div style="background:#f8f9fa;padding:20px;border-radius:12px;margin:16px 0">
        <p><strong>TIS Insurance Broker</strong></p>
        <p>📍 Lầu 5, Tòa nhà Pax Sky, 123 Nguyễn Đình Chiểu, Q.3, TP.HCM</p>
        <p>📞 Hotline: <a href="tel:0901234567">0901 234 567</a></p>
        <p>📧 Email: <a href="mailto:${COMPANY_EMAIL}">${COMPANY_EMAIL}</a></p>
        <p>🔗 LinkedIn: <a href="${COMPANY_LINKEDIN_URL}">${COMPANY_LINKEDIN_URL}</a></p>
        <p>💬 Zalo: <a href="${COMPANY_ZALO_URL}">${COMPANY_ZALO_URL}</a></p>
      </div>
      <p><em>Cập nhật lần cuối: Tháng 5, 2026</em></p>
    `,
  },
]

/* ─── Loading Skeleton ──────────────────────────────────────────────────── */
function TermsSkeleton() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b py-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="skeleton h-4 w-40 mb-4" />
          <div className="skeleton h-8 w-80 mb-2" />
          <div className="skeleton h-4 w-64" />
        </div>
      </div>
      <div className="container mx-auto px-4 max-w-7xl py-10">
        <div className="grid lg:grid-cols-[280px_1fr] gap-10">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-10 w-full rounded-xl" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── TermsPage ─────────────────────────────────────────────────────────── */
export default function TermsPage() {
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState(DEFAULT_SECTIONS[0].id)
  const sectionRefs = useRef({})

  // Try to fetch from API first, fallback to hardcoded content
  useEffect(() => {
    fetchList('/site-pages/?slug=terms')
      .then(list => {
        if (list.length > 0) {
          setPage(list[0])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Scroll tracking for active TOC item
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY + 150
      let current = DEFAULT_SECTIONS[0].id

      DEFAULT_SECTIONS.forEach(section => {
        const el = sectionRefs.current[section.id]
        if (el && el.offsetTop <= scrollTop) {
          current = section.id
        }
      })

      setActiveSection(current)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => {
    const el = sectionRefs.current[id]
    if (el) {
      window.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' })
    }
  }

  if (loading) return <TermsSkeleton />

  // If we got CMS content, render it simply
  const useCmsContent = page && page.content

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b py-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <nav className="text-sm text-gray-400 mb-3 flex items-center gap-2">
            <Link to="/" className="hover:text-tis-red transition-colors">
              <i className="fas fa-home mr-1" />Trang chủ
            </Link>
            <span>/</span>
            <span className="text-gray-700 font-medium">Điều khoản sử dụng</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {page?.title || 'Điều khoản sử dụng & Chính sách bảo mật'}
          </h1>
          <p className="text-gray-500">
            {page?.updated_at
              ? `Cập nhật lần cuối: ${formatDate(page.updated_at)}`
              : 'Cập nhật lần cuối: Tháng 5, 2026'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 max-w-7xl py-10">
        {useCmsContent ? (
          /* CMS content mode */
          <article className="card-tis p-8 md:p-12 max-w-4xl">
            <div
              className="prose prose-sm md:prose-base max-w-none text-gray-700 leading-relaxed
                prose-headings:text-gray-900 prose-headings:font-bold
                prose-a:text-tis-red prose-a:no-underline hover:prose-a:underline
                prose-li:marker:text-tis-red"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </article>
        ) : (
          /* Hardcoded sections mode with TOC sidebar */
          <div className="grid lg:grid-cols-[280px_1fr] gap-10 items-start">
            {/* Table of Contents Sidebar */}
            <aside className="lg:sticky lg:top-24">
              <div className="card-tis p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                  <i className="fas fa-list text-tis-red" />
                  Mục lục
                </h3>
                <nav className="space-y-1">
                  {DEFAULT_SECTIONS.map((section, i) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2.5 ${
                        activeSection === section.id
                          ? 'bg-red-50 text-tis-red font-bold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <i className={`fas ${section.icon} text-xs ${activeSection === section.id ? 'text-tis-red' : 'text-gray-400'}`} />
                      <span>
                        <span className="text-gray-400 mr-1">{i + 1}.</span>
                        {section.title}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Quick Contact */}
              <div className="card-tis p-5 mt-4 bg-gradient-to-br from-red-50 to-white">
                <div className="text-sm">
                  <p className="font-bold text-gray-900 mb-2">
                    <i className="fas fa-question-circle text-tis-red mr-1" />
                    Có câu hỏi?
                  </p>
                  <p className="text-gray-500 text-xs mb-3">
                    Liên hệ đội ngũ hỗ trợ pháp lý TIS Broker
                  </p>
                  <Link
                    to="/contact"
                    className="btn-tis-outline w-full py-2 text-xs text-center"
                  >
                    <i className="fas fa-paper-plane mr-1" />Liên hệ hỗ trợ
                  </Link>
                </div>
              </div>
            </aside>

            {/* Content Sections */}
            <div className="space-y-8">
              {DEFAULT_SECTIONS.map((section, i) => (
                <article
                  key={section.id}
                  ref={el => (sectionRefs.current[section.id] = el)}
                  className="card-tis p-7 md:p-9 scroll-mt-24"
                  id={section.id}
                >
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-tis-red flex items-center justify-center">
                      <i className={`fas ${section.icon}`} />
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 font-semibold">Phần {i + 1}</span>
                      <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
                    </div>
                  </div>
                  <div
                    className="prose prose-sm max-w-none text-gray-600 leading-relaxed
                      prose-headings:text-gray-800 prose-headings:font-bold prose-headings:text-sm prose-headings:mt-6 prose-headings:mb-2
                      prose-ul:space-y-1 prose-li:marker:text-tis-red
                      prose-a:text-tis-red prose-a:no-underline hover:prose-a:underline"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </article>
              ))}

              {/* Back to top */}
              <div className="text-center pt-4">
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-tis-red transition-colors"
                >
                  <i className="fas fa-arrow-up" />
                  Về đầu trang
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
