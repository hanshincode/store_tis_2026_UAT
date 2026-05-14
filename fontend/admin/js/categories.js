const specMap = {
    property: 'Tài sản',
    health: 'Sức khỏe',
    vehicle: 'Xe cộ',
    marine: 'Hàng hải',
};

const fieldTypeMap = {
    text: 'Text',
    number: 'Number',
    date: 'Ngày',
    textarea: 'Nội dung dài',
    file: 'Upload file',
};

let editingCategoryId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
});

window.openCategoryModal = async function(id = null) {
    const form = document.getElementById('category-form');
    const title = document.querySelector('#categoryModal .modal-title');
    const fieldList = document.getElementById('subject-field-list');
    if (form) form.reset();
    if (fieldList) fieldList.innerHTML = '';
    editingCategoryId = id;

    if (id) {
        title.innerText = 'Chỉnh sửa danh mục';
        try {
            const cat = await fetchAPI(`/categories/${id}/`);
            document.getElementById('c-name').value = cat.name || '';
            document.getElementById('c-spec').value = cat.specialization_code || 'health';
            (cat.subject_fields || []).forEach(field => addSubjectFieldRow(field));
        } catch (e) {
            Toast.fire({ icon: 'error', title: 'Không thể tải dữ liệu danh mục' });
        }
    } else {
        title.innerText = 'Thêm danh mục mới';
    }

    if (!document.querySelectorAll('.subject-field-row').length) {
        addSubjectFieldRow();
    }

    const modalEl = document.getElementById('categoryModal');
    if (modalEl) new bootstrap.Modal(modalEl).show();
};

window.addSubjectFieldRow = function(field = {}) {
    const list = document.getElementById('subject-field-list');
    if (!list) return;
    const rowId = `subject-field-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    list.insertAdjacentHTML('beforeend', `
        <div class="subject-field-row border rounded-3 p-3 bg-light" id="${rowId}">
            <div class="row g-2 align-items-end">
                <div class="col-lg-3">
                    <label class="form-label small fw-semibold">Tên trường</label>
                    <input type="text" class="form-control subject-label" value="${escapeHTML(field.label || '')}" placeholder="Biển số xe">
                </div>
                <div class="col-lg-2">
                    <label class="form-label small fw-semibold">Kiểu dữ liệu</label>
                    <select class="form-select subject-type">
                        ${Object.entries(fieldTypeMap).map(([value, label]) => `
                            <option value="${value}" ${field.field_type === value ? 'selected' : ''}>${label}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="col-lg-3">
                    <label class="form-label small fw-semibold">Gợi ý nhập</label>
                    <input type="text" class="form-control subject-help" value="${escapeHTML(field.help_text || '')}" placeholder="Nhập đúng theo giấy tờ">
                </div>
                <div class="col-lg-2">
                    <label class="form-label small fw-semibold">Mã field</label>
                    <input type="text" class="form-control subject-key" value="${escapeHTML(field.field_key || '')}" placeholder="Tự tạo">
                </div>
                <div class="col-lg-1">
                    <div class="form-check mb-2">
                        <input class="form-check-input subject-required" type="checkbox" ${field.is_required === false ? '' : 'checked'}>
                        <label class="form-check-label small">Bắt buộc</label>
                    </div>
                </div>
                <div class="col-lg-1 text-end">
                    <button type="button" class="btn btn-outline-secondary" onclick="document.getElementById('${rowId}')?.remove()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `);
};

window.loadCategories = async function() {
    const tbody = document.getElementById('category-list');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-danger spinner-border-sm"></div> Đang tải...</td></tr>';

    try {
        const cats = await fetchAPI('/categories/');
        if (!cats || cats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Chưa có danh mục nào.</td></tr>';
            return;
        }

        tbody.innerHTML = cats.map(c => {
            const fields = c.subject_fields || [];
            return `
                <tr>
                    <td class="ps-4 text-muted">${c.id}</td>
                    <td class="fw-bold text-dark cursor-pointer" onclick="openCategoryModal(${c.id})">${escapeHTML(c.name)}</td>
                    <td><span class="badge bg-light text-dark border font-monospace">${escapeHTML(c.slug || '')}</span></td>
                    <td>
                        <span class="badge bg-info-subtle text-info border border-info px-3 py-2">
                            <i class="fas fa-user-tag me-1"></i> ${specMap[c.specialization_code] || c.specialization_code}
                        </span>
                    </td>
                    <td>
                        ${fields.length
                            ? `<div class="d-flex flex-wrap gap-1">${fields.slice(0, 4).map(f => `<span class="badge bg-light text-dark border">${escapeHTML(f.label)}</span>`).join('')}${fields.length > 4 ? `<span class="badge bg-secondary">+${fields.length - 4}</span>` : ''}</div>`
                            : '<span class="text-muted small">Chưa cấu hình</span>'}
                    </td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-primary border-0" onclick="openCategoryModal(${c.id})">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteCategory(${c.id})">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Lỗi kết nối máy chủ.</td></tr>';
    }
};

window.submitCategory = async function() {
    const name = document.getElementById('c-name')?.value.trim() || '';
    const spec = document.getElementById('c-spec')?.value || 'health';

    if (!name) {
        Toast.fire({ icon: 'warning', title: 'Vui lòng nhập tên danh mục!' });
        return;
    }

    const subjectFields = Array.from(document.querySelectorAll('.subject-field-row')).map((row, index) => ({
        label: row.querySelector('.subject-label')?.value.trim() || '',
        field_key: row.querySelector('.subject-key')?.value.trim() || '',
        field_type: row.querySelector('.subject-type')?.value || 'text',
        is_required: row.querySelector('.subject-required')?.checked || false,
        help_text: row.querySelector('.subject-help')?.value.trim() || '',
        sort_order: index,
    })).filter(field => field.label);

    const payload = {
        name,
        specialization_code: spec,
        subject_fields: subjectFields,
    };

    if (!editingCategoryId) {
        payload.slug = slugifyVi(name);
    }

    const method = editingCategoryId ? 'PATCH' : 'POST';
    const url = editingCategoryId ? `/categories/${editingCategoryId}/` : '/categories/';

    try {
        await fetchAPI(url, method, payload);
        const modal = bootstrap.Modal.getInstance(document.getElementById('categoryModal'));
        if (modal) modal.hide();
        loadCategories();
        Toast.fire({ icon: 'success', title: editingCategoryId ? 'Cập nhật thành công!' : 'Đã thêm danh mục mới!' });
    } catch(e) {
        Swal.fire('Lỗi', getErrorMessage(e, 'Không thể lưu danh mục. Vui lòng kiểm tra lại thông tin.'), 'error');
    }
};

window.deleteCategory = async function(id) {
    const result = await Swal.fire({
        title: 'Xác nhận xóa danh mục?',
        text: 'Hành động này không thể hoàn tác!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#D71920',
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy',
    });

    if (!result.isConfirmed) return;
    try {
        await fetchAPI(`/categories/${id}/`, 'DELETE');
        loadCategories();
        Toast.fire({ icon: 'success', title: 'Đã gỡ bỏ danh mục.' });
    } catch(e) {
        Swal.fire('Lỗi', 'Danh mục này hiện đang có sản phẩm liên kết, không thể xóa.', 'error');
    }
};

function slugifyVi(value) {
    return value.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}
