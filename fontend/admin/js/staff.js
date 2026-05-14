// admin/js/staff.js

document.addEventListener('DOMContentLoaded', () => {
    loadStaffList();

    document.getElementById('btn-open-add-staff')?.addEventListener('click', () => {
        document.getElementById('staff-form').reset();
        new bootstrap.Modal(document.getElementById('staffModal')).show();
    });

    document.getElementById('btn-submit-staff')?.addEventListener('click', createStaffAccount);
});

async function loadStaffList() {
    const list = document.getElementById('staff-list');
    list.innerHTML = '<tr><td colspan="5" class="text-center">Đang tải...</td></tr>';

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
                <td>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" ${s.is_active ? 'checked' : ''}
                            onclick="toggleStaffStatus(${s.id}, ${s.is_active})">
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        list.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Chưa có dữ liệu nhân sự</td></tr>';
    }
}

async function createStaffAccount() {
    const usernameInput = document.getElementById('s-username');
    const username = typeof validateVietnamPhoneInput === 'function'
        ? validateVietnamPhoneInput(usernameInput)
        : usernameInput.value.trim();
    const name = document.getElementById('s-name').value.trim();
    const pass = document.getElementById('s-pass').value;
    const role = document.getElementById('s-role').value;

    if (!username) return;
    if (!pass) return Swal.fire('Lỗi', 'Vui lòng nhập mật khẩu', 'error');

    try {
        await fetchAPI('/users/create-staff/', 'POST', {
            username,
            full_name: name,
            password: pass,
            role
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
