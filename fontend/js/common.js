/**
 * fontend/js/common.js
 * Chức năng: Cấu hình API, Quản lý JWT (Access/Refresh), Xử lý thông báo,
 * và Tự động bắt lỗi mất kết nối Server có đính kèm chi tiết lỗi.
 */

// --- 1. CẤU HÌNH HỆ THỐNG ---
const DOMAIN = "http://hcm-tis-uat.tisbroker.local:8000";
const API_BASE_URL = `${DOMAIN}/api`;

// --- 2. QUẢN LÝ TOKEN ---
const getAccessToken = () => localStorage.getItem('access_token');
const getRefreshToken = () => localStorage.getItem('refresh_token');

const saveTokens = (access, refresh) => {
    if (access) localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
};

const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
};

// --- 3. KHỞI TẠO THÔNG BÁO (SWEETALERT2 SAFE) ---
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

// --- 4. HÀM FETCH API TRUNG TÂM ---
async function fetchAPI(endpoint, method = 'GET', body = null) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
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
            const errorData = await response.json();
            throw errorData; 
        }

        if (response.status === 204 || method === 'DELETE') return { success: true };
        
        return await response.json();

    } catch (error) {
        // [THÊM MỚI] XỬ LÝ LỖI MẠNG HOẶC SERVER SẬP & TRUYỀN MÃ LỖI
        if (error.name === 'TypeError' || 
            (error.message && (error.message.includes('fetch') || error.message.includes('NetworkError')))) {
            console.error("🔥 Báo động: Mất kết nối đến Backend Server!", error);
            
            // Lấy thông báo lỗi và mã hóa để đưa lên URL
            const errorMsg = encodeURIComponent(error.message || "Network Error");
            
            if (!window.location.pathname.includes('server-error.html')) {
                window.location.href = `/server-error.html?error=${errorMsg}`;
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
    if (window.location.pathname.includes('server-error.html')) return;

    try {
        await fetch(`${API_BASE_URL}/products/?limit=1`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        if (error.name === 'TypeError' || 
            (error.message && (error.message.includes('fetch') || error.message.includes('NetworkError')))) {
            console.error("🔥 Server Backend không phản hồi từ lúc load trang!");
            
            const errorMsg = encodeURIComponent(error.message || "Connection Failed");
            window.location.href = `/server-error.html?error=${errorMsg}`;
        }
    }
}

// --- 7. HÀM TIỆN ÍCH ---
window.logout = function() {
    clearTokens();
    const rootPath = window.location.origin;
    window.location.replace(`${rootPath}/login.html`);
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