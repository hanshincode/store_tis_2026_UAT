// admin/js/products.js
let descEditor;
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('#p-desc')) {
        ClassicEditor.create(document.querySelector('#p-desc'))
            .then(editor => { descEditor = editor; }).catch(err => console.error(err));
    }
    loadProducts();
});

async function loadProducts() {
    const tbody = document.getElementById('products-list');
    tbody.innerHTML = '<tr><td colspan="5">Đang tải...</td></tr>';
    try {
        const products = await fetchAPI('/products/');
        tbody.innerHTML = products.map(p => `
            <tr>
                <td><img src="${p.images?.[0]?.image ? MEDIA_URL + p.images[0].image : ''}"></td>
                <td class="fw-bold">${p.name}</td>
                <td>${p.provider_name}</td>
                <td class="text-danger fw-bold">${p.packages?.[0] ? formatMoney(p.packages[0].price) : 'Liên hệ'}</td>
                <td><button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5">Lỗi kết nối</td></tr>'; }
}

function openAddModal() {
    document.getElementById('product-form').reset();
    if(descEditor) descEditor.setData('');
    new bootstrap.Modal(document.getElementById('productModal')).show();
}

async function submitProduct() {
    const fd = new FormData();
    fd.append('name', document.getElementById('p-name').value);
    fd.append('provider_name', document.getElementById('p-provider').value);
    fd.append('category', document.getElementById('p-category').value);
    fd.append('target_audience', document.getElementById('p-target').value);
    if(descEditor) fd.append('description', descEditor.getData());
    
    const files = document.getElementById('p-images').files;
    for (let i = 0; i < files.length; i++) fd.append('uploaded_images', files[i]);

    try {
        // Tải ảnh / Gửi multipart/form-data trực tiếp bằng fetch
        const res = await fetch(`${API_BASE_URL}/products/`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${getAccessToken()}` }, body: fd
        });
        if(!res.ok) throw await res.json();
        const newProd = await res.json();

        // Tạo gói giá
        const price = document.getElementById('p-price').value;
        if(price) {
            await fetchAPI('/product-packages/', 'POST', {
                product: newProd.id, duration_label: '1 Năm', duration_days: 365, price: price
            });
        }
        Toast.fire({ icon: 'success', title: 'Thêm thành công' });
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        loadProducts();
    } catch(e) { Toast.fire({ icon: 'error', title: 'Lỗi thêm sản phẩm' }); }
}

async function deleteProduct(id) {
    if(!confirm('Xóa sản phẩm này?')) return;
    await fetchAPI(`/products/${id}/`, 'DELETE');
    loadProducts();
}