/**
 * fontend/js/common.js
 * Chức năng: Cấu hình API, Quản lý JWT (Access/Refresh), Xử lý thông báo,
 * và Tự động bắt lỗi mất kết nối Server có đính kèm chi tiết lỗi.
 */

// --- 1. CẤU HÌNH HỆ THỐNG ---
const DEFAULT_API_DOMAIN = 'http://100.11.22.33:8080';

const DOMAIN = DEFAULT_API_DOMAIN;
const API_BASE_URL = `${DOMAIN}/api`;

function frontendPath(path = '') {
    const cleanPath = String(path).replace(/^\/+/, '');
    const isNestedPage = /\/(admin|user)\//.test(window.location.pathname.replace(/\\/g, '/'));
    return `${isNestedPage ? '../' : ''}${cleanPath}`;
}

function apiUrl(endpoint = '') {
    if (String(endpoint).startsWith('http')) return endpoint;
    const cleanEndpoint = String(endpoint).startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${cleanEndpoint}`;
}

function mediaUrl(path) {
    if (!path) return 'https://placehold.co/800x600/f8f9fa/d71920?text=TIS+Broker';
    if (String(path).startsWith('http')) return path;
    const cleanPath = String(path).startsWith('/') ? path : `/${path}`;
    if (cleanPath.startsWith('/media')) return `${DOMAIN}${cleanPath}`;
    return `${DOMAIN}/media${cleanPath}`;
}

function websocketUrl(path = '') {
    const domainUrl = new URL(DOMAIN);
    const wsProtocol = domainUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const cleanPath = String(path).startsWith('/') ? path : `/${path}`;
    return `${wsProtocol}//${domainUrl.host}${cleanPath}`;
}

function redirectTo(path) {
    window.location.href = frontendPath(path);
}

function isAuthPage() {
    return /(?:^|\/)(login|admin-login|forgot-password|reset-password|verify-email)\.html$/.test(window.location.pathname);
}

// --- 2. QUẢN LÝ TOKEN ---
function migrateLegacyTokens() {
    const legacyAccess = localStorage.getItem('access_token');
    const legacyRefresh = localStorage.getItem('refresh_token');
    if (legacyAccess && !sessionStorage.getItem('access_token')) sessionStorage.setItem('access_token', legacyAccess);
    if (legacyRefresh && !sessionStorage.getItem('refresh_token')) sessionStorage.setItem('refresh_token', legacyRefresh);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}

migrateLegacyTokens();

const getAccessToken = () => sessionStorage.getItem('access_token');
const getRefreshToken = () => sessionStorage.getItem('refresh_token');

const saveTokens = (access, refresh) => {
    if (access) sessionStorage.setItem('access_token', access);
    if (refresh) sessionStorage.setItem('refresh_token', refresh);
};

const clearTokens = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user_info');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
};
const removeTokens = clearTokens;

