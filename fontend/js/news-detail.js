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
        const image = news.image ? mediaUrl(news.image) : '';
        const createdAt = news.created_at ? new Date(news.created_at).toLocaleDateString('vi-VN') : '';

        document.title = `${news.title || 'Tin tức'} - TIS Broker`;
        container.innerHTML = `
            <header class="news-detail-header">
                <a href="news.html" class="news-back-link"><i class="fas fa-arrow-left"></i> Tin tức</a>
                <div class="news-detail-meta">
                    <span>TIS Broker</span>
                    ${createdAt ? `<span><i class="far fa-calendar-alt me-1"></i>${createdAt}</span>` : ''}
                </div>
                <h1>${escapeHTML(news.title || 'Tin tức')}</h1>
            </header>
            ${image ? `
                <figure class="news-detail-cover">
                    <img src="${escapeHTML(image)}" alt="${escapeHTML(news.title || 'Tin tức')}" onerror="this.closest('figure').remove()">
                </figure>
            ` : ''}
            <section class="news-detail-content">
                ${sanitizeNewsHtml(news.content || '<p>Nội dung bài viết đang được cập nhật.</p>')}
            </section>
            <div class="news-detail-footer">
                <a href="news.html" class="btn btn-outline-danger rounded-pill px-4">
                    <i class="fas fa-arrow-left me-2"></i>Quay lại danh sách tin
                </a>
            </div>
        `;
    } catch (error) {
        console.error('Lỗi tải chi tiết tin tức:', error);
        renderNotFound(container);
    }
}

function sanitizeNewsHtml(html = '') {
    const template = document.createElement('template');
    template.innerHTML = String(html);
    template.content.querySelectorAll('script, iframe[src^="javascript:"], object, embed').forEach(el => el.remove());
    template.content.querySelectorAll('*').forEach(el => {
        [...el.attributes].forEach(attr => {
            const name = attr.name.toLowerCase();
            const value = attr.value || '';
            if (name.startsWith('on') || value.trim().toLowerCase().startsWith('javascript:')) {
                el.removeAttribute(attr.name);
            }
        });
    });
    return template.innerHTML;
}

function renderNotFound(container) {
    container.innerHTML = `
        <div class="news-empty-state">
            <i class="far fa-newspaper"></i>
            <h3>Không tìm thấy tin tức</h3>
            <p>Bài viết có thể đã bị xóa hoặc đường dẫn không hợp lệ.</p>
            <a href="news.html" class="btn btn-danger rounded-pill px-4">Về trang tin tức</a>
        </div>
    `;
}
