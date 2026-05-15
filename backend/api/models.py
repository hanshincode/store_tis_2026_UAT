from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta
import uuid
import secrets

from django.core.exceptions import ValidationError


# --- 1. USER & ROLES ---
class User(AbstractUser):
    ROLE_CHOICES = (
        ('super_admin', 'Super Admin'), # 
        ('admin', 'Admin'), # 
        ('leader', 'Leader'), #
        ('staff', 'Staff'), # 
        ('customer', 'Khách hàng'), # 
    )
    USER_TYPE_CHOICES = (
        ('individual', 'Cá nhân'), 
        ('enterprise', 'Doanh nghiệp')
    )
    LANGUAGE_CHOICES = (
        ('vi', 'Tiếng Việt'),
        ('en', 'English'),
    )
    # Các loại bảo hiểm staff phụ trách 
    STAFF_SPECIALIZATION = (
        ('property', 'Tài sản'),
        ('health', 'Sức khỏe'),
        ('vehicle', 'Xe'),
        ('marine', 'Hàng hải'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=15, unique=True, null=True, blank=True) # Login Customer 
    address = models.TextField(null=True, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    # Info Cá nhân
    cccd = models.CharField(max_length=20, null=True, blank=True) 

    # Info Doanh nghiệp
    company_name = models.CharField(max_length=255, null=True, blank=True)
    tax_code = models.CharField(max_length=50, null=True, blank=True) # Bắt buộc nếu là DN 
    
    # Info Staff
    specialization = models.CharField(max_length=20, choices=STAFF_SPECIALIZATION, null=True, blank=True)
    specialized_categories = models.ManyToManyField(
        'Category',
        blank=True,
        related_name='specialized_staff',
        verbose_name='Danh mục chuyên môn'
    )
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, null=True, blank=True)
    preferred_language = models.CharField(max_length=5, choices=LANGUAGE_CHOICES, default='vi')
    email_verified = models.BooleanField(default=False)
    email_verification_otp = models.CharField(max_length=6, blank=True)
    email_verification_token = models.CharField(max_length=64, blank=True)
    email_verification_expires_at = models.DateTimeField(null=True, blank=True)
    password_reset_otp = models.CharField(max_length=6, blank=True)
    password_reset_token = models.CharField(max_length=64, blank=True)
    password_reset_expires_at = models.DateTimeField(null=True, blank=True)
    must_change_password = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
            # Logic: Internal user dùng email cty
            if self.role in ['admin', 'leader', 'staff', 'super_admin']:
                if self.email and not self.email.endswith('@tisbroker.com'):
                    # SỬA LỖI: Thay lệnh pass bằng raise ValidationError
                    raise ValidationError("Nhân viên/Admin phải sử dụng email @tisbroker.com")
            super().save(*args, **kwargs)

class EnterpriseEmployee(models.Model):
    """Nhân viên thuộc doanh nghiệp và có thể được gắn quyền lợi bảo hiểm."""
    enterprise = models.ForeignKey(User, on_delete=models.CASCADE, related_name='employees')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='enterprise_memberships')
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('enterprise', 'phone')

    def __str__(self):
        return f"{self.full_name} - {self.enterprise.company_name or self.enterprise.username}"


class EmployeeInsurance(models.Model):
    employee = models.ForeignKey(EnterpriseEmployee, on_delete=models.CASCADE, related_name='coverages')
    order = models.ForeignKey('Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='employee_coverages')
    order_item = models.ForeignKey('OrderItem', on_delete=models.SET_NULL, null=True, blank=True, related_name='employee_coverages')
    package = models.ForeignKey('ProductPackage', on_delete=models.SET_NULL, null=True, blank=True, related_name='employee_coverages')
    start_date = models.DateField(default=timezone.localdate)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=(('active', 'Đang hiệu lực'), ('expired', 'Hết hạn'), ('cancelled', 'Đã hủy')),
        default='active'
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.order_item and not self.package:
            self.package = self.order_item.package
        if self.order_item and not self.order:
            self.order = self.order_item.order
        if self.package and not self.end_date:
            self.end_date = self.start_date + timedelta(days=self.package.duration_days)
        super().save(*args, **kwargs)

# --- 2. PRODUCTS & NEWS ---
class Category(models.Model):
    name = models.CharField(max_length=100) # Sức khỏe, Xe, v.v.
    slug = models.SlugField(unique=True)
    # Mapping với staff specialization
    specialization_code = models.CharField(max_length=20, choices=User.STAFF_SPECIALIZATION) 


class CategorySubjectField(models.Model):
    FIELD_TYPE_CHOICES = (
        ('text', 'Text'),
        ('number', 'Number'),
        ('date', 'Date'),
        ('textarea', 'Textarea'),
        ('file', 'Upload file'),
    )

    category = models.ForeignKey(Category, related_name='subject_fields', on_delete=models.CASCADE)
    label = models.CharField(max_length=150)
    field_key = models.SlugField(max_length=120)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPE_CHOICES, default='text')
    is_required = models.BooleanField(default=True)
    help_text = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']
        unique_together = ('category', 'field_key')

    def __str__(self):
        return f"{self.category.name} - {self.label}"

