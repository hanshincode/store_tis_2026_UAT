// admin/js/staff.js

let staffCategories = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadStaffCategories();
    loadStaffList();

    document.getElementById('btn-open-add-staff')?.addEventListener('click', () => {
        document.getElementById('staff-form').reset();
        renderStaffCategoryPicker();
        new bootstrap.Modal(document.getElementById('staffModal')).show();
    });

    document.getElementById('s-role')?.addEventListener('change', toggleStaffCategorySection);
    document.getElementById('btn-submit-staff')?.addEventListener('click', createStaffAccount);
});

async function loadStaffCategories() {
    try {
        staffCategories = await fetchAPI('/categories/');
    } catch (e) {
        staffCategories = [];
    }
    renderStaffCategoryPicker();
}

function renderStaffCategoryPicker() {
    const container = document.getElementById('s-categories');
    if (!container) return;
    if (!staffCategories.length) {
        container.innerHTML = '<div class="text-muted small">Chưa tải được danh mục.</div>';
        return;
    }

    container.innerHTML = staffCategories.map(category => `
        <label class="staff-category-option">
            <input type="checkbox" value="${category.id}">
            <span>${escapeHTML(category.name)}</span>
        </label>
    `).join('');
    toggleStaffCategorySection();
}

function toggleStaffCategorySection() {
    const section = document.getElementById('staff-category-section');
    const role = document.getElementById('s-role')?.value;
    if (section) section.style.display = role === 'staff' ? 'block' : 'none';
}

async function loadStaffList() {
    const list = document.getElementById('staff-list');
    list.innerHTML = '<tr><td colspan="6" class="text-center">Đang tải...</td></tr>';

    try {
        const staff = await fetchAPI('/users/staff-list/');
        list.innerHTML = staff.map(s => `
            <tr>
                <td class="fw-bold">${escapeHTML(s.username || '-')}</td>
                <td>${escapeHTML(s.full_name || 'Chưa cập nhật')}</td>
                <td>${escapeHTML(s.email || '-')}</td>
                <td>
                    <span class="badge ${s.is_superuser || s.role === 'admin' || s.role === 'super_admin' ? 'bg-danger' : 'bg-primary'}">
                        ${s.is_superuser || s.role === 'admin' || s.role === 'super_admin' ? 'Admin' : 'Staff'}
                    </span>
                </td>
                <td>${renderStaffSpecializations(s)}</td>
                <td>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" ${s.is_active ? 'checked' : ''}
                            onclick="toggleStaffStatus(${s.id}, ${s.is_active})">
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        list.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Chưa có dữ liệu nhân sự</td></tr>';
    }
}

function renderStaffSpecializations(staff) {
    const names = staff.specialized_category_names || [];
    if (staff.role !== 'staff') return '<span class="text-muted small">Toàn quyền</span>';
    if (!names.length) return '<span class="text-danger small">Chưa khai báo</span>';
    return `<div class="d-flex flex-wrap gap-1">${names.map(name => `
        <span class="badge bg-light text-dark border">${escapeHTML(name)}</span>
    `).join('')}</div>`;
}

async function createStaffAccount() {
    const usernameInput = document.getElementById('s-username');
    const username = typeof validateVietnamPhoneInput === 'function'
        ? validateVietnamPhoneInput(usernameInput)
        : usernameInput.value.trim();
    const name = document.getElementById('s-name').value.trim();
    const pass = document.getElementById('s-pass').value;
    const role = document.getElementById('s-role').value;
    const specializedCategories = Array.from(document.querySelectorAll('#s-categories input:checked')).map(input => input.value);

    if (!username) return;
    if (!pass) return Swal.fire('Lỗi', 'Vui lòng nhập mật khẩu', 'error');
    if (role === 'staff' && specializedCategories.length === 0) {
        return Swal.fire('Lỗi', 'Vui lòng chọn ít nhất một danh mục chuyên môn cho staff', 'error');
    }

    try {
        await fetchAPI('/users/create-staff/', 'POST', {
            username,
            full_name: name,
            password: pass,
            role,
            specialized_categories: specializedCategories,
        });

        bootstrap.Modal.getInstance(document.getElementById('staffModal')).hide();
        loadStaffList();
        Swal.fire('Thành công', 'Đã tạo tài khoản nhân sự mới', 'success');
    } catch (e) {
        Swal.fire('Thất bại', e.detail || e.message || 'Không thể tạo tài khoản nhân sự', 'error');
    }
}

async function toggleStaffStatus(id, currentStatus) {
    try {
        await fetchAPI(`/users/${id}/toggle-status/`, 'POST');
        Toast.fire({ icon: 'success', title: 'Đã cập nhật trạng thái' });
    } catch (e) {
        loadStaffList();
        Toast.fire({ icon: 'error', title: e.detail || e.message || 'Không thể cập nhật trạng thái' });
    }
}
