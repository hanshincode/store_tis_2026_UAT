let allAccounts = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('account-search')?.addEventListener('input', renderAccounts);
    document.getElementById('account-role-filter')?.addEventListener('change', renderAccounts);
    document.getElementById('account-edit-form')?.addEventListener('submit', saveAccountEdit);
    document.getElementById('edit-user-type')?.addEventListener('change', syncEditCompanyField);
    loadAccounts();
});

async function loadAccounts() {
    const tbody = document.getElementById('accounts-list');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Đang tải tài khoản...</td></tr>';
    try {
        const data = await fetchAPI('/users/');
        allAccounts = normalizeList(data);
        renderAccounts();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">${escapeHTML(getErrorMessage(error, 'Không thể tải danh sách tài khoản'))}</td></tr>`;
    }
}

function getAccountName(user) {
    const fullName = `${user.last_name || ''} ${user.first_name || ''}`.trim();
    if (user.user_type === 'enterprise') return user.company_name || fullName || user.phone || user.username || `#${user.id}`;
    return fullName || user.phone || user.username || `#${user.id}`;
}

function getRoleLabel(role) {
    return {
        super_admin: 'Super Admin',
        admin: 'Admin',
        staff: 'Staff',
        customer: 'Khách hàng'
    }[role] || role || '--';
}

function getTypeLabel(user) {
    if (user.role !== 'customer') return getRoleLabel(user.role);
    return user.user_type === 'enterprise' ? 'Doanh nghiệp' : 'Cá nhân';
}

function formatDateTime(value) {
    if (!value) return '--';
    return new Date(value).toLocaleString('vi-VN');
}

function getAvatarUrl(user) {
    if (user.avatar) return mediaUrl(user.avatar);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(getAccountName(user))}&background=d71920&color=fff`;
}

function renderAccounts() {
    const tbody = document.getElementById('accounts-list');
    const keyword = (document.getElementById('account-search')?.value || '').trim().toLowerCase();
    const role = document.getElementById('account-role-filter')?.value || 'all';

    const filtered = allAccounts.filter(user => {
        const haystack = [
            user.username, user.phone, user.email, user.first_name, user.last_name,
            user.full_name, user.company_name, user.tax_code, getAccountName(user)
        ].join(' ').toLowerCase();
        const roleOk = role === 'all' || user.role === role;
        return roleOk && (!keyword || haystack.includes(keyword));
    });

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Không tìm thấy tài khoản phù hợp.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(user => `
        <tr>
            <td class="ps-4">
                <div class="d-flex align-items-center gap-3">
                    <img src="${getAvatarUrl(user)}" class="rounded-circle border" width="44" height="44" style="object-fit:cover;">
                    <div class="min-width-0">
                        <div class="fw-bold text-truncate">${escapeHTML(getAccountName(user))}</div>
                        <div class="small text-muted text-truncate">@${escapeHTML(user.username || '--')}</div>
                    </div>
                </div>
            </td>
            <td>
                <div>${escapeHTML(user.phone || 'Chưa có SĐT')}</div>
                <div class="small text-muted">${escapeHTML(user.email || 'Chưa có email')}</div>
            </td>
            <td><span class="badge bg-light text-dark border">${escapeHTML(getTypeLabel(user))}</span></td>
            <td>${user.email_verified ? '<span class="badge bg-success-subtle text-success">Đã xác minh</span>' : '<span class="badge bg-warning-subtle text-warning">Chưa xác minh</span>'}</td>
            <td>${user.is_active ? '<span class="badge bg-success">Hoạt động</span>' : '<span class="badge bg-secondary">Đang khóa</span>'}</td>
            <td class="small">${formatDateTime(user.date_joined)}</td>
            <td class="text-end pe-4">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" title="Xem chi tiết" onclick="openAccountDetail(${user.id})"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-outline-secondary" title="Chỉnh sửa" onclick="openAccountEdit(${user.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-outline-warning" title="Khóa và yêu cầu xác minh lại" onclick="requireReverification(${user.id})"><i class="fas fa-user-lock"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function openAccountDetail(id) {
    const body = document.getElementById('account-detail-body');
    body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-danger"></div></div>';
    new bootstrap.Modal(document.getElementById('accountDetailModal')).show();

    try {
        const data = await fetchAPI(`/users/${id}/account-overview/`);
        body.innerHTML = renderAccountOverview(data);
    } catch (error) {
        body.innerHTML = `<div class="alert alert-danger">${escapeHTML(getErrorMessage(error, 'Không thể tải chi tiết tài khoản'))}</div>`;
    }
}