class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True, null=True)
    provider_name = models.CharField(max_length=255) # Tên đơn vị cung cấp (Sensitive) 
    short_description = models.TextField(blank=True, null=True) # Detail Base (chỉ text)
    short_description_en = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)       # Detail Final (CKEditor)
    description_en = models.TextField(blank=True, null=True)
    is_featured = models.BooleanField(default=False) # Sản phẩm nổi bật 
    is_price_hidden = models.BooleanField(default=False, verbose_name="Giá liên hệ")
    target_audience = models.CharField(max_length=10, choices=(('ind', 'Cá nhân'), ('ent', 'Doanh nghiệp')))
    created_at = models.DateTimeField(auto_now_add=True)


    @property
    def base_price(self):
        # Lấy giá của gói đầu tiên để trả về cho FE nhanh
        first_package = self.packages.first()
        return first_package.price if first_package else None

    @property
    def category_name(self):
        return self.category.name if self.category else "Chưa phân loại"

class ProductImage(models.Model):
    """Cho phép upload nhiều ảnh """
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='products/')

class ProductPackage(models.Model):
    """Gói thời hạn (6 tháng, 1 năm...) """
    product = models.ForeignKey(Product, related_name='packages', on_delete=models.CASCADE)
    duration_label = models.CharField(max_length=50) # "6 Tháng", "1 Năm"
    price = models.DecimalField(max_digits=15, decimal_places=0)
    duration_days = models.IntegerField(help_text="Số ngày hiệu lực")

class News(models.Model): # 
    title = models.CharField(max_length=255)
    image = models.ImageField(upload_to='news/')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class Banner(models.Model):
    TEMPLATE_CHOICES = (
        ('single_left', '1 banner - chữ bên trái'),
        ('single_center', '1 banner - chữ giữa'),
        ('triple_grid', '3 banner - lưới chiến dịch'),
        ('carousel', 'Slider nhiều banner'),
        ('custom_html', 'Custom HTML/CSS overlay'),
    )

    title = models.CharField(max_length=255)
    subtitle = models.TextField(blank=True)
    eyebrow = models.CharField(max_length=100, blank=True)
    button_text = models.CharField(max_length=80, blank=True)
    button_link = models.CharField(max_length=255, blank=True)
    secondary_button_text = models.CharField(max_length=80, blank=True)
    secondary_button_link = models.CharField(max_length=255, blank=True)
    background_image = models.ImageField(upload_to='banners/')
    template = models.CharField(max_length=30, choices=TEMPLATE_CHOICES, default='single_left')
    custom_html = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', '-created_at']

    def __str__(self):
        return self.title


class BannerSlide(models.Model):
    banner = models.ForeignKey(Banner, on_delete=models.CASCADE, related_name='slides')
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to='banners/slides/')
    button_text = models.CharField(max_length=80, blank=True)
    button_link = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.title

