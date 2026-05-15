document.addEventListener('DOMContentLoaded', () => {
    if (!getAccessToken()) {
        redirectTo('login.html');
        return;
    }
    document.getElementById('force-password-form')?.addEventListener('submit', handleForcePasswordChange);
});

async function handleForcePasswordChange(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('current_password').value;
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const btn = document.getElementById('btn-force-password');
    const defaultText = btn.textContent;

    if (newPassword !== confirmPassword) {
        return Swal.fire('Chua khop', 'Mat khau xac nhan khong khop.', 'warning');
    }
    if (newPassword.length < 6) {
        return Swal.fire('Mat khau yeu', 'Mat khau moi can toi thieu 6 ky tu.', 'warning');
    }

    try {
        btn.disabled = true;
        btn.textContent = 'DANG LUU...';
        await fetchAPI('/users/set_password/', 'POST', {
            current_password: currentPassword,
            new_password: newPassword,
        });
        const user = await fetchAPI('/users/me/');
        sessionStorage.setItem('user_info', JSON.stringify(user));
        Swal.fire('Thanh cong', 'Mat khau moi da duoc cap nhat.', 'success')
            .then(() => {
                if (['super_admin', 'admin', 'leader', 'staff'].includes(user.role)) {
                    redirectTo('admin/index.html');
                } else {
                    redirectTo('index.html');
                }
            });
    } catch (error) {
        Swal.fire('That bai', error.current_password?.[0] || error.new_password?.[0] || error.detail || error.message || 'Khong the doi mat khau.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = defaultText;
    }
}
