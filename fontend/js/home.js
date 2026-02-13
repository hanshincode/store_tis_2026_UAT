// js/home.js
checkNavbar(); // Hàm từ common.js

async function loadFeaturedProducts() {
    const products = await fetchAPI('/products/featured/');
    const container = document.getElementById('product-list');
    
    if (!products) return;

    container.innerHTML = products.map(p => `
        <div class="col-md-4 mb-4">
            <div class="card product-card h-100 shadow-sm">
                ${p.provider_name ? `<span class="provider-badge">${p.provider_name}</span>` : ''}
                <img src="${p.images.length ? MEDIA_URL + p.images[0].image : ''}" class="card-img-top">
                <div class="card-body">
                    <h5>${p.name}</h5>
                    <p class="text-muted small">${p.description.substring(0,80)}...</p>
                    <a href="product.html?id=${p.id}" class="btn btn-outline-primary w-100">Xem chi tiết</a>
                </div>
            </div>
        </div>
    `).join('');
}
loadFeaturedProducts();


async function loadNews() {
    // Giả sử bạn đã tạo vài tin tức trong Admin
    const newsList = await fetchAPI('/news/');
    const container = document.getElementById('news-container'); // Bạn cần thêm div này vào index.html
    
    if (!newsList) return;

    container.innerHTML = newsList.map(n => `
        <div class="col-md-4 mb-3">
            <div class="card h-100">
                <img src="${n.image}" class="card-img-top" style="height: 150px; object-fit: cover">
                <div class="card-body">
                    <h5 class="card-title">${n.title}</h5>
                    <p class="card-text small">${n.content.substring(0, 100)}...</p>
                    <a href="#" class="btn btn-link p-0">Xem thêm</a>
                </div>
            </div>
        </div>
    `).join('');
}
loadNews(); // Gọi hàm này cùng lúc với loadFeaturedProducts