function renderAccountOverview(data) {
    const user = data.account || {};
    const stats = data.stats || {};
    const orders = data.orders || [];
    const consultations = data.consultations || [];

    return `
        <div class="row g-4">
            <div class="col-lg-4">
                <div class="account-detail-card h-100">
                    <div class="text-center mb-4">
                        <img src="${getAvatarUrl(user)}" class="rounded-circle border mb-3" width="88" height="88" style="object-fit:cover;">
                        <h5 class="fw-bold mb-1">${escapeHTML(getAccountName(user))}</h5>
                        <div class="text-muted">${escapeHTML(getTypeLabel(user))}</div>
                    </div>
                    ${renderInfoLine('Tài khoản', user.username)}
                    ${renderInfoLine('Số điện thoại', user.phone)}
                    ${renderInfoLine('Email', user.email)}
                    ${renderInfoLine('Doanh nghiệp', user.company_name)}
                    ${renderInfoLine('Mã số thuế', user.tax_code)}
                    ${renderInfoLine('CCCD/CMND', user.cccd)}
                    ${renderInfoLine('Địa chỉ', user.address)}
                    ${renderInfoLine('Ngày tạo', formatDateTime(user.date_joined))}
                    ${renderInfoLine('Đăng nhập cuối', formatDateTime(user.last_login))}
                    ${renderInfoLine('Xác minh email', user.email_verified ? 'Đã xác minh' : 'Chưa xác minh')}
                    ${renderInfoLine('Trạng thái', user.is_active ? 'Hoạt động' : 'Đang khóa')}
                </div>
            </div>
            <div class="col-lg-8">
                <div class="row g-3 mb-4">
                    ${renderStatBox('Đơn hàng', stats.orders_count || 0, 'fa-file-invoice-dollar')}
                    ${renderStatBox('Tổng giá trị', formatMoney(stats.orders_total || 0), 'fa-wallet')}
                    ${renderStatBox('Yêu cầu tư vấn', stats.consultations_count || 0, 'fa-headset')}
                    ${renderStatBox('Tin nhắn', stats.messages_count || 0, 'fa-comments')}
                </div>
                <div class="account-detail-card mb-4">
                    <h6 class="fw-bold mb-3">Đơn hàng gần nhất</h6>
                    ${renderOrdersMiniTable(orders)}
                </div>
                <div class="account-detail-card">
                    <h6 class="fw-bold mb-3">Yêu cầu tư vấn gần nhất</h6>
                    ${renderConsultationsMiniList(consultations)}
                </div>
            </div>
        </div>
    `;
}

function renderInfoLine(label, value) {
    return `
        <div class="account-info-line">
            <span>${escapeHTML(label)}</span>
            <strong>${escapeHTML(value || '--')}</strong>
        </div>`;
}

function renderStatBox(label, value, icon) {
    return `
        <div class="col-md-6 col-xl-3">
            <div class="account-stat-box">
                <i class="fas ${icon} text-danger"></i>
                <div class="small text-muted mt-2">${escapeHTML(label)}</div>
                <div class="fw-bold">${escapeHTML(value)}</div>
            </div>
        </div>`;
}

