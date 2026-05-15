/**
 * admin/js/core.js
 * Chức năng: Core Admin - Layout, Auth, Navigation & Realtime Updates
 */

// 1. CHỐNG NHẤP NHÁY: Ẩn giao diện cho đến khi xác thực xong
// document.documentElement.style.display = 'none';

// XÓA DÒNG NÀY: document.documentElement.style.display = 'none';

document.addEventListener('DOMContentLoaded', async () => {
    // A. KIỂM TRA TOKEN
    const token = getAccessToken();
    if (!token) {
        window.location.replace('../admin-login.html'); 
        return;
    }

    // --- 1. LẤY CACHE VÀ VẼ GIAO DIỆN NGAY LẬP TỨC (Không cần đợi API) ---
    let cachedUser = sessionStorage.getItem('admin_user');
    if (cachedUser) {
        try {
            cachedUser = JSON.parse(cachedUser);
            renderAdminLayout(cachedUser); // Vẽ Menu lên màn hình ngay lập tức
            activeCurrentMenu();
        } catch (e) {}
    } else {
        // Nếu lỡ không có cache, hiện tạm Spinner loading cho thân thiện
        document.body.insertAdjacentHTML('afterbegin', '<div id="tis-loader" style="position:fixed;top:0;left:0;width:100%;height:100%;background:#f8f9fa;z-index:9999;display:flex;justify-content:center;align-items:center;"><div class="spinner-border text-danger"></div></div>');
    }

    // --- 2. GỌI API NGẦM ĐỂ XÁC THỰC BẢO MẬT ---
    try {
        const user = await fetchAPI('/users/me/');

        const allowedRoles = ['super_admin', 'admin', 'leader', 'staff'];
        const hasAccess = user.is_superuser || allowedRoles.includes(user.role);

        if (!hasAccess) {
            alert("Tài khoản của bạn không có quyền truy cập trang quản trị!");
            window.location.replace('../index.html');
            return;
        }

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (['leader', 'staff'].includes(user.role) && currentPage === 'index.html') {
            window.location.replace('consultations.html');
            return;
        }

        // Cập nhật lại cache mới nhất từ server
        sessionStorage.setItem('admin_user', JSON.stringify(user));

        // Nếu lúc nãy chưa có cache để vẽ, thì bây giờ có data rồi mới vẽ
        if (!cachedUser) {
            const loader = document.getElementById('tis-loader');
            if (loader) loader.remove();
            renderAdminLayout(user);
            activeCurrentMenu();
        } else if (cachedUser.role !== user.role || cachedUser.id !== user.id) {
            // Nếu phát hiện quyền (role) trên server vừa bị đổi, ép tải lại trang
            window.location.reload();
        }

        // --- 3. CẬP NHẬT SỐ LƯỢNG THÔNG BÁO ---
        updateBadgeCount();
        startAdminSupportWatcher();

    } catch (error) {
        console.error("Lỗi xác thực Admin:", error);
        clearTokens();
        window.location.replace('../admin-login.html');
    }
});
/**
 * Render Sidebar và Topbar
 */
