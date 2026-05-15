const INTERNAL_ROLES = ['super_admin', 'admin', 'leader', 'staff'];
let loginSubmitting = false;

function getLoginScope() {
    return document.getElementById('login-form')?.dataset.loginScope || 'customer';
}

function loginWithGoogle() {
    window.location.href = `${DOMAIN}/accounts/google/login/`;
}

function loginWithMicrosoft() {
    window.location.href = `${DOMAIN}/accounts/microsoft/login/`;
}

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get('access');
    const refresh = params.get('refresh');

    if (access && refresh) {
        saveTokens(access, refresh);
        window.history.replaceState({}, document.title, window.location.pathname);
        checkUserRoleAndRedirect();
        return;
    }

    if (getAccessToken()) {
        checkUserRoleAndRedirect();
    }

    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
});

async function handleLogin(event) {
    event.preventDefault();
    if (loginSubmitting) return;
    const btn = document.getElementById('btn-login');
    const defaultText = btn.textContent;
    const phone = validateVietnamPhoneInput(document.getElementById('phone'));
    if (!phone) return;

    try {
        loginSubmitting = true;
        btn.disabled = true;
        btn.textContent = 'ĐANG XỬ LÝ...';

        const data = await fetchJsonWithTimeout(`${API_BASE_URL}/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone,
                password: document.getElementById('password').value,
            }),
        }, 12000);

        saveTokens(data.access, data.refresh);
        const user = await fetchCurrentUserWithTimeout();
        if (!user?.role) throw new Error('Không thể xác định quyền tài khoản.');

        const allowed = enforceLoginScope(user.role);
        if (!allowed) return;

        sessionStorage.setItem('user_info', JSON.stringify(user));
        Toast.fire({ icon: 'success', title: 'Đăng nhập thành công!' });
        if (user.must_change_password) {
            setTimeout(() => redirectTo('force-change-password.html'), 500);
            return;
        }
        setTimeout(() => redirectByUserRole(user.role), 500);
    } catch (error) {
        clearTokens();
        Swal.fire('Thất bại', error.message || 'Lỗi kết nối hệ thống', 'error');
    } finally {
        loginSubmitting = false;
        btn.disabled = false;
        btn.textContent = defaultText;
    }
}

async function checkUserRoleAndRedirect() {
    try {
        const user = await fetchCurrentUserWithTimeout();
        if (!user?.role) return;
        if (!enforceLoginScope(user.role)) return;
        sessionStorage.setItem('user_info', JSON.stringify(user));
        if (user.must_change_password) {
            redirectTo('force-change-password.html');
            return;
        }
        redirectByUserRole(user.role);
    } catch (error) {
        clearTokens();
    }
}

async function fetchCurrentUserWithTimeout() {
    return fetchJsonWithTimeout(apiUrl('/users/me/'), {
        method: 'GET',
        headers: getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {},
    }, 12000);
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json')
            ? await response.json()
            : { detail: await response.text() };
        if (!response.ok) {
            throw new Error(payload.detail || payload.error || response.statusText || 'Yêu cầu không thành công.');
        }
        return payload;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
        }
        if (error.name === 'TypeError') {
            throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra địa chỉ API hoặc mạng nội bộ.');
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

function enforceLoginScope(role) {
    const scope = getLoginScope();
    const isInternal = INTERNAL_ROLES.includes(role);

    if (scope === 'internal' && !isInternal) {
        clearTokens();
        Swal.fire('Không có quyền truy cập', 'Trang này chỉ dành cho Admin/Staff.', 'warning');
        return false;
    }

    if (scope === 'customer' && isInternal) {
        clearTokens();
        Swal.fire({
            icon: 'info',
            title: 'Tài khoản nội bộ',
            text: 'Vui lòng đăng nhập bằng trang Admin/Staff.',
            confirmButtonColor: '#D71920',
        }).then(() => redirectTo('admin-login.html'));
        return false;
    }

    return true;
}

function redirectByUserRole(role) {
    if (INTERNAL_ROLES.includes(role)) {
        redirectTo('admin/index.html');
    } else {
        redirectTo('index.html');
    }
}

async function handleSocialLogin(provider, token) {
    const response = await fetch(`${API_BASE_URL}/auth/${provider}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token }),
    });
    const data = await response.json();
    if (response.ok) {
        saveTokens(data.access, data.refresh);
        checkUserRoleAndRedirect();
    }
}
