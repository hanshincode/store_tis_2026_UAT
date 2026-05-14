document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('forgot-password-form')?.addEventListener('submit', handleForgotPassword);
});

function getSafeAuthNext(defaultPath = 'login.html') {
    const next = new URLSearchParams(window.location.search).get('next') || defaultPath;
    return ['login.html', 'admin-login.html'].includes(next) ? next : defaultPath;
}

async function handleForgotPassword(event) {
    event.preventDefault();
    const accountInput = document.getElementById('email_or_phone');
    let account = accountInput.value.trim();
    if (!account) return Toast.fire({ icon: 'warning', title: 'Vui lòng nhập số điện thoại hoặc email.' });
    if (!account.includes('@')) {
        account = validateVietnamPhoneInput(accountInput);
        if (!account) return;
    }

    const btn = document.getElementById('btn-forgot');
    const originalText = btn.innerText;
    btn.innerText = 'Đang gửi...';
    btn.disabled = true;

    try {
        const data = await fetchAPI('/users/forgot-password/', 'POST', { email_or_phone: account });
        const next = getSafeAuthNext();
        Swal.fire({
            icon: 'success',
            title: 'Kiểm tra email',
            text: data.detail || 'Nếu tài khoản tồn tại, email khôi phục đã được gửi.',
            confirmButtonColor: '#D71920'
        }).then(() => redirectTo(`reset-password.html?account=${encodeURIComponent(account)}&next=${encodeURIComponent(next)}`));
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể gửi email khôi phục.') });
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