function renderAdminLayout(user) {
    const fullName = `${user.last_name || ''} ${user.first_name || ''}`.trim() || user.username;
    const avatarName = encodeURIComponent(fullName || 'TIS');
    const fallbackAvatarUrl = `https://ui-avatars.com/api/?name=${avatarName}&background=d71920&color=fff`;
    const avatarUrl = user.avatar ? mediaUrl(user.avatar) : fallbackAvatarUrl;
    
    // HTML SIDEBAR
    const sidebarHtml = `
    <nav id="sidebar" class="bg-white shadow-sm sidebar-wrapper">
        <div class="sidebar-brand p-3 border-bottom d-flex align-items-center justify-content-center gap-2">
            <i class="fas fa-shield-alt fa-2x text-danger"></i>
            <div>
                <h5 class="fw-bold text-dark m-0">TIS Admin</h5>
                <small class="text-muted" style="font-size: 0.75rem;">Insurance Broker</small>
            </div>
        </div>
        
        <div class="sidebar-menu p-3">
            <ul class="list-unstyled">
                <li class="menu-label text-muted small fw-bold mb-2">QUẢN LÝ CHUNG</li>
                <li><a href="index.html" id="menu-index" class="nav-link"><i class="fas fa-th-large"></i> Dashboard</a></li>
                <li><a href="orders.html" id="menu-orders" class="nav-link"><i class="fas fa-file-invoice-dollar"></i> Đơn hàng</a></li>
                <li><a href="products.html" id="menu-products" class="nav-link"><i class="fas fa-box-open"></i> Sản phẩm</a></li>
                <li><a href="categories.html" id="menu-categories" class="nav-link"><i class="fas fa-list"></i> Danh mục</a></li>
                
                <li class="menu-label text-muted small fw-bold mt-3 mb-2">KHÁCH HÀNG & SUPPORT</li>
                <li>
                    <a href="consultations.html" id="menu-consultations" class="nav-link">
                        <i class="fas fa-headset"></i> Tư vấn
                        <span class="badge bg-warning text-dark ms-auto" id="sidebar-consult-badge" style="display:none">0</span>
                    </a>
                </li>
                <li>
                    <a href="chat.html" id="menu-chat" class="nav-link d-flex align-items-center">
                        <i class="fab fa-facebook-messenger me-2"></i> Live Chat
                        <span class="badge bg-danger ms-auto" id="sidebar-chat-badge" style="display:none">0</span>
                    </a>
                </li>
                
                <li class="menu-label text-muted small fw-bold mt-3 mb-2">NỘI DUNG & HỆ THỐNG</li>
                <li><a href="banners.html" id="menu-banners" class="nav-link"><i class="fas fa-images"></i> Banner</a></li>
                <li><a href="news.html" id="menu-news" class="nav-link"><i class="fas fa-newspaper"></i> Tin tức</a></li>
                <li><a href="enterprise-employees.html" id="menu-enterprise-employees" class="nav-link"><i class="fas fa-id-card"></i> Bảo hiểm DN</a></li>
                <li><a href="accounts.html" id="menu-accounts" class="nav-link"><i class="fas fa-address-book"></i> Tài khoản</a></li>
                <li><a href="staff.html" id="menu-staff" class="nav-link"><i class="fas fa-users-cog"></i> Nhân sự</a></li>
                <li><a href="payment-settings.html" id="menu-payment-settings" class="nav-link"><i class="fas fa-qrcode"></i> Thanh toán QR</a></li>
                
                </ul>
        </div>

        <div class="sidebar-footer p-3 border-top mt-auto bg-light">
            <div class="d-flex align-items-center gap-2 mb-3 p-2 rounded border bg-white shadow-sm user-profile-btn" 
                 onclick="window.location.href='profile.html'" 
                 title="Xem hồ sơ cá nhân"
                 style="cursor: pointer; transition: all 0.2s ease;">
                 
                <img src="${avatarUrl}" class="rounded-circle border" width="40" height="40" style="object-fit: cover;" onerror="this.onerror=null;this.src='${fallbackAvatarUrl}';">
                
                <div class="overflow-hidden flex-grow-1">
                    <div class="fw-bold text-dark text-truncate small" title="${fullName}">${fullName}</div>
                    <div class="text-muted x-small text-truncate">${user.role ? user.role.toUpperCase() : 'ADMIN'}</div>
                </div>
                
                <i class="fas fa-chevron-right text-muted small ms-1"></i>
            </div>

            <button class="btn btn-outline-danger btn-sm w-100" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt"></i> Đăng xuất
            </button>
        </div>
    </nav>`;

    // HTML TOPBAR (Mobile Toggle)
    const topbarHtml = `
    <div class="topbar d-md-none bg-white shadow-sm p-3 d-flex justify-content-between align-items-center mb-3 sticky-top">
        <div class="d-flex align-items-center gap-2">
            <i class="fas fa-shield-alt text-danger fa-lg"></i>
            <span class="fw-bold">TIS Panel</span>
        </div>
        <button class="btn btn-light border" onclick="toggleSidebar()">
            <i class="fas fa-bars"></i>
        </button>
    </div>`;

    document.body.insertAdjacentHTML('afterbegin', sidebarHtml);
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertAdjacentHTML('afterbegin', topbarHtml);
    }
    restrictStaffNavigation(user);
    
    // Thêm hiệu ứng hover bằng JS (hoặc CSS)
    const profileBtn = document.querySelector('.user-profile-btn');
    if(profileBtn) {
        profileBtn.addEventListener('mouseenter', () => profileBtn.classList.add('bg-light'));
        profileBtn.addEventListener('mouseleave', () => profileBtn.classList.remove('bg-light'));
    }
}

