// js/login.js
document.addEventListener('DOMContentLoaded', () => {
    if (getAccessToken()) checkUserRole();
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
});

async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Đang xử lý...'; btn.disabled = true;

    try {
        // urls.py khai báo 'login/' -> qua fetchAPI sẽ thành /api/login/
        const data = await fetchAPI('/login/', 'POST', {
            username: document.getElementById('username').value.trim(),
            password: document.getElementById('password').value
        });
        setTokens(data.access, data.refresh);
        await checkUserRole();
    } catch (error) {
        Toast.fire({ icon: 'error', title: error.detail || "Sai thông tin đăng nhập!" });
    } finally {
        btn.innerHTML = originalText; btn.disabled = false;
    }
}

async function checkUserRole() {
    try {
        const user = await fetchAPI('/users/me/');
        if (user.is_superuser || ['admin', 'super_admin', 'staff'].includes(user.role)) {
            window.location.href = '/admin/index.html'; // Đi vào khu vực Admin
        } else {
            window.location.href = '/index.html'; // Đi vào khu vực Khách
        }
    } catch (error) { logout(); }
}