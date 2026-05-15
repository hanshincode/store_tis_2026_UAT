// admin/js/staff.js

let staffCategories = [];
let staffUsers = [];

const ROLE_META = {
    super_admin: { label: 'Super Admin', badge: 'bg-dark' },
    admin: { label: 'Admin', badge: 'bg-danger' },
    leader: { label: 'Leader', badge: 'bg-warning text-dark' },
    staff: { label: 'Staff', badge: 'bg-primary' },
};

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = await fetchAPI('/users/me/');
    if (!currentUser.is_superuser && !['super_admin', 'admin'].includes(currentUser.role)) {
        window.location.replace('consultations.html');
        return;
    }
    await loadStaffCategories();
    await loadStaffList();

    document.getElementById('btn-open-add-staff')?.addEventListener('click', () => {
        document.getElementById('staff-form').reset();
        renderCategoryPicker('s-categories');
        toggleCategorySection('s-role', 'staff-category-section');
        new bootstrap.Modal(document.getElementById('staffModal')).show();
    });

    document.getElementById('s-role')?.addEventListener('change', () => toggleCategorySection('s-role', 'staff-category-section'));
    document.getElementById('rr-role')?.addEventListener('change', () => toggleCategorySection('rr-role', 'rr-category-section'));
    document.getElementById('btn-submit-staff')?.addEventListener('click', createStaffAccount);
    document.getElementById('btn-save-role-rules')?.addEventListener('click', saveRoleRules);
});

async function loadStaffCategories() {
    try {
        staffCategories = await fetchAPI('/categories/');
    } catch (e) {
        staffCategories = [];
    }
    renderCategoryPicker('s-categories');
}

function renderCategoryPicker(containerId, selectedIds = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!staffCategories.length) {
        container.innerHTML = '<div class="text-muted small">Chua tai duoc danh muc.</div>';
        return;
    }

    const selected = new Set((selectedIds || []).map(String));
    container.innerHTML = staffCategories.map(category => `
        <label class="staff-category-option">
            <input type="checkbox" value="${category.id}" ${selected.has(String(category.id)) ? 'checked' : ''}>
            <span>${escapeHTML(category.name)}</span>
        </label>
    `).join('');
}

function toggleCategorySection(roleSelectId, sectionId) {
    const section = document.getElementById(sectionId);
    const role = document.getElementById(roleSelectId)?.value;
    if (section) section.style.display = ['leader', 'staff'].includes(role) ? 'block' : 'none';
}

async function loadStaffList() {
    const list = document.getElementById('staff-list');
    list.innerHTML = '<tr><td colspan="7" class="text-center">Dang tai...</td></tr>';

    try {
        staffUsers = await fetchAPI('/users/staff-list/');
        if (!staffUsers.length) {
            list.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Chua co du lieu nhan su</td></tr>';
            return;
        }
        list.innerHTML = staffUsers.map(renderStaffRow).join('');
    } catch (e) {
        list.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Chua co du lieu nhan su</td></tr>';
    }
}

function renderStaffRow(user) {
    const role = ROLE_META[user.role] || { label: user.role || '-', badge: 'bg-secondary' };
    const canEdit = !user.is_superuser && user.role !== 'super_admin';
    return `
        <tr>
            <td class="fw-bold">${escapeHTML(user.username || user.phone || '-')}</td>
            <td>${escapeHTML(user.full_name || 'Chua cap nhat')}</td>
            <td>${escapeHTML(user.email || '-')}</td>
            <td><span class="badge ${role.badge}">${role.label}</span></td>
            <td>${renderRules(user)}</td>
            <td>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" ${user.is_active ? 'checked' : ''}
                        ${canEdit ? `onclick="toggleStaffStatus(${user.id})"` : 'disabled'}>
                </div>
            </td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary" ${canEdit ? '' : 'disabled'} onclick="openRoleRules(${user.id})">
                    <i class="fas fa-user-shield me-1"></i> Phan quyen
                </button>
            </td>
        </tr>
    `;
}

