/**
 * js/layout.js
 * Chức năng: Quản lý Header, Footer, Auth state, Mega Menu và Giỏ hàng
 */

document.addEventListener("DOMContentLoaded", () => {
    loadHeader();
    loadFooter();
});

let chatWidgetScriptPromise = null;

// --- 1. LOAD HEADER ---
async function loadHeader() {
    const placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    try {
        const response = await fetch(frontendPath('components/header.html'));
        if (!response.ok) throw new Error("Header not found");
        placeholder.innerHTML = await response.text();
        normalizeInternalLinks(placeholder);
        renderLanguageSwitcher();
        applyTranslations(placeholder);
        
        // Sau khi HTML header xuất hiện, chạy các logic đi kèm:
        checkAuth();           // Kiểm tra đăng nhập
        updateCartBadge();     // Đã có hàm xử lý ở dưới
        highlightActiveMenu(); // Active menu hiện tại
        loadMegaMenuCategories(); // Tải danh mục vào Menu
        
    } catch (error) {
        console.error("Lỗi tải Header:", error);
    }
}

// --- 2. LOAD MEGA MENU ---
async function loadMegaMenuCategories() {
    const listInd = document.getElementById('menu-cat-ind');
    const listEnt = document.getElementById('menu-cat-ent');
    
    if (!listInd || !listEnt) return;

    try {
        const categories = await fetchAPI('/categories/');
        
        if (!categories || categories.length === 0) {
            const emptyMsg = `<li class="text-muted small">${t('mega.updating')}</li>`;
            listInd.innerHTML = emptyMsg;
            listEnt.innerHTML = emptyMsg;
            return;
        }

        const htmlItems = categories.map(c => 
            `<li class="col-6">
                <a href="${frontendPath(`products.html?category=${c.id}`)}" class="text-decoration-none hover-danger">
                    <i class="fas fa-caret-right text-muted me-1 small"></i> ${escapeHTML(c.name)}
                </a>
            </li>`
        ).join('');

        const viewAllHtml = `
            <li class="col-12 mt-2 pt-2 border-top">
                <a href="${frontendPath('products.html')}" class="fw-bold text-danger text-decoration-none small">
                    ${t('mega.view_all')} <i class="fas fa-arrow-right ms-1"></i>
                </a>
            </li>
        `;

        listInd.innerHTML = htmlItems + viewAllHtml;
        listEnt.innerHTML = htmlItems + viewAllHtml;

    } catch (e) {
        console.error("Lỗi Mega Menu:", e);
        // Không làm gì để giữ nguyên UI mặc định hoặc ẩn đi
    }
}

// --- 3. LOAD FOOTER ---
async function loadFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (placeholder) {
        try {
            const response = await fetch(frontendPath('components/footer.html'));
            if (response.ok) {
                placeholder.innerHTML = await response.text();
                normalizeInternalLinks(placeholder);
                applyTranslations(placeholder);
                ensureChatWidgetScript();
            }
        } catch (e) { console.error("Lỗi tải Footer"); }
    }
}

function normalizeInternalLinks(container) {
    container.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
        link.setAttribute('href', frontendPath(href));
    });

    container.querySelectorAll('img[src]').forEach(img => {
        const src = img.getAttribute('src');
        if (!src || src.startsWith('http') || src.startsWith('data:')) return;
        img.setAttribute('src', frontendPath(src));
    });
}

function ensureChatWidgetScript() {
    if (window.__chatWidgetInitialized) return Promise.resolve();
    if (chatWidgetScriptPromise) return chatWidgetScriptPromise;

    const existingScript = document.querySelector('script[data-chat-widget-script="true"]');
    if (existingScript) {
        chatWidgetScriptPromise = Promise.resolve();
        return chatWidgetScriptPromise;
    }

    chatWidgetScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = frontendPath('user/js/chat-widget.js');
        script.dataset.chatWidgetScript = 'true';
        script.onload = () => resolve();
        script.onerror = () => {
            chatWidgetScriptPromise = null;
            reject(new Error('Không thể tải chat widget script'));
        };
        document.body.appendChild(script);
    });

    return chatWidgetScriptPromise;
}