const TIS_SUPPORTED_LANGUAGES = ['vi', 'en'];
const TIS_TRANSLATIONS = {
    vi: {
        'nav.home': 'Trang chủ',
        'nav.products': 'Sản phẩm',
        'nav.news': 'Tin tức',
        'nav.admin': 'Trang quản trị',
        'nav.profile': 'Hồ sơ của tôi',
        'nav.orders': 'Đơn hàng đã mua',
        'nav.logout': 'Đăng xuất',
        'nav.login': 'Đăng nhập',
        'nav.cart': 'Giỏ hàng',
        'nav.support_chat': 'Hỗ trợ & Chat',
        'nav.search_placeholder': 'Tìm gói bảo hiểm...',
        'nav.hello': 'Xin chào',
        'mega.individual': 'Cá nhân',
        'mega.individual_desc': 'Bảo vệ bạn và gia đình',
        'mega.enterprise': 'Doanh nghiệp',
        'mega.enterprise_desc': 'Giải pháp toàn diện cho tổ chức',
        'mega.loading': 'Đang tải...',
        'mega.updating': 'Đang cập nhật...',
        'mega.view_all': 'Xem tất cả gói',
        'mega.free_consult': 'Tư vấn miễn phí',
        'footer.about': 'Công ty Cổ phần Môi giới Bảo hiểm TIS Việt Nam là đơn vị hàng đầu cung cấp các giải pháp quản trị rủi ro chuyên nghiệp và tối ưu cho khách hàng.',
        'footer.quick_links': 'Liên kết nhanh',
        'footer.about_link': 'Về TIS Broker',
        'footer.products': 'Sản phẩm Bảo hiểm',
        'footer.claims': 'Quy trình bồi thường',
        'footer.terms': 'Điều khoản sử dụng',
        'footer.contact': 'Thông tin liên hệ',
        'footer.copyright': 'Copyright © 2026 TIS Insurance Broker. Phát triển bởi TIS IT Team.',
        'chat.online_consult': 'Tư vấn trực tuyến',
        'chat.form_intro': 'Vui lòng để lại thông tin để chúng tôi hỗ trợ bạn tốt nhất.',
        'chat.name_placeholder': 'Họ và tên *',
        'chat.phone_placeholder': 'Số điện thoại *',
        'chat.note_placeholder': 'Bạn cần tư vấn về vấn đề gì?',
        'chat.start': 'Bắt đầu chat',
        'chat.start_conversation': 'Bắt đầu cuộc trò chuyện',
        'chat.input_placeholder': 'Nhập tin nhắn...',
        'chat.attach_title': 'Gửi file',
        'common.language': 'Ngôn ngữ',
        'common.vietnamese': 'Tiếng Việt',
        'common.english': 'English',
    },
    en: {
        'nav.home': 'Home',
        'nav.products': 'Products',
        'nav.news': 'News',
        'nav.admin': 'Admin panel',
        'nav.profile': 'My profile',
        'nav.orders': 'My orders',
        'nav.logout': 'Log out',
        'nav.login': 'Log in',
        'nav.cart': 'Cart',
        'nav.support_chat': 'Support & Chat',
        'nav.search_placeholder': 'Search insurance plans...',
        'nav.hello': 'Hello',
        'mega.individual': 'Individual',
        'mega.individual_desc': 'Protect yourself and your family',
        'mega.enterprise': 'Enterprise',
        'mega.enterprise_desc': 'Complete solutions for organizations',
        'mega.loading': 'Loading...',
        'mega.updating': 'Updating...',
        'mega.view_all': 'View all plans',
        'mega.free_consult': 'Free consultation',
        'footer.about': 'TIS Vietnam Insurance Broker provides professional, optimized risk management solutions for customers.',
        'footer.quick_links': 'Quick links',
        'footer.about_link': 'About TIS Broker',
        'footer.products': 'Insurance products',
        'footer.claims': 'Claims process',
        'footer.terms': 'Terms of use',
        'footer.contact': 'Contact information',
        'footer.copyright': 'Copyright © 2026 TIS Insurance Broker. Developed by TIS IT Team.',
        'chat.online_consult': 'Online consultation',
        'chat.form_intro': 'Please leave your information so we can support you better.',
        'chat.name_placeholder': 'Full name *',
        'chat.phone_placeholder': 'Phone number *',
        'chat.note_placeholder': 'What do you need advice on?',
        'chat.start': 'Start chat',
        'chat.start_conversation': 'Start the conversation',
        'chat.input_placeholder': 'Type a message...',
        'chat.attach_title': 'Send file',
        'common.language': 'Language',
        'common.vietnamese': 'Tiếng Việt',
        'common.english': 'English',
    }
};

function getPreferredLanguage() {
    const saved = localStorage.getItem('tis_language') || 'vi';
    return TIS_SUPPORTED_LANGUAGES.includes(saved) ? saved : 'vi';
}

function t(key, fallback = '') {
    const lang = getPreferredLanguage();
    return TIS_TRANSLATIONS[lang]?.[key] || TIS_TRANSLATIONS.vi?.[key] || fallback || key;
}

function localizedField(item, field, fallback = '') {
    if (!item) return fallback;
    const lang = getPreferredLanguage();
    if (lang === 'en') {
        const englishValue = item[`${field}_en`];
        if (englishValue !== undefined && englishValue !== null && String(englishValue).trim()) {
            return englishValue;
        }
    }
    const value = item[field];
    return value !== undefined && value !== null && String(value).trim() ? value : fallback;
}

function applyTranslations(root = document) {
    const lang = getPreferredLanguage();
    document.documentElement.lang = lang;
    root.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n, el.textContent);
    });
    root.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t(el.dataset.i18nHtml, el.innerHTML);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder, el.getAttribute('placeholder') || ''));
    });
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.setAttribute('title', t(el.dataset.i18nTitle, el.getAttribute('title') || ''));
    });
    root.querySelectorAll('[data-language-label]').forEach(el => {
        el.textContent = lang.toUpperCase();
    });
}

