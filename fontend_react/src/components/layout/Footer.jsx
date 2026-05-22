import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchList } from '@/lib/api'
import { COMPANY_CONTACT_CHANNELS, COMPANY_EMAIL } from '@/lib/company'

export default function Footer() {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    fetchList('/categories/').then(cats => setCategories(cats.slice(0, 6))).catch(() => {})
  }, [])

  return (
    <footer className="bg-white border-t border-gray-200/80 text-gray-800 pt-16 pb-8 mt-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-brand-logo-wrap">
              <img src="/images/logo.png" alt="TIS Logo" className="footer-brand-logo"
                onError={e => { e.target.src = 'https://via.placeholder.com/150x50/ffffff/d71920?text=TIS+BROKER' }} />
            </div>
            <h4 className="text-tis-red font-bold text-lg mb-3">TIS BROKER</h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              CÔNG TY TNHH MÔI GIỚI BẢO HIỂM TIS VIỆT NAM là đơn vị hàng đầu cung cấp các giải pháp quản trị rủi ro chuyên nghiệp và tối ưu cho khách hàng.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="font-bold text-gray-900 mb-5">Liên kết nhanh</h5>
            <ul className="space-y-3">
              {[
                { to: '/#about',        label: 'Về TIS Broker' },
                { to: '/products',      label: 'Sản phẩm Bảo hiểm' },
                { to: '/claims-process',label: 'Quy trình bồi thường' },
                { to: '/terms',         label: 'Điều khoản sử dụng' },
                { to: '/contact',       label: 'Liên hệ' },
              ].map(item => (
                <li key={item.to}>
                  <Link to={item.to} className="text-gray-600 text-sm hover:text-tis-red transition-colors hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h5 className="font-bold text-gray-900 mb-5">Danh mục sản phẩm</h5>
            {categories.length === 0 ? (
              <p className="text-gray-400 text-sm">Đang tải danh mục...</p>
            ) : (
              <ul className="space-y-3">
                {categories.map(cat => (
                  <li key={cat.id}>
                    <Link to={`/category/${cat.id}`}
                      className="text-gray-600 text-sm hover:text-tis-red transition-colors hover:underline">
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Contact Info */}
          <div>
            <h5 className="font-bold text-gray-900 mb-5">Thông tin liên hệ</h5>
            <div className="space-y-3 text-gray-600 text-sm">
              <div className="flex gap-3 items-start">
                <i className="fas fa-map-marker-alt text-tis-red mt-0.5 w-4 flex-shrink-0" />
                <span className="leading-relaxed">Phòng 1101, tầng 11, Tòa nhà Grace Tower, số 71 Hoàng Văn Thái, phường Tân Mỹ, Q.7, TP.HCM</span>
              </div>
              <div className="flex gap-3 items-center">
                <i className="fas fa-phone-alt text-tis-red w-4 flex-shrink-0" />
                <span>Hotline: +84 28 54 171 181</span>
              </div>
              <div className="flex gap-3 items-center">
                <i className="fas fa-globe text-tis-red w-4 flex-shrink-0" />
                <span>tisbroker.com</span>
              </div>
              <div className="flex gap-3 items-center">
                <i className="fas fa-envelope text-tis-red w-4 flex-shrink-0" />
                <a href={`mailto:${COMPANY_EMAIL}`} className="hover:text-tis-red transition-colors">
                  {COMPANY_EMAIL}
                </a>
              </div>
              <div className="flex gap-3 items-center pt-2">
                {COMPANY_CONTACT_CHANNELS.map((item) => (
                  <a
                    key={item.key}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`footer-social-link ${item.className}`}
                    title={item.label}
                  >
                    <i className={`${item.icon} text-sm`} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-200 mt-12 mb-6" />
        <p className="text-center text-gray-500 text-sm">
          Copyright © 2026 TIS Insurance Broker. Phát triển bởi TIS IT Team.
        </p>
      </div>
    </footer>
  )
}
