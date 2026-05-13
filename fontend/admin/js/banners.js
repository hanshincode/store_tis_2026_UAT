let currentTemplate = 'single_left';
let currentImagePreview = '';

document.addEventListener('DOMContentLoaded', () => {
    bindBannerForm();
    resetBannerForm();
    loadAdminBanners();
});

function bindBannerForm() {
    document.querySelectorAll('.banner-template-option').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTemplate = btn.dataset.template;
            document.querySelectorAll('.banner-template-option').forEach(item => item.classList.toggle('active', item === btn));
            document.getElementById('custom-html-wrap').style.display = currentTemplate === 'custom_html' ? 'block' : 'none';
            updateBannerPreview();
        });
    });

    document.querySelectorAll('#banner-form input, #banner-form textarea').forEach(input => {
        input.addEventListener('input', updateBannerPreview);
        input.addEventListener('change', updateBannerPreview);
    });

    document.getElementById('banner-image').addEventListener('change', event => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            currentImagePreview = e.target.result;
            updateBannerPreview();
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('banner-form').addEventListener('submit', saveBanner);
    document.getElementById('btn-reset-banner').addEventListener('click', resetBannerForm);
    document.getElementById('btn-add-banner').addEventListener('click', resetBannerForm);
}

async function loadAdminBanners() {
    const list = document.getElementById('banner-list-admin');
    list.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-danger"></div></div>';

    try {
        const banners = normalizeList(await fetchAPI('/banners/'));
        if (!banners.length) {
            list.innerHTML = '<div class="col-12 text-muted text-center py-4">Chưa có banner nào.</div>';
            return;
        }

        list.innerHTML = banners.map(banner => `
            <div class="col-md-6 col-xl-4">
                <div class="banner-admin-card">
                    <img src="${mediaUrl(banner.background_image)}" alt="${escapeHTML(banner.title)}">
                    <div class="p-3">
                        <div class="d-flex justify-content-between gap-2 mb-2">
                            <h6 class="fw-bold mb-0">${escapeHTML(banner.title)}</h6>
                            <span class="badge ${banner.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">${banner.is_active ? 'Đang bật' : 'Ẩn'}</span>
                        </div>
                        <div class="small text-muted mb-3">${escapeHTML(getTemplateLabel(banner.template))} · Thứ tự ${banner.sort_order || 0}</div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-danger flex-fill" onclick="editBanner(${banner.id})">
                                <i class="fas fa-pen me-1"></i>Sửa
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="deleteBanner(${banner.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error(error);
        list.innerHTML = '<div class="col-12 text-danger text-center py-4">Không tải được banner.</div>';
    }
}

async function saveBanner(event) {
    event.preventDefault();

    const id = document.getElementById('banner-id').value;
    const file = document.getElementById('banner-image').files[0];
    if (!id && !file) {
        Toast.fire({ icon: 'warning', title: 'Vui lòng chọn ảnh nền banner' });
        return;
    }

    const formData = new FormData();
    formData.append('title', document.getElementById('banner-title').value);
    formData.append('subtitle', document.getElementById('banner-subtitle').value);
    formData.append('eyebrow', document.getElementById('banner-eyebrow').value);
    formData.append('button_text', document.getElementById('banner-button-text').value);
    formData.append('button_link', document.getElementById('banner-button-link').value);
    formData.append('secondary_button_text', document.getElementById('banner-secondary-text').value);
    formData.append('secondary_button_link', document.getElementById('banner-secondary-link').value);
    formData.append('template', currentTemplate);
    formData.append('custom_html', document.getElementById('banner-custom-html').value);
    formData.append('sort_order', document.getElementById('banner-sort').value || 0);
    formData.append('is_active', document.getElementById('banner-active').checked ? 'true' : 'false');
    if (file) formData.append('background_image', file);

    try {
        await fetchAPI(id ? `/banners/${id}/` : '/banners/', id ? 'PATCH' : 'POST', formData);
        Toast.fire({ icon: 'success', title: 'Đã lưu banner' });
        resetBannerForm();
        loadAdminBanners();
    } catch (error) {
        console.error(error);
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể lưu banner') });
    }
}

window.editBanner = async function(id) {
    try {
        const banner = await fetchAPI(`/banners/${id}/`);
        document.getElementById('banner-id').value = banner.id;
        document.getElementById('banner-title').value = banner.title || '';
        document.getElementById('banner-subtitle').value = banner.subtitle || '';
        document.getElementById('banner-eyebrow').value = banner.eyebrow || '';
        document.getElementById('banner-button-text').value = banner.button_text || '';
        document.getElementById('banner-button-link').value = banner.button_link || '';
        document.getElementById('banner-secondary-text').value = banner.secondary_button_text || '';
        document.getElementById('banner-secondary-link').value = banner.secondary_button_link || '';
        document.getElementById('banner-custom-html').value = banner.custom_html || '';
        document.getElementById('banner-sort').value = banner.sort_order || 0;
        document.getElementById('banner-active').checked = !!banner.is_active;
        currentTemplate = banner.template || 'single_left';
        currentImagePreview = mediaUrl(banner.background_image);
        syncTemplateButtons();
        updateBannerPreview();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Không thể mở banner' });
    }
};

window.deleteBanner = async function(id) {
    if (!confirm('Xóa banner này?')) return;
    try {
        await fetchAPI(`/banners/${id}/`, 'DELETE');
        Toast.fire({ icon: 'success', title: 'Đã xóa banner' });
        loadAdminBanners();
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Không thể xóa banner' });
    }
};

function resetBannerForm() {
    document.getElementById('banner-form').reset();
    document.getElementById('banner-id').value = '';
    document.getElementById('banner-title').value = 'An tâm vững bước';
    document.getElementById('banner-eyebrow').value = 'UY TÍN HÀNG ĐẦU';
    document.getElementById('banner-subtitle').value = 'Giải pháp bảo hiểm tối ưu cho Doanh nghiệp & Cá nhân với quy trình số hóa 100%, minh bạch.';
    document.getElementById('banner-button-text').value = 'Mua ngay';
    document.getElementById('banner-button-link').value = '#products';
    document.getElementById('banner-secondary-text').value = 'Liên hệ';
    document.getElementById('banner-secondary-link').value = '#about';
    document.getElementById('banner-active').checked = true;
    currentTemplate = 'single_left';
    currentImagePreview = 'https://img.freepik.com/free-vector/family-protection-concept-illustration_114360-5431.jpg';
    syncTemplateButtons();
    updateBannerPreview();
}

function syncTemplateButtons() {
    document.querySelectorAll('.banner-template-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.template === currentTemplate);
    });
    document.getElementById('custom-html-wrap').style.display = currentTemplate === 'custom_html' ? 'block' : 'none';
}

function updateBannerPreview() {
    const title = document.getElementById('banner-title').value || 'Tiêu đề banner';
    const subtitle = document.getElementById('banner-subtitle').value || 'Mô tả ngắn của banner.';
    const eyebrow = document.getElementById('banner-eyebrow').value;
    const customHtml = document.getElementById('banner-custom-html').value;
    const imageUrl = currentImagePreview || 'https://placehold.co/1200x520/f8f9fa/d71920?text=TIS+Banner';
    const primary = document.getElementById('banner-button-text').value;
    const secondary = document.getElementById('banner-secondary-text').value;

    const overlay = currentTemplate === 'custom_html' && customHtml
        ? customHtml
        : `
            ${eyebrow ? `<span class="hybrid-eyebrow">${escapeHTML(eyebrow)}</span>` : ''}
            <h1>${escapeHTML(title)}</h1>
            <p>${escapeHTML(subtitle)}</p>
            <div class="hybrid-banner-actions">
                ${primary ? `<a class="btn btn-danger rounded-pill px-4">${escapeHTML(primary)}</a>` : ''}
                ${secondary ? `<a class="btn btn-outline-dark rounded-pill px-4">${escapeHTML(secondary)}</a>` : ''}
            </div>
        `;

    document.getElementById('banner-preview').innerHTML = `
        <div class="hybrid-banner banner-template-${currentTemplate}" style="background-image:url('${imageUrl}')">
            <div class="hybrid-banner-overlay">${overlay}</div>
        </div>
    `;
}

function getTemplateLabel(template) {
    return {
        single_left: '1 banner - text trái',
        single_center: '1 banner - text giữa',
        triple_grid: '3 banner - grid',
        custom_html: 'Custom HTML',
    }[template] || template;
}
