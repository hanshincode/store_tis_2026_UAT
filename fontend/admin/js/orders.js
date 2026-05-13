/**
 * admin/js/orders.js
 * Quản lý đơn đặt mua bảo hiểm của khách hàng.
 */

let currentStatusFilter = 'all';
let orderCustomers = [];
let orderProducts = [];
let orderPackageOptions = [];

document.addEventListener('DOMContentLoaded', () => {
    loadOrders('all');
    initCreateOrderForm();
});

async function initCreateOrderForm() {
    const form = document.getElementById('create-order-form');
    if (!form) return;

    document.getElementById('btn-add-order-line')?.addEventListener('click', () => addOrderLine());
    form.addEventListener('submit', createOrderForCustomer);

    await Promise.all([loadOrderCustomers(), loadOrderProducts()]);
    addOrderLine();
}

async function loadOrderCustomers() {
    const select = document.getElementById('create-order-customer');
    if (!select) return;
    try {
        orderCustomers = normalizeList(await fetchAPI('/users/'))
            .filter(user => user.role === 'customer')
            .sort((a, b) => getCustomerOptionLabel(a).localeCompare(getCustomerOptionLabel(b), 'vi'));
        select.innerHTML = orderCustomers.length
            ? '<option value="">Chọn khách hàng...</option>' + orderCustomers.map(user => `
                <option value="${user.id}">${escapeHTML(getCustomerOptionLabel(user))}</option>
            `).join('')
            : '<option value="">Chưa có khách hàng</option>';
    } catch (error) {
        select.innerHTML = '<option value="">Không tải được khách hàng</option>';
    }
}

async function loadOrderProducts() {
    try {
        orderProducts = normalizeList(await fetchAPI('/products/'));
        orderPackageOptions = orderProducts.flatMap(product => (product.packages || []).map(pkg => ({
            id: pkg.id,
            label: `${product.name} · ${pkg.duration_label}`,
            price: Number(pkg.price || 0),
        })));
        renderExistingOrderLineOptions();
    } catch (error) {
        orderPackageOptions = [];
    }
}

function addOrderLine(value = {}) {
    const container = document.getElementById('create-order-lines');
    if (!container) return;
    const lineId = `order-line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    container.insertAdjacentHTML('beforeend', `
        <div class="create-order-line border rounded-3 p-2" id="${lineId}">
            <div class="row g-2 align-items-center">
                <div class="col-md-7">
                    <select class="form-select order-package-select" required>
                        ${renderPackageOptions(value.package_id)}
                    </select>
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control order-quantity-input" min="1" value="${value.quantity || 1}" required>
                </div>
                <div class="col-md-2 text-md-end fw-bold text-danger order-line-total">0 đ</div>
                <div class="col-md-1 text-end">
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="removeOrderLine('${lineId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `);
    bindOrderLineEvents(container.lastElementChild);
    updateCreateOrderTotal();
}

function renderExistingOrderLineOptions() {
    document.querySelectorAll('.order-package-select').forEach(select => {
        const selected = select.value;
        select.innerHTML = renderPackageOptions(selected);
    });
    updateCreateOrderTotal();
}

function renderPackageOptions(selectedId = '') {
    if (!orderPackageOptions.length) {
        return '<option value="">Đang tải sản phẩm...</option>';
    }
    return '<option value="">Chọn gói bảo hiểm...</option>' + orderPackageOptions.map(pkg => `
        <option value="${pkg.id}" data-price="${pkg.price}" ${String(selectedId) === String(pkg.id) ? 'selected' : ''}>
            ${escapeHTML(pkg.label)} · ${formatMoney(pkg.price)}
        </option>
    `).join('');
}

function bindOrderLineEvents(line) {
    line.querySelector('.order-package-select')?.addEventListener('change', updateCreateOrderTotal);
    line.querySelector('.order-quantity-input')?.addEventListener('input', updateCreateOrderTotal);
}

window.removeOrderLine = function(lineId) {
    const lines = document.querySelectorAll('.create-order-line');
    if (lines.length <= 1) {
        Toast.fire({ icon: 'warning', title: 'Đơn cần ít nhất một sản phẩm' });
        return;
    }
    document.getElementById(lineId)?.remove();
    updateCreateOrderTotal();
};

function updateCreateOrderTotal() {
    let total = 0;
    document.querySelectorAll('.create-order-line').forEach(line => {
        const select = line.querySelector('.order-package-select');
        const quantity = Math.max(Number(line.querySelector('.order-quantity-input')?.value || 1), 1);
        const price = Number(select?.selectedOptions?.[0]?.dataset.price || 0);
        const subtotal = price * quantity;
        total += subtotal;
        const totalEl = line.querySelector('.order-line-total');
        if (totalEl) totalEl.textContent = formatMoney(subtotal);
    });
    const totalEl = document.getElementById('create-order-total');
    if (totalEl) totalEl.textContent = formatMoney(total);
}

async function createOrderForCustomer(event) {
    event.preventDefault();
    const customerId = document.getElementById('create-order-customer')?.value;
    const items = Array.from(document.querySelectorAll('.create-order-line')).map(line => ({
        package_id: line.querySelector('.order-package-select')?.value,
        quantity: Number(line.querySelector('.order-quantity-input')?.value || 1),
    })).filter(item => item.package_id);

    if (!customerId) return Toast.fire({ icon: 'warning', title: 'Vui lòng chọn khách hàng' });
    if (!items.length) return Toast.fire({ icon: 'warning', title: 'Vui lòng chọn sản phẩm' });

    const btn = document.getElementById('btn-create-order');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang tạo';

    try {
        const order = await fetchAPI('/orders/create-for-customer/', 'POST', {
            customer_id: customerId,
            items,
            add_to_cart: document.getElementById('create-order-add-cart')?.checked,
            send_chat: document.getElementById('create-order-send-chat')?.checked,
            beneficiary_note: document.getElementById('create-order-note')?.value || '',
        });
        Toast.fire({ icon: 'success', title: `Đã tạo đơn ${order.code}` });
        bootstrap.Modal.getInstance(document.getElementById('create-order-modal'))?.hide();
        resetCreateOrderForm();
        loadOrders(currentStatusFilter);
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể tạo đơn cho khách') });
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

function resetCreateOrderForm() {
    document.getElementById('create-order-form')?.reset();
    const lines = document.getElementById('create-order-lines');
    if (lines) lines.innerHTML = '';
    addOrderLine();
    updateCreateOrderTotal();
}

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

function getCustomerOptionLabel(user) {
    const fullName = `${user.last_name || ''} ${user.first_name || ''}`.trim();
    const name = user.company_name || fullName || user.username || user.phone || `Khách hàng #${user.id}`;
    const type = user.user_type === 'enterprise' ? 'Doanh nghiệp' : 'Cá nhân';
    const contact = user.phone || user.email || 'chưa có liên hệ';
    return `${name} · ${type} · ${contact}`;
}

function formatDate(value) {
    if (!value) return '--';
    return new Date(value).toLocaleDateString('vi-VN');
}
