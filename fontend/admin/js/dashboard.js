// admin/js/dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const orders = await fetchAPI('/orders/');
        document.getElementById('stat-revenue').innerText = formatMoney(orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0));
        document.getElementById('stat-pending').innerText = orders.filter(o => o.status === 'pending').length;
        document.getElementById('stat-total').innerText = orders.length;

        document.getElementById('dashboard-orders').innerHTML = orders.slice(0, 5).map(o => `
            <tr>
                <td>${o.code}</td>
                <td class="text-danger fw-bold">${formatMoney(o.total_amount)}</td>
                <td><span class="badge bg-${o.status==='pending'?'warning':'success'}">${o.status}</span></td>
                <td>${new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
});