function restrictStaffNavigation(user) {
    if (!user || !['leader', 'staff'].includes(user.role)) return;
    const hiddenForStaff = [
        'menu-products',
        'menu-categories',
        'menu-banners',
        'menu-news',
        'menu-accounts',
        'menu-staff',
        'menu-payment-settings',
        'menu-enterprise-employees',
    ];
    const hiddenForLeader = [
        'menu-products',
        'menu-categories',
        'menu-banners',
        'menu-news',
        'menu-accounts',
        'menu-staff',
        'menu-payment-settings',
        'menu-enterprise-employees',
        'menu-orders',
    ];
    const ids = user.role === 'leader' ? hiddenForLeader : hiddenForStaff;
    ids.forEach(id => {
        const link = document.getElementById(id);
        link?.closest('li')?.remove();
    });
}

/**
 * Active menu dựa trên URL
 */
function activeCurrentMenu() {
    const path = window.location.pathname;
    let page = path.split("/").pop();
    if (page === '' || page === 'admin') page = 'index.html';
    const menuId = 'menu-' + page.replace('.html', '');
    
    const activeLink = document.getElementById(menuId);
    if (activeLink) {
        activeLink.classList.add('active');
        activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

window.toggleSidebar = function() {
    document.getElementById('sidebar').classList.toggle('show');
}

window.handleLogout = function() {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
        clearTokens();
        sessionStorage.removeItem('admin_user');
        window.location.replace('../admin-login.html');
    }
}

let adminSupportPollTimer = null;
let adminSupportSnapshotReady = false;

function startAdminSupportWatcher() {
    if (adminSupportPollTimer) return;
    adminSupportPollTimer = setInterval(updateBadgeCount, 8000);
}

async function updateBadgeCount() {
    try {
        const payload = await fetchAPI('/consultations/');
        const data = Array.isArray(payload) ? payload : (payload.results || []);
        if (Array.isArray(data)) {
            const activeItems = data.filter(item => item.status !== 'archived');
            const newConsultations = activeItems.filter(item => item.status === 'new');
            const customerMessageItems = activeItems.filter(item => item.last_message && item.last_message.is_staff === false);

            updateSidebarBadge('sidebar-consult-badge', newConsultations.length);
            updateSidebarBadge('sidebar-chat-badge', customerMessageItems.length);
            toggleSidebarPulse('menu-consultations', newConsultations.length > 0);
            toggleSidebarPulse('menu-chat', customerMessageItems.length > 0);
            detectSupportChanges(newConsultations, customerMessageItems);

            if (typeof window.loadConsultations === 'function' && document.getElementById('consultation-list')) {
                window.loadConsultations({ silent: true });
            }
        }
    } catch (e) {}
}

function updateSidebarBadge(id, count) {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.innerText = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
    badge.classList.toggle('support-badge-pulse', count > 0);
}

function toggleSidebarPulse(menuId, enabled) {
    const link = document.getElementById(menuId);
    if (link) link.classList.toggle('support-link-alert', enabled);
}

function detectSupportChanges(newConsultations, customerMessageItems) {
    const consultationIds = newConsultations.map(item => item.id).sort((a, b) => a - b);
    const chatKeys = customerMessageItems
        .map(item => `${item.id}:${item.last_message?.time || ''}:${formatChatPreviewMessage(item.last_message?.message || '', item.last_message?.attachment_url || '')}`)
        .sort();

    const previousConsultationIds = JSON.parse(sessionStorage.getItem('admin_new_consultation_ids') || '[]');
    const previousChatKeys = JSON.parse(sessionStorage.getItem('admin_customer_chat_keys') || '[]');
    const newIds = consultationIds.filter(id => !previousConsultationIds.includes(id));
    const newChatKeys = chatKeys.filter(key => !previousChatKeys.includes(key));

    sessionStorage.setItem('admin_new_consultation_ids', JSON.stringify(consultationIds));
    sessionStorage.setItem('admin_customer_chat_keys', JSON.stringify(chatKeys));

    if (!adminSupportSnapshotReady) {
        adminSupportSnapshotReady = true;
        return;
    }

    if (newIds.length > 0) {
        const latest = newConsultations.find(item => item.id === newIds[newIds.length - 1]) || newConsultations[0];
        showAdminSupportToast({
            title: 'Yêu cầu tư vấn mới',
            message: `${latest.customer_name || 'Khách hàng'} cần tư vấn${latest.product_name ? ` về ${latest.product_name}` : ''}.`,
            href: 'consultations.html',
            notificationTitle: 'TIS Admin: Tư vấn mới',
        });
    } else if (newChatKeys.length > 0) {
        const latestChat = customerMessageItems[0];
        showAdminSupportToast({
            title: 'Tin nhắn khách hàng mới',
            message: formatChatPreviewMessage(latestChat?.last_message?.message || '', latestChat?.last_message?.attachment_url || ''),
            href: 'chat.html',
            notificationTitle: 'TIS Admin: Tin nhắn mới',
        });
    }
}

function showAdminSupportToast({ title, message, href, notificationTitle }) {
    const toast = document.createElement('div');
    toast.className = 'admin-live-toast';
    toast.innerHTML = `
        <button type="button" class="admin-live-toast-close" aria-label="Đóng">&times;</button>
        <div class="admin-live-toast-icon"><i class="fas fa-bell"></i></div>
        <div class="min-width-0">
            <div class="fw-bold">${escapeHTML(title)}</div>
            <div class="small text-muted">${escapeHTML(message)}</div>
            <a href="${href}" class="small fw-bold text-danger text-decoration-none">Xem ngay</a>
        </div>
    `;
    document.body.appendChild(toast);
    toast.querySelector('.admin-live-toast-close')?.addEventListener('click', () => toast.remove());
    setTimeout(() => toast.remove(), 9000);

    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        const notif = new Notification(notificationTitle, {
            body: message,
            icon: '../images/logo.png',
        });
        notif.onclick = function() {
            window.focus();
            window.location.href = href;
            this.close();
        };
    }
}
// Gắn vào fe/admin/js/core.js (hoặc layout.js)
document.addEventListener('DOMContentLoaded', () => {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
    
    // Tạo kênh lắng nghe thông báo xuyên Tab
    const adminNotifChannel = new BroadcastChannel('admin_chat_notifications');
    
    adminNotifChannel.onmessage = (event) => {
        // Nếu nhận được tín hiệu từ Tab Chat, hiển thị thông báo
        if (document.hidden) {
            const data = event.data;
            const notif = new Notification(`KH: ${data.senderName}`, {
                body: data.messageText || "[Đã gửi một tệp đính kèm]",
                icon: "/fe/images/logo.png"
            });
            
            notif.onclick = function() {
                window.focus();
                this.close();
            };
        }
    };
});

