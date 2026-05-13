/**
 * js/products.js
 * Hiển thị danh sách sản phẩm và lọc theo danh mục, đối tượng, từ khóa.
 */

let allProducts = [];
let allCategories = [];

const productFilters = {
    category: 'all',
    target: 'all',
    search: '',
};

document.addEventListener('DOMContentLoaded', async () => {
    readFiltersFromUrl();
    renderTargetFilters();
    await Promise.all([loadCategories(), loadProducts()]);
    syncFilterUI();
    applyProductFilters(false);
});

async function loadCategories() {
    const containerDesktop = document.getElementById('category-list-container');
    const containerMobile = document.getElementById('category-list-mobile');

    try {
        allCategories = await fetchAPI('/categories/');
        let html = `
            <button type="button" class="filter-chip" data-filter-category="all" onclick="filterProducts(this, 'all')">
                <i class="fas fa-layer-group"></i>
                <span>Tất cả sản phẩm</span>
            </button>
        `;

        if (allCategories && allCategories.length > 0) {
            html += allCategories.map(c => `
                <button type="button" class="filter-chip" data-filter-category="${c.id}" onclick="filterProducts(this, '${c.id}')">
                    <i class="fas fa-shield-halved"></i>
                    <span>${escapeHTML(c.name)}</span>
                </button>
            `).join('');
        }

        if (containerDesktop) containerDesktop.innerHTML = html;
        if (containerMobile) containerMobile.innerHTML = html;
    } catch (e) {
        console.error('Lỗi tải danh mục:', e);
        const errorHtml = `
            <button type="button" class="filter-chip active" data-filter-category="all" onclick="filterProducts(this, 'all')">
                <i class="fas fa-layer-group"></i>
                <span>Tất cả sản phẩm</span>
            </button>
        `;
        if (containerDesktop) containerDesktop.innerHTML = errorHtml;
        if (containerMobile) containerMobile.innerHTML = errorHtml;
    }
}

function renderTargetFilters() {
    const html = `
        <button type="button" data-filter-target="all" onclick="filterTargetProducts(this, 'all')">
            <i class="fas fa-layer-group"></i>
            <span>Tất cả</span>
        </button>
        <button type="button" data-filter-target="ind" onclick="filterTargetProducts(this, 'ind')">
            <i class="fas fa-user"></i>
            <span>Cá nhân</span>
        </button>
        <button type="button" data-filter-target="ent" onclick="filterTargetProducts(this, 'ent')">
            <i class="fas fa-building"></i>
            <span>Doanh nghiệp</span>
        </button>
    `;

    document.querySelectorAll('#target-list-container, #target-list-mobile').forEach(container => {
        container.innerHTML = html;
    });
}

