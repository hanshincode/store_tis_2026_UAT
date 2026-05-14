// frontend/admin/js/consultations.js

let consultationStaff = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!getAccessToken()) {
        window.location.href = '../admin-login.html';
        return;
    }
    await loadAssignableStaff();
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

window.loadConsultations = async function(options = {}) {
    const tbody = document.getElementById('consultation-list');
    if (!tbody) return;
    if (!options.silent) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Đang tải yêu cầu tư vấn...</td></tr>';
    }

    try {
        const payload = await fetchAPI('/consultations/');
        const data = Array.isArray(payload) ? payload : (payload.results || []);
        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Chưa có yêu cầu tư vấn nào.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(renderConsultationRow).join('');
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Không thể tải yêu cầu tư vấn.</td></tr>';
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
                <small class="text-muted">${item.processor_name ? 'Đã tiếp nhận' : 'Được chỉ định'}</small>
            </div>
        </div>
    ` : '<span class="text-muted small fst-italic">Chưa có</span>';

    const statusText = item.status === 'new' ? 'Mới' : (item.status === 'archived' ? 'Lưu trữ' : 'Đang xử lý');
    const statusClass = item.status === 'new' ? 'warning' : (item.status === 'archived' ? 'secondary' : 'success');
    const assignHtml = consultationStaff.length ? renderAssignStaffControl(item) : '';
    const actionHtml = processorName
        ? `<button class="btn btn-sm btn-success" onclick="goToChat(${item.id})"><i class="fab fa-facebook-messenger me-1"></i> Chat ngay</button>`
        : `<button class="btn btn-sm btn-primary" onclick="acceptAndChat(${item.id})"><i class="fas fa-hand-paper me-1"></i> Tiếp nhận</button>`;

    return `
        <tr>
            <td>
                <div class="fw-bold">${escapeHTML(item.customer_name || 'Khách hàng')}</div>
                <small class="text-muted">#${item.id}</small>
            </td>
            <td>${escapeHTML(item.customer_contact || '-')}</td>
            <td>${escapeHTML(item.product_name || 'Chung')}</td>
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
                <option value="">Chỉ định staff...</option>
                ${consultationStaff.map(staff => `
                    <option value="${staff.id}">${escapeHTML(staff.full_name || staff.username)}</option>
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
    if (!staffId) return Toast.fire({ icon: 'warning', title: 'Vui lòng chọn staff' });
    try {
        await fetchAPI(`/consultations/${id}/assign-staff/`, 'POST', { staff_id: staffId });
        Toast.fire({ icon: 'success', title: 'Đã chỉ định staff' });
        loadConsultations({ silent: true });
    } catch (e) {
        Toast.fire({ icon: 'error', title: e.detail || e.message || 'Không thể chỉ định staff' });
    }
}

async function acceptAndChat(id) {
    try {
        await fetchAPI(`/consultations/${id}/assign_processor/`, 'POST');
        Toast.fire({ icon: 'success', title: 'Đã tiếp nhận yêu cầu' });
        setTimeout(() => { window.location.href = `chat.html?id=${id}`; }, 500);
    } catch (e) {
        Toast.fire({ icon: 'error', title: e.detail || e.message || 'Không thể tiếp nhận yêu cầu' });
    }
}

function goToChat(id) {
    window.location.href = `chat.html?id=${id}`;
}

async function handleTicket(id) {
    return acceptAndChat(id);
}
