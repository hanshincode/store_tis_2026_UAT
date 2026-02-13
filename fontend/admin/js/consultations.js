// admin/js/consultations.js
document.addEventListener('DOMContentLoaded', () => loadConsultations());

async function loadConsultations() {
    const tbody = document.getElementById('consultations-list');
    if(!tbody) return;
    
    try {
        const data = await fetchAPI('/consultations/');
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${new Date(item.created_at).toLocaleDateString('vi-VN')}</td>
                <td class="fw-bold">${item.customer_name}</td>
                <td><span class="badge bg-light text-dark border">${item.customer_contact}</span></td>
                <td>${item.product_name || 'Sản phẩm không rõ'}</td>
                <td><span class="badge bg-${item.status === 'new' ? 'warning' : 'success'}">${item.status === 'new' ? 'Mới' : 'Đã xử lý'}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="handleTicket(${item.id})">Xử lý</button>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error("Lỗi tải ticket:", e); }
}

async function handleTicket(id) {
    if(!confirm("Đánh dấu ticket này là đã tư vấn xong?")) return;
    try {
        await fetchAPI(`/consultations/${id}/`, 'PATCH', { status: 'processed' });
        loadConsultations();
    } catch (e) { alert("Lỗi cập nhật trạng thái"); }
}