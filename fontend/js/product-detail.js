/**
 * js/product-detail.js
 * Chức năng: Quản lý hiển thị chi tiết sản phẩm, giỏ hàng và tạo ticket tư vấn.
 */

let currentProduct = null;
let selectedPackageId = null;

// --- 1. KHỞI TẠO (INITIALIZATION) ---

document.addEventListener('DOMContentLoaded', () => {
    // Lấy ID từ URL: product-detail.html?id=...
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = 'products.html';
        return;
    }

    loadProductDetail(productId);
});

/**
 * Tải dữ liệu sản phẩm từ API
 */
async function loadProductDetail(id) {
    const container = document.getElementById('product-detail-container');
    if (!container) return;

    try {
        currentProduct = await fetchAPI(`/products/${id}/`);
        
        // Cập nhật tên trên Breadcrumb
        const breadcrumb = document.getElementById('breadcrumb-name');
        if (breadcrumb) breadcrumb.innerText = currentProduct.name;

        renderDetailUI();
    } catch (e) {
        console.error("Lỗi tải chi tiết sản phẩm:", e);
        container.innerHTML = `
            <div class="text-center py-5">
                <h3 class="fw-bold">Sản phẩm không tồn tại hoặc đã bị gỡ bỏ</h3>
                <a href="products.html" class="btn btn-danger rounded-pill px-4 mt-3">Quay lại danh sách</a>
            </div>
        `;
    }
}

// --- 2. HIỂN THỊ (RENDERING) ---

function renderDetailUI() {
    const container = document.getElementById('product-detail-container');
    const p = currentProduct;
    if (!p) return;

    // Xử lý ảnh chính và danh sách ảnh phụ
    let mainImageUrl = getValidImageUrl(p.images?.length > 0 ? p.images[0].image : null);
    let imagesHtml = '';
    if (p.images && p.images.length > 1) {
        let thumbnails = p.images.map((imgObj, idx) => {
            let thumbUrl = getValidImageUrl(imgObj.image);
            return `
                <div class="col-3">
                    <img src="${thumbUrl}" class="thumbnail-img ${idx === 0 ? 'active' : ''}" 
                         onclick="changeMainImage(this, '${thumbUrl}')">
                </div>
            `;
        }).join('');
        imagesHtml = `<div class="row g-2 mt-2">${thumbnails}</div>`;
    }

    // Xử lý các gói bảo hiểm
    let packagesHtml = '';
    let displayPrice = p.base_price ? formatMoney(p.base_price) : 'Liên hệ';
    
    if (p.packages && p.packages.length > 0) {
        selectedPackageId = p.packages[0].id;
        displayPrice = formatMoney(p.packages[0].price);

        packagesHtml = p.packages.map((pkg, idx) => {
            return `
                <label class="package-option d-block mb-3 ${idx === 0 ? 'selected' : ''}" id="pkg-label-${pkg.id}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <input type="radio" name="product_package" value="${pkg.id}" class="form-check-input me-3" 
                                   ${idx === 0 ? 'checked' : ''} onchange="selectPackage(${pkg.id}, ${pkg.price})">
                            <div>
                                <h6 class="mb-0 fw-bold">${pkg.duration_label}</h6>
                                <small class="text-muted">${pkg.duration_days} ngày bảo vệ</small>
                            </div>
                        </div>
                        <div class="fw-bold text-danger">${formatMoney(pkg.price)}</div>
                    </div>
                </label>
            `;
        }).join('');
    }

    // --- CẬP NHẬT CHÍNH TẠI ĐÂY ---
    // 1. Sử dụng p.short_description cho phần mô tả ngắn (Detail Base)
    // 2. Sử dụng p.description cho phần chi tiết (Detail Final)
    container.innerHTML = `
        <div class="row g-5 bg-white p-4 p-md-5 rounded-4 shadow-sm mb-5">
            <div class="col-lg-5">
                <div class="main-image-wrapper position-relative">
                    ${p.provider_name ? `<span class="badge-provider">${p.provider_name}</span>` : ''}
                    <img src="${mainImageUrl}" id="main-product-image" alt="${p.name}" class="img-fluid rounded shadow-sm">
                </div>
                ${imagesHtml}
            </div>

            <div class="col-lg-7">
                <h2 class="fw-bold text-dark mb-3">${p.name}</h2>
                
                <p class="text-muted mb-4">${p.short_description || 'Mô tả đang cập nhật...'}</p>
                
                <hr class="opacity-25">
                <h3 class="fw-bolder text-danger mb-4" id="display-price">${displayPrice}</h3>

                <h6 class="fw-bold mb-3">Chọn gói bảo hiểm:</h6>
                <div class="package-list mb-4">${packagesHtml}</div>

                <div class="d-flex gap-3">
                    <button class="btn btn-danger btn-lg rounded-pill px-5 fw-bold shadow-sm" onclick="addToCart()">
                        <i class="fas fa-cart-plus me-2"></i> Mua ngay
                    </button>
                    <button class="btn btn-outline-dark btn-lg rounded-pill px-4" onclick="requestConsultation()">
                        <i class="fas fa-headset me-2"></i> Tư vấn
                    </button>
                </div>
            </div>
        </div>

        <div class="bg-white p-4 p-md-5 rounded-4 shadow-sm">
            <h4 class="fw-bold mb-4 pb-2 border-bottom">Chi tiết quyền lợi</h4>
            <div class="ck-content">${p.description || '<p>Thông tin đang được cập nhật.</p>'}</div>
        </div>
    `;
}

