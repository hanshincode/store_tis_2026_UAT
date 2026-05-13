let enterprises = [];
let employees = [];
let enterpriseOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btn-open-employee')?.addEventListener('click', openEmployeeModal);
    document.getElementById('btn-reload-employees')?.addEventListener('click', loadEmployees);
    document.getElementById('enterprise-filter')?.addEventListener('change', loadEmployees);
    document.getElementById('employee-form')?.addEventListener('submit', saveEmployee);
    document.getElementById('coverage-form')?.addEventListener('submit', saveCoverage);
    await loadEnterprises();
    await loadEmployees();
});

async function loadEnterprises() {
    enterprises = await fetchAPI('/users/enterprise-list/');
    const options = enterprises.map(e => `<option value="${e.id}">${escapeHTML(e.company_name || e.full_name || e.phone || e.username)}</option>`).join('');
    document.getElementById('enterprise-filter').innerHTML = `<option value="">Tất cả doanh nghiệp</option>${options}`;
    document.getElementById('employee-enterprise').innerHTML = options;
}

async function loadEmployees() {
    const enterpriseId = document.getElementById('enterprise-filter').value;
    const tbody = document.getElementById('enterprise-employee-list');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-danger"></div></td></tr>';
    try {
        employees = normalizeList(await fetchAPI(`/employees/${enterpriseId ? `?enterprise=${enterpriseId}` : ''}`));
        if (!employees.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Chưa có nhân viên nào.</td></tr>';
            return;
        }
        tbody.innerHTML = employees.map(employee => {
            const coverageHtml = (employee.coverages || []).length
                ? employee.coverages.map(c => `<div class="small"><strong>${escapeHTML(c.product_name || '-')}</strong> · ${formatDate(c.start_date)} - ${formatDate(c.end_date)}</div>`).join('')
                : '<span class="text-muted small">Chưa gắn bảo hiểm</span>';
            return `
                <tr>
                    <td><strong>${escapeHTML(employee.full_name)}</strong><div class="small text-muted">${escapeHTML(employee.email || '')}</div></td>
                    <td>${escapeHTML(employee.phone || '-')}</td>
                    <td>${escapeHTML(employee.enterprise_name || '-')}</td>
                    <td>${coverageHtml}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-danger" onclick="openCoverageModal(${employee.id}, ${employee.enterprise})">
                            <i class="fas fa-shield-alt me-1"></i>Gắn bảo hiểm
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">${escapeHTML(getErrorMessage(error, 'Không tải được danh sách.'))}</td></tr>`;
    }
}

function openEmployeeModal() {
    document.getElementById('employee-form').reset();
    const selectedEnterprise = document.getElementById('enterprise-filter').value;
    if (selectedEnterprise) document.getElementById('employee-enterprise').value = selectedEnterprise;
    new bootstrap.Modal(document.getElementById('employeeModal')).show();
}

async function saveEmployee(event) {
    event.preventDefault();
    const phone = validateVietnamPhoneInput(document.getElementById('employee-phone'));
    if (!phone) return;
    const payload = {
        enterprise: document.getElementById('employee-enterprise').value,
        full_name: document.getElementById('employee-name').value.trim(),
        phone,
        email: document.getElementById('employee-email').value.trim(),
        password: document.getElementById('employee-password').value.trim()
    };
    try {
        await fetchAPI('/employees/', 'POST', payload);
        bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
        Toast.fire({ icon: 'success', title: 'Đã thêm nhân viên' });
        loadEmployees();
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể thêm nhân viên') });
    }
}

async function openCoverageModal(employeeId, enterpriseId) {
    document.getElementById('coverage-form').reset();
    document.getElementById('coverage-employee-id').value = employeeId;
    await loadEnterpriseOrderItems(enterpriseId);
    new bootstrap.Modal(document.getElementById('coverageModal')).show();
}

async function loadEnterpriseOrderItems(enterpriseId) {
    enterpriseOrders = normalizeList(await fetchAPI('/orders/')).filter(order => Number(order.user) === Number(enterpriseId));
    const items = [];
    enterpriseOrders.forEach(order => {
        (order.items || []).forEach(item => items.push({ order, item }));
    });
    document.getElementById('coverage-order-item').innerHTML = items.length
        ? items.map(({ order, item }) => `<option value="${item.id}">${escapeHTML(order.code)} · ${escapeHTML(item.product_name)} · ${escapeHTML(item.duration)}</option>`).join('')
        : '<option value="">Doanh nghiệp chưa có sản phẩm trong đơn</option>';
}

async function saveCoverage(event) {
    event.preventDefault();
    const employeeId = document.getElementById('coverage-employee-id').value;
    const orderItem = document.getElementById('coverage-order-item').value;
    if (!orderItem) return Toast.fire({ icon: 'warning', title: 'Vui lòng chọn sản phẩm trong đơn.' });
    try {
        await fetchAPI(`/employees/${employeeId}/add-coverage/`, 'POST', {
            order_item: orderItem,
            start_date: document.getElementById('coverage-start-date').value,
            note: document.getElementById('coverage-note').value.trim()
        });
        bootstrap.Modal.getInstance(document.getElementById('coverageModal')).hide();
        Toast.fire({ icon: 'success', title: 'Đã gắn bảo hiểm' });
        loadEmployees();
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể gắn bảo hiểm') });
    }
}

function formatDate(value) {
    if (!value) return '--';
    return new Date(value).toLocaleDateString('vi-VN');
}
