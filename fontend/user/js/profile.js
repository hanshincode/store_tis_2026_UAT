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
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Không thể tải hồ sơ' });
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
