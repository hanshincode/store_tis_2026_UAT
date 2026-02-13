// js/common.js
const DOMAIN = 'http://127.0.0.1:8000';
const API_BASE_URL = `${DOMAIN}/api`; 
const MEDIA_URL = DOMAIN; 

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Format tiền tệ
function formatMoney(amount) {
    if (!amount) return '0 ₫';
    let num = parseFloat(amount);
    return isNaN(num) ? '0 ₫' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

// Quản lý Token
function getAccessToken() { return localStorage.getItem(ACCESS_TOKEN_KEY); }
function getRefreshToken() { return localStorage.getItem(REFRESH_TOKEN_KEY); }
function setTokens(access, refresh) {
    if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

// Đăng xuất - Luôn trỏ về trang chủ (Dùng dấu / ở đầu để tính từ gốc Server)
function logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    if (!window.location.pathname.includes('login.html')) {
        window.location.href = '/login.html'; 
    }
}

// Hàm Fetch API chuẩn
async function fetchAPI(endpoint, method = 'GET', body = null) {
    let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    const headers = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        let response = await fetch(url, config);
        
        // Auto refresh token nếu hết hạn
        if (response.status === 401 && !url.includes('login')) {
            const newToken = await refreshAccessToken();
            if (newToken) {
                config.headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(url, config);
            } else {
                logout();
                throw new Error("Phiên đăng nhập hết hạn");
            }
        }

        if (response.status === 204) return null;
        const data = await response.json();
        if (!response.ok) throw data;
        return data;
    } catch (error) { throw error; }
}

async function refreshAccessToken() {
    const refresh = getRefreshToken();
    if (!refresh) return null;
    try {
        const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh })
        });
        if (res.ok) {
            const data = await res.json();
            setTokens(data.access, data.refresh);
            return data.access;
        }
    } catch (e) {}
    return null;
}

// Toast thông báo
const Toast = typeof Swal !== 'undefined' ? Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true
}) : { fire: (o) => alert(o.title) };