async function setPreferredLanguage(lang, { persist = true } = {}) {
    if (!TIS_SUPPORTED_LANGUAGES.includes(lang)) lang = 'vi';
    localStorage.setItem('tis_language', lang);
    applyTranslations();
    if (typeof renderLanguageSwitcher === 'function') renderLanguageSwitcher();

    if (persist && getAccessToken()) {
        try {
            const user = await fetchAPI('/users/me/');
            if (user?.id && user.preferred_language !== lang) {
                await fetchAPI(`/users/${user.id}/`, 'PATCH', { preferred_language: lang });
            }
        } catch (error) {
            console.warn('Không thể lưu ngôn ngữ vào tài khoản:', error);
        }
    }
}

window.t = t;
window.localizedField = localizedField;
window.applyTranslations = applyTranslations;
window.setPreferredLanguage = setPreferredLanguage;
window.getPreferredLanguage = getPreferredLanguage;

function normalizeList(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.results)) return payload.results;
    return [];
}

function getErrorMessage(error, fallback = 'Có lỗi xảy ra. Vui lòng thử lại.') {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    if (error.detail) return error.detail;
    const firstKey = Object.keys(error)[0];
    const firstValue = firstKey ? error[firstKey] : null;
    if (Array.isArray(firstValue)) return firstValue.join(', ');
    if (firstValue) return String(firstValue);
    return fallback;
}

function escapeHTML(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizeVietnamPhone(value = '') {
    let phone = String(value).trim().replace(/[\s().-]/g, '');
    if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
    if (phone.startsWith('84')) phone = `0${phone.slice(2)}`;
    return phone;
}

function isValidVietnamPhone(value = '') {
    return /^0(3|5|7|8|9)\d{8}$/.test(normalizeVietnamPhone(value));
}

function validateVietnamPhoneInput(inputOrValue, message = 'Số điện thoại không đúng định dạng Việt Nam. Vui lòng nhập 10 số, ví dụ 0912345678.') {
    const input = typeof inputOrValue === 'string' ? null : inputOrValue;
    const value = input ? input.value : inputOrValue;
    const normalized = normalizeVietnamPhone(value);
    if (input) input.value = normalized;
    if (isValidVietnamPhone(normalized)) return normalized;
    Toast.fire({ icon: 'warning', title: message });
    input?.focus();
    return null;
}

function parseVideoCallMessage(message) {
    if (!message || typeof message !== 'string') return null;
    let value = message.trim();
    for (let i = 0; i < 2; i += 1) {
        try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === 'object' && parsed.kind === 'video_call') return parsed;
            if (typeof parsed === 'string') {
                value = parsed;
                continue;
            }
        } catch (e) {}
        break;
    }
    return null;
}

