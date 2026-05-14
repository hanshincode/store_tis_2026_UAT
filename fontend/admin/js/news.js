let allNews = [];
let currentNewsId = null;
let newsEditor = null;

document.addEventListener('DOMContentLoaded', () => {
    initNewsEditor();
    bindNewsEvents();
    loadNews();
});

function bindNewsEvents() {
    document.getElementById('btn-add-news')?.addEventListener('click', () => openNewsModal());
    document.getElementById('btn-submit-news')?.addEventListener('click', submitNews);
    document.getElementById('btn-reload-news')?.addEventListener('click', loadNews);
    document.getElementById('news-search')?.addEventListener('input', renderNewsList);
    document.getElementById('n-image')?.addEventListener('change', previewNewsImage);
}

function initNewsEditor() {
    const target = document.querySelector('#n-content');
    if (!target || typeof ClassicEditor === 'undefined') return;

    ClassicEditor
        .create(target)
        .then(editor => {
            newsEditor = editor;
        })
        .catch(error => {
            newsEditor = null;
            console.error('Không thể khởi tạo editor tin tức:', error);
        });
}

async function loadNews() {
    const list = document.getElementById('news-list');
    if (!list) return;
    list.innerHTML = renderNewsLoading();

    try {
        const response = await fetchAPI('/news/');
        allNews = normalizeList(response).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        renderNewsList();
    } catch (error) {
        console.error('Lỗi tải tin tức:', error);
        list.innerHTML = `
            <div class="admin-news-empty text-danger">
                <i class="fas fa-triangle-exclamation"></i>
                <strong>Không thể tải danh sách tin tức.</strong>
                <span>${escapeHTML(getErrorMessage(error, 'Vui lòng thử lại sau.'))}</span>
            </div>
        `;
    }
}

function renderNewsLoading() {
    return `
        <div class="admin-news-empty">
            <div class="spinner-border text-danger" role="status"></div>
            <span>Đang tải tin tức...</span>
        </div>
    `;
}

function renderNewsList() {
    const list = document.getElementById('news-list');
    if (!list) return;

    const keyword = (document.getElementById('news-search')?.value || '').trim().toLowerCase();
    const filtered = keyword
        ? allNews.filter(item => `${item.title || ''} ${stripNewsHtml(item.content || '')}`.toLowerCase().includes(keyword))
        : allNews;

    if (!filtered.length) {
        list.innerHTML = `
            <div class="admin-news-empty">
                <i class="far fa-newspaper"></i>
                <strong>${keyword ? 'Không tìm thấy bài viết phù hợp.' : 'Chưa có bài viết nào.'}</strong>
                <span>${keyword ? 'Hãy thử từ khóa khác.' : 'Bấm “Đăng bài mới” để tạo nội dung đầu tiên.'}</span>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(item => {
        const image = item.image ? mediaUrl(item.image) : 'https://placehold.co/640x360/f8f9fa/d71920?text=TIS+Broker';
        const date = formatNewsDate(item.created_at);
        const preview = trimText(stripNewsHtml(item.content || ''), 150);

        return `
            <article class="admin-news-card">
                <img src="${escapeHTML(image)}" alt="${escapeHTML(item.title || 'Tin tức')}" onerror="this.src='https://placehold.co/640x360/f8f9fa/d71920?text=TIS+Broker'">
                <div class="admin-news-card-body">
                    <div class="admin-news-card-meta">
                        <span><i class="far fa-calendar-alt me-1"></i>${escapeHTML(date || '--')}</span>
                        <span>#${item.id}</span>
                    </div>
                    <h5 title="${escapeHTML(item.title || '')}">${escapeHTML(item.title || 'Không có tiêu đề')}</h5>
                    <p>${escapeHTML(preview || 'Chưa có nội dung tóm tắt.')}</p>
                    <div class="admin-news-card-actions">
                        <a href="../news-detail.html?id=${item.id}" target="_blank" class="btn btn-sm btn-light border">
                            <i class="fas fa-eye me-1"></i>Xem
                        </a>
                        <button type="button" class="btn btn-sm btn-outline-primary" onclick="openNewsModal(${item.id})">
                            <i class="fas fa-pen me-1"></i>Sửa
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteNews(${item.id})">
                            <i class="fas fa-trash me-1"></i>Xóa
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

window.openNewsModal = function(id = null) {
    currentNewsId = id;
    const item = id ? allNews.find(news => String(news.id) === String(id)) : null;
    const form = document.getElementById('news-form');
    form?.reset();

    document.getElementById('news-modal-title').textContent = item ? 'Chỉnh sửa bài viết' : 'Đăng bài mới';
    document.getElementById('n-title').value = item?.title || '';
    setNewsContent(item?.content || '');
    renderImagePreview(item?.image ? mediaUrl(item.image) : '');

    const modal = new bootstrap.Modal(document.getElementById('newsModal'));
    modal.show();
};

function setNewsContent(value) {
    if (newsEditor) {
        newsEditor.setData(value || '');
    } else {
        document.getElementById('n-content').value = value || '';
    }
}

function getNewsContent() {
    return newsEditor ? newsEditor.getData() : document.getElementById('n-content').value;
}

function previewNewsImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    renderImagePreview(URL.createObjectURL(file));
}

function renderImagePreview(src = '') {
    const preview = document.getElementById('news-image-preview');
    if (!preview) return;
    preview.innerHTML = src
        ? `<img src="${escapeHTML(src)}" alt="Ảnh bìa tin tức">`
        : '<span>Chưa chọn ảnh</span>';
}

async function submitNews() {
    const form = document.getElementById('news-form');
    if (form && !form.reportValidity()) return;

    const title = document.getElementById('n-title').value.trim();
    const content = getNewsContent().trim();
    if (!content) {
        Toast.fire({ icon: 'warning', title: 'Vui lòng nhập nội dung bài viết.' });
        return;
    }

    const btn = document.getElementById('btn-submit-news');
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu';

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);

    const imageFile = document.getElementById('n-image').files?.[0];
    if (!currentNewsId && !imageFile) {
        Toast.fire({ icon: 'warning', title: 'Vui lòng chọn ảnh bìa cho bài viết.' });
        return;
    }
    if (imageFile) formData.append('image', imageFile);

    try {
        const url = currentNewsId ? `/news/${currentNewsId}/` : '/news/';
        const method = currentNewsId ? 'PATCH' : 'POST';
        await fetchAPI(url, method, formData);

        bootstrap.Modal.getInstance(document.getElementById('newsModal'))?.hide();
        Toast.fire({ icon: 'success', title: currentNewsId ? 'Đã cập nhật bài viết' : 'Đã đăng bài viết' });
        currentNewsId = null;
        await loadNews();
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể lưu bài viết.') });
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

window.deleteNews = async function(id) {
    const result = await Swal.fire({
        title: 'Xóa bài viết?',
        text: 'Bài viết sẽ bị xóa khỏi trang tin tức công khai.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#D71920',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy',
    });
    if (!result.isConfirmed) return;

    try {
        await fetchAPI(`/news/${id}/`, 'DELETE');
        Toast.fire({ icon: 'success', title: 'Đã xóa bài viết' });
        await loadNews();
    } catch (error) {
        Toast.fire({ icon: 'error', title: getErrorMessage(error, 'Không thể xóa bài viết.') });
    }
};

function stripNewsHtml(value = '') {
    const div = document.createElement('div');
    div.innerHTML = value;
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function trimText(value = '', max = 140) {
    const text = String(value || '').trim();
    return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function formatNewsDate(value) {
    return value ? new Date(value).toLocaleDateString('vi-VN') : '';
}
