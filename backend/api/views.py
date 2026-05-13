# backend/api/views.py

import time
import uuid
import random
import secrets
from datetime import timedelta
from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets, permissions, status, filters, mixins
from rest_framework.decorators import action, permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

# Import Models
from .models import (
    Product, ProductImage, ProductPackage, Category,
    Order, OrderItem, News, User, EnterpriseEmployee, 
    ConsultationRequest, Cart, CartItem, Banner
)

# Import Serializers
from .serializers import (
    ProductSerializer, CategorySerializer, OrderSerializer, 
    EnterpriseEmployeeSerializer, RegisterSerializer, 
    CartItemSerializer, OrderItemSerializer,
    ProductPackageSerializer, ConsultationRequestSerializer, NewsSerializer,
    UserSerializer, PhoneTokenObtainPairSerializer, BannerSerializer
)

# --- PHÂN QUYỀN TÙY CHỈNH (INTERNAL) ---

class IsTISAdminOrStaff(permissions.BasePermission):
    """
    Quyền truy cập dành cho cấp quản trị dựa trên trường 'role' trong Model User.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               (request.user.is_superuser or request.user.is_staff or request.user.role in ['super_admin', 'admin', 'staff'])


def make_order_code():
    return f"ORD-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"


def make_otp():
    return f"{random.randint(100000, 999999)}"


def get_frontend_base_url(request):
    origin = request.headers.get('Origin') or request.headers.get('Referer')
    if origin:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(origin)
            return f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            pass
    return getattr(settings, 'FRONTEND_BASE_URL', 'http://127.0.0.1:5500')


def issue_email_verification(user, request):
    user.email_verification_otp = make_otp()
    user.email_verification_token = secrets.token_urlsafe(32)
    user.email_verification_expires_at = timezone.now() + timedelta(minutes=20)
    user.save(update_fields=['email_verification_otp', 'email_verification_token', 'email_verification_expires_at'])

    verify_link = f"{get_frontend_base_url(request)}/verify-email.html?token={user.email_verification_token}&email={user.email}"
    send_mail(
        subject="Xác minh tài khoản TIS Broker",
        message=(
            f"Xin chào {user.get_full_name() or user.username},\n\n"
            f"Mã OTP xác minh tài khoản của bạn là: {user.email_verification_otp}\n"
            f"Hoặc bấm link xác minh: {verify_link}\n\n"
            "Mã/link có hiệu lực trong 20 phút."
        ),
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@tisbroker.local'),
        recipient_list=[user.email],
        fail_silently=False,
    )


def issue_password_reset(user, request):
    user.password_reset_otp = make_otp()
    user.password_reset_token = secrets.token_urlsafe(32)
    user.password_reset_expires_at = timezone.now() + timedelta(minutes=20)
    user.save(update_fields=['password_reset_otp', 'password_reset_token', 'password_reset_expires_at'])

    reset_link = f"{get_frontend_base_url(request)}/reset-password.html?token={user.password_reset_token}&email={user.email}"
    send_mail(
        subject="Khôi phục mật khẩu TIS Broker",
        message=(
            f"Xin chào {user.get_full_name() or user.username},\n\n"
            f"Mã OTP đặt lại mật khẩu của bạn là: {user.password_reset_otp}\n"
            f"Hoặc bấm link đặt lại mật khẩu: {reset_link}\n\n"
            "Mã/link có hiệu lực trong 20 phút."
        ),
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@tisbroker.local'),
        recipient_list=[user.email],
        fail_silently=False,
    )


def build_payment_reference(order_code):
    return f"PAY-{order_code.replace('ORD-', '')}"


def expire_unpaid_orders(queryset=None):
    base_queryset = queryset if queryset is not None else Order.objects.all()
    return base_queryset.filter(
        status='awaiting_payment',
        payment_status='unpaid',
        payment_expires_at__lt=timezone.now(),
    ).update(status='payment_expired', payment_status='expired')


def parse_positive_int(value, default=1, field_name="quantity"):
    try:
        number = int(value if value is not None else default)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} không hợp lệ")
    if number <= 0:
        raise ValueError(f"{field_name} phải lớn hơn 0")
    return number

# --- AUTH VIEWSETS ---

class RegisterView(viewsets.GenericViewSet, mixins.CreateModelMixin):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class PhoneTokenObtainPairView(TokenObtainPairView):
    serializer_class = PhoneTokenObtainPairSerializer

class UserViewSet(viewsets.ModelViewSet):
    """Quản lý thông tin người dùng và lấy dữ liệu cá nhân (me)"""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def get_permissions(self):
        public_actions = ['create', 'verify_email', 'resend_verification', 'forgot_password', 'reset_password']
        if self.action in public_actions or (self.action == 'messages' and self.request.method == 'GET'):
            return [permissions.AllowAny()]
        if self.action in ['me', 'set_password']:
            return [permissions.IsAuthenticated()]
        return [IsTISAdminOrStaff()]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return User.objects.none()
        return User.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return RegisterSerializer
        return UserSerializer # Serializer đầy đủ thông tin

    def create(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        issue_email_verification(user, request)
        return Response({
            "detail": "Tạo tài khoản thành công. Vui lòng kiểm tra email để xác minh tài khoản.",
            "email": user.email,
            "requires_email_verification": True,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def me(self, request):
        # Đảm bảo dùng UserSerializer ở đây
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='verify-email')
    def verify_email(self, request):
        email = (request.data.get('email') or '').strip().lower()
        otp = (request.data.get('otp') or '').strip()
        token = (request.data.get('token') or '').strip()

        user = None
        if token:
            user = User.objects.filter(email_verification_token=token).first()
        if not user and email:
            user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"detail": "Không tìm thấy tài khoản cần xác minh."}, status=status.HTTP_400_BAD_REQUEST)
        if user.email_verified:
            return Response({"detail": "Tài khoản đã được xác minh."})
        if not user.email_verification_expires_at or user.email_verification_expires_at < timezone.now():
            return Response({"detail": "Mã xác minh đã hết hạn. Vui lòng yêu cầu gửi lại mã mới."}, status=status.HTTP_400_BAD_REQUEST)
        if token:
            is_valid = secrets.compare_digest(token, user.email_verification_token or '')
        else:
            is_valid = otp and secrets.compare_digest(otp, user.email_verification_otp or '')
        if not is_valid:
            return Response({"detail": "Mã OTP hoặc link xác minh không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

        user.email_verified = True
        user.is_active = True
        user.email_verification_otp = ''
        user.email_verification_token = ''
        user.email_verification_expires_at = None
        user.save(update_fields=[
            'email_verified', 'is_active', 'email_verification_otp',
            'email_verification_token', 'email_verification_expires_at'
        ])
        return Response({"detail": "Xác minh email thành công. Bạn có thể đăng nhập ngay."})

    @action(detail=False, methods=['post'], url_path='resend-verification')
    def resend_verification(self, request):
        account = (request.data.get('email_or_phone') or request.data.get('email') or request.data.get('phone') or '').strip()
        user = User.objects.filter(email__iexact=account).first() or User.objects.filter(phone=account).first()
        if not user:
            return Response({"detail": "Không tìm thấy tài khoản."}, status=status.HTTP_400_BAD_REQUEST)
        if user.email_verified:
            return Response({"detail": "Tài khoản đã được xác minh."})
        issue_email_verification(user, request)
        return Response({"detail": "Đã gửi lại mã xác minh. Vui lòng kiểm tra email.", "email": user.email})

    @action(detail=False, methods=['post'], url_path='forgot-password')
    def forgot_password(self, request):
        account = (request.data.get('email_or_phone') or request.data.get('email') or request.data.get('phone') or '').strip()
        user = User.objects.filter(email__iexact=account).first() or User.objects.filter(phone=account).first()
        if user and user.email:
            issue_password_reset(user, request)
        return Response({
            "detail": "Nếu tài khoản tồn tại, hệ thống đã gửi email khôi phục mật khẩu.",
        })

    @action(detail=False, methods=['post'], url_path='reset-password')
    def reset_password(self, request):
        email = (request.data.get('email') or '').strip().lower()
        otp = (request.data.get('otp') or '').strip()
        token = (request.data.get('token') or '').strip()
        new_password = request.data.get('new_password') or ''

        user = None
        if token:
            user = User.objects.filter(password_reset_token=token).first()
        if not user and email:
            user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"detail": "Không tìm thấy yêu cầu khôi phục mật khẩu."}, status=status.HTTP_400_BAD_REQUEST)
        if not user.password_reset_expires_at or user.password_reset_expires_at < timezone.now():
            return Response({"detail": "Mã khôi phục đã hết hạn. Vui lòng yêu cầu gửi lại mã mới."}, status=status.HTTP_400_BAD_REQUEST)
        if token:
            is_valid = secrets.compare_digest(token, user.password_reset_token or '')
        else:
            is_valid = otp and secrets.compare_digest(otp, user.password_reset_otp or '')
        if not is_valid:
            return Response({"detail": "Mã OTP hoặc link khôi phục không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user)
        except DjangoValidationError as exc:
            return Response({"new_password": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.password_reset_otp = ''
        user.password_reset_token = ''
        user.password_reset_expires_at = None
        if not user.email_verified:
            user.email_verified = True
            user.is_active = True
        user.save(update_fields=[
            'password', 'password_reset_otp', 'password_reset_token',
            'password_reset_expires_at', 'email_verified', 'is_active'
        ])
        return Response({"detail": "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới."})

    @action(detail=False, methods=['get'], url_path='staff-list')
    def staff_list(self, request):
        users = User.objects.filter(role__in=['super_admin', 'admin', 'staff']).order_by('role', 'username')
        return Response(UserSerializer(users, many=True, context={'request': request}).data)

    @action(detail=False, methods=['post'], url_path='create-staff')
    def create_staff(self, request):
        if not (request.user.is_superuser or request.user.role in ['super_admin', 'admin']):
            return Response({"detail": "Bạn không có quyền tạo nhân sự."}, status=status.HTTP_403_FORBIDDEN)

        username = (request.data.get('username') or '').strip()
        password = request.data.get('password') or ''
        full_name = (request.data.get('full_name') or '').strip()
        email = (request.data.get('email') or '').strip()
        role = request.data.get('role') if request.data.get('role') in ['admin', 'staff'] else 'staff'

        if not username or not password:
            return Response({"detail": "Vui lòng nhập tài khoản và mật khẩu."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({"detail": "Tài khoản đã tồn tại."}, status=status.HTTP_400_BAD_REQUEST)

        name_parts = full_name.split(maxsplit=1)
        first_name = name_parts[-1] if name_parts else ''
        last_name = name_parts[0] if len(name_parts) > 1 else ''

        try:
            user = User.objects.create_user(
                username=username,
                phone=username,
                password=password,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=role,
                is_staff=True,
                is_active=True,
                email_verified=True,
            )
        except DjangoValidationError as exc:
            return Response({"detail": "; ".join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(UserSerializer(user, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role in ['super_admin', 'admin']):
            return Response({"detail": "Bạn không có quyền cập nhật trạng thái nhân sự."}, status=status.HTTP_403_FORBIDDEN)

        user = self.get_object()
        if user.id == request.user.id:
            return Response({"detail": "Không thể tự khóa tài khoản đang đăng nhập."}, status=status.HTTP_400_BAD_REQUEST)
        if user.role not in ['super_admin', 'admin', 'staff'] and not user.is_staff:
            return Response({"detail": "Chỉ được cập nhật tài khoản nhân sự."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response(UserSerializer(user, context={'request': request}).data)

    @action(detail=False, methods=['post'], url_path='set_password')
    def set_password(self, request):
        current_password = request.data.get('current_password') or ''
        new_password = request.data.get('new_password') or ''

        if not request.user.check_password(current_password):
            return Response({"current_password": ["Mật khẩu hiện tại không đúng."]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, request.user)
        except DjangoValidationError as exc:
            return Response({"new_password": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({"detail": "Đổi mật khẩu thành công."})

# --- BUSINESS VIEWSETS ---

class CategoryViewSet(viewsets.ModelViewSet):
    """Quản lý danh mục bảo hiểm"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        # Chấp nhận Admin/Super Admin/Staff thực hiện ghi dữ liệu
        return [IsTISAdminOrStaff()]

