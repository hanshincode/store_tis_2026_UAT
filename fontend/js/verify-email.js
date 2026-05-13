document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email') || '';
    const token = params.get('token') || '';
    document.getElementById('email').value = email;

    document.getElementById('verify-email-form')?.addEventListener('submit', (event) => {
        event.preventDefault();
        verifyEmail(token);
    });
    document.getElementById('btn-resend')?.addEventListener('click', resendVerification);

    if (token) verifyEmail(token);
});

async function verifyEmail(urlToken = '') {
    const email = document.getElementById('email').value.trim();
    const otp = document.getElementById('otp').value.trim();
    const token = urlToken || new URLSearchParams(window.location.search).get('token') || '';

    if (!email && !token) return Toast.fire({ icon: 'warning', title: 'Vui lòng nhập email.' });
    if (!otp && !token) return Toast.fire({ icon: 'warning', title: 'Vui lòng nhập OTP hoặc dùng link xác minh.' });

    const btn = document.getElementById('btn-verify');
    const originalText = btn.innerText;
    btn.innerText = 'Đang xác minh...';
    btn.disabled = true;

    try {
        const data = await fetchAPI('/users/verify-email/', 'POST', { email, otp, token });
        Swal.fire({
            icon: 'success',
            title: 'Xác minh thành công',
            text: data.detail || 'Bạn có thể đăng nhập ngay.',
            confirmButtonColor: '#D71920'
        }).then(() => redirectTo('login.html'));
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể xác minh email.') });
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function resendVerification() {
    const account = document.getElementById('email').value.trim();
    if (!account) return Toast.fire({ icon: 'warning', title: 'Vui lòng nhập email.' });

    const btn = document.getElementById('btn-resend');
    const originalText = btn.innerText;
    btn.innerText = 'Đang gửi...';
    btn.disabled = true;

    try {
        const data = await fetchAPI('/users/resend-verification/', 'POST', { email_or_phone: account });
        Toast.fire({ icon: 'success', title: data.detail || 'Đã gửi lại mã xác minh.' });
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể gửi lại mã.') });
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