# --- 3. ORDER & CART ---
class PaymentSetting(models.Model):
    bank_id = models.CharField(max_length=30, verbose_name="Mã ngân hàng VietQR")
    account_no = models.CharField(max_length=50, verbose_name="Số tài khoản nhận tiền")
    account_name = models.CharField(max_length=255, verbose_name="Tên chủ tài khoản")
    template = models.CharField(max_length=30, default="compact2", verbose_name="Mẫu QR")
    payment_timeout_minutes = models.PositiveSmallIntegerField(default=15, verbose_name="Thời hạn QR (phút)")
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cấu hình thanh toán VietQR"
        verbose_name_plural = "Cấu hình thanh toán VietQR"

    def __str__(self):
        return f"{self.bank_id} - {self.account_no}"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1, defaults={
            "bank_id": "",
            "account_no": "",
            "account_name": "",
            "template": "compact2",
            "payment_timeout_minutes": 15,
            "is_active": False,
        })
        return obj

    @property
    def is_configured(self):
        return bool(self.is_active and self.bank_id and self.account_no and self.account_name)

    def get_vietqr_account_parts(self):
        bank_id = str(self.bank_id or "").strip().upper()
        account_no = str(self.account_no or "").strip().upper()

        # Guard against the two fields being entered in reverse order.
        if bank_id.isdigit() and len(bank_id) > 8 and any(ch.isalpha() for ch in account_no):
            bank_id, account_no = account_no, bank_id
        return bank_id, account_no

    def build_qr_url(self, order):
        from urllib.parse import quote, urlencode

        if not self.is_configured:
            return ""
        bank_id, account_no = self.get_vietqr_account_parts()
        path = "-".join([
            quote(bank_id, safe=""),
            quote(account_no, safe=""),
            quote(str(self.template or "compact2").strip(), safe=""),
        ])
        query = urlencode({
            "amount": int(order.total_amount or 0),
            "addInfo": order.code,
            "accountName": self.account_name.strip(),
        })
        return f"https://img.vietqr.io/image/{path}.png?{query}"


class Order(models.Model):
    STATUS_CHOICES = (
        ('awaiting_payment', 'Chờ thanh toán'),
        ('pending', 'Chờ xác nhận'), # 
        ('confirmed', 'Đã xác nhận'), # Đang làm thủ tục
        ('active', 'Đang hiệu lực'), 
        ('cancelled', 'Hủy đơn'),
        ('payment_expired', 'Hết hạn thanh toán'),
    )
    PAYMENT_STATUS_CHOICES = (
        ('unpaid', 'Chưa thanh toán'),
        ('paid', 'Đã thanh toán'),
        ('expired', 'Hết hạn'),
    )
    code = models.CharField(max_length=20, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='awaiting_payment')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    payment_expires_at = models.DateTimeField(null=True, blank=True)
    payment_paid_at = models.DateTimeField(null=True, blank=True)
    payment_reference = models.CharField(max_length=50, blank=True)
    payment_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    total_amount = models.DecimalField(max_digits=15, decimal_places=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Admin xử lý 
    processed_by = models.ForeignKey(User, related_name='processed_orders', null=True, blank=True, on_delete=models.SET_NULL)
    
    # Nếu là DN mua cho nhân viên 
    beneficiary_note = models.TextField(blank=True, help_text="Danh sách người thụ hưởng")

    @property
    def is_payment_expired(self):
        return (
            self.payment_status == 'unpaid'
            and self.payment_expires_at
            and timezone.now() > self.payment_expires_at
        )

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    package = models.ForeignKey(ProductPackage, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=15, decimal_places=0, null=True, blank=True)

    @property
    def effective_price(self):
        return self.unit_price if self.unit_price is not None else self.package.price


class OrderItemSubject(models.Model):
    order_item = models.ForeignKey(OrderItem, related_name='subjects', on_delete=models.CASCADE)
    index = models.PositiveIntegerField(default=1)
    label = models.CharField(max_length=150, blank=True)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['index', 'id']
        unique_together = ('order_item', 'index')

    def __str__(self):
        return self.label or f"Đối tượng {self.index}"
    
class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    package = models.ForeignKey(ProductPackage, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)

# --- 4. CONSULTATION / CHAT ---
class ConsultationRequest(models.Model): # 
    # Auto assign staff based on category
    assigned_staff = models.ForeignKey(User, related_name='consultations', null=True, blank=True, on_delete=models.SET_NULL)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='consultations')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    customer_name = models.CharField(max_length=255)
    customer_contact = models.CharField(max_length=255)
    note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # --- THÊM TRƯỜNG NÀY ---
    processor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_consultations')
    updated_at = models.DateTimeField(auto_now=True)
    guest_session_id = models.CharField(max_length=255, null=True, blank=True) # Lưu session ID của khách vãng lai để gắn với chat
    STATUS_CHOICES = (
        ('new', 'Mới'),
        ('processed', 'Đang xử lý'),
        ('done', 'Hoàn tất'),
        ('archived', 'Lưu trữ'), # Thêm trạng thái này
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')

    def __str__(self):
        return f"{self.customer_name} - {self.status}"


class QuickCustomerForm(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Chờ khách cập nhật'),
        ('submitted', 'Đã gửi dữ liệu'),
        ('expired', 'Hết hạn'),
    )

    token = models.CharField(max_length=64, unique=True, default=secrets.token_urlsafe)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='quick_forms')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_quick_forms')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='quick_forms')
    customer_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    expires_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def is_expired(self):
        return bool(self.expires_at and timezone.now() > self.expires_at)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)





