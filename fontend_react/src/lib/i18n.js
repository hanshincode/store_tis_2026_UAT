// i18n helper (mirrors common.js TIS_TRANSLATIONS + t() function)

const SUPPORTED = ['vi', 'en']
const STORAGE_KEY = 'tis_language'

const TRANSLATIONS = {
  vi: {
    'nav.home':           'Trang chủ',
    'nav.products':       'Sản phẩm',
    'nav.news':           'Tin tức',
    'nav.contact':        'Liên hệ',
    'nav.admin':          'Trang quản trị',
    'nav.profile':        'Hồ sơ của tôi',
    'nav.orders':         'Đơn hàng đã mua',
    'nav.logout':         'Đăng xuất',
    'nav.login':          'Đăng nhập',
    'nav.cart':           'Giỏ hàng',
    'nav.support_chat':   'Hỗ trợ & Chat',
    'nav.hello':          'Xin chào',
    'mega.individual':    'Cá nhân',
    'mega.enterprise':    'Doanh nghiệp',
    'mega.view_all':      'Xem tất cả gói',
    'footer.about':       'CÔNG TY TNHH MÔI GIỚI BẢO HIỂM TIS VIỆT NAM là đơn vị hàng đầu cung cấp các giải pháp quản trị rủi ro chuyên nghiệp và tối ưu cho khách hàng.',
    'footer.quick_links': 'Liên kết nhanh',
    'footer.contact':     'Thông tin liên hệ',
    'footer.copyright':   'Copyright © 2026 TIS Insurance Broker. Phát triển bởi TIS IT Team.',
    'chat.start':         'Bắt đầu chat',
    'chat.input':         'Nhập tin nhắn...',
    'common.loading':     'Đang tải...',
    'common.error':       'Đã xảy ra lỗi',
    'common.save':        'Lưu lại',
    'common.cancel':      'Hủy',
    'common.delete':      'Xóa',
    'common.edit':        'Chỉnh sửa',
    'common.add':         'Thêm mới',
    'common.search':      'Tìm kiếm',
    'common.confirm':     'Xác nhận',
    'common.close':       'Đóng',
    'common.language':    'Ngôn ngữ',
    'common.vietnamese':  'Tiếng Việt',
    'common.english':     'English',
  },
  en: {
    'nav.home':           'Home',
    'nav.products':       'Products',
    'nav.news':           'News',
    'nav.contact':        'Contact',
    'nav.admin':          'Admin panel',
    'nav.profile':        'My profile',
    'nav.orders':         'My orders',
    'nav.logout':         'Log out',
    'nav.login':          'Log in',
    'nav.cart':           'Cart',
    'nav.support_chat':   'Support & Chat',
    'nav.hello':          'Hello',
    'mega.individual':    'Individual',
    'mega.enterprise':    'Enterprise',
    'mega.view_all':      'View all plans',
    'footer.about':       'TIS Vietnam Insurance Broker provides professional, optimized risk management solutions for customers.',
    'footer.quick_links': 'Quick links',
    'footer.contact':     'Contact information',
    'footer.copyright':   'Copyright © 2026 TIS Insurance Broker. Developed by TIS IT Team.',
    'chat.start':         'Start chat',
    'chat.input':         'Type a message...',
    'common.loading':     'Loading...',
    'common.error':       'An error occurred',
    'common.save':        'Save',
    'common.cancel':      'Cancel',
    'common.delete':      'Delete',
    'common.edit':        'Edit',
    'common.add':         'Add new',
    'common.search':      'Search',
    'common.confirm':     'Confirm',
    'common.close':       'Close',
    'common.language':    'Language',
    'common.vietnamese':  'Tiếng Việt',
    'common.english':     'English',
  },
}

export const getLanguage = () => {
  const saved = localStorage.getItem(STORAGE_KEY) || 'vi'
  return SUPPORTED.includes(saved) ? saved : 'vi'
}

export const setLanguage = (lang) => {
  if (SUPPORTED.includes(lang)) localStorage.setItem(STORAGE_KEY, lang)
}

export const t = (key, fallback = '') => {
  const lang = getLanguage()
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.vi?.[key] || fallback || key
}

export const localizedField = (item, field, fallback = '') => {
  if (!item) return fallback
  const lang = getLanguage()
  if (lang === 'en') {
    const engVal = item[`${field}_en`]
    if (engVal !== undefined && engVal !== null && String(engVal).trim()) return engVal
  }
  const val = item[field]
  return (val !== undefined && val !== null && String(val).trim()) ? val : fallback
}
