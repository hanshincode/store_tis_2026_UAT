// admin/js/core.js
document.addEventListener('DOMContentLoaded', async () => {
    if (!getAccessToken()) { window.location.href = '/login.html'; return; }
    
    renderLayout();
    activeCurrentMenu();

    try {
        const user = await fetchAPI('/users/me/');
        if (!['admin', 'super_admin', 'staff'].includes(user.role) && !user.is_superuser) {
            alert("Bạn không có quyền truy cập!"); window.location.href = '/index.html'; return;
        }
        document.getElementById('admin-name').innerText = user.first_name || user.username;
    } catch (e) { logout(); }
});

function renderLayout() {
    const sidebar = `
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header"><h4 class="fw-bold m-0 text-white">TIS ADMIN</h4></div>
        <div class="sidebar-menu mt-2">
            <a href="index.html" id="menu-index"><i class="fas fa-tachometer-alt"></i> Tổng quan</a>
            <a href="orders.html" id="menu-orders"><i class="fas fa-file-invoice-dollar"></i> Đơn hàng</a>
            <a href="products.html" id="menu-products"><i class="fas fa-box-open"></i> Sản phẩm</a>
        </div>
        <div class="p-3 position-absolute bottom-0 w-100 bg-dark">
            <button onclick="logout()" class="btn btn-outline-danger w-100 btn-sm">Đăng xuất</button>
        </div>
    </div>`;

    const topbar = `
    <div class="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded shadow-sm">
        <h5 class="m-0 fw-bold text-secondary">Hệ thống quản trị</h5>
        <div class="d-flex align-items-center"><span class="fw-bold me-2" id="admin-name">...</span><i class="fas fa-user-circle fa-2x text-primary"></i></div>
    </div>`;

    document.body.insertAdjacentHTML('afterbegin', sidebar);
    document.querySelector('.main-content')?.insertAdjacentHTML('afterbegin', topbar);
}

function activeCurrentMenu() {
    const page = window.location.pathname.split("/").pop() || 'index.html';
    document.getElementById('menu-' + page.replace('.html', ''))?.classList.add('active');
}