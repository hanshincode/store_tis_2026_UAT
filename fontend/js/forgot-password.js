document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('forgot-password-form')?.addEventListener('submit', handleForgotPassword);
});

async function handleForgotPassword(event) {
    event.preventDefault();
    const account = document.getElementById('email_or_phone').value.trim();
    if (!account) return Toast.fire({ icon: 'warning', title: 'Vui lòng nhập số điện thoại hoặc email.' });

    const btn = document.getElementById('btn-forgot');
    const originalText = btn.innerText;
    btn.innerText = 'Đang gửi...';
    btn.disabled = true;

    try {
        const data = await fetchAPI('/users/forgot-password/', 'POST', { email_or_phone: account });
        Swal.fire({
            icon: 'success',
            title: 'Kiểm tra email',
            text: data.detail || 'Nếu tài khoản tồn tại, email khôi phục đã được gửi.',
            confirmButtonColor: '#D71920'
        }).then(() => redirectTo(`reset-password.html?account=${encodeURIComponent(account)}`));
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể gửi email khôi phục.') });
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