// --- 4. CHECK AUTH (Đăng nhập/Đăng xuất) ---
async function checkAuth() {
    const authSection = document.getElementById('auth-section');
    if (!authSection) return;

    const token = getAccessToken(); // Hàm từ common.js
    
    if (token) {
        try {
            const user = await fetchAPI('/users/me/');
            if (user.preferred_language && user.preferred_language !== getPreferredLanguage()) {
                localStorage.setItem('tis_language', user.preferred_language);
                applyTranslations();
                renderLanguageSwitcher();
            }
            
            // Menu quyền quản trị
            let roleMenu = '';
            if (['admin', 'super_admin', 'staff'].includes(user.role)) {
                roleMenu = `<li><a class="dropdown-item text-danger fw-bold" href="${frontendPath('admin/index.html')}"><i class="fas fa-cogs me-2"></i>${t('nav.admin')}</a></li>
                            <li><hr class="dropdown-divider"></li>`;
            }

            const displayName = user.user_type === 'enterprise'
                ? (user.company_name || `${user.last_name || ''} ${user.first_name || ''}`.trim() || user.phone || user.username)
                : (`${user.last_name || ''} ${user.first_name || ''}`.trim() || user.phone || user.username);
            const avatarUrl = user.avatar
                ? mediaUrl(user.avatar)
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'TIS')}`;

            authSection.innerHTML = `
                <a class="nav-link dropdown-toggle header-user-toggle d-flex align-items-center gap-2" href="#" role="button" data-bs-toggle="dropdown" title="${escapeHTML(displayName)}">
                    <img src="${avatarUrl}" class="header-user-avatar rounded-circle border" alt="${escapeHTML(displayName)}">
                    <span class="header-user-name fw-bold small">${escapeHTML(displayName)}</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 animate__animated animate__fadeIn">
                    <li><div class="px-3 py-2 text-muted small">${t('nav.hello')}, <strong>${escapeHTML(displayName)}</strong></div></li>
                    <li><hr class="dropdown-divider"></li>
                    ${roleMenu}
                    <li><a class="dropdown-item" href="${frontendPath('user/index.html')}"><i class="fas fa-user-circle me-2"></i>${t('nav.profile')}</a></li>
                    <li><a class="dropdown-item" href="${frontendPath('user/orders.html')}"><i class="fas fa-history me-2"></i>${t('nav.orders')}</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="logout()"><i class="fas fa-sign-out-alt me-2"></i>${t('nav.logout')}</a></li>
                </ul>
            `;
        } catch (e) {
            removeTokens();
            authSection.innerHTML = `<a href="${frontendPath('login.html')}" class="btn btn-danger rounded-pill px-4 fw-bold shadow-sm">${t('nav.login')}</a>`;
        }
    } else {
        authSection.innerHTML = `<a href="${frontendPath('login.html')}" class="btn btn-danger rounded-pill px-4 fw-bold shadow-sm">${t('nav.login')}</a>`;
    }
}

function renderLanguageSwitcher() {
    const container = document.getElementById('language-section');
    if (!container) return;
    const lang = getPreferredLanguage();
    container.innerHTML = `
        <a class="nav-link dropdown-toggle d-flex align-items-center gap-1" href="#" role="button" data-bs-toggle="dropdown" title="${t('common.language')}">
            <i class="fas fa-globe"></i><span class="small fw-bold" data-language-label>${lang.toUpperCase()}</span>
        </a>
        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
            <li><button class="dropdown-item ${lang === 'vi' ? 'active' : ''}" type="button" onclick="setPreferredLanguage('vi')">${t('common.vietnamese')}</button></li>
            <li><button class="dropdown-item ${lang === 'en' ? 'active' : ''}" type="button" onclick="setPreferredLanguage('en')">${t('common.english')}</button></li>
        </ul>
    `;
}
// --- 5. HÀM CẬP NHẬT GIỎ HÀNG (MỚI THÊM) ---
window.updateCartBadge = async function() {
    const badge = document.getElementById('cart-count-badge');
    if (!badge) return;

    const token = getAccessToken();
    if (!token) {
        badge.style.display = 'none';
        return;
    }

    try {
        // Gọi API lấy giỏ hàng
        const cartItems = await fetchAPI('/cart/');
        
        // Đếm tổng số lượng (Tùy cấu trúc API trả về list hay object)
        let count = 0;
        if (Array.isArray(cartItems)) {
            count = cartItems.length;
        } else if (cartItems && Number.isFinite(Number(cartItems.total_items))) {
            count = Number(cartItems.total_items);
        } else if (cartItems && cartItems.results) {
            count = cartItems.results.length;
        }

        if (count > 0) {
            badge.innerText = count;
            badge.style.display = 'inline-block'; // Hiện badge
            badge.classList.add('animate__animated', 'animate__bounceIn'); // Hiệu ứng nhảy
        } else {
            badge.style.display = 'none';
        }
    } catch (e) {
        console.error("Không thể tải giỏ hàng:", e);
        badge.style.display = 'none';
    }
};

// --- 6. HÀM ĐĂNG XUẤT (MỚI THÊM) ---
window.logout = function() {
    clearTokens();
    redirectTo('login.html');
};

// --- 7. HELPER: Highlight Menu ---
function highlightActiveMenu() {
    const path = window.location.pathname;
    const page = path.split("/").pop();
    
    const links = document.querySelectorAll('.primary-nav .nav-link');
    links.forEach(link => {
        if (link.getAttribute('href') === page) {
            link.classList.add('text-danger', 'active');
        }
    });
}

// --- 8. XỬ LÝ TÌM KIẾM ---
window.handleGlobalSearch = function(e) {
    e.preventDefault();
    const keyword = document.getElementById('global-search').value.trim();
    if(keyword) {
        redirectTo(`products.html?search=${encodeURIComponent(keyword)}`);
    }
}
document.addEventListener("DOMContentLoaded", function() {
    // Chờ một chút để header được nạp xong (nếu bạn dùng fetch)
    setTimeout(() => {
        const chatMenuItem = document.getElementById('chat-menu-item');
        
        // Sử dụng hàm getAccessToken() có sẵn trong core.js của bạn
        if (typeof getAccessToken === 'function' && getAccessToken()) {
            if (chatMenuItem) {
                chatMenuItem.style.display = 'block'; // Hiển thị nếu đã login
            }
        } else {
            if (chatMenuItem) {
                chatMenuItem.style.display = 'none'; // Ẩn nếu chưa login
            }
        }
    }, 100); // Delay nhẹ để đảm bảo DOM đã sẵn sàng
});
