// fontend/admin/js/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetchAPI('/orders/');
        const orders = Array.isArray(response) ? response : (response.results || []);

        const totalRevenue = orders
            .filter(o => ['pending', 'confirmed', 'active'].includes(o.status) && o.payment_status === 'paid')
            .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        document.getElementById('stat-revenue').innerText = formatCompactMoney(totalRevenue);

        const pendingCount = orders.filter(o => o.status === 'pending').length;
        document.getElementById('stat-pending').innerText = pendingCount;
        document.getElementById('stat-total').innerText = response.count || orders.length;

        const tableBody = document.getElementById('dashboard-orders');
        if (orders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Chưa có đơn hàng nào</td></tr>';
        } else {
            tableBody.innerHTML = orders.slice(0, 5).map(o => {
                const status = getOrderStatusInfo(o.status);
                const customerName = o.user_name || 'Khách hàng';

                return `
                <tr>
                    <td><span class="fw-bold">${escapeHTML(o.code || `#${o.id}`)}</span></td>
                    <td>${escapeHTML(customerName)}</td>
                    <td class="text-danger fw-bold text-nowrap">${formatMoney(o.total_amount)}</td>
                    <td><span class="badge ${status.badge}">${status.text}</span></td>
                    <td>${new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
                </tr>
                `;
            }).join('');
        }

    } catch (e) {
        console.error('Lỗi tải Dashboard:', e);
        document.getElementById('dashboard-orders').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Lỗi kết nối API</td></tr>';
    }
});

function getOrderStatusInfo(status) {
    const map = {
        awaiting_payment: { badge: 'bg-warning text-dark', text: 'Chờ thanh toán' },
        payment_expired: { badge: 'bg-secondary', text: 'Hết hạn thanh toán' },
        pending: { badge: 'bg-info text-dark', text: 'Chờ admin duyệt' },
        confirmed: { badge: 'bg-primary', text: 'Đã xác nhận' },
        active: { badge: 'bg-success', text: 'Hiệu lực' },
        completed: { badge: 'bg-success', text: 'Hiệu lực' },
        cancelled: { badge: 'bg-danger', text: 'Đã hủy' },
    };
    return map[status] || { badge: 'bg-secondary', text: status || 'Không rõ' };
}

function formatCompactMoney(amount) {
    const value = Number(amount) || 0;
    if (value >= 1000000000) {
        return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1000000000)} tỷ`;
    }
    if (value >= 1000000) {
        return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1000000)} triệu`;
    }
    return formatMoney(value);
}