// --- 3. XỬ LÝ TƯ VẤN (CONSULTATION TICKET) ---

window.requestConsultation = async function() {
    if (!currentProduct) return;

    const token = getAccessToken();
    let payload = { product: currentProduct.id };

    if (token) {
        // TRƯỜNG HỢP: ĐÃ ĐĂNG NHẬP
        try {
            const user = await fetchAPI('/users/me/');
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
            const phone = user.phone || 'Chưa cập nhật';

            const { isConfirmed } = await Swal.fire({
                title: 'Xác nhận yêu cầu tư vấn',
                html: `
                    <div class="text-start small">
                        <p><strong>Sản phẩm:</strong> ${currentProduct.name}</p>
                        <p><strong>Khách hàng:</strong> ${fullName} (${user.username})</p>
                        <p><strong>Liên hệ:</strong> ${phone}</p>
                        <p class="text-muted italic mt-3">* Nhân viên TIS sẽ dựa trên thông tin này để liên hệ với bạn.</p>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Gửi yêu cầu',
                cancelButtonText: 'Hủy',
                confirmButtonColor: '#D71920'
            });

            if (isConfirmed) {
                payload.customer_name = fullName;
                payload.customer_contact = phone;
                payload.user = user.id;
            } else return;

        } catch (err) {
            console.error("Lỗi lấy thông tin user:", err);
            return;
        }
    } else {
        // TRƯỜNG HỢP: CHƯA ĐĂNG NHẬP
        const { value: formValues } = await Swal.fire({
            title: 'Để lại thông tin tư vấn',
            html: `
                <div class="text-start">
                    <p class="small text-muted mb-3">Sản phẩm: ${currentProduct.name}</p>
                    <div class="row g-2">
                        <div class="col-6"><input id="swal-fname" class="swal2-input m-0 w-100" placeholder="Họ"></div>
                        <div class="col-6"><input id="swal-lname" class="swal2-input m-0 w-100" placeholder="Tên"></div>
                    </div>
                    <input id="swal-phone" class="swal2-input m-0 w-100 mt-2" placeholder="Số điện thoại *">
                    <input id="swal-email" class="swal2-input m-0 w-100 mt-2" placeholder="Email (Không bắt buộc)">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Gửi ngay',
            preConfirm: () => {
                const fname = document.getElementById('swal-fname').value.trim();
                const lname = document.getElementById('swal-lname').value.trim();
                const phone = document.getElementById('swal-phone').value.trim();
                const email = document.getElementById('swal-email').value.trim();
                if (!fname || !lname || !phone) {
                    Swal.showValidationMessage('Vui lòng nhập đầy đủ Họ, Tên và SĐT');
                    return false;
                }
                return { name: `${fname} ${lname}`, contact: email ? `${phone} | ${email}` : phone };
            }
        });

        if (formValues) {
            payload.customer_name = formValues.name;
            payload.customer_contact = formValues.contact;
        } else return;
    }

    // Gửi Ticket về hệ thống
    try {
        await fetchAPI('/consultations/', 'POST', payload);
        Swal.fire('Thành công!', 'Yêu cầu của bạn đã được gửi tới Admin và Staff.', 'success');
    } catch (e) {
        Toast.fire({ icon: 'error', title: 'Không thể gửi yêu cầu lúc này.' });
    }
};

// --- 4. HÀM PHỤ TRỢ (HELPERS) ---

window.changeMainImage = function(el, url) {
    document.getElementById('main-product-image').src = url;
    document.querySelectorAll('.thumbnail-img').forEach(img => img.classList.remove('active'));
    el.classList.add('active');
};

window.selectPackage = function(id, price) {
    selectedPackageId = id;
    document.getElementById('display-price').innerText = formatMoney(price);
    document.querySelectorAll('.package-option').forEach(l => l.classList.remove('selected'));
    document.getElementById(`pkg-label-${id}`).classList.add('selected');
};

window.addToCart = async function() {
    if (!getAccessToken()) {
        Swal.fire({ title: 'Cần đăng nhập', icon: 'info', confirmButtonText: 'Đăng nhập ngay' })
            .then(r => { if (r.isConfirmed) window.location.href = 'login.html'; });
        return;
    }
    try {
        await fetchAPI('/cart/add/', 'POST', { package_id: selectedPackageId, quantity: 1 });
        Toast.fire({ icon: 'success', title: 'Đã thêm vào giỏ hàng' });
        if (typeof updateCartBadge === 'function') updateCartBadge();
    } catch (e) { Toast.fire({ icon: 'error', title: 'Lỗi thêm giỏ hàng' }); }
};

function getValidImageUrl(path) {
    if (!path) return 'https://placehold.co/800x600/f8f9fa/d71920?text=TIS+Broker';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? `/media${path}` : `/media/${path}`;
    return DOMAIN + cleanPath;
}