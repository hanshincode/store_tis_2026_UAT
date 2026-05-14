document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const account = params.get('account') || '';
    document.getElementById('email').value = params.get('email') || (account.includes('@') ? account : '');
    document.getElementById('reset-password-form')?.addEventListener('submit', handleResetPassword);
});

function getSafeAuthNext(defaultPath = 'login.html') {
    const next = new URLSearchParams(window.location.search).get('next') || defaultPath;
    return ['login.html', 'admin-login.html'].includes(next) ? next : defaultPath;
}

async function handleResetPassword(event) {
    event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || '';
    const email = document.getElementById('email').value.trim();
    const otp = document.getElementById('otp').value.trim();
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    if (!email && !token) return Toast.fire({ icon: 'warning', title: 'Vui lòng nhập email.' });
    if (!otp && !token) return Toast.fire({ icon: 'warning', title: 'Vui lòng nhập OTP hoặc dùng link khôi phục.' });
    if (newPassword !== confirmPassword) return Toast.fire({ icon: 'warning', title: 'Mật khẩu xác nhận không khớp.' });
    if (newPassword.length < 6) return Toast.fire({ icon: 'warning', title: 'Mật khẩu phải từ 6 ký tự.' });

    const btn = document.getElementById('btn-reset');
    const originalText = btn.innerText;
    btn.innerText = 'Đang lưu...';
    btn.disabled = true;

    try {
        const data = await fetchAPI('/users/reset-password/', 'POST', {
            email,
            otp,
            token,
            new_password: newPassword
        });
        Swal.fire({
            icon: 'success',
            title: 'Đã đổi mật khẩu',
            text: data.detail || 'Bạn có thể đăng nhập bằng mật khẩu mới.',
            confirmButtonColor: '#D71920'
        }).then(() => redirectTo(getSafeAuthNext()));
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể đặt lại mật khẩu.') });
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
