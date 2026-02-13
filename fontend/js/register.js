// js/register.js

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Sự kiện đổi loại tài khoản
    const userTypeSelect = document.getElementById('user_type');
    if (userTypeSelect) {
        userTypeSelect.addEventListener('change', toggleBizFields);
    }

    // 2. Sự kiện tra cứu MST
    const taxInput = document.getElementById('tax_code');
    const searchBtn = document.getElementById('btn-search-mst');

    if (taxInput) taxInput.addEventListener('blur', searchMST);
    if (searchBtn) searchBtn.addEventListener('click', searchMST);

    // 3. Sự kiện Submit Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

function toggleBizFields() {
    const type = document.getElementById('user_type').value;
    const bizFields = document.getElementById('biz-fields');
    const indFields = document.getElementById('ind-fields');

    if (type === 'enterprise') {
        bizFields.classList.remove('d-none');
        indFields.classList.add('d-none');
        
        document.getElementById('tax_code').required = true;
        document.getElementById('company_name').required = true;
        document.getElementById('biz_address').required = true;
    } else {
        bizFields.classList.add('d-none');
        indFields.classList.remove('d-none');
        
        document.getElementById('tax_code').required = false;
        document.getElementById('company_name').required = false;
        document.getElementById('biz_address').required = false;
    }
}

async function searchMST() {
    const mst = document.getElementById('tax_code').value.trim();
    if (!mst || mst.length < 10) return;

    const icon = document.getElementById('mst-icon');
    const spinner = document.getElementById('mst-loading');
    if(icon) icon.classList.add('d-none');
    if(spinner) spinner.classList.remove('d-none');

    try {
        const res = await fetch(`https://api.vietqr.io/v2/business/${mst}`);
        const data = await res.json();

        if (data.code === '00') {
            document.getElementById('company_name').value = data.data.name;
            document.getElementById('biz_address').value = data.data.address;
            
            document.getElementById('tax_code').classList.remove('is-invalid');
            document.getElementById('tax_code').classList.add('is-valid');
            document.getElementById('company_name').classList.add('is-valid');
            
            if (typeof Toast !== 'undefined') Toast.success("Đã tìm thấy thông tin doanh nghiệp!");
        } else {
            if (typeof Toast !== 'undefined') Toast.error("Không tìm thấy thông tin doanh nghiệp này.");
            document.getElementById('tax_code').classList.add('is-invalid');
            document.getElementById('company_name').value = "";
            document.getElementById('biz_address').value = "";
        }
    } catch (error) {
        console.error(error);
        if (typeof Toast !== 'undefined') Toast.error("Lỗi kết nối đến tổng cục thuế.");
    } finally {
        if(icon) icon.classList.remove('d-none');
        if(spinner) spinner.classList.add('d-none');
    }
}

async function handleRegister(e) {
    e.preventDefault();

    // --- LOGIC MỚI: KIỂM TRA MẬT KHẨU ---
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    if (password !== confirmPassword) {
        if (typeof Toast !== 'undefined') {
            Toast.error("Mật khẩu nhập lại không khớp!");
        } else {
            alert("Mật khẩu nhập lại không khớp!");
        }
        // Focus vào ô nhập lại để người dùng sửa
        document.getElementById('confirm_password').focus();
        document.getElementById('confirm_password').classList.add('is-invalid');
        return; // Dừng lại, không gửi dữ liệu đi
    } else {
        document.getElementById('confirm_password').classList.remove('is-invalid');
    }
    // ------------------------------------

    const type = document.getElementById('user_type').value;
    
    const data = {
        username: document.getElementById('phone').value,
        password: password,
        phone: document.getElementById('phone').value,
        first_name: document.getElementById('full_name').value,
        role: 'customer',
        user_type: type,
        address: type === 'enterprise' ? document.getElementById('biz_address').value : document.getElementById('ind_address').value,
        company_name: type === 'enterprise' ? document.getElementById('company_name').value : '',
        tax_code: type === 'enterprise' ? document.getElementById('tax_code').value : '',
        cccd: type === 'individual' ? document.getElementById('cccd').value : ''
    };

    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';
    btn.disabled = true;

    const res = await fetchAPI('/register/', 'POST', data);
    
    btn.innerHTML = originalText;
    btn.disabled = false;

    if (res && res.id) {
        Swal.fire({
            icon: 'success',
            title: 'Đăng ký thành công!',
            text: 'Tài khoản đã được tạo. Vui lòng đăng nhập.',
            confirmButtonColor: '#D71920',
            confirmButtonText: 'Đến trang đăng nhập'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = 'login.html';
            }
        });
    } else {
        if (typeof Toast !== 'undefined') {
            Toast.error("Đăng ký thất bại! SĐT có thể đã tồn tại.");
        } else {
            alert("Đăng ký thất bại.");
        }
    }
}