/**
 * admin/js/orders.js
 * Quáº£n lÃ½ Ä‘Æ¡n Ä‘áº·t mua báº£o hiá»ƒm cá»§a khÃ¡ch hÃ ng.
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
            ? '<option value="">Chá»n khÃ¡ch hÃ ng...</option>' + orderCustomers.map(user => `
                <option value="${user.id}">${escapeHTML(getCustomerOptionLabel(user))}</option>
            `).join('')
            : '<option value="">ChÆ°a cÃ³ khÃ¡ch hÃ ng</option>';
    } catch (error) {
        select.innerHTML = '<option value="">KhÃ´ng táº£i Ä‘Æ°á»£c khÃ¡ch hÃ ng</option>';
    }
}

async function loadOrderProducts() {
    try {
        orderProducts = normalizeList(await fetchAPI('/products/'));
        orderPackageOptions = orderProducts.flatMap(product => (product.packages || []).map(pkg => ({
            id: pkg.id,
            label: `${product.name} Â· ${pkg.duration_label}`,
            price: Number(pkg.price || 0),
            isPriceHidden: Boolean(product.is_price_hidden),
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
                <div class="col-md-5">
                    <select class="form-select order-package-select" required>
                        ${renderPackageOptions(value.package_id)}
                    </select>
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control order-quantity-input" min="1" value="${value.quantity || 1}" required>
                </div>
                <div class="col-md-2">
                    <input type="number" class="form-control order-price-input" min="0" step="1000" value="${value.unit_price || ''}" placeholder="GiÃ¡ bill" required>
                </div>
                <div class="col-md-2 text-md-end fw-bold text-danger order-line-total">0 Ä‘</div>
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
        return '<option value="">Äang táº£i sáº£n pháº©m...</option>';
    }
    return '<option value="">Chá»n gÃ³i báº£o hiá»ƒm...</option>' + orderPackageOptions.map(pkg => `
        <option value="${pkg.id}" data-price="${pkg.price}" ${String(selectedId) === String(pkg.id) ? 'selected' : ''}>
            ${escapeHTML(pkg.label)} · ${pkg.isPriceHidden ? 'Giá liên hệ' : formatMoney(pkg.price)}
        </option>
    `).join('');
}

function bindOrderLineEvents(line) {
    line.querySelector('.order-package-select')?.addEventListener('change', () => syncLinePrice(line));
    line.querySelector('.order-quantity-input')?.addEventListener('input', updateCreateOrderTotal);
    line.querySelector('.order-price-input')?.addEventListener('input', updateCreateOrderTotal);
    syncLinePrice(line);
}

function syncLinePrice(line) {
    const select = line.querySelector('.order-package-select');
    const priceInput = line.querySelector('.order-price-input');
    const selected = select?.selectedOptions?.[0];
    if (priceInput && selected && !priceInput.value) {
        const price = Number(selected.dataset.price || 0);
        priceInput.value = price > 0 ? price : '';
    }
    updateCreateOrderTotal();
}

window.removeOrderLine = function(lineId) {
    const lines = document.querySelectorAll('.create-order-line');
    if (lines.length <= 1) {
        Toast.fire({ icon: 'warning', title: 'ÄÆ¡n cáº§n Ã­t nháº¥t má»™t sáº£n pháº©m' });
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
        const price = Number(line.querySelector('.order-price-input')?.value || select?.selectedOptions?.[0]?.dataset.price || 0);
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
        unit_price: Number(line.querySelector('.order-price-input')?.value || 0),
    })).filter(item => item.package_id);

    if (!customerId) return Toast.fire({ icon: 'warning', title: 'Vui lÃ²ng chá»n khÃ¡ch hÃ ng' });
    if (!items.length) return Toast.fire({ icon: 'warning', title: 'Vui lÃ²ng chá»n sáº£n pháº©m' });
    if (items.some(item => item.unit_price <= 0)) return Toast.fire({ icon: 'warning', title: 'Vui lòng nhập giá tiền để tạo bill' });

    const btn = document.getElementById('btn-create-order');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Äang táº¡o';

    try {
        const order = await fetchAPI('/orders/create-for-customer/', 'POST', {
            customer_id: customerId,
            items,
            add_to_cart: document.getElementById('create-order-add-cart')?.checked,
            send_chat: document.getElementById('create-order-send-chat')?.checked,
            beneficiary_note: document.getElementById('create-order-note')?.value || '',
        });
        Toast.fire({ icon: 'success', title: `ÄÃ£ táº¡o Ä‘Æ¡n ${order.code}` });
        bootstrap.Modal.getInstance(document.getElementById('create-order-modal'))?.hide();
        resetCreateOrderForm();
        loadOrders(currentStatusFilter);
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'KhÃ´ng thá»ƒ táº¡o Ä‘Æ¡n cho khÃ¡ch') });
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

    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Äang táº£i Ä‘Æ¡n hÃ ng...</td></tr>';

    try {
        let orders = await fetchAPI('/orders/');
        if (currentStatusFilter !== 'all') {
            orders = orders.filter(o => o.status === currentStatusFilter);
        }

        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5">ChÆ°a cÃ³ Ä‘Æ¡n hÃ ng phÃ¹ há»£p.</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(renderOrderRows).join('');
    } catch (e) {
        console.error('Lá»—i táº£i Ä‘Æ¡n hÃ ng:', e);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Lá»—i táº£i Ä‘Æ¡n hÃ ng</td></tr>';
    }
};

function renderOrderRows(order) {
    const items = order.items || [];
    const customer = getCustomerInfo(order);
    const firstItem = items[0];
    const extraCount = Math.max(items.length - 1, 0);
    const productSummary = firstItem
        ? `${escapeHTML(firstItem.product_name)}${extraCount ? ` +${extraCount} sáº£n pháº©m khÃ¡c` : ''}`
        : 'ChÆ°a cÃ³ sáº£n pháº©m';
    const renewButton = order.status === 'payment_expired' || order.payment_status === 'expired'
        ? `<button class="btn btn-sm btn-warning border ms-1" onclick="renewOrderPayment(${order.id}, ${order.user_email ? 'true' : 'false'})">
                <i class="fas fa-qrcode me-1"></i>Táº¡o QR má»›i
           </button>`
        : '';

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
                    <i class="fas fa-list-ul me-1"></i>Xem ${items.length || 0} sáº£n pháº©m
                </button>
            </td>
            <td class="fw-bold text-danger">${formatMoney(order.total_amount || 0)}</td>
            <td>
                ${renderOrderStatus(order.status, order.payment_status)}
                ${order.status === 'awaiting_payment' ? `<div class="small text-muted mt-1">Háº¡n QR: ${escapeHTML(order.payment_expires_at_formatted || '--')}</div>` : ''}
            </td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-light border" onclick="updateOrderStatus(${order.id}, 'active')" ${order.status !== 'pending' ? 'disabled title="Chá»‰ duyá»‡t sau khi khÃ¡ch Ä‘Ã£ thanh toÃ¡n"' : ''}>
                    <i class="fas fa-check-circle text-success"></i> Duyá»‡t
                </button>
                <button class="btn btn-sm btn-light border ms-1" onclick="updateOrderStatus(${order.id}, 'cancelled')">
                    <i class="fas fa-times-circle text-danger"></i> Há»§y
                </button>
                ${renewButton}
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
        : '<div class="text-muted py-3">ÄÆ¡n nÃ y chÆ°a cÃ³ sáº£n pháº©m.</div>';

    return `
        <div class="order-detail-panel">
            <div class="row g-4">
                <div class="col-lg-4">
                    <div class="order-detail-box">
                        <div class="order-detail-label">ThÃ´ng tin khÃ¡ch hÃ ng</div>
                        <div class="fw-bold fs-6">${escapeHTML(customer.name)}</div>
                        <div class="text-muted small mt-2"><i class="fas fa-phone me-2"></i>${escapeHTML(order.user_phone || 'ChÆ°a cÃ³ SÄT')}</div>
                        <div class="text-muted small mt-1"><i class="fas fa-envelope me-2"></i>${escapeHTML(order.user_email || 'ChÆ°a cÃ³ email')}</div>
                        <div class="text-muted small mt-1"><i class="fas fa-receipt me-2"></i>${escapeHTML(order.payment_reference || order.code || '--')}</div>
                        ${customer.company ? `<div class="text-muted small mt-1"><i class="fas fa-building me-2"></i>${escapeHTML(customer.company)}</div>` : ''}
                    </div>
                </div>
                <div class="col-lg-8">
                    <div class="order-detail-box">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <div class="order-detail-label">Sáº£n pháº©m trong Ä‘Æ¡n</div>
                                <div class="fw-bold">${items.length} sáº£n pháº©m</div>
                            </div>
                            <div class="text-end">
                                <div class="order-detail-label">Tá»•ng tiá»n</div>
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
                <div class="fw-bold">${index + 1}. ${escapeHTML(item.product_name || 'Sáº£n pháº©m')}</div>
                <div class="small text-muted">
                    ${escapeHTML(item.category_name || 'ChÆ°a phÃ¢n loáº¡i')} Â· ${escapeHTML(item.duration || 'GÃ³i máº·c Ä‘á»‹nh')}
                </div>
                <div class="small text-muted">Sá»‘ lÆ°á»£ng: ${item.quantity || 1}</div>
            </div>
            <div class="text-end">
                <div class="fw-semibold">${formatMoney(item.price || 0)}</div>
                <div class="small text-muted">Táº¡m tÃ­nh</div>
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
        awaiting_payment: 'Chá» thanh toÃ¡n',
        payment_expired: 'Háº¿t háº¡n thanh toÃ¡n',
        pending: 'Chá» admin duyá»‡t',
        confirmed: 'ÄÃ£ xÃ¡c nháº­n',
        active: 'Hiá»‡u lá»±c',
        cancelled: 'ÄÃ£ há»§y',
    };
    const suffix = paymentStatus === 'paid' && status === 'pending' ? ' Â· Ä‘Ã£ thanh toÃ¡n' : '';
    return `<span class="badge border ${styles[status] || 'bg-secondary-subtle text-secondary border-secondary'}">${labels[status] || status}${suffix}</span>`;
}

window.updateOrderStatus = async function(id, status) {
    try {
        await fetchAPI(`/orders/${id}/`, 'PATCH', { status });
        Toast.fire({ icon: 'success', title: 'ÄÃ£ cáº­p nháº­t Ä‘Æ¡n hÃ ng' });
        loadOrders(currentStatusFilter);
    } catch (e) {
        Toast.fire({ icon: 'error', title: 'KhÃ´ng thá»ƒ cáº­p nháº­t' });
    }
};

window.renewOrderPayment = async function(id, hasEmail = false) {
    const result = await Swal.fire({
        title: 'Táº¡o QR thanh toÃ¡n má»›i?',
        html: `
            <div class="text-start">
                <p class="text-muted mb-3">Há»‡ thá»‘ng sáº½ gia háº¡n QR theo cáº¥u hÃ¬nh hiá»‡n táº¡i vÃ  Ä‘Æ°a Ä‘Æ¡n vá» tráº¡ng thÃ¡i chá» thanh toÃ¡n.</p>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="renew-send-email" ${hasEmail ? 'checked' : ''} ${hasEmail ? '' : 'disabled'}>
                    <label class="form-check-label" for="renew-send-email">Gá»­i link QR qua email tÃ i khoáº£n</label>
                    ${hasEmail ? '' : '<div class="small text-danger ms-4">KhÃ¡ch hÃ ng chÆ°a cÃ³ email.</div>'}
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="renew-send-chat" checked>
                    <label class="form-check-label" for="renew-send-chat">Gá»­i link QR qua chat há»— trá»£</label>
                </div>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#D71920',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Táº¡o QR má»›i',
        cancelButtonText: 'Há»§y',
        preConfirm: () => ({
            send_email: document.getElementById('renew-send-email')?.checked || false,
            send_chat: document.getElementById('renew-send-chat')?.checked || false,
        }),
    });
    if (!result.isConfirmed) return;

    try {
        Swal.fire({ title: 'Äang táº¡o QR má»›i...', allowOutsideClick: false });
        Swal.showLoading();
        const response = await fetchAPI(`/orders/${id}/renew-payment/`, 'POST', result.value || {});
        const warnings = response.warnings || [];
        const sent = response.sent || {};
        const sentText = [
            sent.email ? 'ÄÃ£ gá»­i email' : '',
            sent.chat ? 'ÄÃ£ gá»­i chat' : '',
        ].filter(Boolean).join(' Â· ');

        await Swal.fire({
            icon: warnings.length ? 'warning' : 'success',
            title: 'ÄÃ£ táº¡o QR má»›i',
            text: warnings.length ? warnings.join(' ') : (sentText || 'QR má»›i Ä‘Ã£ sáºµn sÃ ng.'),
            confirmButtonColor: '#D71920',
        });
        loadOrders(currentStatusFilter);
    } catch (error) {
        Swal.fire('Lá»—i', getErrorMessage(error, 'KhÃ´ng thá»ƒ táº¡o láº¡i QR thanh toÃ¡n.'), 'error');
    }
};

function getCustomerInfo(order) {
    const name = order.user_name || order.user_phone || `KhÃ¡ch hÃ ng #${order.user || order.id}`;
    const typeLabel = order.user_type === 'enterprise' ? 'Doanh nghiá»‡p' : 'CÃ¡ nhÃ¢n';
    const contact = order.user_phone || order.user_email || 'ChÆ°a cÃ³ liÃªn há»‡';
    return {
        name,
        meta: `${typeLabel} Â· ${contact}`,
        company: order.company_name || '',
    };
}

function getCustomerOptionLabel(user) {
    const fullName = `${user.last_name || ''} ${user.first_name || ''}`.trim();
    const name = user.company_name || fullName || user.username || user.phone || `KhÃ¡ch hÃ ng #${user.id}`;
    const type = user.user_type === 'enterprise' ? 'Doanh nghiá»‡p' : 'CÃ¡ nhÃ¢n';
    const contact = user.phone || user.email || 'chÆ°a cÃ³ liÃªn há»‡';
    return `${name} Â· ${type} Â· ${contact}`;
}

function formatDate(value) {
    if (!value) return '--';
    return new Date(value).toLocaleDateString('vi-VN');
}

