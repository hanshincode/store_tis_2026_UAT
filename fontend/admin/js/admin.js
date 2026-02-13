/**
 * js/admin.js
 * ĐÃ TÍCH HỢP CKEDITOR CHO Ô MÔ TẢ
 */
let userMap = {}; 
let descEditor; // Biến lưu bộ soạn thảo

document.addEventListener('DOMContentLoaded', async () => {
    const token = getAccessToken();
    if (!token) { window.location.href = 'login.html'; return; }

    // --- 1. KHỞI TẠO CKEDITOR (BỘ SOẠN THẢO) ---
    // Kiểm tra xem có ô p-desc không để tránh lỗi ở các trang khác
    if (document.querySelector('#p-desc')) {
        ClassicEditor
            .create(document.querySelector('#p-desc'))
            .then(editor => {
                descEditor = editor; // Lưu lại để tí nữa dùng
            })
            .catch(error => {
                console.error("Lỗi khởi tạo CKEditor:", error);
            });
    }

    try {
        // --- 2. LOGIC CŨ: CHECK QUYỀN & LOAD DATA ---
        const user = await fetchAPI('/users/me/');
        
        const allowed = ['admin', 'super_admin', 'staff'];
        if (!user.is_superuser && !allowed.includes(user.role)) {
            alert("Bạn không có quyền truy cập trang này!");
            window.location.href = 'index.html';
            return;
        }

        const nameEl = document.getElementById('admin-name');
        if(nameEl) nameEl.innerText = user.first_name || user.username;

        if (user.role === 'staff' && !user.is_superuser) {
            const menuStaff = document.getElementById('menu-staff');
            if(menuStaff) menuStaff.classList.add('d-none');
        }

        await prepareUserMap();
        switchTab('dashboard');

    } catch (e) { 
        console.error("Auth Error:", e);
    }
});

// Cache User ID -> Tên
async function prepareUserMap() {
    try {
        const users = await fetchAPI('/users/');
        if (users) users.forEach(u => {
            userMap[u.id] = u.first_name ? `${u.last_name} ${u.first_name}` : u.username;
        });
    } catch (e) { console.warn("Lỗi load user map:", e); }
}

// Chuyển Tab
function switchTab(tabId) {
    document.querySelectorAll('.content-tab').forEach(el => el.classList.add('d-none'));
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.remove('d-none');

    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    // Active logic đơn giản (bỏ qua UI active để code gọn)

    if (tabId === 'dashboard') loadDashboardStats();
    if (tabId === 'orders') loadOrders('all');
    if (tabId === 'products') loadProducts();
    if (tabId === 'news') loadNewsAdmin();
    if (tabId === 'staff') loadStaff();
    if (tabId === 'consultations') loadConsultations();
}

