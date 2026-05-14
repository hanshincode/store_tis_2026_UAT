let currentProfile = null;

document.addEventListener('DOMContentLoaded', () => {
    loadMyProfile();
    document.getElementById('profile-form')?.addEventListener('submit', updateProfile);
    document.getElementById('password-form')?.addEventListener('submit', changePassword);
    document.getElementById('prof-avatar')?.addEventListener('change', previewAvatarFile);
    document.getElementById('prof-user-type')?.addEventListener('change', toggleEnterpriseFields);
    document.getElementById('btn-reset-profile')?.addEventListener('click', () => {
        if (currentProfile) fillProfileForm(currentProfile);
    });
});

async function loadMyProfile() {
    try {
        const user = await fetchAPI('/users/me/');
        currentProfile = user;
        renderProfileSummary(user);
        fillProfileForm(user);
    } catch (error) {
        console.error(error);
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Lỗi tải thông tin cá nhân') });
    }
}

function getDisplayName(user) {
    return user.full_name || `${user.last_name || ''} ${user.first_name || ''}`.trim() || user.username || user.phone || 'TIS Admin';
}

function getRoleLabel(user) {
    if (user.is_superuser || user.role === 'super_admin') return 'Super Admin';
    if (user.role === 'admin') return 'Admin';
    if (user.role === 'staff') return 'Staff';
    return 'Khách hàng';
}

function getUserTypeLabel(user) {
    if (user.user_type === 'enterprise') return 'Doanh nghiệp';
    if (user.user_type === 'individual') return 'Cá nhân';
    return 'Chưa chọn';
}

function getAvatarFallbackText(user) {
    return getDisplayName(user).trim().charAt(0).toUpperCase() || 'T';
}

function getAvatarHtml(user) {
    if (user.avatar) {
        return `<img src="${mediaUrl(user.avatar)}" alt="${escapeHTML(getDisplayName(user))}" class="admin-profile-avatar-preview-img">`;
    }
    return escapeHTML(getAvatarFallbackText(user));
}

function formatDateTime(value) {
    return value ? new Date(value).toLocaleString('vi-VN') : '--';
}

function renderProfileSummary(user) {
    const displayName = getDisplayName(user);
    const roleLabel = getRoleLabel(user);

    document.getElementById('profile-hero-avatar').innerHTML = getAvatarHtml(user);
    document.getElementById('profile-avatar-preview').innerHTML = getAvatarHtml(user);
    document.getElementById('profile-hero-name').textContent = displayName;
    document.getElementById('profile-hero-contact').textContent = user.email || user.phone || '--';
    document.getElementById('profile-role-badge').textContent = roleLabel;

    document.getElementById('stat-role').textContent = roleLabel;
    document.getElementById('stat-email-status').textContent = user.email_verified ? 'Đã xác minh' : 'Chưa xác minh';
    document.getElementById('stat-last-login').textContent = formatDateTime(user.last_login);

    document.getElementById('info-username').textContent = user.username || '--';
    document.getElementById('info-display-name').textContent = displayName;
    document.getElementById('info-phone').textContent = user.phone || '--';
    document.getElementById('info-email').textContent = user.email || 'Chưa cập nhật';
    document.getElementById('info-user-type').textContent = getUserTypeLabel(user);
    document.getElementById('info-address').textContent = user.address || 'Chưa cập nhật';

    const companyRow = document.getElementById('info-company-row');
    if (user.user_type === 'enterprise' && user.company_name) {
        companyRow.classList.remove('d-none');
        document.getElementById('info-company').textContent = user.company_name;
    } else {
        companyRow.classList.add('d-none');
    }
}

function fillProfileForm(user) {
    document.getElementById('prof-username').value = user.username || '';
    document.getElementById('prof-phone').value = user.phone || '';
    document.getElementById('prof-first-name').value = user.first_name || '';
    document.getElementById('prof-last-name').value = user.last_name || '';
    document.getElementById('prof-email').value = user.email || '';
    document.getElementById('prof-cccd').value = user.cccd || '';
    document.getElementById('prof-user-type').value = user.user_type || '';
    document.getElementById('prof-role').value = getRoleLabel(user);
    document.getElementById('prof-company-name').value = user.company_name || '';
    document.getElementById('prof-tax-code').value = user.tax_code || '';
    document.getElementById('prof-address').value = user.address || '';
    document.getElementById('prof-avatar').value = '';
    document.getElementById('profile-avatar-preview').innerHTML = getAvatarHtml(user);
    toggleEnterpriseFields();
}

function previewAvatarFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    document.getElementById('profile-avatar-preview').innerHTML = `<img src="${url}" alt="Avatar mới" class="admin-profile-avatar-preview-img">`;
}

function toggleEnterpriseFields() {
    const isEnterprise = document.getElementById('prof-user-type')?.value === 'enterprise';
    document.querySelectorAll('.profile-enterprise-field').forEach(el => {
        el.classList.toggle('d-none', !isEnterprise);
    });
}

async function updateProfile(event) {
    event.preventDefault();
    if (!currentProfile?.id) return;

    const btn = document.getElementById('btn-update-profile');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu';

    const phoneInput = document.getElementById('prof-phone');
    const phone = phoneInput.value.trim()
        ? (typeof validateVietnamPhoneInput === 'function' ? validateVietnamPhoneInput(phoneInput) : phoneInput.value.trim())
        : '';
    if (phoneInput.value.trim() && !phone) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        return;
    }

    const formData = new FormData();
    formData.append('phone', phone);
    formData.append('first_name', document.getElementById('prof-first-name').value.trim());
    formData.append('last_name', document.getElementById('prof-last-name').value.trim());
    formData.append('email', document.getElementById('prof-email').value.trim());
    formData.append('cccd', document.getElementById('prof-cccd').value.trim());
    formData.append('user_type', document.getElementById('prof-user-type').value);
    formData.append('company_name', document.getElementById('prof-company-name').value.trim());
    formData.append('tax_code', document.getElementById('prof-tax-code').value.trim());
    formData.append('address', document.getElementById('prof-address').value.trim());

    const avatarFile = document.getElementById('prof-avatar').files?.[0];
    if (avatarFile) formData.append('avatar', avatarFile);

    try {
        const updated = await fetchAPI(`/users/${currentProfile.id}/`, 'PATCH', formData);
        currentProfile = updated;
        renderProfileSummary(updated);
        fillProfileForm(updated);
        sessionStorage.setItem('admin_user', JSON.stringify(updated));
        Toast.fire({ icon: 'success', title: 'Đã cập nhật hồ sơ' });
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Lỗi cập nhật thông tin') });
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

async function changePassword(event) {
    event.preventDefault();

    const oldPass = document.getElementById('old-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-pass').value;

    if (newPass !== confirmPass) {
        return Toast.fire({ icon: 'warning', title: 'Mật khẩu xác nhận không khớp!' });
    }
    if (newPass.length < 6) {
        return Toast.fire({ icon: 'warning', title: 'Mật khẩu mới phải từ 6 ký tự!' });
    }

    const btn = document.getElementById('btn-change-password');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý';

    try {
        await fetchAPI('/users/set_password/', 'POST', {
            current_password: oldPass,
            new_password: newPass
        });

        Toast.fire({ icon: 'success', title: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' });
        document.getElementById('password-form').reset();
        setTimeout(() => { window.logout(); }, 2000);
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Lỗi đổi mật khẩu') });
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}
