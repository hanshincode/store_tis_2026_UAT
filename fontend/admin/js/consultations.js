// frontend/admin/js/consultations.js

let consultationStaff = [];
let currentAdminUser = null;
let quickCategories = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!getAccessToken()) {
        window.location.href = '../admin-login.html';
        return;
    }
    currentAdminUser = await fetchAPI('/users/me/');
    await loadAssignableStaff();
    await loadQuickCategories();
    document.getElementById('btn-open-quick-form')?.addEventListener('click', openQuickFormModal);
    document.getElementById('btn-create-quick-form')?.addEventListener('click', createQuickFormLink);
    loadConsultations();
});

async function loadAssignableStaff() {
    try {
        const staff = await fetchAPI('/users/staff-list/');
        consultationStaff = staff.filter(user => user.role === 'staff' && user.is_active);
    } catch (e) {
        consultationStaff = [];
    }
}

async function loadQuickCategories() {
    try {
        quickCategories = await fetchAPI('/categories/');
        if (['leader', 'staff'].includes(currentAdminUser?.role)) {
            const allowed = new Set((currentAdminUser.specialized_categories || []).map(String));
            quickCategories = quickCategories.filter(category => allowed.has(String(category.id)));
        }
    } catch (e) {
        quickCategories = [];
    }
    const select = document.getElementById('quick-category');
    if (!select) return;
    select.innerHTML = quickCategories.map(category => `
        <option value="${category.id}">${escapeHTML(category.name)}</option>
    `).join('');
}

window.loadConsultations = async function(options = {}) {
    const tbody = document.getElementById('consultation-list');
    if (!tbody) return;
    if (!options.silent) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Dang tai yeu cau tu van...</td></tr>';
    }

    try {
        const payload = await fetchAPI('/consultations/');
        const data = Array.isArray(payload) ? payload : (payload.results || []);
        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Chua co yeu cau tu van nao.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(renderConsultationRow).join('');
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Khong the tai yeu cau tu van.</td></tr>';
    }
};

function renderConsultationRow(item) {
    const processorName = item.processor_name || item.assigned_staff_name || '';
    const processorHtml = processorName ? `
        <div class="d-flex align-items-center gap-2">
            <div class="bg-light rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold" style="width: 30px; height: 30px;">
                ${escapeHTML(processorName.charAt(0))}
            </div>
            <div>
                <div class="fw-bold text-dark">${escapeHTML(processorName)}</div>
                <small class="text-muted">${item.processor_name ? 'Da tiep nhan' : 'Duoc chi dinh'}</small>
            </div>
        </div>
    ` : '<span class="text-muted small fst-italic">Chua co</span>';

    const statusText = item.status === 'new' ? 'Moi' : (item.status === 'archived' ? 'Luu tru' : 'Dang xu ly');
    const statusClass = item.status === 'new' ? 'warning' : (item.status === 'archived' ? 'secondary' : 'success');
    const assignHtml = consultationStaff.length ? renderAssignStaffControl(item) : '';
    const isLeader = currentAdminUser?.role === 'leader';
    const actionHtml = processorName
        ? `<button class="btn btn-sm btn-success" onclick="goToChat(${item.id})"><i class="fab fa-facebook-messenger me-1"></i> Chat ngay</button>`
        : (isLeader
            ? '<span class="text-muted small">Cho phan cong staff</span>'
            : `<button class="btn btn-sm btn-primary" onclick="acceptAndChat(${item.id})"><i class="fas fa-hand-paper me-1"></i> Tiep nhan</button>`);

    return `
        <tr>
            <td>
                <div class="fw-bold">${escapeHTML(item.customer_name || 'Khach hang')}</div>
                <small class="text-muted">#${item.id}</small>
            </td>
            <td>${escapeHTML(item.customer_contact || '-')}</td>
            <td>${escapeHTML(item.product_name || item.category_name || 'Chung')}</td>
            <td>${processorHtml}</td>
            <td><span class="badge bg-${statusClass}">${statusText}</span></td>
            <td>
                <div class="d-flex flex-wrap gap-2">
                    ${actionHtml}
                    ${assignHtml}
                </div>
            </td>
        </tr>
    `;
}