async function loadProducts() {
    const container = document.getElementById('product-list');
    if (!container) return;

    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-danger" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>`;

    try {
        allProducts = await fetchAPI('/products/');
        window.allProducts = allProducts;
    } catch (e) {
        console.error('Lỗi tải sản phẩm:', e);
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <p>Không thể tải dữ liệu sản phẩm.</p>
                <button class="btn btn-sm btn-outline-secondary" onclick="loadProducts()">Thử lại</button>
            </div>`;
    }
}

window.filterProducts = function(element, categoryId) {
    productFilters.category = String(categoryId || 'all');
    syncFilterUI();
    applyProductFilters();
    closeFilterOffcanvas();
};

window.filterTargetProducts = function(element, target) {
    productFilters.target = target || 'all';
    syncFilterUI();
    applyProductFilters();
    closeFilterOffcanvas();
};

window.searchProducts = function(keyword) {
    productFilters.search = (keyword || '').trim().toLowerCase();
    applyProductFilters();
};

function applyProductFilters(updateUrl = true) {
    let products = [...allProducts];

    if (productFilters.category !== 'all') {
        products = products.filter(p => String(p.category) === String(productFilters.category));
    }

    if (productFilters.target !== 'all') {
        products = products.filter(p => p.target_audience === productFilters.target);
    }

    if (productFilters.search) {
        products = products.filter(p => {
            const haystack = [
                p.name,
                p.short_description,
                p.description,
                p.category_name,
                getTargetLabel(p.target_audience),
            ].filter(Boolean).join(' ').toLowerCase();
            return haystack.includes(productFilters.search);
        });
    }

    renderProducts(products);
    updateFilterTitle(products.length);
    if (updateUrl) writeFiltersToUrl();
}

function renderProducts(products) {
    const container = document.getElementById('product-list');
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <h5>Không có sản phẩm phù hợp với bộ lọc hiện tại.</h5>
                <button class="btn btn-outline-danger rounded-pill px-4 mt-3" onclick="resetProductFilters()">Xóa bộ lọc</button>
            </div>`;
        return;
    }

    container.innerHTML = products.map(p => {
        let imgUrl = 'https://placehold.co/400x300/f8f9fa/d71920?text=TIS+Broker';
        if (p.images && p.images.length > 0) imgUrl = mediaUrl(p.images[0].image);

        let priceDisplay = '';
        if (p.is_price_hidden) {
            priceDisplay = '<span class="text-primary fw-bold">Liên hệ</span>';
        } else if (p.base_price) {
            priceDisplay = `<span class="text-danger fw-bold">${formatMoney(p.base_price)}</span>`;
        } else {
            priceDisplay = '<span class="text-muted small">Đang cập nhật</span>';
        }

        const shortDesc = trimText(stripHTML(p.short_description || p.description || ''), 95);
        const targetLabel = getTargetLabel(p.target_audience);
        const targetIcon = p.target_audience === 'ent' ? 'fa-building' : 'fa-user';

        return `
            <div class="col-md-6 col-lg-4 mb-4 product-item-col">
                <div class="card h-100 border-0 shadow-sm product-card hover-shadow transition-all">
                    <div class="product-img-wrapper">
                        <a href="product-detail.html?id=${p.id}">
                            <img src="${imgUrl}" class="card-img-top" alt="${escapeHTML(p.name)}">
                        </a>
                        ${p.category_name ? `<span class="badge-category">${escapeHTML(p.category_name)}</span>` : ''}
                    </div>

                    <div class="card-body d-flex flex-column">
                        <div class="product-meta mb-2">
                            <span><i class="fas ${targetIcon} me-1"></i>${targetLabel}</span>
                        </div>
                        <h5 class="card-title fw-bold mb-2 product-title">
                            <a href="product-detail.html?id=${p.id}" class="text-decoration-none text-dark stretched-link-custom">
                                ${escapeHTML(p.name)}
                            </a>
                        </h5>
                        <p class="card-text text-muted small mb-4 flex-grow-1 product-desc">
                            ${escapeHTML(shortDesc || 'Thông tin sản phẩm đang được cập nhật.')}
                        </p>

                        <div class="d-flex justify-content-between align-items-center mt-auto border-top pt-3">
                            <div class="price-tag">${priceDisplay}</div>
                            <a href="product-detail.html?id=${p.id}" class="btn btn-outline-danger btn-sm rounded-pill px-3">
                                Xem chi tiết <i class="fas fa-arrow-right ms-1"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.resetProductFilters = function() {
    productFilters.category = 'all';
    productFilters.target = 'all';
    productFilters.search = '';

    const searchInput = document.getElementById('product-search-input');
    if (searchInput) searchInput.value = '';

    syncFilterUI();
    applyProductFilters();
};

function readFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);
    productFilters.category = params.get('category') || 'all';
    productFilters.target = params.get('target') || params.get('target_audience') || 'all';
    productFilters.search = (params.get('search') || '').trim().toLowerCase();

    const searchInput = document.getElementById('product-search-input');
    if (searchInput) searchInput.value = productFilters.search;
}

function writeFiltersToUrl() {
    const params = new URLSearchParams();
    if (productFilters.category !== 'all') params.set('category', productFilters.category);
    if (productFilters.target !== 'all') params.set('target', productFilters.target);
    if (productFilters.search) params.set('search', productFilters.search);

    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, '', nextUrl);
}

function syncFilterUI() {
    document.querySelectorAll('[data-filter-category]').forEach(item => {
        item.classList.toggle('active', String(item.dataset.filterCategory) === String(productFilters.category));
    });

    document.querySelectorAll('[data-filter-target]').forEach(item => {
        item.classList.toggle('active', item.dataset.filterTarget === productFilters.target);
    });
}

function updateFilterTitle(count) {
    const title = document.getElementById('product-filter-title');
    if (!title) return;

    const categoryName = productFilters.category === 'all'
        ? 'Tất cả danh mục'
        : (allCategories.find(c => String(c.id) === String(productFilters.category))?.name || 'Danh mục đã chọn');
    const targetName = productFilters.target === 'all' ? 'mọi đối tượng' : getTargetLabel(productFilters.target);

    title.textContent = `${categoryName} · ${targetName} (${count})`;
}

function closeFilterOffcanvas() {
    const offcanvasEl = document.getElementById('offcanvasCategory');
    if (!offcanvasEl || typeof bootstrap === 'undefined') return;

    const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasEl);
    if (offcanvasInstance) offcanvasInstance.hide();
}

function getTargetLabel(target) {
    return target === 'ent' ? 'Doanh nghiệp' : 'Cá nhân';
}

function stripHTML(value) {
    return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function trimText(value, maxLength) {
    const text = String(value || '').trim();
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}
