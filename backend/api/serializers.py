from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils.html import strip_tags
from django.utils import timezone
from .models import (
    User, Product, ProductImage, ProductPackage, 
    Order, OrderItem, EnterpriseEmployee, EmployeeInsurance, ChatMessage,
    CartItem, ConsultationRequest, News, Category, Banner, BannerSlide,
    PaymentSetting, CategorySubjectField, OrderItemSubject
)

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth import authenticate
import re
import json


def normalize_vietnam_phone(value):
    phone = re.sub(r'[\s().-]+', '', (value or '').strip())
    if phone.startswith('+84'):
        phone = f"0{phone[3:]}"
    elif phone.startswith('84'):
        phone = f"0{phone[2:]}"
    return phone


def validate_vietnam_phone(value):
    phone = normalize_vietnam_phone(value)
    if not re.fullmatch(r'0(3|5|7|8|9)\d{8}', phone):
        raise serializers.ValidationError("Số điện thoại không đúng định dạng Việt Nam.")
    return phone


def format_chat_preview(content, attachment_url=''):
    if content:
        value = str(content).strip()
        for _ in range(2):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, dict) and parsed.get('kind') == 'video_call':
                    status = parsed.get('status')
                    seconds = max(0, int(parsed.get('duration_seconds') or 0))
                    if status == 'ended':
                        minutes, rest = divmod(seconds, 60)
                        duration = f"{minutes} phút {rest} giây" if minutes else f"{rest} giây"
                        return f"Cuộc gọi video đã kết thúc · {duration}"
                    if status == 'rejected':
                        return "Cuộc gọi video đã bị từ chối"
                    if status == 'missed':
                        return "Cuộc gọi video nhỡ"
                    return "Cuộc gọi video"
                if isinstance(parsed, str):
                    value = parsed
                    continue
            except (TypeError, ValueError, json.JSONDecodeError):
                pass
            break
        return value.replace('[Tá»‡p Ä‘Ã­nh kÃ¨m]', '[Tệp đính kèm]')
    return "[Tệp đính kèm]" if attachment_url else ''


# --- 1. USER & AUTH SERIALIZERS ---
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'phone', 'password', 'role', 'user_type',
            'company_name', 'tax_code', 'cccd', 'address',
            'first_name', 'last_name', 'email'
        ]
        extra_kwargs = {
            'username': {'required': False, 'allow_blank': True},
            'phone': {'required': True},
            'email': {'required': True, 'allow_blank': False},
        }

    def validate_phone(self, value):
        phone = validate_vietnam_phone(value)
        if not phone:
            raise serializers.ValidationError("Vui lòng nhập số điện thoại.")
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError("Số điện thoại đã tồn tại.")
        return phone

    def validate_email(self, value):
        email = (value or '').strip().lower()
        if not email:
            raise serializers.ValidationError("Vui lòng nhập email để xác minh tài khoản.")
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Email đã tồn tại.")
        return email

    def validate_role(self, value):
        request = self.context.get('request')
        is_internal_admin = (
            request
            and request.user.is_authenticated
            and request.user.role in ['super_admin', 'admin']
        )
        return value if is_internal_admin else 'customer'

    def create(self, validated_data):
        if not validated_data.get('username') and 'phone' in validated_data:
            validated_data['username'] = validated_data['phone']
        validated_data['is_active'] = False
        validated_data['email_verified'] = False
        user = User.objects.create_user(**validated_data)
        return user


class PhoneTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['phone'] = serializers.CharField()
        if self.username_field in self.fields:
            del self.fields[self.username_field]

    def validate(self, attrs):
        phone = (attrs.get('phone') or '').strip()
        password = attrs.get('password')
        user_obj = User.objects.filter(phone=phone).first() or User.objects.filter(username=phone).first()

        if user_obj and not user_obj.email_verified:
            raise serializers.ValidationError(
                {'detail': 'Tài khoản chưa xác minh email. Vui lòng kiểm tra email để kích hoạt.'},
                code='authorization'
            )

        user = authenticate(username=user_obj.username if user_obj else phone, password=password)
        if not user:
            raise serializers.ValidationError(
                {'detail': 'Sai số điện thoại hoặc mật khẩu.'},
                code='authorization'
            )

        self.user = user
        refresh = self.get_token(self.user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token)
        }
class EmployeeInsuranceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_phone = serializers.CharField(source='employee.phone', read_only=True)
    enterprise_name = serializers.SerializerMethodField()
    order_code = serializers.CharField(source='order.code', read_only=True)
    product_name = serializers.SerializerMethodField()
    package_name = serializers.CharField(source='package.duration_label', read_only=True)
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeInsurance
        fields = '__all__'

    def get_enterprise_name(self, obj):
        enterprise = obj.employee.enterprise
        return enterprise.company_name or enterprise.get_full_name() or enterprise.username

    def get_product_name(self, obj):
        package = obj.package or (obj.order_item.package if obj.order_item else None)
        return package.product.name if package else ''

    def get_category_name(self, obj):
        package = obj.package or (obj.order_item.package if obj.order_item else None)
        return package.product.category.name if package and package.product.category else ''


class EnterpriseEmployeeSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    enterprise_name = serializers.SerializerMethodField()
    coverages = EmployeeInsuranceSerializer(many=True, read_only=True)

    class Meta:
        model = EnterpriseEmployee
        fields = '__all__'
        read_only_fields = ['enterprise', 'user']

    def get_enterprise_name(self, obj):
        return obj.enterprise.company_name or obj.enterprise.get_full_name() or obj.enterprise.username

# --- 2. PRODUCT SERIALIZERS ---
class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image'] # ThÃªm ID Ä‘á»ƒ FE biáº¿t mÃ  gá»­i lá»‡nh xÃ³a

class ProductPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductPackage
        fields = ['id', 'duration_label', 'price', 'duration_days']

class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    packages = ProductPackageSerializer(many=True, read_only=True)
    
    # 1. Hiá»ƒn thá»‹ tÃªn danh má»¥c (Fix lá»—i N/A)
    category_name = serializers.ReadOnlyField()

    # 2. Xá»­ lÃ½ giÃ¡ (Base Price) - Field áº£o khÃ´ng cÃ³ trong Model Product
    base_price = serializers.DecimalField(max_digits=15, decimal_places=0, required=False, allow_null=True)

    # 3. Upload áº£nh má»›i (List cÃ¡c file áº£nh)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(max_length=1000000, allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )

    # 4. XÃ³a áº£nh cÅ© (List cÃ¡c ID áº£nh cáº§n xÃ³a)
    deleted_image_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Product
        fields = '__all__'

    def validate_short_description(self, value):
        """Äáº£m báº£o Detail Base chá»‰ chá»©a text thuáº§n, loáº¡i bá» HTML tags"""
        if value:
            return strip_tags(value)
        return value

    def validate_short_description_en(self, value):
        if value:
            return strip_tags(value)
        return value

    def create(self, validated_data):
        # TÃ¡ch cÃ¡c dá»¯ liá»‡u khÃ´ng thuá»™c báº£ng Product
        price = validated_data.pop('base_price', None)
        uploaded_images = validated_data.pop('uploaded_images', [])
        
        # LÆ°u Product
        product = super().create(validated_data)

        # Xá»­ lÃ½ GIÃ: Náº¿u cÃ³ nháº­p giÃ¡, táº¡o gÃ³i máº·c Ä‘á»‹nh 1 nÄƒm
        if price and price > 0 and not product.is_price_hidden:
            ProductPackage.objects.create(
                product=product,
                duration_label="1 Năm",
                duration_days=365,
                price=price
            )
        
        # Xá»­ lÃ½ áº¢NH: LÆ°u tá»«ng áº£nh vÃ o báº£ng ProductImage
        for image in uploaded_images:
            ProductImage.objects.create(product=product, image=image)

        return product

    def update(self, instance, validated_data):
        price = validated_data.pop('base_price', None)
        uploaded_images = validated_data.pop('uploaded_images', [])
        deleted_ids = validated_data.pop('deleted_image_ids', []) # Láº¥y danh sÃ¡ch ID cáº§n xÃ³a
        
        # Cáº­p nháº­t thÃ´ng tin Product
        instance = super().update(instance, validated_data)

        # Xá»­ lÃ½ XÃ“A áº¢NH CÅ¨
        if deleted_ids:
            # Chá»‰ xÃ³a áº£nh náº¿u nÃ³ thuá»™c vá» sáº£n pháº©m nÃ y (Ä‘á»ƒ báº£o máº­t)
            ProductImage.objects.filter(id__in=deleted_ids, product=instance).delete()

        # Xá»­ lÃ½ Cáº¬P NHáº¬T GIÃ
        if price is not None and not instance.is_price_hidden:
            package = instance.packages.first()
            if package:
                package.price = price
                package.save()
            else:
                # Náº¿u chÆ°a cÃ³ gÃ³i nÃ o thÃ¬ táº¡o má»›i
                ProductPackage.objects.create(
                    product=instance,
                    duration_label="1 Năm",
                    duration_days=365,
                    price=price
                )
        
        # Xá»­ lÃ½ THÃŠM áº¢NH Má»šI
        for image in uploaded_images:
            ProductImage.objects.create(product=instance, image=image)

        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # áº¨n tÃªn nhÃ  cung cáº¥p náº¿u user khÃ´ng pháº£i Admin
        is_admin = request and request.user.is_authenticated and request.user.role in ['admin', 'super_admin']
        if not is_admin:
            data.pop('provider_name', None)
        return data

class CategorySubjectFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategorySubjectField
        fields = ['id', 'label', 'field_key', 'field_type', 'is_required', 'help_text', 'sort_order']
        extra_kwargs = {'field_key': {'required': False, 'allow_blank': True}}


class CategorySerializer(serializers.ModelSerializer):
    subject_fields = CategorySubjectFieldSerializer(many=True, required=False)

    class Meta:
        model = Category
        fields = '__all__'
        extra_kwargs = {'slug': {'required': False}}

    def create(self, validated_data):
        subject_fields = validated_data.pop('subject_fields', [])
        if 'name' in validated_data and 'slug' not in validated_data:
            from django.utils.text import slugify
            validated_data['slug'] = slugify(validated_data['name'])
        category = super().create(validated_data)
        self._save_subject_fields(category, subject_fields)
        return category

    def update(self, instance, validated_data):
        subject_fields = validated_data.pop('subject_fields', None)
        category = super().update(instance, validated_data)
        if subject_fields is not None:
            category.subject_fields.all().delete()
            self._save_subject_fields(category, subject_fields)
        return category

    def _save_subject_fields(self, category, fields):
        from django.utils.text import slugify
        used_keys = set()
        for index, field in enumerate(fields or []):
            label = (field.get('label') or '').strip()
            if not label:
                continue
            base_key = slugify(field.get('field_key') or label) or f"field-{index + 1}"
            field_key = base_key
            suffix = 2
            while field_key in used_keys:
                field_key = f"{base_key}-{suffix}"
                suffix += 1
            used_keys.add(field_key)
            CategorySubjectField.objects.create(
                category=category,
                label=label,
                field_key=field_key,
                field_type=field.get('field_type') or 'text',
                is_required=field.get('is_required', True),
                help_text=field.get('help_text') or '',
                sort_order=field.get('sort_order', index),
            )

# --- 3. CART & ORDER SERIALIZERS ---
from rest_framework import serializers
from .models import CartItem

class CartItemSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source='package.duration_label', read_only=True)
    product_name = serializers.CharField(source='package.product.name', read_only=True)
    price = serializers.DecimalField(source='effective_price', max_digits=15, decimal_places=0, read_only=True)
    package_price = serializers.DecimalField(source='package.price', max_digits=15, decimal_places=0, read_only=True)
    image = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'package', 'package_name', 'product_name', 'price', 'quantity', 'subtotal', 'image']

    def get_image(self, obj):
        # Láº¥y áº£nh Ä‘áº§u tiÃªn cá»§a sáº£n pháº©m trong album
        first_image = obj.package.product.images.first()
        if first_image and first_image.image:
            return first_image.image.url
        return None

    def get_subtotal(self, obj):
        return obj.package.price * obj.quantity
    
    
    
class OrderItemSubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItemSubject
        fields = ['id', 'index', 'label', 'data', 'created_at', 'updated_at']


class OrderItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    package = serializers.IntegerField(source='package.id', read_only=True)
    product_name = serializers.CharField(source='package.product.name', read_only=True)
    category_name = serializers.CharField(source='package.product.category.name', read_only=True)
    duration = serializers.CharField(source='package.duration_label', read_only=True)
    price = serializers.DecimalField(source='package.price', max_digits=15, decimal_places=0, read_only=True)
    subtotal = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    subject_fields = serializers.SerializerMethodField()
    subjects = OrderItemSubjectSerializer(many=True, read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'package', 'product_name', 'category_name', 'duration', 'quantity', 'price', 'package_price', 'unit_price', 'subtotal', 'image', 'subject_fields', 'subjects']

    def get_subtotal(self, obj):
        return obj.effective_price * obj.quantity

    def get_image(self, obj):
        first_image = obj.package.product.images.first()
        if first_image and first_image.image:
            return first_image.image.url
        return None

    def get_subject_fields(self, obj):
        fields = obj.package.product.category.subject_fields.all()
        return CategorySubjectFieldSerializer(fields, many=True).data

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_name = serializers.SerializerMethodField()
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_type = serializers.CharField(source='user.user_type', read_only=True)
    company_name = serializers.CharField(source='user.company_name', read_only=True)
    payment_expires_at_formatted = serializers.SerializerMethodField()
    payment_remaining_seconds = serializers.SerializerMethodField()
    payment_qr_payload = serializers.SerializerMethodField()
    payment_qr_url = serializers.SerializerMethodField()
    payment_description = serializers.SerializerMethodField()
    payment_bank = serializers.SerializerMethodField()
    payment_timeout_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = '__all__'

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username or obj.user.phone or "KhÃ¡ch hÃ ng"

    def get_payment_expires_at_formatted(self, obj):
        if not obj.payment_expires_at:
            return None
        return timezone.localtime(obj.payment_expires_at).strftime("%d/%m/%Y %H:%M")

    def get_payment_remaining_seconds(self, obj):
        if not obj.payment_expires_at or obj.payment_status != 'unpaid':
            return 0
        remaining = int((obj.payment_expires_at - timezone.now()).total_seconds())
        return max(remaining, 0)

    def get_payment_qr_payload(self, obj):
        return f"TIS|{obj.code}|{int(obj.total_amount)}|{obj.payment_reference or obj.code}"

    def get_payment_qr_url(self, obj):
        return PaymentSetting.get_solo().build_qr_url(obj)

    def get_payment_description(self, obj):
        return obj.code

    def get_payment_bank(self, obj):
        setting = PaymentSetting.get_solo()
        if not setting.is_configured:
            return None
        return {
            "bank_id": setting.bank_id,
            "account_no": setting.account_no,
            "account_name": setting.account_name,
            "template": setting.template,
        }

    def get_payment_timeout_minutes(self, obj):
        return PaymentSetting.get_solo().payment_timeout_minutes


