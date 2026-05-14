// frontend/admin/js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
});

async function loadDashboard() {
    const state = {
        orders: [],
        totalOrders: 0,
        consultations: [],
        ordersError: null,
        consultationsError: null,
    };

    const [ordersResult, consultationsResult] = await Promise.allSettled([
        fetchAPI('/orders/'),
        fetchAPI('/consultations/'),
    ]);

    if (ordersResult.status === 'fulfilled') {
        state.orders = normalizeDashboardList(ordersResult.value);
        state.totalOrders = ordersResult.value?.count || state.orders.length;
    } else {
        state.ordersError = ordersResult.reason;
        console.error('Lỗi tải đơn hàng Dashboard:', ordersResult.reason);
    }

    if (consultationsResult.status === 'fulfilled') {
        state.consultations = normalizeDashboardList(consultationsResult.value);
    } else {
        state.consultationsError = consultationsResult.reason;
        console.error('Lỗi tải tư vấn Dashboard:', consultationsResult.reason);
    }

    renderDashboard(state);
}

function renderDashboard(state) {
    renderStats(state);
    renderPipeline(state.orders);
    renderActionList(state);
    renderPaymentSummary(state.orders);
    renderLatestOrders(state.orders, state.ordersError);
}

function renderStats({ orders, totalOrders, consultations }) {
    const paidOrders = orders.filter(order => order.payment_status === 'paid');
    const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const pendingCount = orders.filter(order => order.status === 'pending').length;
    const activeCount = orders.filter(order => ['active', 'completed', 'confirmed'].includes(order.status)).length;
    const newConsultations = consultations.filter(item => item.status === 'new').length;
    const chatWaiting = consultations.filter(item => item.status !== 'archived' && item.last_message?.is_staff === false).length;

    setText('stat-revenue', formatCompactMoney(revenue));
    setText('stat-paid-count', `${paidOrders.length} đơn đã thanh toán`);
    setText('stat-pending', pendingCount);
    setText('stat-total', totalOrders);
    setText('stat-active-count', `${activeCount} đơn đang hiệu lực`);
    setText('stat-consultations', newConsultations);
    setText('stat-chat-count', `${chatWaiting} cuộc chat cần trả lời`);
}

