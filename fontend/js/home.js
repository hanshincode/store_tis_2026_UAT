// js/home.js

let homeProducts = [];
let currentHomeTarget = 'all';

document.addEventListener('DOMContentLoaded', () => {
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 800, once: true });
    }
    loadFeaturedProducts();
    loadLatestNews();
});

window.handleQuickBuy = async function(packageId, productId) {
    if (!getAccessToken()) {
        Toast.fire({ icon: 'warning', title: 'Vui lòng đăng nhập để mua hàng' });
        setTimeout(() => redirectTo('login.html'), 1500);
        return;
    }
    try {
        await fetchAPI('/cart/add/', 'POST', {
            product_id: productId,
            package_id: packageId,
            quantity: 1
        });
        Toast.fire({ icon: 'success', title: 'Đã thêm vào giỏ hàng' });
        if (typeof updateCartBadge === 'function') updateCartBadge();
    } catch (e) {
        Toast.fire({ icon: 'error', title: 'Không thể thêm vào giỏ hàng' });
    }
};

window.filterHomeProducts = function(target, button) {
    currentHomeTarget = target || 'all';

    document.querySelectorAll('[data-home-target]').forEach(btn => {
        const isActive = btn.dataset.homeTarget === currentHomeTarget;
        btn.classList.toggle('active', isActive);
        btn.classList.toggle('btn-danger', isActive);
        btn.classList.toggle('btn-outline-danger', !isActive);
    });

    renderHomeProducts();
};

async function loadFeaturedProducts() {
    const container = document.getElementById('product-list');
    if (!container) return;

    try {
        homeProducts = await fetchAPI('/products/');

        if (!homeProducts || homeProducts.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5 text-muted">Chưa có sản phẩm nào.</div>';
            return;
        }

        renderHomeProducts();
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="col-12 text-center py-5 text-danger">Lỗi kết nối máy chủ.</div>';
    }
}

function renderHomeProducts() {
    const container = document.getElementById('product-list');
    if (!container) return;

    const products = currentHomeTarget === 'all'
        ? homeProducts
        : homeProducts.filter(p => p.target_audience === currentHomeTarget);

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
                Chưa có sản phẩm cho nhóm ${currentHomeTarget === 'ent' ? 'doanh nghiệp' : 'cá nhân'}.
            </div>`;
        return;
    }

    container.innerHTML = products.slice(0, 6).map((p, idx) => {
        let imageUrl = 'https://placehold.co/400x250?text=TIS+Broker';
        if (p.images?.length > 0) imageUrl = mediaUrl(p.images[0].image);

        const cleanDesc = stripHTML(p.short_description || p.description || 'An tâm bảo vệ tài chính cùng TIS.');
        const targetLabel = p.target_audience === 'ent' ? 'Doanh nghiệp' : 'Cá nhân';
        const targetIcon = p.target_audience === 'ent' ? 'fa-building' : 'fa-user';

        let priceDisplayHTML = '';
        let actionButtonHTML = '';
        const defaultPackageId = p.packages?.[0]?.id || null;

        if (p.is_price_hidden) {
            priceDisplayHTML = `<span class="text-danger fw-bold h5">Liên hệ</span>`;
            actionButtonHTML = `
                <button onclick="window.location.href='product-detail.html?id=${p.id}'"
                        class="btn btn-outline-danger btn-sm rounded-pill px-3">
                    Xem chi tiết
                </button>`;
        } else {
            priceDisplayHTML = `
                <small class="text-muted d-block">Phí từ</small>
                <span class="text-danger fw-bold h5">${formatMoney(p.base_price)}</span>`;

            actionButtonHTML = `
                <button onclick="event.stopPropagation(); handleQuickBuy(${defaultPackageId}, ${p.id})"
                        class="btn btn-danger btn-sm rounded-pill px-3">
                    Mua ngay
                </button>`;
        }

        return `
            <div class="col-lg-4 col-md-6 mb-4" data-aos="fade-up" data-aos-delay="${idx * 100}">
                <div class="card h-100 shadow-sm border-0 home-product-card" onclick="window.location.href='product-detail.html?id=${p.id}'">
                    <div class="position-relative">
                        <span class="badge bg-danger position-absolute top-0 start-0 m-3 shadow-sm">${escapeHTML(p.category_name || 'TIS')}</span>
                        <span class="badge bg-light text-dark border position-absolute top-0 end-0 m-3 shadow-sm">
                            <i class="fas ${targetIcon} me-1"></i>${targetLabel}
                        </span>
                        <img src="${imageUrl}" class="card-img-top" style="height: 200px; object-fit: cover;" alt="${escapeHTML(p.name)}">
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="fw-bold text-truncate" title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</h5>
                        <p class="text-muted small flex-grow-1">${escapeHTML(trimText(cleanDesc, 100))}</p>
                        <div class="d-flex justify-content-between align-items-end mt-3 pt-3 border-top">
                            <div>${priceDisplayHTML}</div>
                            ${actionButtonHTML}
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');

    if (typeof AOS !== 'undefined') AOS.refresh();
}

async function loadLatestNews() {
    const container = document.getElementById('news-list');
    if (!container) return;

    try {
        const news = await fetchAPI('/news/');

        if (!news || news.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-4 text-muted">Đang cập nhật bài viết mới...</div>';
            return;
        }

        container.innerHTML = news.slice(0, 3).map((n, idx) => {
            let imageUrl = 'https://placehold.co/400x250/f8f9fa/6c757d?text=TIS+News';
            if (n.image) imageUrl = mediaUrl(n.image);

            const cleanDesc = stripHTML(n.content || 'Đang cập nhật nội dung...');
            const dateStr = n.created_at ? new Date(n.created_at).toLocaleDateString('vi-VN') : '';

            return `
                <div class="col-lg-4 col-md-6 d-flex" data-aos="fade-up" data-aos-delay="${idx * 100}">
                    <div class="card news-card bg-white shadow-sm h-100 overflow-hidden border-0 cursor-pointer w-100"
                         onclick="window.location.href='news-detail.html?id=${n.id}'">
                        <div class="news-img-wrapper">
                            <img src="${imageUrl}" alt="${escapeHTML(n.title)}" onerror="this.onerror=null; this.src='https://placehold.co/400x250/f8f9fa/6c757d?text=TIS+News';">
                        </div>
                        <div class="card-body news-card-body p-4 d-flex flex-column">
                            <div class="d-flex align-items-center mb-2 text-muted small">
                                <i class="far fa-calendar-alt me-2 text-danger"></i> ${dateStr}
                            </div>
                            <h5 class="news-title fw-bold mb-3">
                                <a href="news-detail.html?id=${n.id}" class="text-dark text-decoration-none hover-red">${escapeHTML(n.title)}</a>
                            </h5>
                            <p class="news-excerpt text-secondary small mb-0">${escapeHTML(cleanDesc)}</p>
                            <span class="news-read-more text-danger small fw-bold text-decoration-none mt-auto pt-4">Đọc tiếp <i class="fas fa-arrow-right ms-1"></i></span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Lỗi tải tin tức:', e);
        container.innerHTML = '';
    }
}

function stripHTML(value) {
    return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function trimText(value, maxLength) {
    const text = String(value || '').trim();
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}