class PaymentSettingSerializer(serializers.ModelSerializer):
    is_configured = serializers.BooleanField(read_only=True)

    class Meta:
        model = PaymentSetting
        fields = [
            'id', 'bank_id', 'account_no', 'account_name', 'template',
            'payment_timeout_minutes', 'is_active', 'is_configured', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_at', 'is_configured']

    def validate_bank_id(self, value):
        value = (value or '').strip().upper()
        if not value:
            raise serializers.ValidationError("Vui lòng nhập mã ngân hàng VietQR.")
        return value

    def validate_account_no(self, value):
        value = ''.join(ch for ch in str(value or '').strip().upper() if ch.isalnum())
        if not value:
            raise serializers.ValidationError("Vui lòng nhập số tài khoản nhận tiền.")
        return value

    def validate_account_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError("Vui lòng nhập tên chủ tài khoản.")
        return value

    def validate_template(self, value):
        return (value or 'compact2').strip()

    def validate_payment_timeout_minutes(self, value):
        try:
            value = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Thời hạn QR không hợp lệ.")
        if value < 1 or value > 1440:
            raise serializers.ValidationError("Thời hạn QR phải từ 1 đến 1440 phút.")
        return value

# --- 4. CHAT & NEWS SERIALIZERS ---
# backend/api/serializers.py

class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(format="%H:%M %d/%m", read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'consultation', 'sender', 'message', 
            'is_staff_reply', 'created_at', 'sender_name', 
            'avatar', 'attachment_url', 'attachment_type'
        ]

    def get_sender_name(self, obj):
        if obj.sender:
            return f"{obj.sender.last_name} {obj.sender.first_name}".strip() or obj.sender.username
        return obj.guest_name or "KhÃ¡ch hÃ ng"

    def get_avatar(self, obj):
        # Tráº£ vá» avatar cá»§a ngÆ°á»i gá»­i (Staff hoáº·c User cÃ³ tÃ i khoáº£n)
        if obj.sender and obj.sender.avatar:
            return obj.sender.avatar.url
        return None

class ConsultationRequestSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    created_at_formatted = serializers.DateTimeField(source='created_at', format="%d/%m/%Y %H:%M", read_only=True)
    processor_name = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ConsultationRequest
        fields = '__all__'

    def get_processor_name(self, obj):
        if obj.processor:
            return f"{obj.processor.last_name} {obj.processor.first_name}".strip()
        return None

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            attachment_url = last_msg.attachment_url or (last_msg.attachment.url if last_msg.attachment else '')
            return {
                "message": format_chat_preview(last_msg.message, attachment_url),
                "attachment_url": attachment_url,
                "time": last_msg.created_at.strftime("%H:%M"),
                "created_at": last_msg.created_at.isoformat(),
                "is_staff": last_msg.is_staff_reply
            }
        return None
class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = '__all__'


class BannerSlideSerializer(serializers.ModelSerializer):
    class Meta:
        model = BannerSlide
        fields = '__all__'
        read_only_fields = ['banner']


class BannerSerializer(serializers.ModelSerializer):
    slides = BannerSlideSerializer(many=True, read_only=True)

    class Meta:
        model = Banner
        fields = '__all__'


# ThÃªm vÃ o backend/api/serializers.py
# backend/api/serializers.py

# ThÃªm vÃ o vá»‹ trÃ­ thÃ­ch há»£p (vÃ­ dá»¥ ngay sau RegisterSerializer)
class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'role', 'first_name', 'last_name',
            'full_name', 'avatar', 'is_superuser', 'is_staff', 'is_active',
            'phone', 'user_type', 'company_name', 'tax_code', 'cccd', 'address',
            'specialization', 'email_verified', 'preferred_language', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'username', 'role', 'is_superuser', 'is_staff', 'is_active', 'date_joined', 'last_login']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def validate_phone(self, value):
        if not value:
            return value
        phone = validate_vietnam_phone(value)
        queryset = User.objects.filter(phone=phone)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Số điện thoại này đã được sử dụng cho tài khoản khác.")
        return phone

    def validate_email(self, value):
        email = (value or '').strip().lower()
        if not email:
            return email
        queryset = User.objects.filter(email__iexact=email)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Email này đã được sử dụng cho tài khoản khác.")
        role = getattr(self.instance, 'role', None) or self.initial_data.get('role')
        if role in ['admin', 'staff', 'super_admin'] and not email.endswith('@tisbroker.com'):
            raise serializers.ValidationError("Nhân viên/Admin phải sử dụng email @tisbroker.com.")
        return email
