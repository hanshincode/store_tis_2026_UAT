// js/product.js
checkNavbar();

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

async function loadDetail() {
    if (!productId) return;
    const p = await fetchAPI(`/products/${productId}/`);
    
    // Render ảnh và thông tin (Rút gọn cho dễ nhìn)
    document.getElementById('p-name').innerText = p.name;
    document.getElementById('p-desc').innerText = p.description;
    document.getElementById('p-img').src = p.images.length ? MEDIA_URL + p.images[0].image : '';

    // Render gói
    const pkgContainer = document.getElementById('pkg-container');
    pkgContainer.innerHTML = p.packages.map(pkg => `
        <div class="pkg-option">
            <input type="radio" name="pkg" value="${pkg.id}" checked>
            <strong>${pkg.duration_label}</strong> - ${formatMoney(pkg.price)}
        </div>
    `).join('');
}

// Hàm Mua Ngay
async function buyNow() {
    if (!getUser()) return alert("Vui lòng đăng nhập!");
    const pkgId = document.querySelector('input[name="pkg"]:checked').value;
    
    const res = await fetchAPI('/orders/buy_now/', 'POST', { package_id: pkgId, quantity: 1 });
    if (res && res.code) {
        alert("Mua thành công! Mã đơn: " + res.code);
        window.location.href = 'profile.html';
    }
}

loadDetail();