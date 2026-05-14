// js/home.js

let homeProducts = [];
let currentHomeTarget = 'all';
let currentHomeProductGroup = 0;
let homeProductCarouselTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 800, once: true });
    }
    loadHomeBanners();
    loadFeaturedProducts();
    loadLatestNews();
});

async function loadHomeBanners() {
    const container = document.getElementById('banner-list');
    if (!container) return;

    try {
        const banners = normalizeList(await fetchAPI('/banners/')).filter(b => b.is_active);
        if (!banners.length) return;
        const carouselBanners = banners.filter(b => b.template === 'carousel');
        const normalBanners = banners.filter(b => b.template !== 'carousel');
        const gridBannerCount = normalBanners.filter(b => b.template === 'triple_grid').length;
        container.classList.toggle('banner-grid-mode', gridBannerCount >= 2);
        container.innerHTML = [
            carouselBanners.length ? renderBannerCarousel(carouselBanners) : '',
            normalBanners.map(renderHybridBanner).join('')
        ].join('');
        startHomeBannerCarousel(container);
    } catch (error) {
        console.error('Lỗi tải banner:', error);
    }
}

function renderBannerCarousel(banners) {
    const slidesData = banners.flatMap(banner => {
        if (banner.slides?.length) {
            return banner.slides
                .filter(slide => slide.is_active !== false)
                .map(slide => ({
                    title: slide.title,
                    subtitle: slide.subtitle,
                    button_text: slide.button_text,
                    button_link: slide.button_link,
                    background_image: slide.image,
                    template: 'carousel_slide',
                }));
        }
        return [{ ...banner, template: 'carousel_slide' }];
    });

    const slides = slidesData.map((banner, index) => {
        const slide = renderHybridBanner(banner);
        return slide.replace('class="hybrid-banner ', `class="hybrid-banner ${index === 0 ? 'active' : ''} `);
    }).join('');

    const tabs = slidesData.map((banner, index) => `
        <button type="button" class="${index === 0 ? 'active' : ''}" data-carousel-tab="${index}">
            <strong>${escapeHTML(banner.title || `Banner ${index + 1}`)}</strong>
            <span>${escapeHTML(banner.subtitle || banner.button_text || '')}</span>
        </button>
    `).join('');

    return `
        <div class="home-banner-carousel" data-home-carousel>
            <div class="home-banner-carousel-tabs">${tabs}</div>
            <div class="home-banner-carousel-track">${slides}</div>
            <button type="button" class="home-banner-carousel-nav prev" data-carousel-prev aria-label="Banner trước">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button type="button" class="home-banner-carousel-nav next" data-carousel-next aria-label="Banner sau">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

function startHomeBannerCarousel(scope = document) {
    scope.querySelectorAll('[data-home-carousel]').forEach(carousel => {
        const slides = Array.from(carousel.querySelectorAll('.hybrid-banner'));
        const tabs = Array.from(carousel.querySelectorAll('[data-carousel-tab]'));
        if (slides.length <= 1) return;

        let index = 0;
        const show = nextIndex => {
            index = (nextIndex + slides.length) % slides.length;
            slides.forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === index));
            tabs.forEach((tab, tabIndex) => tab.classList.toggle('active', tabIndex === index));
        };

        carousel.querySelector('[data-carousel-prev]')?.addEventListener('click', () => show(index - 1));
        carousel.querySelector('[data-carousel-next]')?.addEventListener('click', () => show(index + 1));
        tabs.forEach((tab, tabIndex) => tab.addEventListener('click', () => show(tabIndex)));
        setInterval(() => show(index + 1), 5000);
    });
}

function renderHybridBanner(banner) {
    const template = banner.template || 'single_left';
    const imageUrl = banner.background_image ? mediaUrl(banner.background_image) : 'https://placehold.co/1600x720/f8f9fa/d71920?text=TIS+Banner';
    const primaryBtn = banner.button_text
        ? `<a href="${escapeHTML(banner.button_link || '#products')}" class="btn btn-danger btn-lg rounded-pill px-5 fw-bold shadow">${escapeHTML(banner.button_text)}</a>`
        : '';
    const secondaryBtn = banner.secondary_button_text
        ? `<a href="${escapeHTML(banner.secondary_button_link || '#about')}" class="btn btn-outline-dark btn-lg rounded-pill px-4">${escapeHTML(banner.secondary_button_text)}</a>`
        : '';

    const overlay = template === 'custom_html' && banner.custom_html
        ? banner.custom_html
        : `
            ${banner.eyebrow ? `<span class="hybrid-eyebrow">${escapeHTML(banner.eyebrow)}</span>` : ''}
            <h1>${escapeHTML(banner.title || 'TIS Broker')}</h1>
            ${banner.subtitle ? `<p>${escapeHTML(banner.subtitle)}</p>` : ''}
            ${(primaryBtn || secondaryBtn) ? `<div class="hybrid-banner-actions">${primaryBtn}${secondaryBtn}</div>` : ''}
        `;

    return `
        <div class="hybrid-banner banner-template-${escapeHTML(template)}" style="background-image: url('${imageUrl}');">
            <div class="hybrid-banner-overlay">
                ${overlay}
            </div>
        </div>
    `;
}

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
    currentHomeProductGroup = 0;

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
        homeProducts = normalizeList(await fetchAPI('/products/'));

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

    const groupSize = currentHomeTarget === 'all' ? 9 : 3;
    const groups = chunkArray(products, groupSize);
    if (!groups.length) {
        container.innerHTML = '<div class="col-12 text-center py-5 text-muted">Chưa có sản phẩm nào.</div>';
        return;
    }
    currentHomeProductGroup = Math.min(currentHomeProductGroup, groups.length - 1);

    container.innerHTML = `
        <div class="col-12">
            <div class="home-product-carousel" data-home-product-carousel>
                <div class="home-product-carousel-window">
                    ${groups.map((group, groupIndex) => `
                        <div class="home-product-group ${groupIndex === currentHomeProductGroup ? 'active' : ''}" data-home-product-group="${groupIndex}">
                            <div class="row g-4">
                                ${group.map((p, idx) => renderHomeProductCard(p, idx)).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${groups.length > 1 ? renderHomeProductCarouselControls(groups.length) : ''}
            </div>
        </div>
    `;

    bindHomeProductCarousel(groups.length);

    if (typeof AOS !== 'undefined') AOS.refresh();
}

function renderHomeProductCard(p, idx) {
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
        <div class="col-lg-4 col-md-6">
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
}

function renderHomeProductCarouselControls(groupCount) {
    const dots = Array.from({ length: groupCount }, (_, index) => `
        <button type="button" class="${index === currentHomeProductGroup ? 'active' : ''}" data-home-product-dot="${index}" aria-label="Nhóm sản phẩm ${index + 1}"></button>
    `).join('');

    return `
        <div class="home-product-carousel-controls">
            <button type="button" class="home-product-nav" data-home-product-prev aria-label="Nhóm trước">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div class="home-product-dots">${dots}</div>
            <button type="button" class="home-product-nav" data-home-product-next aria-label="Nhóm sau">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

function bindHomeProductCarousel(groupCount) {
    clearInterval(homeProductCarouselTimer);
    if (groupCount <= 1) return;

    const carousel = document.querySelector('[data-home-product-carousel]');
    if (!carousel) return;

    const showGroup = nextIndex => {
        currentHomeProductGroup = (nextIndex + groupCount) % groupCount;
        carousel.querySelectorAll('[data-home-product-group]').forEach(group => {
            group.classList.toggle('active', Number(group.dataset.homeProductGroup) === currentHomeProductGroup);
        });
        carousel.querySelectorAll('[data-home-product-dot]').forEach(dot => {
            dot.classList.toggle('active', Number(dot.dataset.homeProductDot) === currentHomeProductGroup);
        });
    };

    carousel.querySelector('[data-home-product-prev]')?.addEventListener('click', () => showGroup(currentHomeProductGroup - 1));
    carousel.querySelector('[data-home-product-next]')?.addEventListener('click', () => showGroup(currentHomeProductGroup + 1));
    carousel.querySelectorAll('[data-home-product-dot]').forEach(dot => {
        dot.addEventListener('click', () => showGroup(Number(dot.dataset.homeProductDot)));
    });

    homeProductCarouselTimer = setInterval(() => showGroup(currentHomeProductGroup + 1), 6000);
    carousel.addEventListener('mouseenter', () => clearInterval(homeProductCarouselTimer));
    carousel.addEventListener('mouseleave', () => {
        clearInterval(homeProductCarouselTimer);
        homeProductCarouselTimer = setInterval(() => showGroup(currentHomeProductGroup + 1), 6000);
    });
}

function chunkArray(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

async function loadLatestNews() {
    const container = document.getElementById('news-list');
    if (!container) return;

    try {
        const news = normalizeList(await fetchAPI('/news/'));

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
