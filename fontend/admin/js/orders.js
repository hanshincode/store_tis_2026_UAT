/**
 * admin/js/orders.js
 * Quản lý đơn đặt mua bảo hiểm của khách hàng.
 */

let currentStatusFilter = 'all';

document.addEventListener('DOMContentLoaded', () => loadOrders('all'));

window.loadOrders = async function(statusFilter = currentStatusFilter) {
    currentStatusFilter = statusFilter || 'all';
    const tbody = document.getElementById('orders-list');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Đang tải đơn hàng...</td></tr>';

    try {
        let orders = await fetchAPI('/orders/');
        if (currentStatusFilter !== 'all') {
            orders = orders.filter(o => o.status === currentStatusFilter);
        }

        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5">Chưa có đơn hàng phù hợp.</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(renderOrderRows).join('');
    } catch (e) {
        console.error('Lỗi tải đơn hàng:', e);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Lỗi tải đơn hàng</td></tr>';
    }
};

function renderOrderRows(order) {
    const items = order.items || [];
    const customer = getCustomerInfo(order);
    const firstItem = items[0];
    const extraCount = Math.max(items.length - 1, 0);
    const productSummary = firstItem
        ? `${escapeHTML(firstItem.product_name)}${extraCount ? ` +${extraCount} sản phẩm khác` : ''}`
        : 'Chưa có sản phẩm';

    return `
        <tr class="order-main-row" data-order-id="${order.id}">
            <td class="ps-4">
                <button class="btn btn-link p-0 fw-bold text-danger order-code-btn" onclick="toggleOrderDetail(${order.id})">
                    ${escapeHTML(order.code || `#${order.id}`)}
                </button>
                <div class="small text-muted mt-1">${formatDate(order.created_at)}</div>
            </td>
            <td>
                <div class="fw-bold">${escapeHTML(customer.name)}</div>
                <div class="small text-muted">${escapeHTML(customer.meta)}</div>
                ${customer.company ? `<div class="small text-muted"><i class="fas fa-building me-1"></i>${escapeHTML(customer.company)}</div>` : ''}
            </td>
            <td>
                <div class="fw-semibold">${productSummary}</div>
                <button class="btn btn-sm btn-outline-secondary rounded-pill mt-2" onclick="toggleOrderDetail(${order.id})">
                    <i class="fas fa-list-ul me-1"></i>Xem ${items.length || 0} sản phẩm
                </button>
            </td>
            <td class="fw-bold text-danger">${formatMoney(order.total_amount || 0)}</td>
            <td>
                ${renderOrderStatus(order.status, order.payment_status)}
                ${order.status === 'awaiting_payment' ? `<div class="small text-muted mt-1">Hạn QR: ${escapeHTML(order.payment_expires_at_formatted || '--')}</div>` : ''}
            </td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-light border" onclick="updateOrderStatus(${order.id}, 'active')" ${order.status !== 'pending' ? 'disabled title="Chỉ duyệt sau khi khách đã thanh toán"' : ''}>
                    <i class="fas fa-check-circle text-success"></i> Duyệt
                </button>
                <button class="btn btn-sm btn-light border ms-1" onclick="updateOrderStatus(${order.id}, 'cancelled')">
                    <i class="fas fa-times-circle text-danger"></i> Hủy
                </button>
            </td>
        </tr>
        <tr class="order-detail-row d-none" id="order-detail-${order.id}">
            <td colspan="6">
                ${renderOrderDetail(order, customer)}
            </td>
        </tr>
    `;
}

function renderOrderDetail(order, customer) {
    const items = order.items || [];
    const itemRows = items.length
        ? items.map((item, index) => renderOrderItem(item, index)).join('')
        : '<div class="text-muted py-3">Đơn này chưa có sản phẩm.</div>';

    return `
        <div class="order-detail-panel">
            <div class="row g-4">
                <div class="col-lg-4">
                    <div class="order-detail-box">
                        <div class="order-detail-label">Thông tin khách hàng</div>
                        <div class="fw-bold fs-6">${escapeHTML(customer.name)}</div>
                        <div class="text-muted small mt-2"><i class="fas fa-phone me-2"></i>${escapeHTML(order.user_phone || 'Chưa có SĐT')}</div>
                        <div class="text-muted small mt-1"><i class="fas fa-envelope me-2"></i>${escapeHTML(order.user_email || 'Chưa có email')}</div>
                        <div class="text-muted small mt-1"><i class="fas fa-receipt me-2"></i>${escapeHTML(order.payment_reference || order.code || '--')}</div>
                        ${customer.company ? `<div class="text-muted small mt-1"><i class="fas fa-building me-2"></i>${escapeHTML(customer.company)}</div>` : ''}
                    </div>
                </div>
                <div class="col-lg-8">
                    <div class="order-detail-box">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <div class="order-detail-label">Sản phẩm trong đơn</div>
                                <div class="fw-bold">${items.length} sản phẩm</div>
                            </div>
                            <div class="text-end">
                                <div class="order-detail-label">Tổng tiền</div>
                                <div class="fw-bold text-danger fs-5">${formatMoney(order.total_amount || 0)}</div>
                            </div>
                        </div>
                        <div class="order-items-list">${itemRows}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderOrderItem(item, index) {
    const imageUrl = item.image ? mediaUrl(item.image) : 'https://placehold.co/96x72/f8f9fa/d71920?text=TIS';
    const subtotal = item.subtotal || (Number(item.price || 0) * Number(item.quantity || 0));

    return `
        <div class="order-item-line">
            <img src="${imageUrl}" alt="${escapeHTML(item.product_name)}" onerror="this.src='https://placehold.co/96x72/f8f9fa/d71920?text=TIS'">
            <div class="flex-grow-1 min-width-0">
                <div class="fw-bold">${index + 1}. ${escapeHTML(item.product_name || 'Sản phẩm')}</div>
                <div class="small text-muted">
                    ${escapeHTML(item.category_name || 'Chưa phân loại')} · ${escapeHTML(item.duration || 'Gói mặc định')}
                </div>
                <div class="small text-muted">Số lượng: ${item.quantity || 1}</div>
            </div>
            <div class="text-end">
                <div class="fw-semibold">${formatMoney(item.price || 0)}</div>
                <div class="small text-muted">Tạm tính</div>
                <div class="fw-bold text-danger">${formatMoney(subtotal)}</div>
            </div>
        </div>
    `;
}

window.toggleOrderDetail = function(orderId) {
    const detailRow = document.getElementById(`order-detail-${orderId}`);
    if (!detailRow) return;

    detailRow.classList.toggle('d-none');
};

function renderOrderStatus(status, paymentStatus) {
    const styles = {
        awaiting_payment: 'bg-warning-subtle text-warning border-warning',
        payment_expired: 'bg-secondary-subtle text-secondary border-secondary',
        pending: 'bg-warning-subtle text-warning border-warning',
        confirmed: 'bg-primary-subtle text-primary border-primary',
        active: 'bg-success-subtle text-success border-success',
        cancelled: 'bg-danger-subtle text-danger border-danger',
    };
    const labels = {
        awaiting_payment: 'Chờ thanh toán',
        payment_expired: 'Hết hạn thanh toán',
        pending: 'Chờ admin duyệt',
        confirmed: 'Đã xác nhận',
        active: 'Hiệu lực',
        cancelled: 'Đã hủy',
    };
    const suffix = paymentStatus === 'paid' && status === 'pending' ? ' · đã thanh toán' : '';
    return `<span class="badge border ${styles[status] || 'bg-secondary-subtle text-secondary border-secondary'}">${labels[status] || status}${suffix}</span>`;
}

window.updateOrderStatus = async function(id, status) {
    try {
        await fetchAPI(`/orders/${id}/`, 'PATCH', { status });
        Toast.fire({ icon: 'success', title: 'Đã cập nhật đơn hàng' });
        loadOrders(currentStatusFilter);
    } catch (e) {
        Toast.fire({ icon: 'error', title: 'Không thể cập nhật' });
    }
};

function getCustomerInfo(order) {
    const name = order.user_name || order.user_phone || `Khách hàng #${order.user || order.id}`;
    const typeLabel = order.user_type === 'enterprise' ? 'Doanh nghiệp' : 'Cá nhân';
    const contact = order.user_phone || order.user_email || 'Chưa có liên hệ';
    return {
        name,
        meta: `${typeLabel} · ${contact}`,
        company: order.company_name || '',
    };
}

function formatDate(value) {
    if (!value) return '--';
    return new Date(value).toLocaleDateString('vi-VN');
}
