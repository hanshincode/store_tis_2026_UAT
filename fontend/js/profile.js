// Thay thế đoạn render đơn hàng cũ bằng đoạn này:
const renderOrder = (orders) => {
    if(!orders || orders.length === 0) return '<div class="text-center text-muted py-4"><i class="fas fa-box-open fa-3x mb-3"></i><p>Chưa có đơn hàng nào</p></div>';
    
    return orders.map(o => `
        <div class="order-card ${o.status}">
            <div class="order-header">
                <span class="order-code"><i class="fas fa-hashtag"></i> ${o.code}</span>
                <span class="status-badge bg-${o.status}">${o.status === 'pending' ? 'Chờ xác nhận' : 'Đang hiệu lực'}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center">
                <div class="order-detail">
                    ${o.items.map(i => `<div><i class="fas fa-shield-alt text-primary"></i> ${i.product_name} <span class="badge bg-light text-dark border">${i.duration}</span></div>`).join('')}
                    <small class="text-muted mt-2 d-block"><i class="far fa-clock"></i> Ngày tạo: ${new Date(o.created_at).toLocaleDateString('vi-VN')}</small>
                </div>
                <div class="order-price">
                    ${formatMoney(o.total_amount)}
                </div>
            </div>
        </div>
    `).join('');
};