class ChatMessage(models.Model):
    # Định nghĩa các loại tệp đính kèm được hỗ trợ
    ATTACHMENT_TYPES = (
        ('image', 'Hình ảnh'),
        ('document', 'Tài liệu'),
        ('video', 'Video'),
        ('audio', 'Âm thanh'),
    )

    consultation = models.ForeignKey(
        'ConsultationRequest', 
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name="Yêu cầu tư vấn"
    )
    
    # Người gửi: Null nếu là khách vãng lai chưa có tài khoản
    sender = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_messages',
        verbose_name="Người gửi" 
    )

    # TRƯỜNG QUAN TRỌNG: Lưu tên của khách vãng lai (nếu sender = Null)
    guest_name = models.CharField(
        max_length=100, 
        null=True, 
        blank=True, 
        verbose_name="Tên khách vãng lai"
    )
    
    # Cho phép null/blank vì người dùng có thể chỉ gửi mỗi bức ảnh mà không có text
    message = models.TextField(
        blank=True, 
        null=True,
        verbose_name="Nội dung tin nhắn"
    )
    
    is_staff_reply = models.BooleanField(
        default=False,
        verbose_name="Là phản hồi của Admin/Staff"
    )

    # --- TỆP ĐÍNH KÈM ---
    attachment = models.FileField(
        upload_to='chat_attachments/%Y/%m/', # Tự động tạo thư mục theo năm/tháng
        blank=True,
        null=True,
        verbose_name="Tệp đính kèm"
    )
    
    is_read = models.BooleanField(
        default=False,
        verbose_name="Trạng thái đã xem"
    )

    # --- THỜI GIAN ---
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Thời gian gửi")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Thời gian cập nhật")

# THÊM 2 DÒNG NÀY VÀO DƯỚI CÙNG CỦA MODEL
    attachment_url = models.CharField(max_length=500, null=True, blank=True)
    attachment_type = models.CharField(
        max_length=50,
        choices=ATTACHMENT_TYPES,
        null=True,
        blank=True,
        verbose_name="Loại tệp đính kèm",
    )

    class Meta:
        # Sắp xếp mặc định theo thời gian tăng dần (Tin nhắn cũ ở trên, mới ở dưới)
        ordering = ['created_at'] 
        verbose_name = "Tin nhắn chat"
        verbose_name_plural = "Quản lý tin nhắn"

    def __str__(self):
        # Xử lý ưu tiên tên hiển thị: User đăng nhập -> Tên khách nhập -> Mặc định
        if self.sender:
            sender_name = f"{self.sender.last_name} {self.sender.first_name}".strip() or self.sender.username
        elif self.guest_name:
            sender_name = self.guest_name
        else:
            sender_name = "Khách vãng lai"

        # Nếu không có text (chỉ có ảnh), hiển thị preview là loại file
        if self.message:
            msg_preview = self.message[:30] + ('...' if len(self.message) > 30 else '')
        elif self.attachment:
            msg_preview = f"[{self.get_attachment_type_display()}]"
        else:
            msg_preview = "[Tin nhắn trống]"
            
        return f"[{self.created_at.strftime('%H:%M %d/%m')}] {sender_name}: {msg_preview}"

