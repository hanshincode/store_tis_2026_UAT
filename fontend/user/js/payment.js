let currentOrder = null;
let countdownTimer = null;

document.addEventListener('DOMContentLoaded', loadPaymentPage);

async function loadPaymentPage() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order') || params.get('order_id');
    const paymentToken = params.get('token') || params.get('payment_token');
    const container = document.getElementById('payment-container');

    if (!orderId && !paymentToken) {
        container.innerHTML = renderPaymentError('Không tìm thấy mã đơn hàng.');
        return;
    }

    try {
        currentOrder = paymentToken
            ? await fetchAPI(`/orders/payment-detail/?token=${encodeURIComponent(paymentToken)}`)
            : await fetchAPI(`/orders/${orderId}/`);
        renderPayment(currentOrder);
        startCountdown(currentOrder.payment_remaining_seconds || 0);
    } catch (error) {
        container.innerHTML = renderPaymentError(getErrorMessage(error, 'Không thể tải thông tin thanh toán.'));
    }
}

function renderPayment(order) {
    const container = document.getElementById('payment-container');
    const items = Array.isArray(order.items) ? order.items : [];
    const qrUrl = order.payment_qr_url || '';
    const paymentDescription = order.payment_description || order.code || '';
    const paymentBank = order.payment_bank || {};
    const paymentTimeoutMinutes = order.payment_timeout_minutes || 15;
    const isPaid = order.payment_status === 'paid';
    const isExpired = order.payment_status === 'expired' || order.status === 'payment_expired';

    const itemsHtml = items.map(item => `
        <div class="payment-item">
            <div>
                <div class="fw-semibold">${escapeHTML(item.product_name || 'Gói bảo hiểm')}</div>
                <small class="text-muted">${escapeHTML(item.category_name || 'Danh mục')} · ${escapeHTML(item.duration || 'Gói mặc định')} x ${item.quantity || 1}</small>
            </div>
            <div class="text-end fw-semibold">${formatMoney(item.subtotal || item.price || 0)}</div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="payment-heading mb-4">
            <a href="orders.html" class="btn btn-link text-danger text-decoration-none p-0 mb-3">
                <i class="fas fa-arrow-left me-2"></i>Quay lại đơn hàng
            </a>
            <h3 class="fw-bold mb-1">Thanh toán đơn hàng</h3>
            <p class="text-muted mb-0">Quét QR để thanh toán. Bill sẽ giữ trạng thái chờ thanh toán trong ${paymentTimeoutMinutes} phút.</p>
        </div>

        <div class="row g-4">
            <div class="col-lg-5">
                <section class="payment-panel text-center">
                    <div class="payment-status ${isPaid ? 'paid' : isExpired ? 'expired' : 'waiting'} mb-3">
                        ${getPaymentStatusLabel(order)}
                    </div>
                    <div class="qr-box ${isExpired || isPaid ? 'qr-box-muted' : ''}">
                        ${qrUrl
                            ? `<img src="${escapeHTML(qrUrl)}" alt="QR thanh toán đơn ${escapeHTML(order.code)}">`
                            : `<div class="text-danger fw-semibold p-4">Chưa cấu hình tài khoản nhận tiền.</div>`
                        }
                    </div>
                    <div class="mt-3 text-muted small">Nội dung chuyển khoản</div>
                    <input class="form-control text-center fw-bold payment-ref mt-1" value="${escapeHTML(paymentDescription)}" readonly disabled>
                    ${paymentBank.account_no ? `
                        <div class="small text-muted mt-3">
                            ${escapeHTML(paymentBank.bank_id || '')} · ${escapeHTML(paymentBank.account_no || '')} · ${escapeHTML(paymentBank.account_name || '')}
                        </div>
                    ` : ''}
                    <div class="countdown-box mt-4">
                        <div class="text-muted small">QR hết hạn sau</div>
                        <div class="countdown-time" id="payment-countdown">--:--</div>
                    </div>
                    <button class="btn btn-danger rounded-pill px-4 mt-4" id="btn-confirm-payment" onclick="confirmPayment()" ${isPaid || isExpired || !qrUrl ? 'disabled' : ''}>
                        <i class="fas fa-check-circle me-2"></i>Tôi đã thanh toán
                    </button>
                    <div class="text-muted small mt-3">QR được tạo từ thông tin thanh toán trên hệ thống.</div>
                </section>
            </div>

            <div class="col-lg-7">
                <section class="payment-panel">
                    <div class="d-flex justify-content-between align-items-start gap-3 mb-4">
                        <div>
                            <div class="text-muted small">Mã bill</div>
                            <h5 class="fw-bold mb-0">${escapeHTML(order.code || `#${order.id}`)}</h5>
                        </div>
                        <div class="text-end">
                            <div class="text-muted small">Trạng thái</div>
                            ${orderStatusBadge(order.status, order.payment_status)}
                        </div>
                    </div>

                    <div class="bill-box mb-4">
                        <div class="bill-row">
                            <span>Khách hàng</span>
                            <strong>${escapeHTML(order.user_name || 'Khách hàng')}</strong>
                        </div>
                        <div class="bill-row">
                            <span>Số điện thoại</span>
                            <strong>${escapeHTML(order.user_phone || 'Chưa có')}</strong>
                        </div>
                        <div class="bill-row">
                            <span>Hạn thanh toán</span>
                            <strong>${escapeHTML(order.payment_expires_at_formatted || '--')}</strong>
                        </div>
                    </div>

                    <h6 class="fw-bold mb-3">Chi tiết bill</h6>
                    <div class="payment-items mb-4">${itemsHtml || '<div class="text-muted">Chưa có sản phẩm.</div>'}</div>

                    ${renderSubjectForm(items, isPaid || isExpired)}

                    <div class="d-flex justify-content-between align-items-center border-top pt-3">
                        <span class="fw-bold fs-5">Tổng thanh toán</span>
                        <span class="fs-4 fw-bold text-danger">${formatMoney(order.total_amount || 0)}</span>
                    </div>
                </section>
            </div>
        </div>
    `;
}

function renderSubjectForm(items, disabled = false) {
    const configurableItems = items.filter(item => Array.isArray(item.subject_fields) && item.subject_fields.length);
    if (!configurableItems.length) return '';

    return `
        <div class="subject-form-panel mb-4">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                    <h6 class="fw-bold mb-1">Thông tin đối tượng được bảo hiểm</h6>
                    <div class="text-muted small">Nhập thông tin cho từng đối tượng trước khi thanh toán.</div>
                </div>
                ${disabled ? '' : `
                    <button type="button" class="btn btn-outline-danger rounded-pill btn-sm" onclick="saveOrderSubjects()">
                        <i class="fas fa-save me-1"></i>Lưu thông tin
                    </button>
                `}
            </div>
            <div class="d-grid gap-3">
                ${configurableItems.map(item => renderSubjectItemForms(item, disabled)).join('')}
            </div>
        </div>
    `;
}

function renderSubjectItemForms(item, disabled = false) {
    const subjectsByIndex = {};
    (item.subjects || []).forEach(subject => { subjectsByIndex[subject.index] = subject; });
    const quantity = Math.max(Number(item.quantity || 1), 1);
    let html = '';
    for (let index = 1; index <= quantity; index += 1) {
        const subject = subjectsByIndex[index] || {};
        html += `
            <div class="subject-card" data-order-item-id="${item.id}" data-subject-index="${index}">
                <div class="fw-semibold mb-2">
                    ${escapeHTML(item.product_name || 'Sản phẩm')}
                    <span class="text-muted">· ${escapeHTML(item.category_name || 'Danh mục')}</span>
                    <span class="badge bg-light text-dark border ms-2">Đối tượng ${index}</span>
                </div>
                <div class="subject-grid">
                    ${(item.subject_fields || []).map(field => renderSubjectInput(field, item.id, index, subject.data || {}, disabled)).join('')}
                </div>
            </div>
        `;
    }
    return html;
}

function renderSubjectInput(field, itemId, index, data = {}, disabled = false) {
    const fieldKey = field.field_key;
    const value = data[fieldKey] || '';
    const requiredAttr = field.is_required ? 'required' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const attrs = `class="form-control subject-input" data-item-id="${itemId}" data-subject-index="${index}" data-field-key="${escapeHTML(fieldKey)}" data-field-type="${escapeHTML(field.field_type || 'text')}" ${requiredAttr} ${disabledAttr}`;
    const label = `${escapeHTML(field.label || fieldKey)}${field.is_required ? ' *' : ''}`;
    const help = field.help_text ? `<div class="form-text">${escapeHTML(field.help_text)}</div>` : '';

    let inputHtml = '';
    if (field.field_type === 'textarea') {
        inputHtml = `<textarea ${attrs} rows="2">${escapeHTML(value)}</textarea>`;
    } else if (field.field_type === 'file') {
        inputHtml = `
            ${value ? `<div class="mb-2"><a href="${mediaUrl(value)}" target="_blank" class="small text-danger text-decoration-none"><i class="fas fa-paperclip me-1"></i>File đã tải lên</a></div>` : ''}
            <input type="file" ${attrs}>
            <input type="hidden" class="subject-existing-file" data-field-key="${escapeHTML(fieldKey)}" value="${escapeHTML(value)}">
        `;
    } else {
        const type = field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text';
        inputHtml = `<input type="${type}" ${attrs} value="${escapeHTML(value)}">`;
    }

    return `
        <div>
            <label class="form-label small fw-semibold">${label}</label>
            ${inputHtml}
            ${help}
        </div>
    `;
}

async function saveOrderSubjects(options = {}) {
    if (!currentOrder) return null;
    const cards = Array.from(document.querySelectorAll('.subject-card'));
    if (!cards.length) return currentOrder;

    const byItem = new Map();
    const formData = new FormData();

    cards.forEach(card => {
        const itemId = Number(card.dataset.orderItemId);
        const index = Number(card.dataset.subjectIndex);
        if (!byItem.has(itemId)) byItem.set(itemId, []);
        const data = {};

        card.querySelectorAll('.subject-input').forEach(input => {
            const key = input.dataset.fieldKey;
            const type = input.dataset.fieldType;
            if (type === 'file') {
                const existing = card.querySelector(`.subject-existing-file[data-field-key="${key}"]`)?.value || '';
                if (input.files && input.files[0]) {
                    formData.append(`file_${itemId}_${index}_${key}`, input.files[0]);
                    data[key] = input.files[0].name;
                } else {
                    data[key] = existing;
                }
            } else {
                data[key] = input.value.trim();
            }
        });

        byItem.get(itemId).push({
            index,
            label: `Đối tượng ${index}`,
            data,
        });
    });

    formData.append('payload', JSON.stringify({
        items: Array.from(byItem.entries()).map(([order_item_id, subjects]) => ({ order_item_id, subjects })),
    }));

    try {
        currentOrder = await fetchAPI(`/orders/${currentOrder.id}/subjects/`, 'POST', formData);
        if (!options.silent) {
            Toast.fire({ icon: 'success', title: 'Đã lưu thông tin đối tượng' });
            renderPayment(currentOrder);
            startCountdown(currentOrder.payment_remaining_seconds || 0);
        }
        return currentOrder;
    } catch (error) {
        if (!options.silent) {
            Swal.fire('Lỗi', getErrorMessage(error, 'Không thể lưu thông tin đối tượng.'), 'error');
        }
        throw error;
    }
}

function startCountdown(seconds) {
    clearInterval(countdownTimer);
    updateCountdown(seconds);
    countdownTimer = setInterval(() => {
        seconds -= 1;
        updateCountdown(seconds);
        if (seconds <= 0) {
            clearInterval(countdownTimer);
            const btn = document.getElementById('btn-confirm-payment');
            if (btn) btn.disabled = true;
        }
    }, 1000);
}

function updateCountdown(seconds) {
    const el = document.getElementById('payment-countdown');
    if (!el) return;
    const safeSeconds = Math.max(Number(seconds) || 0, 0);
    const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
    const remainSeconds = (safeSeconds % 60).toString().padStart(2, '0');
    el.textContent = `${minutes}:${remainSeconds}`;
}

async function confirmPayment() {
    if (!currentOrder) return;

    try {
        await saveOrderSubjects({ silent: true });
        const result = await Swal.fire({
            title: 'Xác nhận đã thanh toán?',
            text: 'Sau khi xác nhận, bill sẽ chuyển sang chờ admin duyệt đơn.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#D71920',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Đã thanh toán',
            cancelButtonText: 'Hủy',
        });
        if (!result.isConfirmed) return;

        Swal.fire({ title: 'Đang cập nhật thanh toán...', allowOutsideClick: false });
        Swal.showLoading();
        currentOrder = await fetchAPI(`/orders/${currentOrder.id}/confirm_payment/`, 'POST', {});
        Swal.fire({
            icon: 'success',
            title: 'Thanh toán thành công',
            text: 'Đơn hàng đã chuyển sang trạng thái chờ admin duyệt.',
            confirmButtonColor: '#D71920',
        }).then(() => {
            window.location.href = 'orders.html';
        });
    } catch (error) {
        Swal.fire('Lỗi', getErrorMessage(error, 'Không thể xác nhận thanh toán.'), 'error');
        loadPaymentPage();
    }
}

function getPaymentStatusLabel(order) {
    if (order.payment_status === 'paid') return 'Đã thanh toán';
    if (order.payment_status === 'expired' || order.status === 'payment_expired') return 'QR đã hết hạn';
    return 'Chờ thanh toán';
}

function orderStatusBadge(status, paymentStatus) {
    const labels = {
        awaiting_payment: 'Chờ thanh toán',
        payment_expired: 'Hết hạn thanh toán',
        pending: 'Chờ admin duyệt',
        confirmed: 'Đã xác nhận',
        active: 'Đang hiệu lực',
        cancelled: 'Đã hủy',
    };
    const classes = {
        awaiting_payment: 'bg-warning-subtle text-warning border-warning',
        payment_expired: 'bg-secondary-subtle text-secondary border-secondary',
        pending: 'bg-info-subtle text-info border-info',
        confirmed: 'bg-primary-subtle text-primary border-primary',
        active: 'bg-success-subtle text-success border-success',
        cancelled: 'bg-danger-subtle text-danger border-danger',
    };
    const suffix = paymentStatus === 'paid' && status === 'pending' ? ' · đã thanh toán' : '';
    return `<span class="badge border ${classes[status] || 'bg-light text-muted'}">${labels[status] || status}${suffix}</span>`;
}

function renderPaymentError(message) {
    return `
        <div class="text-center bg-white rounded-3 shadow-sm border p-5">
            <i class="fas fa-exclamation-circle text-danger mb-3" style="font-size: 4rem;"></i>
            <h5 class="fw-bold">Không thể mở trang thanh toán</h5>
            <p class="text-muted">${escapeHTML(message)}</p>
            <a href="orders.html" class="btn btn-danger rounded-pill px-4">Về lịch sử đơn hàng</a>
        </div>`;
}
