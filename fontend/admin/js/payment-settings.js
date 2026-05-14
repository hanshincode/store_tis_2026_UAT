document.addEventListener('DOMContentLoaded', () => {
    loadPaymentSetting();
    document.getElementById('payment-setting-form')?.addEventListener('submit', savePaymentSetting);
    document.getElementById('btn-reload-payment-setting')?.addEventListener('click', loadPaymentSetting);
});

async function loadPaymentSetting() {
    try {
        const setting = await fetchAPI('/payment-settings/current/');
        fillPaymentSettingForm(setting);
        renderPaymentSettingSummary(setting);
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể tải cấu hình thanh toán.') });
    }
}

function fillPaymentSettingForm(setting = {}) {
    document.getElementById('payment-bank-id').value = setting.bank_id || '';
    document.getElementById('payment-account-no').value = setting.account_no || '';
    document.getElementById('payment-account-name').value = setting.account_name || '';
    document.getElementById('payment-template').value = setting.template || 'compact2';
    document.getElementById('payment-timeout-minutes').value = setting.payment_timeout_minutes || 15;
    document.getElementById('payment-is-active').checked = setting.is_active !== false;
}

function renderPaymentSettingSummary(setting = {}) {
    document.getElementById('payment-summary-bank').textContent = setting.bank_id || '--';
    document.getElementById('payment-summary-account').textContent = setting.account_no || '--';
    document.getElementById('payment-summary-name').textContent = setting.account_name || '--';
    document.getElementById('payment-summary-timeout').textContent = `${setting.payment_timeout_minutes || 15} phút`;
    document.getElementById('payment-summary-status').innerHTML = setting.is_configured
        ? '<span class="badge bg-success-subtle text-success border border-success">Đã sẵn sàng</span>'
        : '<span class="badge bg-warning-subtle text-warning border border-warning">Chưa hoàn tất</span>';
}

function normalizePaymentAccount(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function buildPaymentPayload() {
    return {
        bank_id: document.getElementById('payment-bank-id').value.trim().toUpperCase(),
        account_no: normalizePaymentAccount(document.getElementById('payment-account-no').value),
        account_name: document.getElementById('payment-account-name').value.trim().toUpperCase(),
        template: document.getElementById('payment-template').value,
        payment_timeout_minutes: Number(document.getElementById('payment-timeout-minutes').value || 15),
        is_active: document.getElementById('payment-is-active').checked,
    };
}

function validatePaymentPayload(payload) {
    const checks = [
        ['payment-bank-id', payload.bank_id, 'Vui lòng nhập mã ngân hàng VietQR.'],
        ['payment-account-no', payload.account_no, 'Vui lòng nhập số tài khoản nhận tiền.'],
        ['payment-account-name', payload.account_name, 'Vui lòng nhập tên chủ tài khoản.'],
    ];
    const failed = checks.find(([, value]) => !value);
    if (failed) {
        document.getElementById(failed[0])?.focus();
        Toast.fire({ icon: 'warning', title: failed[2] });
        return false;
    }
    if (payload.payment_timeout_minutes < 1 || payload.payment_timeout_minutes > 1440) {
        document.getElementById('payment-timeout-minutes')?.focus();
        Toast.fire({ icon: 'warning', title: 'Thời hạn QR phải từ 1 đến 1440 phút.' });
        return false;
    }
    return true;
}

async function savePaymentSetting(event) {
    event.preventDefault();
    const payload = buildPaymentPayload();
    if (!validatePaymentPayload(payload)) return;

    document.getElementById('payment-account-no').value = payload.account_no;
    document.getElementById('payment-bank-id').value = payload.bank_id;
    document.getElementById('payment-account-name').value = payload.account_name;

    const btn = document.getElementById('btn-save-payment-setting');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu';

    try {
        const setting = await fetchAPI('/payment-settings/current/', 'PATCH', payload);
        fillPaymentSettingForm(setting);
        renderPaymentSettingSummary(setting);
        Toast.fire({ icon: 'success', title: 'Đã lưu cấu hình VietQR.' });
    } catch (error) {
        Swal.fire('Lỗi', getErrorMessage(error, 'Không thể lưu cấu hình thanh toán.'), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}
