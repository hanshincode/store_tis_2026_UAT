/**
 * js/products.js - Phiên bản Layout Mới
 */

let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadProducts();
});

// --- 1. TẢI VÀ RENDER SIDEBAR DANH MỤC ---
async function loadCategories() {
    const container = document.getElementById('category-list-container');
    if (!container) return;

    try {
        const categories = await fetchAPI('/categories/');
        
        // Tạo nút "Tất cả" (luôn nằm đầu tiên)
        let html = `
            <li class="category-item">
                <a href="javascript:void(0)" class="category-link active" onclick="filterProducts(this, 'all')">
                    <span><i class="fas fa-th-large me-2"></i> Tất cả sản phẩm</span>
                    <i class="fas fa-chevron-right small"></i>
                </a>
            </li>
        `;
        
        if (categories && categories.length > 0) {
            html += categories.map(c => `
                <li class="category-item">
                    <a href="javascript:void(0)" class="category-link" onclick="filterProducts(this, ${c.id})">
                        <span>${c.name}</span>
                        <i class="fas fa-chevron-right small text-muted"></i>
                    </a>
                </li>
            `).join('');
        }
        
        container.innerHTML = html;
    } catch (e) {
        console.error("Lỗi danh mục:", e);
        container.innerHTML = `<li class="p-3 text-center text-danger">Lỗi tải danh mục</li>`;
    }
}

// --- 2. TẢI VÀ RENDER SẢN PHẨM ---
async function loadProducts() {
    const container = document.getElementById('product-list');
    
    try {
        allProducts = await fetchAPI('/products/');
        renderProducts(allProducts);
    } catch (e) {
        console.error("Lỗi sản phẩm:", e);
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <p>Không thể tải dữ liệu sản phẩm.</p>
                <button class="btn btn-sm btn-outline-secondary" onclick="loadProducts()">Thử lại</button>
            </div>`;
    }
}

function renderProducts(products) {
    const container = document.getElementById('product-list');
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5"><h5>Chưa có sản phẩm nào.</h5></div>';
        return;
    }

    const html = products.map(p => {
        // Xử lý ảnh
        let imgUrl = 'https://placehold.co/400x300/f8f9fa/d71920?text=TIS';
        if (p.images && p.images.length > 0) {
            let src = p.images[0].image;
            if (src && !src.startsWith('http')) {
                src = DOMAIN + (src.startsWith('/') ? src : '/' + src);
            }
            imgUrl = src;
        }

        // Xử lý giá
        let priceDisplay = p.is_price_hidden 
            ? '<span class="text-muted fst-italic">Liên hệ</span>' 
            : `${formatMoney(p.base_price)} <span class="small text-muted fw-normal">/ năm</span>`;

        // Card HTML Mới
        return `
            <div class="col-6 col-md-4 col-lg-4 product-item-col">
                <div class="product-card h-100 d-flex flex-column">
                    <div class="product-img-wrapper">
                        ${p.category_name ? `<span class="badge-category shadow-sm">${p.category_name}</span>` : ''}
                        <a href="product-detail.html?id=${p.id}">
                            <img src="${imgUrl}" alt="${p.name}">
                        </a>
                    </div>
                    
                    <div class="card-body">
                        <h3 class="product-title mb-2">
                            <a href="product-detail.html?id=${p.id}" title="${p.name}">${p.name}</a>
                        </h3>
                        
                        <div class="product-desc mb-3">
                            ${p.short_description || 'Đang cập nhật mô tả...'}
                        </div>
                        
                        <div class="mt-auto d-flex justify-content-between align-items-center">
                            <div class="price-section">${priceDisplay}</div>
                            <a href="product-detail.html?id=${p.id}" class="btn-view-detail shadow-sm">
                                <i class="fas fa-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// --- 3. LOGIC CLICK DANH MỤC ---
window.filterProducts = function(linkElement, categoryId) {
    // Active style
    const links = document.querySelectorAll('.category-link');
    links.forEach(l => l.classList.remove('active'));
    linkElement.classList.add('active'); // Tô đỏ mục được chọn

    // Filter Logic
    if (categoryId === 'all') {
        renderProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category == categoryId);
        renderProducts(filtered);
    }
};