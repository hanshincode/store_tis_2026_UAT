let currentProfile = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('profile-form')?.addEventListener('submit', saveProfile);
    document.getElementById('btn-reset-profile')?.addEventListener('click', () => {
        if (currentProfile) fillProfileForm(currentProfile);
    });
    loadProfilePage();
});

async function loadProfilePage() {
    try {
        const user = await fetchAPI('/users/me/');
        currentProfile = user;
        renderProfile(user);
        fillProfileForm(user);
        loadProfileStats();
        loadCompanyCoverages();
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Không thể tải hồ sơ' });
    }
}

async function loadCompanyCoverages() {
    const container = document.getElementById('company-coverages');
    if (!container) return;
    container.innerHTML = '<div class="col-12 text-center py-3"><div class="spinner-border text-danger"></div></div>';
    try {
        const coverages = normalizeList(await fetchAPI('/employees/my-coverages/'));
        document.getElementById('coverage-count').textContent = `${coverages.length} quyền lợi`;
        if (!coverages.length) {
            container.innerHTML = '<div class="col-12 text-muted">Chưa có bảo hiểm nào được doanh nghiệp cấp cho tài khoản này.</div>';
            return;
        }
        container.innerHTML = coverages.map(item => `
            <div class="col-md-6 col-xl-4">
                <div class="border rounded-3 p-3 h-100 bg-white">
                    <div class="small text-muted mb-1">${escapeHTML(item.enterprise_name || 'Doanh nghiệp')}</div>
                    <h6 class="fw-bold mb-2">${escapeHTML(item.product_name || 'Gói bảo hiểm')}</h6>
                    <div class="small text-muted mb-2">${escapeHTML(item.category_name || '')} · ${escapeHTML(item.package_name || '')}</div>
                    <div class="d-flex justify-content-between small">
                        <span>Hiệu lực</span>
                        <strong>${formatCoverageDate(item.start_date)} - ${formatCoverageDate(item.end_date)}</strong>
                    </div>
                    <span class="badge bg-success-subtle text-success mt-3">${escapeHTML(getCoverageStatus(item.status))}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div class="col-12 text-danger">Không thể tải danh sách bảo hiểm doanh nghiệp cấp.</div>';
    }
}

function renderProfile(user) {
    const displayName = user.full_name || `${user.last_name || ''} ${user.first_name || ''}`.trim() || user.username;
    const avatarText = (displayName || user.phone || 'U').trim().charAt(0).toUpperCase();
    const userType = user.user_type === 'enterprise' ? 'Doanh nghiệp' : 'Cá nhân';

    document.getElementById('profile-avatar').textContent = avatarText;
    document.getElementById('profile-name').textContent = displayName;
    document.getElementById('profile-phone').textContent = user.phone || '--';
    document.getElementById('info-phone').textContent = user.phone || '--';
    document.getElementById('info-username').textContent = user.username || '--';
    document.getElementById('info-user-type').textContent = userType;
    document.getElementById('info-email').textContent = user.email || 'Chưa cập nhật';

    const companyRow = document.getElementById('company-info-row');
    if (user.company_name) {
        companyRow.classList.remove('d-none');
        document.getElementById('info-company').textContent = user.company_name;
    } else {
        companyRow.classList.add('d-none');
    }
}

function formatCoverageDate(value) {
    if (!value) return '--';
    return new Date(value).toLocaleDateString('vi-VN');
}

function getCoverageStatus(status) {
    return {
        active: 'Đang hiệu lực',
        expired: 'Hết hạn',
        cancelled: 'Đã hủy'
    }[status] || status || '--';
}

function fillProfileForm(user) {
    document.getElementById('last_name').value = user.last_name || '';
    document.getElementById('first_name').value = user.first_name || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('company_name').value = user.company_name || '';
}

async function loadProfileStats() {
    try {
        const [cart, orders, consultations] = await Promise.allSettled([
            fetchAPI('/cart/'),
            fetchAPI('/orders/'),
            fetchAPI('/consultations/')
        ]);

        if (cart.status === 'fulfilled') {
            document.getElementById('stat-cart').textContent = cart.value.total_items || 0;
        }
        if (orders.status === 'fulfilled') {
            document.getElementById('stat-orders').textContent = normalizeList(orders.value).length;
        }
        if (consultations.status === 'fulfilled') {
            document.getElementById('stat-consultations').textContent = normalizeList(consultations.value).length;
        }
    } catch (error) {
        console.warn('Không thể tải thống kê hồ sơ:', error);
    }
}

async function saveProfile(event) {
    event.preventDefault();
    if (!currentProfile?.id) return;

    const button = document.getElementById('btn-save-profile');
    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu';

    const payload = {
        last_name: document.getElementById('last_name').value.trim(),
        first_name: document.getElementById('first_name').value.trim(),
        email: document.getElementById('email').value.trim(),
        company_name: document.getElementById('company_name').value.trim()
    };

    try {
        const updated = await fetchAPI(`/users/${currentProfile.id}/`, 'PATCH', payload);
        currentProfile = updated;
        renderProfile(updated);
        fillProfileForm(updated);
        localStorage.setItem('user_info', JSON.stringify(updated));
        Toast.fire({ icon: 'success', title: 'Đã cập nhật hồ sơ' });
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể cập nhật hồ sơ') });
    } finally {
        button.disabled = false;
        button.innerHTML = originalHtml;
    }
}
