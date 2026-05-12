document.addEventListener('DOMContentLoaded', loadNewsDetail);

async function loadNewsDetail() {
    const container = document.getElementById('news-detail');
    const id = new URLSearchParams(window.location.search).get('id');

    if (!id) {
        renderNotFound(container);
        return;
    }

    try {
        const news = await fetchAPI(`/news/${id}/`);
        const imageHtml = news.image
            ? `<img src="${mediaUrl(news.image)}" alt="${escapeHTML(news.title || 'Tin tức')}" class="img-fluid rounded-3 shadow-sm mb-4 w-100" style="max-height: 460px; object-fit: cover;">`
            : '';
        const createdAt = news.created_at
            ? new Date(news.created_at).toLocaleDateString('vi-VN')
            : '';

        document.title = `${news.title || 'Tin tức'} - TIS Broker`;
        container.innerHTML = `
            <div class="mb-4">
                <span class="badge bg-danger-subtle text-danger mb-3">Tin tức</span>
                <h1 class="fw-bold mb-3">${escapeHTML(news.title || 'Tin tức')}</h1>
                ${createdAt ? `<div class="text-muted small"><i class="far fa-calendar-alt me-2"></i>${createdAt}</div>` : ''}
            </div>
            ${imageHtml}
            <div class="news-content fs-6 lh-lg">${news.content || ''}</div>
            <div class="border-top mt-5 pt-4">
                <a href="index.html#news" class="btn btn-outline-danger rounded-pill px-4">
                    <i class="fas fa-arrow-left me-2"></i>Quay lại tin tức
                </a>
            </div>
        `;
    } catch (error) {
        console.error('Lỗi tải chi tiết tin tức:', error);
        renderNotFound(container);
    }
}

function renderNotFound(container) {
    container.innerHTML = `
        <div class="text-center py-5">
            <i class="far fa-newspaper text-muted mb-3" style="font-size: 4rem;"></i>
            <h3 class="fw-bold">Không tìm thấy tin tức</h3>
            <p class="text-muted">Bài viết có thể đã bị xóa hoặc đường dẫn không hợp lệ.</p>
            <a href="index.html#news" class="btn btn-danger rounded-pill px-4">Về trang chủ</a>
        </div>
    `;
}
