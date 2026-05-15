let quickFormToken = '';
let quickFormConfig = null;

document.addEventListener('DOMContentLoaded', async () => {
    quickFormToken = new URLSearchParams(window.location.search).get('token') || '';
    document.getElementById('quick-customer-form')?.addEventListener('submit', submitQuickForm);
    await loadQuickForm();
});

async function loadQuickForm() {
    const message = document.getElementById('quick-form-message');
    const form = document.getElementById('quick-customer-form');
    if (!quickFormToken) {
        message.innerHTML = '<div class="alert alert-danger">Link form khong hop le.</div>';
        return;
    }

    try {
        quickFormConfig = await fetchAPI(`/quick-forms/public/?token=${encodeURIComponent(quickFormToken)}`);
        document.getElementById('quick-form-subtitle').textContent = `Danh muc: ${quickFormConfig.category_name || 'TIS Broker'}`;
        document.getElementById('customer_name').value = quickFormConfig.customer_name || '';
        document.getElementById('phone').value = quickFormConfig.phone || '';
        document.getElementById('email').value = quickFormConfig.email || '';
        renderQuickFields(quickFormConfig.subject_fields || []);
        form.style.display = 'block';
    } catch (error) {
        message.innerHTML = `<div class="alert alert-danger">${escapeHTML(error.detail || error.message || 'Khong the tai form.')}</div>`;
    }
}

function renderQuickFields(fields) {
    const container = document.getElementById('quick-dynamic-fields');
    if (!container) return;
    container.innerHTML = fields.map(field => {
        const required = field.is_required ? 'required' : '';
        const requiredMark = field.is_required ? '<span class="text-danger">*</span>' : '';
        const help = field.help_text ? `<div class="form-text">${escapeHTML(field.help_text)}</div>` : '';
        const common = `id="field-${field.field_key}" name="${field.field_key}" class="form-control" ${required}`;
        let control = '';
        if (field.field_type === 'textarea') {
            control = `<textarea ${common} rows="3"></textarea>`;
        } else if (field.field_type === 'file') {
            control = `<input type="file" ${common}>`;
        } else {
            const type = field.field_type === 'number' ? 'number' : (field.field_type === 'date' ? 'date' : 'text');
            control = `<input type="${type}" ${common}>`;
        }
        return `
            <div class="mb-3">
                <label class="fw-bold small mb-1">${escapeHTML(field.label)} ${requiredMark}</label>
                ${control}
                ${help}
            </div>
        `;
    }).join('');
}

async function submitQuickForm(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-submit-quick-form');
    const defaultText = btn.textContent;
    const formData = new FormData();
    formData.append('token', quickFormToken);
    formData.append('customer_name', document.getElementById('customer_name').value.trim());
    formData.append('phone', document.getElementById('phone').value.trim());
    formData.append('email', document.getElementById('email').value.trim());

    (quickFormConfig?.subject_fields || []).forEach(field => {
        const input = document.getElementById(`field-${field.field_key}`);
        if (!input) return;
        if (field.field_type === 'file') {
            if (input.files?.[0]) formData.append(field.field_key, input.files[0]);
        } else {
            formData.append(field.field_key, input.value);
        }
    });

    try {
        btn.disabled = true;
        btn.textContent = 'DANG GUI...';
        const response = await fetchAPI('/quick-forms/submit/', 'POST', formData);
        document.getElementById('quick-customer-form').style.display = 'none';
        document.getElementById('quick-form-message').innerHTML = `
            <div class="alert alert-success">
                <div class="fw-bold mb-1">Da gui thong tin thanh cong.</div>
                <div>${escapeHTML(response.detail || 'TIS Broker da tao tai khoan va gui mat khau tam thoi qua email.')}</div>
            </div>
        `;
    } catch (error) {
        const detail = error.fields
            ? Object.values(error.fields).join(' ')
            : (error.phone?.[0] || error.email?.[0] || error.detail || error.message || 'Khong the gui thong tin.');
        Swal.fire('That bai', detail, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = defaultText;
    }
}