function renderRules(user) {
    const names = user.specialized_category_names || [];
    if (user.role === 'admin' || user.role === 'super_admin') {
        return '<span class="text-muted small">Toan quyen he thong</span>';
    }
    if (user.role === 'leader' && !names.length) {
        return '<span class="text-danger small">Chua gan danh muc quan ly</span>';
    }
    if (user.role === 'staff' && !names.length) {
        return '<span class="text-danger small">Chua gan danh muc chuyen mon</span>';
    }
    return `<div class="d-flex flex-wrap gap-1">${names.map(name => `
        <span class="badge bg-light text-dark border">${escapeHTML(name)}</span>
    `).join('')}</div>`;
}

function getCheckedCategoryIds(containerId) {
    return Array.from(document.querySelectorAll(`#${containerId} input:checked`)).map(input => input.value);
}

async function createStaffAccount() {
    const usernameInput = document.getElementById('s-username');
    const username = typeof validateVietnamPhoneInput === 'function'
        ? validateVietnamPhoneInput(usernameInput)
        : usernameInput.value.trim();
    const name = document.getElementById('s-name').value.trim();
    const email = document.getElementById('s-email').value.trim();
    const pass = document.getElementById('s-pass').value;
    const role = document.getElementById('s-role').value;
    const specializedCategories = getCheckedCategoryIds('s-categories');

    if (!username) return;
    if (!pass) return Swal.fire('Loi', 'Vui long nhap mat khau', 'error');
    if (['leader', 'staff'].includes(role) && specializedCategories.length === 0) {
        return Swal.fire('Loi', 'Vui long chon it nhat mot danh muc phan quyen', 'error');
    }

    try {
        await fetchAPI('/users/create-staff/', 'POST', {
            username,
            full_name: name,
            email,
            password: pass,
            role,
            specialized_categories: specializedCategories,
        });

        bootstrap.Modal.getInstance(document.getElementById('staffModal')).hide();
        await loadStaffList();
        Swal.fire('Thanh cong', 'Da tao tai khoan nhan su moi', 'success');
    } catch (e) {
        Swal.fire('That bai', e.detail || e.message || 'Khong the tao tai khoan nhan su', 'error');
    }
}

function openRoleRules(id) {
    const user = staffUsers.find(item => Number(item.id) === Number(id));
    if (!user) return;
    const selectedIds = user.specialized_categories || [];
    document.getElementById('rr-user-id').value = user.id;
    document.getElementById('rr-user-name').value = user.full_name || user.username || user.phone || '';
    document.getElementById('rr-role').value = user.role === 'leader' ? 'leader' : (user.role === 'admin' ? 'admin' : 'staff');
    document.getElementById('rr-active').checked = !!user.is_active;
    renderCategoryPicker('rr-categories', selectedIds);
    toggleCategorySection('rr-role', 'rr-category-section');
    new bootstrap.Modal(document.getElementById('roleRulesModal')).show();
}

async function saveRoleRules() {
    const id = document.getElementById('rr-user-id').value;
    const role = document.getElementById('rr-role').value;
    const specializedCategories = getCheckedCategoryIds('rr-categories');
    const isActive = document.getElementById('rr-active').checked;

    if (['leader', 'staff'].includes(role) && specializedCategories.length === 0) {
        return Swal.fire('Loi', 'Leader/Staff can it nhat mot danh muc phan quyen', 'error');
    }

    try {
        await fetchAPI(`/users/${id}/role-rules/`, 'PATCH', {
            role,
            is_active: isActive,
            specialized_categories: specializedCategories,
        });
        bootstrap.Modal.getInstance(document.getElementById('roleRulesModal')).hide();
        await loadStaffList();
        Toast.fire({ icon: 'success', title: 'Da luu phan quyen' });
    } catch (e) {
        Swal.fire('That bai', e.detail || e.message || 'Khong the luu phan quyen', 'error');
    }
}

async function toggleStaffStatus(id) {
    try {
        await fetchAPI(`/users/${id}/toggle-status/`, 'POST');
        await loadStaffList();
        Toast.fire({ icon: 'success', title: 'Da cap nhat trang thai' });
    } catch (e) {
        await loadStaffList();
        Toast.fire({ icon: 'error', title: e.detail || e.message || 'Khong the cap nhat trang thai' });
    }
}