function renderAssignStaffControl(item) {
    return `
        <div class="input-group input-group-sm consultation-assign-control">
            <select class="form-select" id="assign-staff-${item.id}">
                <option value="">Chi dinh staff...</option>
                ${consultationStaff.map(staff => `
                    <option value="${staff.id}" ${Number(item.assigned_staff) === Number(staff.id) ? 'selected' : ''}>
                        ${escapeHTML(staff.full_name || staff.username)}
                    </option>
                `).join('')}
            </select>
            <button class="btn btn-outline-primary" type="button" onclick="assignStaff(${item.id})">
                <i class="fas fa-user-check"></i>
            </button>
        </div>
    `;
}

async function assignStaff(id) {
    const staffId = document.getElementById(`assign-staff-${id}`)?.value;
    if (!staffId) return Toast.fire({ icon: 'warning', title: 'Vui long chon staff' });
    try {
        await fetchAPI(`/consultations/${id}/assign-staff/`, 'POST', { staff_id: staffId });
        Toast.fire({ icon: 'success', title: 'Da chi dinh staff' });
        loadConsultations({ silent: true });
    } catch (e) {
        Toast.fire({ icon: 'error', title: e.detail || e.message || 'Khong the chi dinh staff' });
    }
}

async function acceptAndChat(id) {
    try {
        await fetchAPI(`/consultations/${id}/assign_processor/`, 'POST');
        Toast.fire({ icon: 'success', title: 'Da tiep nhan yeu cau' });
        setTimeout(() => { window.location.href = `chat.html?id=${id}`; }, 500);
    } catch (e) {
        Toast.fire({ icon: 'error', title: e.detail || e.message || 'Khong the tiep nhan yeu cau' });
    }
}

function goToChat(id) {
    window.location.href = `chat.html?id=${id}`;
}

async function handleTicket(id) {
    return acceptAndChat(id);
}

function openQuickFormModal() {
    document.getElementById('quick-link-result').innerHTML = '';
    document.getElementById('quick-name').value = '';
    document.getElementById('quick-phone').value = '';
    document.getElementById('quick-email').value = '';
    new bootstrap.Modal(document.getElementById('quickFormModal')).show();
}

async function createQuickFormLink() {
    const category = document.getElementById('quick-category')?.value;
    if (!category) return Swal.fire('Thieu danh muc', 'Vui long chon danh muc can khach cap nhat.', 'warning');
    const btn = document.getElementById('btn-create-quick-form');
    const defaultText = btn.textContent;
    try {
        btn.disabled = true;
        btn.textContent = 'DANG TAO...';
        const form = await fetchAPI('/quick-forms/', 'POST', {
            category,
            customer_name: document.getElementById('quick-name').value.trim(),
            phone: document.getElementById('quick-phone').value.trim(),
            email: document.getElementById('quick-email').value.trim(),
            expires_days: document.getElementById('quick-expires-days').value,
        });
        document.getElementById('quick-link-result').innerHTML = `
            <div class="alert alert-success">
                <div class="fw-bold mb-2">Link form da san sang</div>
                <div class="input-group">
                    <input class="form-control" id="quick-generated-link" value="${escapeHTML(form.form_url)}" readonly>
                    <button class="btn btn-outline-primary" type="button" onclick="copyQuickFormLink()">Copy</button>
                </div>
            </div>
        `;
    } catch (e) {
        Swal.fire('That bai', e.detail || e.message || 'Khong the tao link form.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = defaultText;
    }
}

async function copyQuickFormLink() {
    const input = document.getElementById('quick-generated-link');
    if (!input) return;
    try {
        await navigator.clipboard.writeText(input.value);
        Toast.fire({ icon: 'success', title: 'Da copy link' });
    } catch (e) {
        input.select();
        document.execCommand('copy');
        Toast.fire({ icon: 'success', title: 'Da copy link' });
    }
}