function formatCallDurationText(totalSeconds = 0) {
    const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours} giờ ${mins} phút`;
    }
    if (minutes > 0) return `${minutes} phút ${rest} giây`;
    return `${rest} giây`;
}

function formatChatPreviewMessage(message, attachmentUrl = '') {
    const callInfo = parseVideoCallMessage(message);
    if (callInfo) {
        if (callInfo.status === 'ended') return `Cuộc gọi video đã kết thúc · ${formatCallDurationText(callInfo.duration_seconds)}`;
        if (callInfo.status === 'rejected') return 'Cuộc gọi video đã bị từ chối';
        if (callInfo.status === 'missed') return 'Cuộc gọi video nhỡ';
        return 'Cuộc gọi video';
    }

    if ((!message || !String(message).trim()) && attachmentUrl) return '[Tệp đính kèm]';
    return String(message || '')
        .replace('[Tệp đính kèm]', '[Tệp đính kèm]')
        .replace('Tệp đính kèm', 'Tệp đính kèm');
}

// --- 3. KHỞI TẠO THÔNG BÁO (SWEETALERT2 SAFE) ---
function escapeChatHtml(value) {
    return String(value || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function normalizePaymentHref(href) {
    const value = String(href || '').replace(/&amp;/g, '&');
    const match = value.match(/\/user\/payment\.html\?(token|payment_token|order|order_id)=([^&\s]+)/);
    if (!match) return value;
    const key = match[1] === 'token' || match[1] === 'payment_token' ? 'token' : 'order';
    return `/user/payment.html?${key}=${encodeURIComponent(match[2])}`;
}

function formatRichChatMessageText(text, options = {}) {
    const paymentClass = options.paymentClass || 'btn btn-danger btn-sm rounded-pill px-3 mt-2 fw-bold';
    const paymentStyle = options.paymentStyle || '';
    let safeText = escapeChatHtml(text);

    safeText = safeText.replace(
        /(?:Thanh toán tại:|Bấm vào đây để tiến hành thanh toán:)?\s*(\/user\/payment\.html\?(?:token|payment_token|order|order_id)=[^\s<]+)/gi,
        (_match, href) => {
            const paymentHref = normalizePaymentHref(href);
            return `<a href="${paymentHref}" class="${paymentClass}" style="${paymentStyle}" target="_blank"><i class="fas fa-qrcode me-1"></i>Ấn vào đây để tiến hành thanh toán</a>`;
        }
    );

    safeText = safeText.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" class="fw-bold text-decoration-underline" target="_blank">$1</a>'
    );

    return safeText.replace(/\n/g, '<br>');
}

let Toast = {
    fire: (obj) => console.log(`${obj.icon}: ${obj.title}`) 
};

if (typeof Swal !== 'undefined') {
    Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
} else {
    console.warn("SweetAlert2 chưa được tải. Vui lòng kiểm tra script trong HTML.");
}

// --- 4. FETCH API TRUNG TAM ---
async function fetchAPI(endpoint, method = 'GET', body = null) {
    const url = apiUrl(endpoint);
    
    const getOptions = (token) => {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const options = { method, headers };

        if (body) {
            if (body instanceof FormData) {
                options.body = body;
            } else {
                headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }
        return options;
    };

    try {
        let response = await fetch(url, getOptions(getAccessToken()));

        // XỬ LÝ KHI TOKEN HẾT HẠN (401)
        if (response.status === 401 && getRefreshToken()) {
            console.warn("Access Token hết hạn, đang thực hiện xoay vòng mã thông báo...");
            
            const isRefreshed = await handleRefreshToken();
            if (isRefreshed) {
                response = await fetch(url, getOptions(getAccessToken()));
            } else {
                window.logout();
                return;
            }
        }

        // Xử lý lỗi phân quyền hoặc lỗi dữ liệu (403, 400...)
        if (!response.ok) {
            const contentType = response.headers.get('content-type') || '';
            const errorData = contentType.includes('application/json')
                ? await response.json()
                : { detail: await response.text() || response.statusText };
            throw errorData; 
        }

        if (response.status === 204 || method === 'DELETE') return { success: true };
        
        return await response.json();

    } catch (error) {
        // Xu ly loi mang/server va truyen ma loi sang trang thong bao.
        if (error.name === 'TypeError' || 
            (error.message && (error.message.includes('fetch') || error.message.includes('NetworkError')))) {
            console.error("🔥 Báo động: Mất kết nối đến Backend Server!", error);
            
            // Lấy thông báo lỗi và mã hóa để đưa lên URL
            const errorMsg = encodeURIComponent(error.message || "Network Error");
            
            if (!isAuthPage() && !window.location.pathname.includes('server-error.html')) {
                window.location.href = frontendPath(`server-error.html?error=${errorMsg}`);
            }
        }

        console.error(`Lỗi API (${endpoint}):`, error);
        throw error; 
    }
}

// --- 5. LOGIC XOAY VÒNG TOKEN ---
async function handleRefreshToken() {
    const refresh = getRefreshToken();
    if (!refresh) return false;

    try {
        const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refresh })
        });

        if (res.ok) {
            const data = await res.json();
            saveTokens(data.access, data.refresh);
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

// --- 6. HÀM KIỂM TRA SỨC KHỎE SERVER NGAY KHI LOAD TRANG ---
async function checkServerHealth() {
    if (isAuthPage() || window.location.pathname.includes('server-error.html')) return;

    try {
        await fetch(`${API_BASE_URL}/products/?limit=1`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        if (error.name === 'TypeError' || 
            (error.message && (error.message.includes('fetch') || error.message.includes('NetworkError')))) {
            console.error("🔥 Server Backend không phản hồi từ lúc load trang!");
            
            console.warn("Bỏ qua chuyển trang lỗi server tự động từ health-check.", error);
        }
    }
}

// --- 7. HÀM TIỆN ÍCH ---
window.logout = function() {
    clearTokens();
    window.location.replace(frontendPath('login.html'));
};

function formatMoney(amount) {
    if (!amount) return '0đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

document.addEventListener("DOMContentLoaded", function() {
    // Ping kiểm tra server
    checkServerHealth();

    // Logic Ẩn/Hiện mật khẩu
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');

    togglePasswordButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            const inputField = this.closest('.input-group').querySelector('input');
            const icon = this.querySelector('i');

            if (inputField.type === 'password') {
                inputField.type = 'text'; 
                if (icon) {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash'); 
                }
            } else {
                inputField.type = 'password'; 
                if (icon) {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    });
});