// --- DASHBOARD ---
async function loadDashboardStats() {
    try {
        const [orders, products] = await Promise.all([
            fetchAPI('/orders/'),
            fetchAPI('/products/')
        ]);
        
        const revenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        const pending = orders.filter(o => o.status === 'pending').length;

        document.getElementById('stat-revenue').innerText = formatMoney(revenue);
        document.getElementById('stat-pending').innerText = pending;
        document.getElementById('stat-total').innerText = orders.length;

        const recent = orders.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0,5);
        document.getElementById('dashboard-orders').innerHTML = recent.map(o => `
            <tr>
                <td>${o.code || '#'+o.id}</td>
                <td>${userMap[o.user] || o.user}</td>
                <td>${formatMoney(o.total_amount)}</td>
                <td>${renderBadge(o.status)}</td>
                <td>${new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

// --- ORDERS ---
async function loadOrders(status) {
    const tbody = document.getElementById('orders-list');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Đang tải...</td></tr>';
    try {
        let orders = await fetchAPI('/orders/');
        if (status !== 'all') orders = orders.filter(o => o.status === status);
        
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>${o.code || '#'+o.id}</td>
                <td>${userMap[o.user] || o.user}</td>
                <td>${o.items ? o.items.length : 0} gói</td>
                <td>${formatMoney(o.total_amount)}</td>
                <td>${renderBadge(o.status)}</td>
                <td>
                    <button class="btn btn-sm btn-info text-white" onclick="viewOrder(${o.id})"><i class="fas fa-eye"></i></button>
                    ${o.status === 'pending' ? `<button class="btn btn-sm btn-success ms-1" onclick="updateOrder(${o.id}, 'confirmed')"><i class="fas fa-check"></i></button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>'; }
}

async function updateOrder(id, st) {
    if(!confirm('Xác nhận cập nhật trạng thái đơn hàng?')) return;
    try {
        await fetchAPI(`/orders/${id}/`, 'PATCH', { status: st });
        Toast.fire({ icon: 'success', title: 'Cập nhật thành công' });
        loadOrders('all'); loadDashboardStats();
    } catch(e) { Toast.fire({ icon: 'error', title: 'Lỗi cập nhật' }); }
}

async function viewOrder(id) {
    const modalBody = document.getElementById('order-detail-body');
    const btnApprove = document.getElementById('btn-approve-order');
    modalBody.innerHTML = 'Đang tải...';
    new bootstrap.Modal(document.getElementById('orderModal')).show();

    try {
        const o = await fetchAPI(`/orders/${id}/`);
        modalBody.innerHTML = `
            <p><strong>Khách hàng:</strong> ${userMap[o.user] || o.user}</p>
            <p><strong>Ngày đặt:</strong> ${new Date(o.created_at).toLocaleString('vi-VN')}</p>
            <p><strong>Tổng tiền:</strong> <span class="text-danger fw-bold fs-5">${formatMoney(o.total_amount)}</span></p>
            <hr>
            <h6>Danh sách sản phẩm:</h6>
            <ul class="list-group">
                ${o.items.map(i => `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${i.product_name}</strong><br>
                            <small class="text-muted">${i.duration}</small>
                        </div>
                        <span>${i.quantity} x ${formatMoney(i.price)}</span>
                    </li>
                `).join('')}
            </ul>
        `;
        
        if (o.status === 'pending') {
            btnApprove.classList.remove('d-none');
            btnApprove.onclick = () => { updateOrder(id, 'confirmed'); bootstrap.Modal.getInstance(document.getElementById('orderModal')).hide(); };
        } else {
            btnApprove.classList.add('d-none');
        }
    } catch(e) { modalBody.innerHTML = 'Lỗi tải chi tiết'; }
}

// --- PRODUCTS (Đã cập nhật logic lấy dữ liệu từ CKEditor) ---
async function loadProducts() {
    const tbody = document.getElementById('products-list');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Đang tải...</td></tr>';
    try {
        const products = await fetchAPI('/products/');
        tbody.innerHTML = products.map(p => `
            <tr>
                <td><img src="${p.images?.[0]?.image ? MEDIA_URL + p.images[0].image : 'https://via.placeholder.com/50'}" width="50"></td>
                <td class="fw-bold">${p.name}</td>
                <td>${p.provider_name}</td>
                <td>${p.target_audience === 'ent' ? 'Doanh nghiệp' : 'Cá nhân'}</td>
                <td>${p.packages?.[0] ? formatMoney(p.packages[0].price) : 'Liên hệ'}</td>
                <td><button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="6" class="text-center">Trống</td></tr>'; }
}

async function submitProduct() {
    // 1. Lấy dữ liệu
    const name = document.getElementById('p-name').value;
    const provider = document.getElementById('p-provider').value;
    const price = document.getElementById('p-price').value;
    const target = document.getElementById('p-target').value;
    const image = document.getElementById('p-image').files[0];
    
    // --- QUAN TRỌNG: Lấy nội dung từ CKEditor ---
    const desc = descEditor ? descEditor.getData() : document.getElementById('p-desc').value;

    if(!name || !provider) return Toast.fire({icon:'warning', title:'Vui lòng điền tên và nhà cung cấp'});

    // 2. FormData
    const fd = new FormData();
    fd.append('name', name);
    fd.append('provider_name', provider);
    fd.append('description', desc); // Gửi nội dung HTML
    fd.append('target_audience', target);
    fd.append('category', 1); // Mặc định category ID=1 (Hoặc bạn thêm ô chọn category vào HTML)
    
    if(image) fd.append('uploaded_images', image);

    try {
        // Tạo sản phẩm
        const res = await fetch(`${API_BASE_URL}/products/`, {
            method:'POST', 
            headers: {'Authorization': `Bearer ${getAccessToken()}`}, 
            body: fd
        });
        
        if(!res.ok) throw await res.json();
        const newProd = await res.json();

        // Tạo giá (Package)
        if(price) {
            await fetchAPI('/product-packages/', 'POST', {
                product: newProd.id,
                duration_label: '1 Năm',
                duration_days: 365,
                price: price
            });
        }

        Toast.fire({ icon: 'success', title: 'Thêm sản phẩm thành công' });
        
        // Reset form & Editor
        document.getElementById('product-form').reset();
        if(descEditor) descEditor.setData(''); 
        
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        loadProducts();

    } catch(e) { 
        console.error(e);
        Toast.fire({ icon: 'error', title: 'Lỗi thêm sản phẩm' }); 
    }
}

async function deleteProduct(id) {
    if(!confirm('Xóa sản phẩm này?')) return;
    try {
        await fetchAPI(`/products/${id}/`, 'DELETE');
        loadProducts();
        Toast.fire({ icon: 'success', title: 'Đã xóa' });
    } catch(e) { Toast.fire({ icon: 'error', title: 'Không xóa được' }); }
}

// --- HELPERS ---
function renderBadge(status) {
    const map = {'pending':'warning', 'confirmed':'info', 'active':'success', 'cancelled':'secondary'};
    const label = {'pending':'Chờ duyệt', 'confirmed':'Đã xác nhận', 'active':'Hiệu lực', 'cancelled':'Đã hủy'};
    return `<span class="badge bg-${map[status]||'light'} text-dark">${label[status]||status}</span>`;
}

function showModal(id) { new bootstrap.Modal(document.getElementById(id)).show(); }
function togglePriceInput() {
    const chk = document.getElementById('p-hidden-price');
    const inp = document.getElementById('p-price');
    if(chk && inp) inp.disabled = chk.checked;
}

// Giữ các hàm rỗng để tránh lỗi nếu chưa dùng tới
async function loadNewsAdmin() { 
    const div = document.getElementById('news-list-admin');
    div.innerHTML = '<p class="text-muted p-3">Chức năng đang cập nhật...</p>';
}
async function loadStaff() {
    const tbody = document.getElementById('staff-list');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Chức năng đang cập nhật...</td></tr>';
}
async function submitStaff() { alert("Chức năng đang cập nhật"); }
async function submitNews() { alert("Chức năng đang cập nhật"); }
async function loadConsultations() {
    const div = document.getElementById('consultation-list');
    div.innerHTML = '<p class="text-muted">Chức năng đang cập nhật...</p>';
}