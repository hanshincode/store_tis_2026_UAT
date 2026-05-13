let currentTemplate = 'single_left';
let currentImagePreview = '';
let selectedImage = null;
let currentEditingBanner = null;
let adminBanners = [];
let editingSlideId = null;
let draggedSlideId = null;

const cropState = { image: null, zoom: 1, x: 50, y: 50 };

document.addEventListener('DOMContentLoaded', () => {
    bindBannerForm();
    resetBannerForm();
    loadAdminBanners();
});

function bindBannerForm() {
    document.querySelectorAll('.banner-template-option').forEach(btn => {
        btn.addEventListener('click', () => {
            currentTemplate = btn.dataset.template;
            syncTemplateButtons();
            updateBannerPreview();
        });
    });

    document.querySelectorAll('#banner-form input, #banner-form textarea').forEach(input => {
        input.addEventListener('input', updateBannerPreview);
        input.addEventListener('change', updateBannerPreview);
    });

    ['banner-crop-zoom', 'banner-crop-x', 'banner-crop-y'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateCropControls);
    });

    document.getElementById('banner-image').addEventListener('change', event => {
        const file = event.target.files?.[0];
        if (!file) return;
        selectedImage = file;
        const reader = new FileReader();
        reader.onload = e => {
            currentImagePreview = e.target.result;
            loadCropImage(e.target.result);
            updateBannerPreview();
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('banner-form').addEventListener('submit', saveBanner);
    document.getElementById('slide-form').addEventListener('submit', saveSlide);
    document.getElementById('btn-cancel-slide-edit')?.addEventListener('click', resetSlideForm);
    document.getElementById('btn-reset-banner').addEventListener('click', resetBannerForm);
    document.getElementById('btn-add-banner').addEventListener('click', resetBannerForm);
}

async function loadAdminBanners() {
    const list = document.getElementById('banner-list-admin');
    list.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-danger"></div></div>';
    try {
        adminBanners = normalizeList(await fetchAPI('/banners/'));
        if (!adminBanners.length) {
            list.innerHTML = '<div class="col-12 text-muted text-center py-4">Chưa có banner nào.</div>';
            return;
        }
        list.innerHTML = adminBanners.map(renderBannerCard).join('');
        if (currentEditingBanner?.id) {
            currentEditingBanner = adminBanners.find(b => b.id === currentEditingBanner.id) || currentEditingBanner;
            renderSlideManager(currentEditingBanner);
            updateBannerPreview();
        }
    } catch (error) {
        console.error(error);
        list.innerHTML = '<div class="col-12 text-danger text-center py-4">Không tải được banner.</div>';
    }
}

function renderBannerCard(banner) {
    const image = banner.template === 'carousel'
        ? (banner.slides?.[0]?.image ? mediaUrl(banner.slides[0].image) : mediaUrl(banner.background_image))
        : mediaUrl(banner.background_image);
    const slideInfo = banner.template === 'carousel' ? ` · ${banner.slides?.length || 0} ảnh` : '';
    return `
        <div class="col-md-6 col-xl-4">
            <div class="banner-admin-card">
                <img src="${image}" alt="${escapeHTML(banner.title)}">
                <div class="p-3">
                    <div class="d-flex justify-content-between gap-2 mb-2">
                        <h6 class="fw-bold mb-0 text-truncate" title="${escapeHTML(banner.title)}">${escapeHTML(banner.title)}</h6>
                        <span class="badge ${banner.is_active ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">${banner.is_active ? 'Đang bật' : 'Ẩn'}</span>
                    </div>
                    <div class="small text-muted mb-3">${escapeHTML(getTemplateLabel(banner.template))}${slideInfo} · Thứ tự ${banner.sort_order || 0}</div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-danger flex-fill" onclick="editBanner(${banner.id})"><i class="fas fa-pen me-1"></i>Sửa</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="deleteBanner(${banner.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function saveBanner(event) {
    event.preventDefault();
    const id = document.getElementById('banner-id').value;
    if (currentTemplate !== 'carousel' && !id && !selectedImage) {
        Toast.fire({ icon: 'warning', title: 'Vui lòng chọn ảnh nền banner' });
        return;
    }

    const formData = new FormData();
    formData.append('title', document.getElementById('banner-title').value);
    formData.append('subtitle', currentTemplate === 'carousel' ? '' : document.getElementById('banner-subtitle').value);
    formData.append('eyebrow', currentTemplate === 'carousel' ? '' : document.getElementById('banner-eyebrow').value);
    formData.append('button_text', currentTemplate === 'carousel' ? '' : document.getElementById('banner-button-text').value);
    formData.append('button_link', currentTemplate === 'carousel' ? '' : document.getElementById('banner-button-link').value);
    formData.append('secondary_button_text', currentTemplate === 'carousel' ? '' : document.getElementById('banner-secondary-text').value);
    formData.append('secondary_button_link', currentTemplate === 'carousel' ? '' : document.getElementById('banner-secondary-link').value);
    formData.append('template', currentTemplate);
    formData.append('custom_html', document.getElementById('banner-custom-html').value);
    formData.append('sort_order', document.getElementById('banner-sort').value || 0);
    formData.append('is_active', document.getElementById('banner-active').checked ? 'true' : 'false');

    if (currentTemplate === 'carousel' && !id && !selectedImage) {
        const placeholder = await makePlaceholderBannerBlob();
        formData.append('background_image', placeholder, 'slider-group-placeholder.jpg');
    } else if (selectedImage && cropState.image) {
        const croppedBlob = await makeCroppedBannerBlob();
        formData.append('background_image', croppedBlob, selectedImage.name.replace(/\.[^.]+$/, '') + '-banner.jpg');
    }

    const btn = document.getElementById('btn-save-banner');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu';

    try {
        const saved = await fetchAPI(id ? `/banners/${id}/` : '/banners/', id ? 'PATCH' : 'POST', formData);
        Toast.fire({ icon: 'success', title: currentTemplate === 'carousel' ? 'Đã lưu khung slider' : 'Đã lưu banner' });
        await loadAdminBanners();
        if (saved.template === 'carousel') await editBanner(saved.id);
    } catch (error) {
        console.error(error);
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể lưu banner') });
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

async function saveSlide(event) {
    event.preventDefault();
    const bannerId = document.getElementById('slide-banner-id').value;
    const file = document.getElementById('slide-image').files[0];
    if (!bannerId) return Toast.fire({ icon: 'warning', title: 'Vui lòng lưu khung slider trước.' });
    if (!editingSlideId && !file) return Toast.fire({ icon: 'warning', title: 'Vui lòng chọn ảnh.' });

    const formData = new FormData();
    formData.append('title', document.getElementById('slide-title').value.trim());
    formData.append('subtitle', document.getElementById('slide-subtitle').value.trim());
    formData.append('button_text', document.getElementById('slide-button-text').value.trim());
    formData.append('button_link', document.getElementById('slide-button-link').value.trim());
    if (file) formData.append('image', file);
    if (!editingSlideId) formData.append('sort_order', currentEditingBanner?.slides?.length || 0);

    const btn = document.getElementById('btn-save-slide');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu';

    try {
        const endpoint = editingSlideId
            ? `/banners/${bannerId}/slides/${editingSlideId}/`
            : `/banners/${bannerId}/slides/`;
        const method = editingSlideId ? 'PATCH' : 'POST';
        const wasEditing = !!editingSlideId;
        await fetchAPI(endpoint, method, formData);
        resetSlideForm();
        Toast.fire({ icon: 'success', title: wasEditing ? 'Đã cập nhật ảnh slider' : 'Đã thêm ảnh vào group slider' });
        await loadAdminBanners();
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể lưu ảnh slider') });
    } finally {
        btn.disabled = false;
        btn.innerHTML = editingSlideId
            ? '<i class="fas fa-save me-2"></i>Cập nhật ảnh'
            : '<i class="fas fa-plus me-2"></i>Thêm ảnh vào group';
    }
}

window.editBanner = async function(id) {
    try {
        const banner = await fetchAPI(`/banners/${id}/`);
        currentEditingBanner = banner;
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
        document.getElementById('banner-image').value = '';
        currentTemplate = banner.template || 'single_left';
        currentImagePreview = mediaUrl(banner.background_image);
        selectedImage = null;
        document.getElementById('banner-crop-wrap').style.display = 'none';
        syncTemplateButtons();
        renderSlideManager(banner);
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
        resetBannerForm();
        loadAdminBanners();
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Không thể xóa banner' });
    }
};

window.deleteSlide = async function(slideId) {
    if (!currentEditingBanner?.id || !confirm('Xóa ảnh này khỏi group slider?')) return;
    try {
        await fetchAPI(`/banners/${currentEditingBanner.id}/slides/${slideId}/`, 'DELETE');
        if (Number(editingSlideId) === Number(slideId)) resetSlideForm();
        Toast.fire({ icon: 'success', title: 'Đã xóa ảnh slider' });
        await loadAdminBanners();
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Không thể xóa ảnh slider' });
    }
};

window.editSlide = function(slideId) {
    const slide = currentEditingBanner?.slides?.find(item => Number(item.id) === Number(slideId));
    if (!slide) return;
    editingSlideId = slide.id;
    document.getElementById('slide-title').value = slide.title || '';
    document.getElementById('slide-subtitle').value = slide.subtitle || '';
    document.getElementById('slide-button-text').value = slide.button_text || '';
    document.getElementById('slide-button-link').value = slide.button_link || '';
    document.getElementById('slide-image').value = '';
    document.getElementById('slide-image').required = false;
    document.getElementById('btn-cancel-slide-edit').style.display = '';
    document.getElementById('btn-save-slide').innerHTML = '<i class="fas fa-save me-2"></i>Cập nhật ảnh';
    document.getElementById('slide-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.moveSlide = async function(slideId, direction) {
    if (!currentEditingBanner?.slides?.length) return;
    const slides = [...currentEditingBanner.slides].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const index = slides.findIndex(slide => Number(slide.id) === Number(slideId));
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= slides.length) return;
    [slides[index], slides[nextIndex]] = [slides[nextIndex], slides[index]];
    await persistSlideOrder(slides.map(slide => slide.id));
};

async function persistSlideOrder(slideIds) {
    if (!currentEditingBanner?.id) return;
    try {
        currentEditingBanner = await fetchAPI(`/banners/${currentEditingBanner.id}/slides/reorder/`, 'POST', { slide_ids: slideIds });
        Toast.fire({ icon: 'success', title: 'Đã lưu thứ tự ảnh' });
        await loadAdminBanners();
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể lưu thứ tự ảnh') });
    }
}

function resetSlideForm() {
    editingSlideId = null;
    document.getElementById('slide-form').reset();
    document.getElementById('slide-image').required = true;
    document.getElementById('btn-cancel-slide-edit').style.display = 'none';
    document.getElementById('btn-save-slide').innerHTML = '<i class="fas fa-plus me-2"></i>Thêm ảnh vào group';
}

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
    selectedImage = null;
    currentEditingBanner = null;
    resetSlideForm();
    cropState.image = null;
    document.getElementById('banner-crop-wrap').style.display = 'none';
    renderSlideManager(null);
    syncTemplateButtons();
    updateBannerPreview();
}

function syncTemplateButtons() {
    document.querySelectorAll('.banner-template-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.template === currentTemplate);
    });
    document.getElementById('custom-html-wrap').style.display = currentTemplate === 'custom_html' ? 'block' : 'none';
    document.querySelectorAll('.non-carousel-field').forEach(el => {
        el.style.display = currentTemplate === 'carousel' ? 'none' : '';
    });
    document.getElementById('slide-manager').style.display = currentTemplate === 'carousel' ? 'block' : 'none';
    document.getElementById('btn-save-banner').innerHTML = `<i class="fas fa-save me-2"></i>${currentTemplate === 'carousel' ? 'Lưu khung slider' : 'Lưu banner'}`;
}

function renderSlideManager(banner) {
    const manager = document.getElementById('slide-manager');
    const count = banner?.slides?.length || 0;
    document.getElementById('slide-count').textContent = `${count} ảnh`;
    document.getElementById('slide-banner-id').value = banner?.id || '';
    manager.style.display = currentTemplate === 'carousel' ? 'block' : 'none';
    const list = document.getElementById('slide-list-admin');
    if (currentTemplate !== 'carousel') {
        list.innerHTML = '';
        return;
    }
    if (!banner?.id) {
        list.innerHTML = '<div class="text-muted small">Lưu khung slider trước, sau đó thêm từng ảnh vào group.</div>';
        return;
    }
    if (!count) {
        list.innerHTML = '<div class="text-muted small">Group này chưa có ảnh. Thêm ảnh đầu tiên để tạo tab slider.</div>';
        return;
    }
    const slides = [...banner.slides].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    list.innerHTML = slides.map((slide, index) => `
        <div class="banner-slide-row d-flex gap-2 align-items-center border rounded-3 p-2 mb-2 bg-white" draggable="true" data-slide-id="${slide.id}">
            <span class="banner-slide-drag" title="Kéo để đổi thứ tự"><i class="fas fa-grip-vertical"></i></span>
            <img src="${mediaUrl(slide.image)}" alt="${escapeHTML(slide.title)}" style="width:84px;height:48px;object-fit:cover;border-radius:6px;">
            <div class="min-width-0 flex-grow-1">
                <div class="fw-bold text-truncate">${escapeHTML(slide.title)}</div>
                <div class="small text-muted text-truncate">${escapeHTML(slide.subtitle || '')}</div>
            </div>
            <div class="banner-slide-actions">
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="moveSlide(${slide.id}, -1)" ${index === 0 ? 'disabled' : ''} title="Đưa lên"><i class="fas fa-chevron-up"></i></button>
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="moveSlide(${slide.id}, 1)" ${index === slides.length - 1 ? 'disabled' : ''} title="Đưa xuống"><i class="fas fa-chevron-down"></i></button>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="editSlide(${slide.id})"><i class="fas fa-pen"></i></button>
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="deleteSlide(${slide.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
    bindSlideSortEvents();
}

function bindSlideSortEvents() {
    document.querySelectorAll('.banner-slide-row').forEach(row => {
        row.addEventListener('dragstart', event => {
            draggedSlideId = Number(row.dataset.slideId);
            event.dataTransfer.effectAllowed = 'move';
            row.classList.add('dragging');
        });
        row.addEventListener('dragend', () => {
            draggedSlideId = null;
            row.classList.remove('dragging');
            document.querySelectorAll('.banner-slide-row.drag-over').forEach(item => item.classList.remove('drag-over'));
        });
        row.addEventListener('dragover', event => {
            event.preventDefault();
            row.classList.add('drag-over');
        });
        row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
        row.addEventListener('drop', async event => {
            event.preventDefault();
            row.classList.remove('drag-over');
            const targetId = Number(row.dataset.slideId);
            if (!draggedSlideId || draggedSlideId === targetId) return;
            const slides = [...currentEditingBanner.slides].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            const fromIndex = slides.findIndex(slide => Number(slide.id) === draggedSlideId);
            const toIndex = slides.findIndex(slide => Number(slide.id) === targetId);
            if (fromIndex < 0 || toIndex < 0) return;
            const [moved] = slides.splice(fromIndex, 1);
            slides.splice(toIndex, 0, moved);
            await persistSlideOrder(slides.map(slide => slide.id));
        });
    });
}

function updateBannerPreview() {
    const html = currentTemplate === 'carousel' ? renderCarouselPreview() : renderSinglePreview();
    document.getElementById('banner-preview').innerHTML = html;
    document.getElementById('banner-mobile-preview').innerHTML = html;
}

function renderCarouselPreview() {
    const slides = currentEditingBanner?.slides?.length
        ? [...currentEditingBanner.slides].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        : [{
            title: document.getElementById('banner-title').value || 'Tiêu đề ảnh',
            subtitle: 'Thêm ảnh vào group để tab lấy tiêu đề ảnh thật',
            image: currentImagePreview
        }];
    const tabs = slides.map((slide, index) => `
        <span class="${index === 0 ? 'active' : ''}">
            ${escapeHTML(slide.title)}
            <small>${escapeHTML(slide.subtitle || slide.button_text || '')}</small>
        </span>
    `).join('');
    const first = slides[0];
    const imageUrl = first.image ? (String(first.image).startsWith('data:') ? first.image : mediaUrl(first.image)) : currentImagePreview;
    return `
        <div class="hybrid-banner carousel-preview-slide" style="background-image:url('${imageUrl}')">
            <div class="banner-carousel-tabs">${tabs}</div>
            <button class="banner-carousel-nav prev" type="button"><i class="fas fa-chevron-left"></i></button>
            <button class="banner-carousel-nav next" type="button"><i class="fas fa-chevron-right"></i></button>
        </div>
    `;
}

function renderSinglePreview() {
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

    return `
        <div class="hybrid-banner banner-template-${currentTemplate}" style="background-image:url('${imageUrl}')">
            <div class="hybrid-banner-overlay">${overlay}</div>
        </div>
    `;
}

function loadCropImage(src) {
    const img = document.getElementById('banner-crop-image');
    document.getElementById('banner-crop-wrap').style.display = 'block';
    cropState.zoom = 1;
    cropState.x = 50;
    cropState.y = 50;
    document.getElementById('banner-crop-zoom').value = 1;
    document.getElementById('banner-crop-x').value = 50;
    document.getElementById('banner-crop-y').value = 50;
    const image = new Image();
    image.onload = () => {
        cropState.image = image;
        img.src = src;
        updateCropControls();
    };
    image.src = src;
}

function updateCropControls() {
    cropState.zoom = Number(document.getElementById('banner-crop-zoom').value || 1);
    cropState.x = Number(document.getElementById('banner-crop-x').value || 50);
    cropState.y = Number(document.getElementById('banner-crop-y').value || 50);
    const img = document.getElementById('banner-crop-image');
    img.style.transform = `translate(-${cropState.x}%, -${cropState.y}%) scale(${cropState.zoom})`;
    img.style.left = `${cropState.x}%`;
    img.style.top = `${cropState.y}%`;
}

async function makeCroppedBannerBlob() {
    const image = cropState.image;
    const outputWidth = 1600;
    const outputHeight = 720;
    const outputRatio = outputWidth / outputHeight;
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    let cropWidth = image.naturalWidth / cropState.zoom;
    let cropHeight = cropWidth / outputRatio;
    if (cropHeight > image.naturalHeight / cropState.zoom || sourceRatio < outputRatio) {
        cropHeight = image.naturalHeight / cropState.zoom;
        cropWidth = cropHeight * outputRatio;
    }
    const maxX = image.naturalWidth - cropWidth;
    const maxY = image.naturalHeight - cropHeight;
    const sx = maxX * (cropState.x / 100);
    const sy = maxY * (cropState.y / 100);
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    canvas.getContext('2d').drawImage(image, sx, sy, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
}

async function makePlaceholderBannerBlob() {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d71920';
    ctx.font = '700 52px Arial';
    ctx.fillText('TIS Slider Group', 90, 360);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
}

function getTemplateLabel(template) {
    return {
        single_left: '1 banner - text trái',
        single_center: '1 banner - text giữa',
        carousel: 'Slider nhiều banner',
        triple_grid: '3 banner - grid',
        custom_html: 'Custom HTML',
    }[template] || template;
}