class ProductViewSet(viewsets.ModelViewSet):
    """Quản lý sản phẩm, giá phí và album ảnh"""
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'category__name', 'provider_name']

    def get_queryset(self):
        queryset = Product.objects.all().order_by('-created_at')
        category_id = self.request.query_params.get('category')
        target = self.request.query_params.get('target') or self.request.query_params.get('target_audience')

        if category_id and category_id != 'all':
            queryset = queryset.filter(category_id=category_id)

        if target in ['ind', 'ent']:
            queryset = queryset.filter(target_audience=target)

        return queryset


    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsTISAdminOrStaff()]

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Lấy danh sách sản phẩm nổi bật"""
        products = self.queryset.filter(is_featured=True)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['delete'])
    def delete_image(self, request, pk=None):
        """Xóa lẻ một tấm ảnh trong album"""
        image_id = request.data.get('image_id')
        try:
            img = ProductImage.objects.get(id=image_id, product_id=pk)
            img.delete()
            return Response({"message": "Đã xóa ảnh thành công"}, status=status.HTTP_204_NO_CONTENT)
        except ProductImage.DoesNotExist:
            return Response({"error": "Ảnh không tồn tại"}, status=status.HTTP_404_NOT_FOUND)

class OrderViewSet(viewsets.ModelViewSet):
    """Quản lý đơn hàng"""
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Order.objects.none() # Trả về list rỗng cho Swagger
    
        expire_unpaid_orders()
        user = self.request.user
        queryset = Order.objects.select_related('user').prefetch_related('items__package__product__category', 'items__package__product__images')
        if user.role in ['admin', 'super_admin', 'staff']:
            return queryset.order_by('-created_at')
        return queryset.filter(user=user).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def buy_now(self, request):
        package_id = request.data.get('package_id')
        
        try:
            quantity = parse_positive_int(request.data.get('quantity', 1))
            package = ProductPackage.objects.get(id=package_id)
            total = package.price * quantity
            order_code = make_order_code()
            
            order = Order.objects.create(
                user=request.user,
                total_amount=total,
                status='awaiting_payment',
                payment_status='unpaid',
                payment_expires_at=timezone.now() + timedelta(minutes=20),
                code=order_code,
                payment_reference=build_payment_reference(order_code),
            )
            OrderItem.objects.create(order=order, package=package, quantity=quantity)
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        except (ValueError, ProductPackage.DoesNotExist) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def checkout_cart(self, request):
        try:
            cart = Cart.objects.get(user=request.user)
            items = cart.items.all()
            
            if not items.exists():
                return Response({"error": "Giỏ hàng đang trống"}, status=status.HTTP_400_BAD_REQUEST)

            total_amount = sum(item.package.price * item.quantity for item in items)
            order_code = make_order_code()
            
            with transaction.atomic():
                order = Order.objects.create(
                    user=request.user,
                    total_amount=total_amount,
                    status='awaiting_payment',
                    payment_status='unpaid',
                    payment_expires_at=timezone.now() + timedelta(minutes=20),
                    code=order_code,
                    payment_reference=build_payment_reference(order_code),
                )
                
                # Chuyển CartItem thành OrderItem
                for item in items:
                    OrderItem.objects.create(
                        order=order, 
                        package=item.package, 
                        quantity=item.quantity
                    )
                
                # Xóa sạch giỏ hàng sau khi tạo đơn
                items.delete()

            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        except Cart.DoesNotExist:
            return Response({"error": "Không tìm thấy giỏ hàng"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def confirm_payment(self, request, pk=None):
        order = self.get_object()

        if order.user != request.user and request.user.role not in ['admin', 'super_admin', 'staff']:
            return Response({"detail": "Bạn không có quyền cập nhật thanh toán đơn này."}, status=status.HTTP_403_FORBIDDEN)

        if order.payment_status == 'paid':
            return Response(OrderSerializer(order, context={'request': request}).data)

        if order.is_payment_expired:
            order.status = 'payment_expired'
            order.payment_status = 'expired'
            order.save(update_fields=['status', 'payment_status'])
            return Response({"detail": "QR thanh toán đã hết hạn. Vui lòng tạo đơn mới."}, status=status.HTTP_400_BAD_REQUEST)

        order.payment_status = 'paid'
        order.payment_paid_at = timezone.now()
        order.status = 'pending'
        order.save(update_fields=['payment_status', 'payment_paid_at', 'status'])
        return Response(OrderSerializer(order, context={'request': request}).data)




class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EnterpriseEmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 1. Bỏ qua nếu là fake view của Swagger
        if getattr(self, 'swagger_fake_view', False):
            return EnterpriseEmployee.objects.none()

        # 2. Đảm bảo user đã đăng nhập
        if not self.request.user.is_authenticated:
            return EnterpriseEmployee.objects.none()

        # Code cũ của bạn
        return EnterpriseEmployee.objects.filter(enterprise=self.request.user)

    def perform_create(self, serializer):
        serializer.save(enterprise=self.request.user)

# backend/api/views.py
from .models import ChatMessage
from .serializers import ChatMessageSerializer

class ConsultationRequestViewSet(viewsets.ModelViewSet):
    queryset = ConsultationRequest.objects.all().order_by('-created_at') # Sắp xếp mới nhất lên đầu
    serializer_class = ConsultationRequestSerializer
    
    # --- SỬA ĐOẠN NÀY ---
    def get_permissions(self):
        # Cho phép bất kỳ ai (kể cả khách) được gửi yêu cầu (POST)
        if self.action == 'create':
            return [permissions.AllowAny()]
        # Các hành động xem/xóa/sửa thì bắt buộc phải đăng nhập
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        # Nếu chưa đăng nhập (trường hợp hiếm khi lọt vào get_queryset trừ khi code lỗi) thì trả rỗng
        if self.action == 'messages':
            return ConsultationRequest.objects.all()

        if not self.request.user.is_authenticated:
            return ConsultationRequest.objects.none()

        user = self.request.user
        # Admin/Staff thấy tất cả, User thường chỉ thấy của mình
        if user.role in ['admin', 'super_admin', 'staff']:
            return ConsultationRequest.objects.all().order_by('-created_at')
        return ConsultationRequest.objects.filter(user=user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def assign_processor(self, request, pk=None):
        consultation = self.get_object()
        if not consultation.processor:
            consultation.processor = request.user
            consultation.status = 'processed'
            consultation.save()
        return Response({"status": "assigned", "processor": request.user.username})

    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        consultation = self.get_object()

        # 1. LẤY DANH SÁCH TIN NHẮN
        if request.method == 'GET':
            messages = consultation.messages.all().order_by('created_at')
            serializer = ChatMessageSerializer(messages, many=True)
            return Response(serializer.data)

        # 2. GỬI TIN NHẮN MỚI
        if request.method == 'POST':
            message_text = request.data.get('message', '')
            attachment = request.FILES.get('attachment') # Nếu có gửi file

            if not message_text and not attachment:
                return Response({"error": "Vui lòng nhập nội dung"}, status=status.HTTP_400_BAD_REQUEST)

            # Tạo tin nhắn mới
            new_message = ChatMessage.objects.create(
                consultation=consultation,
                sender=request.user,
                message=message_text,
                attachment=attachment,
                is_staff_reply=False # Đánh dấu đây là tin nhắn của khách
            )
            
            return Response(ChatMessageSerializer(new_message).data, status=status.HTTP_201_CREATED)


class NewsViewSet(viewsets.ModelViewSet):
    queryset = News.objects.all()
    serializer_class = NewsSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'destroy']:
            return [IsTISAdminOrStaff()]
        return [permissions.AllowAny()]


class BannerViewSet(viewsets.ModelViewSet):
    queryset = Banner.objects.all().order_by('sort_order', '-created_at')
    serializer_class = BannerSerializer

    def get_queryset(self):
        queryset = Banner.objects.all().order_by('sort_order', '-created_at')
        if self.action in ['list', 'retrieve'] and not (
            self.request.user.is_authenticated
            and self.request.user.role in ['admin', 'super_admin', 'staff']
        ):
            queryset = queryset.filter(is_active=True)
        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsTISAdminOrStaff()]

class CartViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        items = cart.items.all()
        total_price = sum(item.package.price * item.quantity for item in items)
        return Response({
            "items": CartItemSerializer(items, many=True).data,
            "total_price": total_price,
            "total_items": items.count()
        })

    @action(detail=False, methods=['post'])
    def add(self, request):
        package_id = request.data.get('package_id')
        try:
            quantity = parse_positive_int(request.data.get('quantity', 1))
            cart, _ = Cart.objects.get_or_create(user=request.user)
            package = ProductPackage.objects.get(id=package_id)
            item, created = CartItem.objects.get_or_create(cart=cart, package=package)
            if not created:
                item.quantity += quantity
            item.save()
            return Response({"status": "Added to cart"})
        except ProductPackage.DoesNotExist:
             return Response({"error": "Product Package not found"}, status=404)
        except ValueError as e:
             return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=['post'])
    def update_item(self, request):
        item_id = request.data.get('item_id')
        try:
            quantity = int(request.data.get('quantity'))
            item = CartItem.objects.get(id=item_id, cart__user=request.user)
            if quantity <= 0:
                item.delete()
            else:
                item.quantity = quantity
                item.save()
            return Response({"status": "Cart updated"})
        except CartItem.DoesNotExist:
            return Response({"error": "Item not found"}, status=404)
        except (TypeError, ValueError):
            return Response({"error": "quantity không hợp lệ"}, status=400)

    @action(detail=False, methods=['post'])
    def remove(self, request):
        item_id = request.data.get('item_id')
        try:
            item = CartItem.objects.get(id=item_id, cart__user=request.user)
            item.delete()
            return Response({"status": "Đã xóa sản phẩm khỏi giỏ hàng"})
        except CartItem.DoesNotExist:
            return Response({"error": "Không tìm thấy sản phẩm trong giỏ"}, status=404)


# --- UTILITY VIEWS ---

class DashboardSummaryView(APIView):
    """Báo cáo Dashboard tổng hợp cho quản trị viên"""
    permission_classes = [IsTISAdminOrStaff]

    def get(self, request):
        total_revenue = Order.objects.filter(status='active').aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(status='pending').count()
        recent_orders = Order.objects.order_by('-created_at')[:5]

        return Response({
            "revenue": total_revenue,
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "recent_orders": OrderSerializer(recent_orders, many=True).data
        })




# backend/api/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import ConsultationRequest
from .serializers import ConsultationRequestSerializer

@api_view(['PATCH'])
@permission_classes([IsTISAdminOrStaff])
def update_consultation_status(request, pk):
    try:
        # Tìm cuộc hội thoại theo ID truyền từ URL
        consultation = ConsultationRequest.objects.get(pk=pk)
    except ConsultationRequest.DoesNotExist:
        return Response({'error': 'Không tìm thấy cuộc hội thoại'}, status=404)

    # partial=True cho phép chỉ cập nhật trường 'status' mà không cần gửi lại toàn bộ dữ liệu
    serializer = ConsultationRequestSerializer(consultation, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)