function renderPipeline(orders) {
    const statuses = [
        { key: 'awaiting_payment', label: 'Chờ thanh toán', icon: 'fa-qrcode', color: 'warning' },
        { key: 'pending', label: 'Chờ duyệt', icon: 'fa-user-check', color: 'info' },
        { key: 'active', label: 'Hiệu lực', icon: 'fa-shield-alt', color: 'success' },
        { key: 'payment_expired', label: 'QR hết hạn', icon: 'fa-hourglass-end', color: 'secondary' },
        { key: 'cancelled', label: 'Đã hủy', icon: 'fa-ban', color: 'danger' },
    ];
    const total = Math.max(orders.length, 1);

    const html = statuses.map(status => {
        const count = orders.filter(order => {
            if (status.key === 'active') return ['active', 'completed', 'confirmed'].includes(order.status);
            return order.status === status.key || order.payment_status === status.key.replace('payment_', '');
        }).length;
        const percent = Math.round((count / total) * 100);

        return `
            <div class="pipeline-item">
                <div class="pipeline-icon text-${status.color} bg-${status.color}-subtle">
                    <i class="fas ${status.icon}"></i>
                </div>
                <div class="pipeline-body">
                    <div class="d-flex justify-content-between gap-3">
                        <strong>${status.label}</strong>
                        <span>${count}</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar bg-${status.color}" style="width: ${percent}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('order-pipeline').innerHTML = html;
}

function renderActionList({ orders, consultations, ordersError, consultationsError }) {
    const awaitingPayment = orders.filter(order => order.status === 'awaiting_payment').length;
    const paidNeedApproval = orders.filter(order => order.status === 'pending' && order.payment_status === 'paid').length;
    const expiredPayment = orders.filter(order => order.status === 'payment_expired' || order.payment_status === 'expired').length;
    const newConsultations = consultations.filter(item => item.status === 'new').length;
    const chatWaiting = consultations.filter(item => item.status !== 'archived' && item.last_message?.is_staff === false).length;

    const items = [
        {
            title: 'Duyệt đơn đã thanh toán',
            desc: `${paidNeedApproval} đơn cần admin xác nhận hiệu lực`,
            href: 'orders.html',
            count: paidNeedApproval,
            icon: 'fa-check-circle',
            tone: 'success',
        },
        {
            title: 'Nhắc khách thanh toán',
            desc: `${awaitingPayment} đơn đang chờ QR được thanh toán`,
            href: 'orders.html',
            count: awaitingPayment,
            icon: 'fa-qrcode',
            tone: 'warning',
        },
        {
            title: 'Tạo lại QR hết hạn',
            desc: `${expiredPayment} đơn cần gia hạn link thanh toán`,
            href: 'orders.html',
            count: expiredPayment,
            icon: 'fa-rotate-right',
            tone: 'secondary',
        },
        {
            title: 'Tư vấn và chat',
            desc: `${newConsultations} yêu cầu mới, ${chatWaiting} tin nhắn khách`,
            href: chatWaiting > 0 ? 'chat.html' : 'consultations.html',
            count: newConsultations + chatWaiting,
            icon: 'fa-headset',
            tone: 'danger',
        },
    ];

    if (ordersError || consultationsError) {
        items.unshift({
            title: 'Có dữ liệu chưa tải được',
            desc: 'Một phần API đang lỗi, hãy làm mới hoặc kiểm tra kết nối.',
            href: '#',
            count: '!',
            icon: 'fa-triangle-exclamation',
            tone: 'danger',
        });
    }

    document.getElementById('dashboard-actions').innerHTML = items.map(item => `
        <a class="action-item" href="${item.href}">
            <span class="action-icon text-${item.tone} bg-${item.tone}-subtle">
                <i class="fas ${item.icon}"></i>
            </span>
            <span class="action-copy">
                <strong>${item.title}</strong>
                <small>${item.desc}</small>
            </span>
            <span class="action-count">${item.count}</span>
        </a>
    `).join('');
}

function renderPaymentSummary(orders) {
    const summary = [
        { label: 'Đã thanh toán', value: orders.filter(order => order.payment_status === 'paid').length, tone: 'success' },
        { label: 'Chờ thanh toán', value: orders.filter(order => order.status === 'awaiting_payment').length, tone: 'warning' },
        { label: 'QR hết hạn', value: orders.filter(order => order.status === 'payment_expired' || order.payment_status === 'expired').length, tone: 'secondary' },
        { label: 'Đã hủy', value: orders.filter(order => order.status === 'cancelled').length, tone: 'danger' },
    ];
    const paidRevenue = orders
        .filter(order => order.payment_status === 'paid')
        .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    document.getElementById('payment-summary').innerHTML = `
        <div class="payment-revenue">
            <span>Tiền đã ghi nhận</span>
            <strong>${formatMoney(paidRevenue)}</strong>
        </div>
        <div class="payment-grid">
            ${summary.map(item => `
                <div class="payment-tile">
                    <span class="text-${item.tone}">${item.value}</span>
                    <small>${item.label}</small>
                </div>
            `).join('')}
        </div>
    `;
}

function renderLatestOrders(orders, error) {
    const tableBody = document.getElementById('dashboard-orders');

    if (error) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Lỗi kết nối API đơn hàng</td></tr>';
        return;
    }

    if (orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Chưa có đơn hàng nào</td></tr>';
        return;
    }

    tableBody.innerHTML = orders.slice(0, 6).map(order => {
        const status = getOrderStatusInfo(order.status, order.payment_status);
        const customerName = order.user_name || order.user_phone || 'Khách hàng';

        return `
            <tr>
                <td><span class="fw-bold">${escapeHTML(order.code || `#${order.id}`)}</span></td>
                <td>
                    <div class="fw-semibold">${escapeHTML(customerName)}</div>
                    <div class="small text-muted">${escapeHTML(order.user_email || order.user_phone || 'Chưa có liên hệ')}</div>
                </td>
                <td class="text-danger fw-bold text-nowrap">${formatMoney(order.total_amount || 0)}</td>
                <td><span class="badge ${status.badge}">${status.text}</span></td>
                <td>${formatDate(order.created_at)}</td>
            </tr>
        `;
    }).join('');
}

function getOrderStatusInfo(status, paymentStatus) {
    const map = {
        awaiting_payment: { badge: 'bg-warning-subtle text-warning border border-warning', text: 'Chờ thanh toán' },
        payment_expired: { badge: 'bg-secondary-subtle text-secondary border border-secondary', text: 'Hết hạn thanh toán' },
        pending: { badge: 'bg-info-subtle text-info border border-info', text: paymentStatus === 'paid' ? 'Chờ duyệt · đã thanh toán' : 'Chờ duyệt' },
        confirmed: { badge: 'bg-primary-subtle text-primary border border-primary', text: 'Đã xác nhận' },
        active: { badge: 'bg-success-subtle text-success border border-success', text: 'Hiệu lực' },
        completed: { badge: 'bg-success-subtle text-success border border-success', text: 'Hoàn tất' },
        cancelled: { badge: 'bg-danger-subtle text-danger border border-danger', text: 'Đã hủy' },
    };
    return map[status] || { badge: 'bg-secondary-subtle text-secondary border border-secondary', text: status || 'Không rõ' };
}

function normalizeDashboardList(response) {
    if (Array.isArray(response)) return response;
    return response?.results || [];
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

function formatDate(value) {
    if (!value) return '--';
    return new Date(value).toLocaleDateString('vi-VN');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}
