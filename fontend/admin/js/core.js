/**
 * admin/js/core.js
 * Chức năng: Render Layout (Sidebar, Topbar), Check quyền Admin/Staff, Logout
 */

// 1. ẨN TRANG NGAY LẬP TỨC ĐỂ CHECK QUYỀN
document.documentElement.style.display = 'none';

document.addEventListener('DOMContentLoaded', async () => {
    // A. CHECK TOKEN
    const token = localStorage.getItem('access_token'); // Hoặc getAccessToken() từ common.js
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    try {
        // B. GỌI API CHECK USER ROLE
        // Giả sử API trả về { role: 'admin' | 'staff' | 'user', ... }
        const user = await fetchAPI('/users/me/'); 
        
        if (!['admin', 'super_admin', 'staff'].includes(user.role) && !user.is_superuser) {
            alert("Bạn không có quyền truy cập trang quản trị!");
            window.location.href = '../index.html';
            return;
        }

        // C. RENDER LAYOUT & SHOW TRANG
        renderAdminLayout(user);
        activeCurrentMenu();
        document.documentElement.style.display = 'block';

    } catch (e) {
        console.error("Lỗi xác thực Admin:", e);
        logout();
    }
});

function renderAdminLayout(user) {
    // 1. Sidebar HTML
    const sidebarHtml = `
    <nav id="sidebar" class="bg-white shadow-sm sidebar-wrapper">
        <div class="sidebar-brand p-3 border-bottom d-flex align-items-center justify-content-center">
            <a href="index.html" class="text-decoration-none d-flex align-items-center gap-2">
                <i class="fas fa-shield-alt fa-2x text-danger"></i>
                <div>
                    <h5 class="fw-bold text-dark m-0">TIS Admin</h5>
                    <small class="text-muted" style="font-size: 0.75rem;">Insurance Broker</small>
                </div>
            </a>
        </div>
        <div class="sidebar-menu p-3">
            <ul class="list-unstyled">
                <li class="menu-label text-muted small fw-bold mb-2">QUẢN LÝ CHUNG</li>
                <li><a href="index.html" id="menu-index" class="nav-link"><i class="fas fa-th-large"></i> Dashboard</a></li>
                <li><a href="orders.html" id="menu-orders" class="nav-link"><i class="fas fa-file-invoice-dollar"></i> Đơn hàng</a></li>
                <li><a href="products.html" id="menu-products" class="nav-link"><i class="fas fa-box-open"></i> Sản phẩm</a></li>
                <li><a href="categories.html" id="menu-categories" class="nav-link"><i class="fas fa-list"></i> Danh mục</a></li>
                
                <li class="menu-label text-muted small fw-bold mt-3 mb-2">KHÁCH HÀNG & NỘI DUNG</li>
                <li><a href="consultations.html" id="menu-consultations" class="nav-link"><i class="fas fa-headset"></i> Tư vấn</a></li>
                <li><a href="news.html" id="menu-news" class="nav-link"><i class="fas fa-newspaper"></i> Tin tức</a></li>
                <li><a href="staff.html" id="menu-staff" class="nav-link"><i class="fas fa-users-cog"></i> Nhân sự</a></li>
            </ul>
        </div>
        <div class="sidebar-footer p-3 border-top mt-auto">
            <div class="d-flex align-items-center gap-2">
                <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + user.username}" class="rounded-circle" width="40" height="40">
                <div class="overflow-hidden">
                    <div class="fw-bold text-truncate">${user.last_name || user.username}</div>
                    <div class="text-muted small text-truncate">${user.role.toUpperCase()}</div>
                </div>
            </div>
            <button class="btn btn-outline-danger btn-sm w-100 mt-2" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> Đăng xuất
            </button>
        </div>
    </nav>`;

    // 2. Topbar HTML (Nút toggle menu trên mobile)
    const topbarHtml = `
    <div class="topbar d-md-none bg-white shadow-sm p-3 d-flex justify-content-between align-items-center mb-3">
        <span class="fw-bold">TIS Admin Panel</span>
        <button class="btn btn-light" onclick="document.getElementById('sidebar').classList.toggle('show')">
            <i class="fas fa-bars"></i>
        </button>
    </div>`;

    document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
    document.querySelector('.main-content').insertAdjacentHTML('afterbegin', topbarHtml);
}

function activeCurrentMenu() {
    const path = window.location.pathname;
    const page = path.split("/").pop().replace('.html', '') || 'index';
    
    // Xóa active cũ
    document.querySelectorAll('.sidebar-menu .nav-link').forEach(l => l.classList.remove('active'));
    
    // Thêm active mới
    const activeLink = document.getElementById(`menu-${page}`);
    if (activeLink) activeLink.classList.add('active');
}

// Hàm logout toàn cục cho Admin
window.logout = function() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '../login.html';
};