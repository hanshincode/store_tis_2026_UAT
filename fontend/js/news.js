document.addEventListener('DOMContentLoaded', loadNewsPage);

async function loadNewsPage() {
    const list = document.getElementById('news-list-page');
    if (!list) return;

    try {
        const payload = await fetchAPI('/news/');
        const newsItems = normalizeList(payload).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        if (!newsItems.length) {
            list.innerHTML = `
                <div class="col-12">
                    <div class="news-empty-state">
                        <i class="far fa-newspaper"></i>
                        <h4>Chưa có tin tức</h4>
                        <p>Các bài viết mới sẽ được cập nhật tại đây.</p>
                    </div>
                </div>
            `;
            return;
        }

        list.innerHTML = newsItems.map((item, index) => renderNewsCard(item, index === 0)).join('');
    } catch (error) {
        console.error('Lỗi tải danh sách tin tức:', error);
        list.innerHTML = `
            <div class="col-12">
                <div class="news-empty-state text-danger">
                    <i class="fas fa-exclamation-circle"></i>
                    <h4>Không thể tải tin tức</h4>
                    <p>${escapeHTML(getErrorMessage(error, 'Vui lòng thử lại sau.'))}</p>
                </div>
            </div>
        `;
    }
}

function renderNewsCard(item, featured = false) {
    const image = item.image
        ? mediaUrl(item.image)
        : 'https://placehold.co/900x520/f8f9fa/d71920?text=TIS+Broker';
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '';
    const preview = trimNewsText(stripHtml(item.content || ''), featured ? 210 : 135);
    const colClass = featured ? 'col-12' : 'col-md-6 col-lg-4';
    const cardClass = featured ? 'news-list-card news-list-card-featured' : 'news-list-card';

    return `
        <div class="${colClass}">
            <article class="${cardClass}">
                <a href="news-detail.html?id=${item.id}" class="news-list-image" aria-label="${escapeHTML(item.title || 'Tin tức')}">
                    <img src="${escapeHTML(image)}" alt="${escapeHTML(item.title || 'Tin tức')}" onerror="this.src='https://placehold.co/900x520/f8f9fa/d71920?text=TIS+Broker'">
                </a>
                <div class="news-list-body">
                    <div class="news-list-meta">
                        <span>TIS Broker</span>
                        ${date ? `<span><i class="far fa-calendar-alt me-1"></i>${date}</span>` : ''}
                    </div>
                    <h2 class="news-list-title ${featured ? 'featured' : ''}">
                        <a href="news-detail.html?id=${item.id}">${escapeHTML(item.title || 'Tin tức')}</a>
                    </h2>
                    <p class="news-list-excerpt">${escapeHTML(preview || 'Nội dung bài viết đang được cập nhật.')}</p>
                    <a href="news-detail.html?id=${item.id}" class="news-list-link">
                        Đọc tiếp <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            </article>
        </div>
    `;
}

function stripHtml(value = '') {
    const div = document.createElement('div');
    div.innerHTML = value;
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function trimNewsText(value = '', maxLength = 140) {
    const text = String(value || '').trim();
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}