function renderOrdersMiniTable(orders) {
    if (!orders.length) return '<div class="text-muted">Tài khoản chưa có đơn hàng.</div>';
    return `
        <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
                <thead><tr><th>Mã đơn</th><th>Ngày tạo</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td><a href="orders.html" class="fw-bold text-danger">${escapeHTML(order.code || `#${order.id}`)}</a></td>
                            <td>${formatDateTime(order.created_at)}</td>
                            <td>${formatMoney(order.total_amount || 0)}</td>
                            <td><span class="badge bg-light text-dark border">${escapeHTML(order.status || '--')}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

function renderConsultationsMiniList(items) {
    if (!items.length) return '<div class="text-muted">Tài khoản chưa có yêu cầu tư vấn.</div>';
    return items.map(item => `
        <div class="border rounded-3 p-3 mb-2">
            <div class="d-flex justify-content-between gap-3">
                <strong>#${item.id} - ${escapeHTML(item.product_name || 'Hỗ trợ')}</strong>
                <span class="badge bg-light text-dark border">${escapeHTML(item.status || '--')}</span>
            </div>
            <div class="small text-muted mt-1">${formatDateTime(item.created_at)} · ${escapeHTML(item.customer_contact || '')}</div>
            ${item.note ? `<div class="small mt-2">${escapeHTML(item.note)}</div>` : ''}
        </div>
    `).join('');
}

function openAccountEdit(id) {
    const user = allAccounts.find(item => Number(item.id) === Number(id));
    if (!user) return;

    document.getElementById('edit-account-id').value = user.id;
    document.getElementById('edit-phone').value = user.phone || '';
    document.getElementById('edit-email').value = user.email || '';
    document.getElementById('edit-last-name').value = user.last_name || '';
    document.getElementById('edit-first-name').value = user.first_name || '';
    document.getElementById('edit-user-type').value = user.user_type || '';
    document.getElementById('edit-company-name').value = user.company_name || '';
    document.getElementById('edit-tax-code').value = user.tax_code || '';
    document.getElementById('edit-cccd').value = user.cccd || '';
    document.getElementById('edit-address').value = user.address || '';
    syncEditCompanyField();
    new bootstrap.Modal(document.getElementById('accountEditModal')).show();
}

function syncEditCompanyField() {
    const type = document.getElementById('edit-user-type').value;
    const company = document.getElementById('edit-company-name');
    const tax = document.getElementById('edit-tax-code');
    const enabled = type === 'enterprise';
    company.disabled = !enabled;
    tax.disabled = !enabled;
    if (!enabled) {
        company.value = '';
        tax.value = '';
    }
}

async function saveAccountEdit(event) {
    event.preventDefault();
    const id = document.getElementById('edit-account-id').value;
    const phoneInput = document.getElementById('edit-phone');
    const phone = phoneInput.value.trim()
        ? (typeof validateVietnamPhoneInput === 'function' ? validateVietnamPhoneInput(phoneInput) : phoneInput.value.trim())
        : '';
    if (phoneInput.value.trim() && !phone) return;

    const payload = {
        phone,
        email: document.getElementById('edit-email').value.trim(),
        last_name: document.getElementById('edit-last-name').value.trim(),
        first_name: document.getElementById('edit-first-name').value.trim(),
        user_type: document.getElementById('edit-user-type').value,
        company_name: document.getElementById('edit-company-name').value.trim(),
        tax_code: document.getElementById('edit-tax-code').value.trim(),
        cccd: document.getElementById('edit-cccd').value.trim(),
        address: document.getElementById('edit-address').value.trim(),
    };

    try {
        const updated = await fetchAPI(`/users/${id}/`, 'PATCH', payload);
        const index = allAccounts.findIndex(item => Number(item.id) === Number(id));
        if (index >= 0) allAccounts[index] = updated;
        bootstrap.Modal.getInstance(document.getElementById('accountEditModal')).hide();
        renderAccounts();
        Toast.fire({ icon: 'success', title: 'Đã cập nhật tài khoản' });
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể cập nhật tài khoản') });
    }
}

async function requireReverification(id) {
    const user = allAccounts.find(item => Number(item.id) === Number(id));
    if (!user) return;
    const result = await Swal.fire({
        icon: 'warning',
        title: 'Khóa tạm thời tài khoản?',
        text: `Hệ thống sẽ khóa ${getAccountName(user)} và gửi email yêu cầu xác minh lại.`,
        showCancelButton: true,
        confirmButtonText: 'Khóa và gửi email',
        cancelButtonText: 'Hủy',
        confirmButtonColor: '#d71920'
    });
    if (!result.isConfirmed) return;

    try {
        const response = await fetchAPI(`/users/${id}/require-reverification/`, 'POST');
        const index = allAccounts.findIndex(item => Number(item.id) === Number(id));
        if (index >= 0 && response.account) allAccounts[index] = response.account;
        renderAccounts();
        Toast.fire({ icon: 'success', title: response.detail || 'Đã yêu cầu xác minh lại' });
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể khóa xác minh tài khoản') });
    }
}
