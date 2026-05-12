document.addEventListener('DOMContentLoaded', loadNewsPage);

async function loadNewsPage() {
    const list = document.getElementById('news-list-page');
    if (!list) return;

    try {
        const payload = await fetchAPI('/news/');
        const newsItems = normalizeList(payload);

        if (!newsItems.length) {
            list.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="far fa-newspaper text-muted mb-3" style="font-size: 4rem;"></i>
                    <h4 class="fw-bold">Chưa có tin tức</h4>
                    <p class="text-muted">Các bài viết mới sẽ được cập nhật tại đây.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = newsItems.map(item => {
            const image = item.image
                ? mediaUrl(item.image)
                : 'https://placehold.co/800x500/f8f9fa/d71920?text=TIS+Broker';
            const date = item.created_at
                ? new Date(item.created_at).toLocaleDateString('vi-VN')
                : '';
            const preview = stripHtml(item.content || '').slice(0, 140);

            return `
                <div class="col-md-6 col-lg-4">
                    <article class="card h-100 border-0 shadow-sm">
                        <a href="news-detail.html?id=${item.id}" class="text-decoration-none">
                            <img src="${image}" alt="${escapeHTML(item.title || 'Tin tức')}" class="card-img-top" style="height: 220px; object-fit: cover;">
                        </a>
                        <div class="card-body d-flex flex-column">
                            ${date ? `<div class="text-muted small mb-2"><i class="far fa-calendar-alt me-1"></i>${date}</div>` : ''}
                            <h5 class="fw-bold mb-3">
                                <a href="news-detail.html?id=${item.id}" class="text-dark text-decoration-none">${escapeHTML(item.title || 'Tin tức')}</a>
                            </h5>
                            <p class="text-muted small flex-grow-1">${escapeHTML(preview)}${preview.length >= 140 ? '...' : ''}</p>
                            <a href="news-detail.html?id=${item.id}" class="btn btn-outline-danger rounded-pill px-3 align-self-start">Xem chi tiết</a>
                        </div>
                    </article>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Lỗi tải danh sách tin tức:', error);
        list.innerHTML = `
            <div class="col-12 text-center py-5 text-danger">
                <i class="fas fa-exclamation-circle mb-3" style="font-size: 3rem;"></i>
                <p>Không thể tải danh sách tin tức.</p>
            </div>
        `;
    }
}

function stripHtml(value = '') {
    const div = document.createElement('div');
    div.innerHTML = value;
    return div.textContent || div.innerText || '';
}
