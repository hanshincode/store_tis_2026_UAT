# backend/api/views.py

import time
import uuid
import random
import secrets
import json
from decimal import Decimal, InvalidOperation
from datetime import timedelta
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.storage import default_storage
from django.contrib.auth.password_validation import validate_password
from django.core.mail import EmailMultiAlternatives
from django.db import transaction, IntegrityError
from django.db.models import Q, Sum
from django.utils import timezone
from django.utils.html import escape
from rest_framework import viewsets, permissions, status, filters, mixins
from rest_framework.decorators import action, permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

# Import Models
from .models import (
    Product, ProductImage, ProductPackage, Category,
    Order, OrderItem, OrderItemSubject, News, User, EnterpriseEmployee, EmployeeInsurance,
    ConsultationRequest, ChatMessage, Cart, CartItem, Banner, BannerSlide,
    PaymentSetting, QuickCustomerForm
)

# Import Serializers
from .serializers import (
    ProductSerializer, CategorySerializer, OrderSerializer, 
    EnterpriseEmployeeSerializer, EmployeeInsuranceSerializer, RegisterSerializer, 
    CartItemSerializer, OrderItemSerializer,
    ProductPackageSerializer, ConsultationRequestSerializer, NewsSerializer,
    UserSerializer, PhoneTokenObtainPairSerializer, BannerSerializer, BannerSlideSerializer,
    PaymentSettingSerializer, QuickCustomerFormSerializer, QuickCustomerFormPublicSerializer,
    validate_vietnam_phone
)

# --- PHÂN QUYỀN TÙY CHỈNH (INTERNAL) ---

class IsTISAdminOrStaff(permissions.BasePermission):
    """
    Quyền truy cập dành cho cấp quản trị. Staff có phạm vi riêng ở từng ViewSet nghiệp vụ.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and \
               (request.user.is_superuser or request.user.role in ['super_admin', 'admin'])


class IsTISInternalUser(permissions.BasePermission):
    """Quyền đăng nhập khu vực nội bộ: admin, leader, staff."""
    def has_permission(self, request, view):
        return is_internal_staff(request.user)


def make_order_code():
    return f"ORD-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"


def make_otp():
    return f"{random.randint(100000, 999999)}"


def make_temporary_password():
    return f"TIS{random.randint(100000, 999999)}"


def get_frontend_base_url(request):
    configured_url = getattr(settings, 'FRONTEND_BASE_URL', '').strip()
    if configured_url:
        return configured_url.rstrip('/')

    origin = request.headers.get('Origin') or request.headers.get('Referer')
    if origin:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(origin)
            return f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            pass
    return getattr(settings, 'FRONTEND_BASE_URL', 'http://127.0.0.1:5500')


def send_tis_action_email(user, subject, intro, otp, action_url, action_label, purpose_text):
    display_name = user.get_full_name() or user.username or user.email
    safe_display_name = escape(display_name)
    safe_subject = escape(subject)
    safe_intro = escape(intro)
    safe_otp = escape(otp)
    safe_action_url = escape(action_url)
    safe_action_label = escape(action_label)
    safe_purpose_text = escape(purpose_text)
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@tisbroker.local')
    text_body = (
        f"Xin chào {display_name},\n\n"
        f"{intro}\n\n"
        f"Mã OTP: {otp}\n"
        f"Bạn cũng có thể mở link sau để tiếp tục: {action_url}\n\n"
        "Mã/link có hiệu lực trong 20 phút.\n"
        "Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email."
    )
    html_body = f"""
    <!doctype html>
    <html lang="vi">
    <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,'Helvetica Neue',sans-serif;color:#1f2937;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
              <tr>
                <td style="padding:26px 30px;background:#d71920;color:#ffffff;">
                  <div style="font-size:26px;font-weight:800;letter-spacing:.5px;">TIS Broker</div>
                  <div style="font-size:14px;opacity:.92;margin-top:4px;">Insurance Broker</div>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;">
                  <h1 style="margin:0 0 12px;font-size:22px;line-height:1.35;color:#111827;">{safe_subject}</h1>
                  <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#4b5563;">Xin chào <strong>{safe_display_name}</strong>,</p>
                  <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#4b5563;">{safe_intro}</p>

                  <div style="background:#fff5f5;border:1px solid #fecdd3;border-radius:12px;padding:18px;text-align:center;margin:0 0 24px;">
                    <div style="font-size:13px;text-transform:uppercase;font-weight:700;color:#991b1b;margin-bottom:8px;">Mã OTP của bạn</div>
                    <div style="font-size:34px;letter-spacing:8px;font-weight:800;color:#d71920;">{safe_otp}</div>
                    <div style="font-size:13px;color:#6b7280;margin-top:8px;">Có hiệu lực trong 20 phút</div>
                  </div>

                  <div style="text-align:center;margin:26px 0;">
                    <a href="{safe_action_url}" style="display:inline-block;background:#d71920;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:999px;font-size:15px;">
                      {safe_action_label}
                    </a>
                  </div>

                  <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">{safe_purpose_text}</p>
                  <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">
                    Nếu nút không hoạt động, hãy sao chép đường dẫn này vào trình duyệt:<br>
                    <a href="{safe_action_url}" style="color:#d71920;word-break:break-all;">{safe_action_url}</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 30px;background:#111827;color:#d1d5db;font-size:12px;line-height:1.6;">
                  Email tự động từ TIS Broker. Vui lòng không trả lời email này.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=from_email,
        to=[user.email],
    )
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=False)


def send_quick_account_email(user, temporary_password, request):
    login_url = f"{get_frontend_base_url(request)}/login.html"
    display_name = user.get_full_name() or user.username or user.phone or user.email
    safe_display_name = escape(display_name)
    safe_password = escape(temporary_password)
    safe_login_url = escape(login_url)
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@tisbroker.local')
    text_body = (
        f"Xin chào {display_name},\n\n"
        "TIS Broker đã tạo tài khoản nhanh cho bạn từ thông tin vừa cập nhật.\n"
        f"Tài khoản/SĐT đăng nhập: {user.phone}\n"
        f"Mật khẩu tạm thời: {temporary_password}\n\n"
        f"Vui lòng đăng nhập tại {login_url} và đổi mật khẩu mới trong lần đăng nhập đầu tiên."
    )
    html_body = f"""
    <!doctype html>
    <html lang="vi">
    <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,'Helvetica Neue',sans-serif;color:#1f2937;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:28px 12px;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr><td style="padding:26px 30px;background:#d71920;color:#fff;">
              <div style="font-size:26px;font-weight:800;">TIS Broker</div>
              <div style="font-size:14px;opacity:.92;margin-top:4px;">Tài khoản khách hàng</div>
            </td></tr>
            <tr><td style="padding:30px;">
              <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Tài khoản TIS Broker của bạn</h1>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#4b5563;">Xin chào <strong>{safe_display_name}</strong>,</p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#4b5563;">Chúng tôi đã tạo tài khoản nhanh cho bạn từ thông tin vừa cập nhật.</p>
              <div style="background:#fff5f5;border:1px solid #fecdd3;border-radius:12px;padding:18px;margin:0 0 24px;">
                <div style="font-size:14px;color:#6b7280;margin-bottom:8px;">Số điện thoại đăng nhập</div>
                <div style="font-size:20px;font-weight:800;color:#111827;">{escape(user.phone or '')}</div>
                <div style="font-size:14px;color:#6b7280;margin:16px 0 8px;">Mật khẩu tạm thời</div>
                <div style="font-size:24px;font-weight:800;color:#d71920;letter-spacing:2px;">{safe_password}</div>
              </div>
              <div style="text-align:center;margin:26px 0;">
                <a href="{safe_login_url}" style="display:inline-block;background:#d71920;color:#fff;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:999px;font-size:15px;">Đăng nhập và đổi mật khẩu</a>
              </div>
              <p style="margin:14px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">Vì lý do bảo mật, hệ thống sẽ yêu cầu bạn đặt mật khẩu mới trong lần đăng nhập đầu tiên.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """
    email = EmailMultiAlternatives(
        subject="Tài khoản TIS Broker của bạn",
        body=text_body,
        from_email=from_email,
        to=[user.email],
    )
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=False)


def issue_email_verification(user, request):
    user.email_verification_otp = make_otp()
    user.email_verification_token = secrets.token_urlsafe(32)
    user.email_verification_expires_at = timezone.now() + timedelta(minutes=20)
    user.save(update_fields=['email_verification_otp', 'email_verification_token', 'email_verification_expires_at'])

    verify_link = f"{get_frontend_base_url(request)}/verify-email.html?token={user.email_verification_token}&email={user.email}"
    send_tis_action_email(
        user=user,
        subject="Xác minh tài khoản TIS Broker",
        intro="Vui lòng xác minh email để kích hoạt tài khoản và bắt đầu sử dụng hệ thống.",
        otp=user.email_verification_otp,
        action_url=verify_link,
        action_label="Xác minh tài khoản",
        purpose_text="Bạn có thể nhập mã OTP trên trang xác minh hoặc bấm nút phía trên để xác minh nhanh.",
    )


def issue_password_reset(user, request):
    user.password_reset_otp = make_otp()
    user.password_reset_token = secrets.token_urlsafe(32)
    user.password_reset_expires_at = timezone.now() + timedelta(minutes=20)
    user.save(update_fields=['password_reset_otp', 'password_reset_token', 'password_reset_expires_at'])

    reset_link = f"{get_frontend_base_url(request)}/reset-password.html?token={user.password_reset_token}&email={user.email}"
    send_tis_action_email(
        user=user,
        subject="Khôi phục mật khẩu TIS Broker",
        intro="Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.",
        otp=user.password_reset_otp,
        action_url=reset_link,
        action_label="Đặt lại mật khẩu",
        purpose_text="Bạn có thể nhập mã OTP trên trang khôi phục hoặc bấm nút phía trên để tạo mật khẩu mới.",
    )


def build_payment_reference(order_code):
    return f"PAY-{order_code.replace('ORD-', '')}"


def get_payment_timeout_minutes():
    return PaymentSetting.get_solo().payment_timeout_minutes or 15


def get_payment_expires_at():
    return timezone.now() + timedelta(minutes=get_payment_timeout_minutes())


def build_payment_url(request, order):
    return f"{get_frontend_base_url(request)}/user/payment.html?token={order.payment_token}"


def send_payment_link_email(order, request):
    if not order.user.email:
        return "Khách hàng chưa có email."

    payment_url = build_payment_url(request, order)
    display_name = order.user.get_full_name() or order.user.username or order.user.phone or "Khách hàng"
    safe_display_name = escape(display_name)
    safe_order_code = escape(order.code)
    safe_payment_url = escape(payment_url)
    total_display = f"{int(order.total_amount):,}".replace(",", ".")
    expires_display = timezone.localtime(order.payment_expires_at).strftime("%d/%m/%Y %H:%M") if order.payment_expires_at else "--"
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@tisbroker.local')

    text_body = (
        f"Xin chào {display_name},\n\n"
        f"TIS Broker đã tạo lại QR thanh toán cho đơn {order.code}.\n"
        f"Tổng tiền: {total_display} đ\n"
        f"Hạn thanh toán: {expires_display}\n"
        f"Link thanh toán: {payment_url}\n\n"
        "Vui lòng mở link và quét QR để hoàn tất thanh toán."
    )
    html_body = f"""
    <!doctype html>
    <html lang="vi">
    <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,'Helvetica Neue',sans-serif;color:#1f2937;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
              <tr>
                <td style="padding:26px 30px;background:#d71920;color:#ffffff;">
                  <div style="font-size:26px;font-weight:800;">TIS Broker</div>
                  <div style="font-size:14px;opacity:.92;margin-top:4px;">Thanh toán đơn hàng</div>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;">
                  <h1 style="margin:0 0 12px;font-size:22px;line-height:1.35;color:#111827;">QR thanh toán mới cho đơn {safe_order_code}</h1>
                  <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#4b5563;">Xin chào <strong>{safe_display_name}</strong>,</p>
                  <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#4b5563;">TIS Broker đã tạo lại QR thanh toán cho đơn hàng của bạn.</p>
                  <div style="background:#fff5f5;border:1px solid #fecdd3;border-radius:12px;padding:18px;margin:0 0 24px;">
                    <div style="font-size:14px;color:#6b7280;margin-bottom:8px;">Tổng tiền</div>
                    <div style="font-size:24px;font-weight:800;color:#d71920;">{total_display} đ</div>
                    <div style="font-size:13px;color:#6b7280;margin-top:10px;">Hạn thanh toán: {escape(expires_display)}</div>
                  </div>
                  <div style="text-align:center;margin:26px 0;">
                    <a href="{safe_payment_url}" style="display:inline-block;background:#d71920;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:999px;font-size:15px;">Mở trang thanh toán</a>
                  </div>
                  <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">
                    Nếu nút không hoạt động, hãy sao chép đường dẫn này vào trình duyệt:<br>
                    <a href="{safe_payment_url}" style="color:#d71920;word-break:break-all;">{safe_payment_url}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    email = EmailMultiAlternatives(
        subject=f"QR thanh toán mới cho đơn {order.code}",
        body=text_body,
        from_email=from_email,
        to=[order.user.email],
    )
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=False)
    return None


def user_can_access_order(user, order):
    if order.user == user or is_admin_user(user):
        return True
    if user.role == 'staff':
        return order.processed_by_id == user.id
    return False


def validate_order_subjects(order):
    errors = []
    items = order.items.select_related('package__product__category').prefetch_related(
        'subjects', 'package__product__category__subject_fields'
    )
    for item in items:
        fields = list(item.package.product.category.subject_fields.all())
        if not fields:
            continue
        subjects = {subject.index: subject for subject in item.subjects.all()}
        for index in range(1, int(item.quantity or 1) + 1):
            subject = subjects.get(index)
            if not subject:
                errors.append(f"{item.package.product.name}: thiếu thông tin đối tượng {index}.")
                continue
            for field in fields:
                if not field.is_required:
                    continue
                value = (subject.data or {}).get(field.field_key)
                if value in [None, '']:
                    errors.append(f"{item.package.product.name} - đối tượng {index}: thiếu {field.label}.")
    return errors


def is_admin_user(user):
    return bool(
        user.is_authenticated and (
            user.is_superuser or user.role in ['super_admin', 'admin']
        )
    )


def is_internal_staff(user):
    return bool(
        user.is_authenticated and (
            user.is_superuser or user.is_staff or user.role in ['super_admin', 'admin', 'leader', 'staff']
        )
    )


def get_staff_category_ids(user):
    if not user.is_authenticated or user.role not in ['leader', 'staff']:
        return []
    category_ids = list(user.specialized_categories.values_list('id', flat=True))
    if not category_ids and user.specialization:
        category_ids = list(Category.objects.filter(specialization_code=user.specialization).values_list('id', flat=True))
    return category_ids


def leader_consultation_filter(user):
    category_ids = get_staff_category_ids(user)
    if not category_ids:
        return Q(pk__in=[])
    return Q(product__category_id__in=category_ids) | Q(category_id__in=category_ids)


def staff_consultation_filter(user, include_claimable=False):
    query = Q(processor=user) | Q(assigned_staff=user)
    if include_claimable:
        category_ids = get_staff_category_ids(user)
        if category_ids:
            query |= (
                Q(processor__isnull=True, assigned_staff__isnull=True)
                & (Q(product__category_id__in=category_ids) | Q(category_id__in=category_ids))
            )
    return query


def staff_customer_ids(user):
    if user.role == 'leader':
        query = leader_consultation_filter(user)
    else:
        query = staff_consultation_filter(user)
    return ConsultationRequest.objects.filter(query, user__isnull=False).values_list('user_id', flat=True).distinct()


def user_can_access_consultation(user, consultation):
    if is_admin_user(user):
        return True
    if user.role == 'leader':
        return ConsultationRequest.objects.filter(
            pk=consultation.pk
        ).filter(leader_consultation_filter(user)).exists()
    if user.role == 'staff':
        return ConsultationRequest.objects.filter(
            pk=consultation.pk
        ).filter(staff_consultation_filter(user)).exists()
    return consultation.user_id == user.id


def find_customer_consultation(customer):
    queryset = ConsultationRequest.objects.filter(user=customer)
    if customer.phone:
        queryset = queryset | ConsultationRequest.objects.filter(customer_contact__icontains=customer.phone)
    return queryset.order_by('-updated_at', '-created_at').first()


def broadcast_chat_message(consultation, message):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    sender = message.sender
    sender_name = "TIS Broker"
    if sender:
        sender_name = f"CSKH {sender.last_name} {sender.first_name}".strip() or sender.username
    async_to_sync(channel_layer.group_send)(
        f"chat_{consultation.id}",
        {
            "type": "chat_message",
            "message": message.message,
            "sender_name": sender_name,
            "is_staff_reply": True,
            "created_at": timezone.localtime(message.created_at).strftime("%H:%M"),
            "avatar": sender.avatar.url if sender and getattr(sender, "avatar", None) else None,
            "attachment_url": None,
            "attachment_type": None,
            "is_read": False,
        }
    )


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


def parse_money(value, default=None):
    if value in [None, '']:
        return default
    try:
        number = Decimal(str(value).replace('.', '').replace(',', '').strip())
    except (InvalidOperation, AttributeError):
        raise ValueError("Giá tiền không hợp lệ")
    if number < 0:
        raise ValueError("Giá tiền không được âm")
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
        if self.action in ['me', 'set_password', 'retrieve', 'update', 'partial_update']:
            return [permissions.IsAuthenticated()]
        return [IsTISAdminOrStaff()]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return User.objects.none()
        user = self.request.user
        queryset = User.objects.all()
        if is_admin_user(user):
            return queryset
        if user.is_authenticated and user.role in ['leader', 'staff']:
            allowed_customer_ids = list(staff_customer_ids(user))
            return queryset.filter(Q(id=user.id) | Q(id__in=allowed_customer_ids))
        if user.is_authenticated:
            return queryset.filter(id=user.id)
        return User.objects.none()

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

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        if user.id != request.user.id and not is_admin_user(request.user):
            return Response({"detail": "Bạn không có quyền xem tài khoản này."}, status=status.HTTP_403_FORBIDDEN)
        return Response(UserSerializer(user, context={'request': request}).data)

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        if user.id != request.user.id and not is_admin_user(request.user):
            return Response({"detail": "Bạn không có quyền cập nhật tài khoản này."}, status=status.HTTP_403_FORBIDDEN)
        partial = kwargs.pop('partial', False)
        data = request.data.copy()
        if not is_admin_user(request.user):
            for protected_field in ['role', 'is_staff', 'is_superuser', 'is_active', 'specialization', 'specialized_categories']:
                data.pop(protected_field, None)
        if user.id == request.user.id and user.role == 'customer':
            if user.user_type == 'enterprise':
                data.pop('email', None)
                data.pop('company_name', None)
            elif user.user_type == 'individual':
                data['company_name'] = ''
        serializer = UserSerializer(user, data=data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
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
        user.must_change_password = False
        if not user.email_verified:
            user.email_verified = True
            user.is_active = True
        user.save(update_fields=[
            'password', 'password_reset_otp', 'password_reset_token',
            'password_reset_expires_at', 'must_change_password', 'email_verified', 'is_active'
        ])
        return Response({"detail": "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới."})

    @action(detail=False, methods=['get'], url_path='staff-list')
    def staff_list(self, request):
        if not (is_admin_user(request.user) or request.user.role == 'leader'):
            return Response({"detail": "Bạn không có quyền xem danh sách nhân sự."}, status=status.HTTP_403_FORBIDDEN)
        users = User.objects.filter(role__in=['super_admin', 'admin', 'leader', 'staff']).order_by('role', 'username')
        if request.user.role == 'leader' and not is_admin_user(request.user):
            category_ids = get_staff_category_ids(request.user)
            users = users.filter(role='staff', specialized_categories__id__in=category_ids).distinct()
        return Response(UserSerializer(users, many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path='enterprise-list')
    def enterprise_list(self, request):
        if not is_admin_user(request.user):
            return Response({"detail": "Bạn không có quyền xem danh sách doanh nghiệp."}, status=status.HTTP_403_FORBIDDEN)
        users = User.objects.filter(role='customer', user_type='enterprise').order_by('company_name', 'username')
        return Response(UserSerializer(users, many=True, context={'request': request}).data)

    @action(detail=False, methods=['post'], url_path='create-staff')
    def create_staff(self, request):
        if not (request.user.is_superuser or request.user.role in ['super_admin', 'admin']):
            return Response({"detail": "Bạn không có quyền tạo nhân sự."}, status=status.HTTP_403_FORBIDDEN)

        username = (request.data.get('username') or '').strip()
        password = request.data.get('password') or ''
        full_name = (request.data.get('full_name') or '').strip()
        email = (request.data.get('email') or '').strip().lower()
        role = request.data.get('role') if request.data.get('role') in ['admin', 'leader', 'staff'] else 'staff'
        specialized_category_ids = request.data.get('specialized_categories') or []
        if isinstance(specialized_category_ids, str):
            try:
                specialized_category_ids = json.loads(specialized_category_ids)
            except json.JSONDecodeError:
                specialized_category_ids = [item.strip() for item in specialized_category_ids.split(',') if item.strip()]

        if not username or not password:
            return Response({"detail": "Vui lòng nhập tài khoản và mật khẩu."}, status=status.HTTP_400_BAD_REQUEST)
        if role in ['leader', 'staff'] and not specialized_category_ids:
            return Response({"detail": "Vui lòng chọn ít nhất một danh mục quản lý/chuyên môn."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            phone = validate_vietnam_phone(username)
        except Exception as exc:
            detail = getattr(exc, 'detail', None)
            if isinstance(detail, list) and detail:
                detail = str(detail[0])
            elif detail:
                detail = str(detail)
            else:
                detail = str(exc)
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"detail": "Tài khoản đã tồn tại."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(phone=phone).exists():
            return Response({"detail": "Số điện thoại này đã được sử dụng cho tài khoản khác."}, status=status.HTTP_400_BAD_REQUEST)
        if email and User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "Email này đã được sử dụng cho tài khoản khác."}, status=status.HTTP_400_BAD_REQUEST)

        name_parts = full_name.split(maxsplit=1)
        first_name = name_parts[-1] if name_parts else ''
        last_name = name_parts[0] if len(name_parts) > 1 else ''

        try:
            user = User.objects.create_user(
                username=phone,
                phone=phone,
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
        except IntegrityError:
            return Response({"detail": "Số điện thoại hoặc email đã tồn tại. Vui lòng kiểm tra lại thông tin."}, status=status.HTTP_400_BAD_REQUEST)

        if role in ['leader', 'staff']:
            categories = Category.objects.filter(id__in=specialized_category_ids)
            if categories.count() != len(set(map(str, specialized_category_ids))):
                user.delete()
                return Response({"detail": "Danh mục quản lý/chuyên môn không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)
            user.specialized_categories.set(categories)

        return Response(UserSerializer(user, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='role-rules')
    def role_rules(self, request, pk=None):
        if not is_admin_user(request.user):
            return Response({"detail": "Bạn không có quyền phân role/rule nhân sự."}, status=status.HTTP_403_FORBIDDEN)

        user = self.get_object()
        if user.id == request.user.id:
            return Response({"detail": "Không thể tự thay đổi role/rule tài khoản đang đăng nhập."}, status=status.HTTP_400_BAD_REQUEST)
        if user.role == 'customer' and not user.is_staff:
            return Response({"detail": "Chỉ được phân quyền cho nhân sự nội bộ."}, status=status.HTTP_400_BAD_REQUEST)

        role = request.data.get('role')
        if role not in ['admin', 'leader', 'staff']:
            return Response({"detail": "Vai trò không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

        specialized_category_ids = request.data.get('specialized_categories') or []
        if isinstance(specialized_category_ids, str):
            try:
                specialized_category_ids = json.loads(specialized_category_ids)
            except json.JSONDecodeError:
                specialized_category_ids = [item.strip() for item in specialized_category_ids.split(',') if item.strip()]

        if role in ['leader', 'staff'] and not specialized_category_ids:
            return Response({"detail": "Leader/Staff cần ít nhất một danh mục được phân quyền."}, status=status.HTTP_400_BAD_REQUEST)

        categories = Category.objects.none()
        if role in ['leader', 'staff']:
            categories = Category.objects.filter(id__in=specialized_category_ids)
            if categories.count() != len(set(map(str, specialized_category_ids))):
                return Response({"detail": "Danh mục phân quyền không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

        raw_is_active = request.data.get('is_active', user.is_active)
        if isinstance(raw_is_active, str):
            is_active = raw_is_active.lower() in ['1', 'true', 'yes', 'on']
        else:
            is_active = bool(raw_is_active)

        user.role = role
        user.is_staff = True
        user.is_active = is_active
        user.save(update_fields=['role', 'is_staff', 'is_active'])
        if role in ['leader', 'staff']:
            user.specialized_categories.set(categories)
        else:
            user.specialized_categories.clear()
        return Response(UserSerializer(user, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role in ['super_admin', 'admin']):
            return Response({"detail": "Bạn không có quyền cập nhật trạng thái nhân sự."}, status=status.HTTP_403_FORBIDDEN)

        user = self.get_object()
        if user.id == request.user.id:
            return Response({"detail": "Không thể tự khóa tài khoản đang đăng nhập."}, status=status.HTTP_400_BAD_REQUEST)
        if user.role not in ['super_admin', 'admin', 'leader', 'staff'] and not user.is_staff:
            return Response({"detail": "Chỉ được cập nhật tài khoản nhân sự."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response(UserSerializer(user, context={'request': request}).data)

    @action(detail=True, methods=['get'], url_path='account-overview')
    def account_overview(self, request, pk=None):
        if not is_internal_staff(request.user):
            return Response({"detail": "Bạn không có quyền xem thông tin tài khoản."}, status=status.HTTP_403_FORBIDDEN)

        user = self.get_object()
        if request.user.role in ['leader', 'staff'] and user.id not in staff_customer_ids(request.user) and user.id != request.user.id:
            return Response({"detail": "Bạn không có quyền xem khách hàng này."}, status=status.HTTP_403_FORBIDDEN)
        orders = Order.objects.filter(user=user).order_by('-created_at')
        consultations = ConsultationRequest.objects.filter(user=user).order_by('-created_at')
        if request.user.role == 'leader':
            consultations = consultations.filter(leader_consultation_filter(request.user))
            orders = orders.filter(items__package__product__category_id__in=get_staff_category_ids(request.user)).distinct()
        elif request.user.role == 'staff':
            orders = orders.filter(processed_by=request.user)
            consultations = consultations.filter(staff_consultation_filter(request.user))
        messages_count = ChatMessage.objects.filter(sender=user).count()
        orders_total = orders.aggregate(total=Sum('total_amount')).get('total') or 0

        return Response({
            "account": UserSerializer(user, context={'request': request}).data,
            "stats": {
                "orders_count": orders.count(),
                "orders_total": orders_total,
                "consultations_count": consultations.count(),
                "messages_count": messages_count,
            },
            "orders": OrderSerializer(orders[:20], many=True, context={'request': request}).data,
            "consultations": ConsultationRequestSerializer(consultations[:20], many=True, context={'request': request}).data,
        })

    @action(detail=True, methods=['post'], url_path='require-reverification')
    def require_reverification(self, request, pk=None):
        if not (request.user.is_superuser or request.user.role in ['super_admin', 'admin']):
            return Response({"detail": "Bạn không có quyền khóa xác minh tài khoản."}, status=status.HTTP_403_FORBIDDEN)

        user = self.get_object()
        if user.id == request.user.id:
            return Response({"detail": "Không thể khóa xác minh chính tài khoản đang đăng nhập."}, status=status.HTTP_400_BAD_REQUEST)
        if not user.email:
            return Response({"detail": "Tài khoản chưa có email nên không thể gửi xác minh lại."}, status=status.HTTP_400_BAD_REQUEST)

        user.email_verified = False
        user.is_active = False
        user.save(update_fields=['email_verified', 'is_active'])
        issue_email_verification(user, request)
        return Response({
            "detail": "Đã khóa tạm thời tài khoản và gửi email yêu cầu xác minh lại.",
            "account": UserSerializer(user, context={'request': request}).data
        })

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
        request.user.must_change_password = False
        request.user.save(update_fields=['password', 'must_change_password'])
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


class QuickCustomerFormViewSet(viewsets.ModelViewSet):
    serializer_class = QuickCustomerFormSerializer

    def get_permissions(self):
        if self.action in ['public_form', 'submit']:
            return [permissions.AllowAny()]
        return [IsTISInternalUser()]

    def get_queryset(self):
        queryset = QuickCustomerForm.objects.select_related('category', 'created_by', 'user')
        user = self.request.user
        if is_admin_user(user):
            return queryset
        if user.role == 'leader':
            return queryset.filter(category_id__in=get_staff_category_ids(user))
        if user.role == 'staff':
            return queryset.filter(Q(created_by=user) | Q(category_id__in=get_staff_category_ids(user)))
        return queryset.none()

    def create(self, request, *args, **kwargs):
        category_id = request.data.get('category')
        category = Category.objects.filter(id=category_id).first()
        if not category:
            return Response({"detail": "Vui lòng chọn danh mục hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role in ['leader', 'staff'] and category.id not in get_staff_category_ids(request.user):
            return Response({"detail": "Bạn không có quyền tạo form cho danh mục này."}, status=status.HTTP_403_FORBIDDEN)

        expires_days = request.data.get('expires_days') or 7
        try:
            expires_days = max(1, min(30, int(expires_days)))
        except (TypeError, ValueError):
            expires_days = 7

        form = QuickCustomerForm.objects.create(
            category=category,
            created_by=request.user,
            customer_name=(request.data.get('customer_name') or '').strip(),
            phone=(request.data.get('phone') or '').strip(),
            email=(request.data.get('email') or '').strip().lower(),
            expires_at=timezone.now() + timedelta(days=expires_days),
        )
        return Response(QuickCustomerFormSerializer(form, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='public')
    def public_form(self, request):
        token = (request.query_params.get('token') or '').strip()
        form = QuickCustomerForm.objects.select_related('category').filter(token=token).first()
        if not form:
            return Response({"detail": "Link form không hợp lệ."}, status=status.HTTP_404_NOT_FOUND)
        if form.is_expired:
            if form.status != 'expired':
                form.status = 'expired'
                form.save(update_fields=['status'])
            return Response({"detail": "Link form đã hết hạn."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(QuickCustomerFormPublicSerializer(form, context={'request': request}).data)

    @action(detail=False, methods=['post'], url_path='submit')
    def submit(self, request):
        token = (request.data.get('token') or request.query_params.get('token') or '').strip()
        form = QuickCustomerForm.objects.select_related('category', 'created_by').filter(token=token).first()
        if not form:
            return Response({"detail": "Link form không hợp lệ."}, status=status.HTTP_404_NOT_FOUND)
        if form.status == 'submitted':
            return Response({"detail": "Form này đã được gửi trước đó."}, status=status.HTTP_400_BAD_REQUEST)
        if form.is_expired:
            form.status = 'expired'
            form.save(update_fields=['status'])
            return Response({"detail": "Link form đã hết hạn."}, status=status.HTTP_400_BAD_REQUEST)

        full_name = (request.data.get('customer_name') or form.customer_name or '').strip()
        email = (request.data.get('email') or form.email or '').strip().lower()
        try:
            phone = validate_vietnam_phone(request.data.get('phone') or form.phone)
        except Exception as exc:
            detail = getattr(exc, 'detail', None)
            if isinstance(detail, list) and detail:
                detail = str(detail[0])
            elif detail:
                detail = str(detail)
            else:
                detail = str(exc)
            return Response({"phone": [detail]}, status=status.HTTP_400_BAD_REQUEST)
        if not email:
            return Response({"email": ["Vui lòng nhập email để nhận mật khẩu tạm thời."]}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(phone=phone).exists():
            return Response({"phone": ["Số điện thoại này đã có tài khoản. Vui lòng đăng nhập hoặc dùng khôi phục mật khẩu."]}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"email": ["Email này đã có tài khoản. Vui lòng đăng nhập hoặc dùng khôi phục mật khẩu."]}, status=status.HTTP_400_BAD_REQUEST)

        submitted_data, errors = self._collect_quick_form_data(form, request)
        if errors:
            return Response({"fields": errors}, status=status.HTTP_400_BAD_REQUEST)

        temporary_password = make_temporary_password()
        name_parts = full_name.split(maxsplit=1)
        with transaction.atomic():
            user = User.objects.create_user(
                username=phone,
                phone=phone,
                email=email,
                password=temporary_password,
                first_name=name_parts[-1] if name_parts else '',
                last_name=name_parts[0] if len(name_parts) > 1 else '',
                role='customer',
                user_type=request.data.get('user_type') or 'individual',
                is_active=True,
                email_verified=True,
                must_change_password=True,
            )
            form.user = user
            form.customer_name = full_name
            form.phone = phone
            form.email = email
            form.data = submitted_data
            form.status = 'submitted'
            form.submitted_at = timezone.now()
            form.save(update_fields=['user', 'customer_name', 'phone', 'email', 'data', 'status', 'submitted_at'])

            assigned_staff = form.created_by if form.created_by and form.created_by.role == 'staff' else None
            ConsultationRequest.objects.create(
                category=form.category,
                user=user,
                customer_name=full_name or phone,
                customer_contact=f"{phone} / {email}",
                note=json.dumps({
                    "source": "quick_customer_form",
                    "quick_form_id": form.id,
                    "category": form.category.name,
                    "data": submitted_data,
                }, ensure_ascii=False),
                assigned_staff=assigned_staff,
                status='processed' if assigned_staff else 'new',
            )

        warning = None
        try:
            send_quick_account_email(user, temporary_password, request)
        except Exception as exc:
            warning = f"Đã tạo tài khoản nhưng chưa gửi được email mật khẩu: {exc}"

        return Response({
            "detail": "Đã gửi thông tin thành công. Tài khoản đăng nhập đã được tạo và mật khẩu tạm thời được gửi qua email.",
            "login_phone": phone,
            "warning": warning,
        }, status=status.HTTP_201_CREATED)

    def _collect_quick_form_data(self, form, request):
        raw_data = request.data.get('data') or {}
        if isinstance(raw_data, str):
            try:
                raw_data = json.loads(raw_data)
            except json.JSONDecodeError:
                raw_data = {}

        payload = {}
        errors = {}
        for field in form.category.subject_fields.all():
            key = field.field_key
            value = raw_data.get(key, request.data.get(key, ''))
            if field.field_type == 'file':
                uploaded = request.FILES.get(key)
                if uploaded:
                    path = default_storage.save(f"quick_forms/{form.token}/{uploaded.name}", uploaded)
                    value = default_storage.url(path)
            if field.is_required and value in [None, '']:
                errors[key] = f"Vui lòng nhập {field.label}."
                continue
            payload[key] = value
        return payload, errors

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
        queryset = Order.objects.select_related('user').prefetch_related(
            'items__package__product__category',
            'items__package__product__category__subject_fields',
            'items__package__product__images',
            'items__subjects',
        )
        if is_admin_user(user):
            return queryset.order_by('-created_at')
        if user.role == 'staff':
            return queryset.filter(processed_by=user).order_by('-created_at')
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
                payment_expires_at=get_payment_expires_at(),
                code=order_code,
                payment_reference=build_payment_reference(order_code),
            )
            OrderItem.objects.create(order=order, package=package, quantity=quantity, unit_price=package.price)
            return Response(OrderSerializer(order, context={'request': request}).data, status=status.HTTP_201_CREATED)
        except (ValueError, ProductPackage.DoesNotExist) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def checkout_cart(self, request):
        try:
            cart = Cart.objects.get(user=request.user)
            items = cart.items.select_related('package__product')
            
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
                    payment_expires_at=get_payment_expires_at(),
                    code=order_code,
                    payment_reference=build_payment_reference(order_code),
                )
                
                # Chuyển CartItem thành OrderItem
                for item in items:
                    OrderItem.objects.create(
                        order=order, 
                        package=item.package, 
                        quantity=item.quantity,
                        unit_price=item.package.price,
                    )
                
                # Xóa sạch giỏ hàng sau khi tạo đơn
                items.delete()

            return Response(OrderSerializer(order, context={'request': request}).data, status=status.HTTP_201_CREATED)
        except Cart.DoesNotExist:
            return Response({"error": "Không tìm thấy giỏ hàng"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='create-for-customer')
    def create_for_customer(self, request):
        if not (is_admin_user(request.user) or request.user.role == 'staff'):
            return Response({"detail": "Bạn không có quyền tạo đơn cho khách hàng."}, status=status.HTTP_403_FORBIDDEN)

        customer_id = request.data.get('customer_id') or request.data.get('user_id')
        customer_phone = (request.data.get('customer_phone') or request.data.get('phone') or '').strip()
        customer = None
        if customer_id:
            customer = User.objects.filter(id=customer_id, role='customer').first()
        if not customer and customer_phone:
            customer = User.objects.filter(phone=customer_phone, role='customer').first()
        if not customer:
            return Response({"detail": "Không tìm thấy tài khoản khách hàng."}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.role == 'staff':
            consultation_id = request.data.get('consultation_id')
            allowed_consultations = ConsultationRequest.objects.filter(
                staff_consultation_filter(request.user),
                user=customer,
            )
            if consultation_id:
                allowed_consultations = allowed_consultations.filter(id=consultation_id)
            if not allowed_consultations.exists():
                return Response({"detail": "Bạn chỉ được tạo đơn cho khách hàng đang được mình tư vấn."}, status=status.HTTP_403_FORBIDDEN)

        raw_items = request.data.get('items') or []
        if not isinstance(raw_items, list) or not raw_items:
            return Response({"detail": "Vui lòng chọn ít nhất một sản phẩm."}, status=status.HTTP_400_BAD_REQUEST)

        prepared_items = []
        total_amount = 0
        try:
            for raw_item in raw_items:
                package_id = raw_item.get('package_id') or raw_item.get('package')
                quantity = parse_positive_int(raw_item.get('quantity', 1))
                package = ProductPackage.objects.select_related('product').get(id=package_id)
                unit_price = parse_money(raw_item.get('unit_price', raw_item.get('price')), package.price)
                if package.product.is_price_hidden and unit_price in [None, 0]:
                    return Response({"detail": f"Vui lòng nhập giá tiền cho {package.product.name}."}, status=status.HTTP_400_BAD_REQUEST)
                prepared_items.append((package, quantity, unit_price))
                total_amount += unit_price * quantity
        except (ValueError, ProductPackage.DoesNotExist) as exc:
            return Response({"detail": str(exc) or "Sản phẩm hoặc số lượng không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

        add_to_cart = request.data.get('add_to_cart', True)
        send_chat = request.data.get('send_chat', True)
        beneficiary_note = request.data.get('beneficiary_note') or ''
        order_code = make_order_code()

        with transaction.atomic():
            order = Order.objects.create(
                user=customer,
                total_amount=total_amount,
                status='awaiting_payment',
                payment_status='unpaid',
                payment_expires_at=get_payment_expires_at(),
                code=order_code,
                payment_reference=build_payment_reference(order_code),
                processed_by=request.user,
                beneficiary_note=beneficiary_note,
            )

            cart = None
            if add_to_cart:
                cart, _ = Cart.objects.get_or_create(user=customer)

            for package, quantity, unit_price in prepared_items:
                OrderItem.objects.create(order=order, package=package, quantity=quantity, unit_price=unit_price)
                if cart:
                    cart_item, created = CartItem.objects.get_or_create(
                        cart=cart,
                        package=package,
                        defaults={'quantity': quantity}
                    )
                    if not created:
                        cart_item.quantity += quantity
                        cart_item.save(update_fields=['quantity'])

            chat_message = None
            consultation = None
            if send_chat:
                consultation_id = request.data.get('consultation_id')
                if consultation_id:
                    consultation = ConsultationRequest.objects.filter(id=consultation_id).first()
                if not consultation:
                    consultation = find_customer_consultation(customer)
                if consultation:
                    item_summary = ', '.join(
                        f"{package.product.name} ({package.duration_label}) x{quantity}"
                        for package, quantity, unit_price in prepared_items[:3]
                    )
                    if len(prepared_items) > 3:
                        item_summary += f" và {len(prepared_items) - 3} sản phẩm khác"
                    payment_link = f"/user/payment.html?token={order.payment_token}"
                    total_display = f"{int(order.total_amount):,}".replace(",", ".")
                    chat_message = ChatMessage.objects.create(
                        consultation=consultation,
                        sender=request.user,
                        message=(
                            f"TIS Broker đã tạo đơn {order.code} cho bạn.\n"
                            f"Sản phẩm: {item_summary}\n"
                            f"Tổng tiền: {total_display} đ\n"
                            f"Trạng thái: Chờ thanh toán. QR có hiệu lực trong {get_payment_timeout_minutes()} phút.\n"
                            f"Bấm vào đây để tiến hành thanh toán: {payment_link}"
                        ),
                        is_staff_reply=True,
                    )

        if chat_message and consultation:
            broadcast_chat_message(consultation, chat_message)

        return Response(OrderSerializer(order, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='payment-detail')
    def payment_detail(self, request):
        token = (request.query_params.get('token') or '').strip()
        if not token:
            return Response({"detail": "Thiếu mã thanh toán."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            payment_token = uuid.UUID(token)
        except (TypeError, ValueError):
            return Response({"detail": "Mã thanh toán không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.select_related('user').prefetch_related(
            'items__package__product__category',
            'items__package__product__category__subject_fields',
            'items__package__product__images',
            'items__subjects',
        ).filter(payment_token=payment_token).first()
        if not order:
            return Response({"detail": "Không tìm thấy đơn thanh toán."}, status=status.HTTP_404_NOT_FOUND)
        if order.user != request.user and request.user.role not in ['admin', 'super_admin', 'staff']:
            return Response({"detail": "Bạn không có quyền xem đơn thanh toán này."}, status=status.HTTP_403_FORBIDDEN)
        if order.is_payment_expired:
            order.status = 'payment_expired'
            order.payment_status = 'expired'
            order.save(update_fields=['status', 'payment_status'])
        return Response(OrderSerializer(order, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='renew-payment')
    def renew_payment(self, request, pk=None):
        order = self.get_object()
        if not (is_admin_user(request.user) or request.user.role == 'staff'):
            return Response({"detail": "Bạn không có quyền tạo lại QR thanh toán."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == 'staff' and order.processed_by_id != request.user.id:
            return Response({"detail": "Bạn chỉ được tạo lại QR cho đơn do mình phụ trách."}, status=status.HTTP_403_FORBIDDEN)

        if order.payment_status == 'paid':
            return Response({"detail": "Đơn này đã thanh toán, không thể tạo lại QR."}, status=status.HTTP_400_BAD_REQUEST)

        if order.status not in ['payment_expired', 'awaiting_payment'] and order.payment_status != 'expired':
            return Response({"detail": "Chỉ tạo lại QR cho đơn hết hạn hoặc đang chờ thanh toán."}, status=status.HTTP_400_BAD_REQUEST)

        def request_bool(name, default=False):
            value = request.data.get(name, default)
            if isinstance(value, bool):
                return value
            return str(value).strip().lower() in ['1', 'true', 'yes', 'on']

        send_email = request_bool('send_email', False)
        send_chat = request_bool('send_chat', False)

        order.status = 'awaiting_payment'
        order.payment_status = 'unpaid'
        order.payment_paid_at = None
        order.payment_expires_at = get_payment_expires_at()
        order.payment_token = uuid.uuid4()
        order.payment_reference = order.payment_reference or build_payment_reference(order.code)
        order.save(update_fields=[
            'status', 'payment_status', 'payment_paid_at',
            'payment_expires_at', 'payment_token', 'payment_reference'
        ])

        warnings = []
        sent = {"email": False, "chat": False}
        payment_url = build_payment_url(request, order)
        total_display = f"{int(order.total_amount):,}".replace(",", ".")

        if send_email:
            try:
                warning = send_payment_link_email(order, request)
                if warning:
                    warnings.append(warning)
                else:
                    sent["email"] = True
            except Exception as exc:
                warnings.append(f"Không gửi được email: {exc}")

        if send_chat:
            consultation_id = request.data.get('consultation_id')
            consultation = ConsultationRequest.objects.filter(id=consultation_id).first() if consultation_id else None
            if not consultation:
                consultation = find_customer_consultation(order.user)
            if consultation:
                chat_message = ChatMessage.objects.create(
                    consultation=consultation,
                    sender=request.user,
                    message=(
                        f"TIS Broker đã tạo lại QR thanh toán cho đơn {order.code}.\n"
                        f"Tổng tiền: {total_display} đ\n"
                        f"Hạn thanh toán: {timezone.localtime(order.payment_expires_at).strftime('%d/%m/%Y %H:%M') if order.payment_expires_at else '--'}\n"
                        f"Bấm vào đây để tiến hành thanh toán: {payment_url}"
                    ),
                    is_staff_reply=True,
                )
                broadcast_chat_message(consultation, chat_message)
                sent["chat"] = True
            else:
                warnings.append("Không tìm thấy phiên chat hỗ trợ của khách hàng.")

        return Response({
            "detail": "Đã tạo lại QR thanh toán.",
            "sent": sent,
            "warnings": warnings,
            "order": OrderSerializer(order, context={'request': request}).data,
        })

    @action(detail=True, methods=['post'], url_path='subjects')
    def save_subjects(self, request, pk=None):
        order = self.get_object()
        if not user_can_access_order(request.user, order):
            return Response({"detail": "Bạn không có quyền cập nhật thông tin đơn này."}, status=status.HTTP_403_FORBIDDEN)

        if order.payment_status == 'paid':
            return Response({"detail": "Đơn đã thanh toán, không thể sửa thông tin đối tượng."}, status=status.HTTP_400_BAD_REQUEST)

        payload = request.data.get('payload')
        if payload:
            try:
                payload = json.loads(payload)
            except (TypeError, ValueError, json.JSONDecodeError):
                return Response({"detail": "Dữ liệu đối tượng không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            payload = request.data

        item_payloads = payload.get('items') if isinstance(payload, dict) else None
        if not isinstance(item_payloads, list):
            return Response({"detail": "Thiếu danh sách thông tin đối tượng."}, status=status.HTTP_400_BAD_REQUEST)

        order_items = {
            item.id: item for item in order.items.select_related('package__product__category').prefetch_related(
                'package__product__category__subject_fields'
            )
        }

        with transaction.atomic():
            for item_data in item_payloads:
                try:
                    item_id = int(item_data.get('order_item_id'))
                except (TypeError, ValueError):
                    return Response({"detail": "Mã sản phẩm trong đơn không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

                item = order_items.get(item_id)
                if not item:
                    return Response({"detail": "Sản phẩm không thuộc đơn hàng này."}, status=status.HTTP_400_BAD_REQUEST)

                configured_fields = {field.field_key: field for field in item.package.product.category.subject_fields.all()}
                subjects = item_data.get('subjects') or []
                if configured_fields and len(subjects) != int(item.quantity or 1):
                    return Response({"detail": f"{item.package.product.name} cần {item.quantity} đối tượng được bảo hiểm."}, status=status.HTTP_400_BAD_REQUEST)

                item.subjects.all().delete()
                for raw_subject in subjects:
                    index = int(raw_subject.get('index') or 1)
                    data = raw_subject.get('data') or {}
                    clean_data = {}
                    for field_key, field in configured_fields.items():
                        value = data.get(field_key)
                        upload_key = f"file_{item.id}_{index}_{field_key}"
                        upload = request.FILES.get(upload_key)
                        if upload:
                            saved_path = default_storage.save(f"subject_files/order_{order.id}/{upload.name}", upload)
                            value = default_storage.url(saved_path)
                        if field.is_required and value in [None, '']:
                            return Response({"detail": f"Vui lòng nhập {field.label} cho đối tượng {index}."}, status=status.HTTP_400_BAD_REQUEST)
                        if value not in [None, '']:
                            clean_data[field_key] = value

                    OrderItemSubject.objects.create(
                        order_item=item,
                        index=index,
                        label=raw_subject.get('label') or f"Đối tượng {index}",
                        data=clean_data,
                    )

        order.refresh_from_db()
        return Response(OrderSerializer(order, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def confirm_payment(self, request, pk=None):
        order = self.get_object()

        if not user_can_access_order(request.user, order):
            return Response({"detail": "Bạn không có quyền cập nhật thanh toán đơn này."}, status=status.HTTP_403_FORBIDDEN)

        if order.payment_status == 'paid':
            return Response(OrderSerializer(order, context={'request': request}).data)

        if order.is_payment_expired:
            order.status = 'payment_expired'
            order.payment_status = 'expired'
            order.save(update_fields=['status', 'payment_status'])
            return Response({"detail": "QR thanh toán đã hết hạn. Vui lòng tạo đơn mới."}, status=status.HTTP_400_BAD_REQUEST)

        subject_errors = validate_order_subjects(order)
        if subject_errors:
            return Response({
                "detail": "Vui lòng nhập đầy đủ thông tin đối tượng được bảo hiểm trước khi thanh toán.",
                "errors": subject_errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        order.payment_status = 'paid'
        order.payment_paid_at = timezone.now()
        order.status = 'pending'
        order.save(update_fields=['payment_status', 'payment_paid_at', 'status'])
        return Response(OrderSerializer(order, context={'request': request}).data)




class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EnterpriseEmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return EnterpriseEmployee.objects.none()
        if not self.request.user.is_authenticated:
            return EnterpriseEmployee.objects.none()

        queryset = EnterpriseEmployee.objects.select_related('enterprise', 'user').prefetch_related('coverages__package__product__category', 'coverages__order')
        user = self.request.user
        if is_admin_user(user):
            enterprise_id = self.request.query_params.get('enterprise')
            if enterprise_id:
                queryset = queryset.filter(enterprise_id=enterprise_id)
            return queryset.order_by('enterprise__company_name', 'full_name')
        if user.role == 'staff':
            queryset = queryset.filter(enterprise_id__in=staff_customer_ids(user))
            enterprise_id = self.request.query_params.get('enterprise')
            if enterprise_id:
                queryset = queryset.filter(enterprise_id=enterprise_id)
            return queryset.order_by('enterprise__company_name', 'full_name')
        if user.user_type == 'enterprise':
            return queryset.filter(enterprise=user).order_by('full_name')
        return queryset.filter(user=user).order_by('enterprise__company_name')

    def perform_create(self, serializer):
        enterprise = self._resolve_enterprise()
        employee_user = self._resolve_or_create_employee_user()
        serializer.save(enterprise=enterprise, user=employee_user)

    def _resolve_enterprise(self):
        request = self.request
        if is_admin_user(request.user):
            enterprise_id = request.data.get('enterprise') or request.data.get('enterprise_id')
            enterprise = User.objects.filter(id=enterprise_id, user_type='enterprise').first()
            if not enterprise:
                raise DjangoValidationError("Vui lòng chọn doanh nghiệp hợp lệ.")
            return enterprise
        if request.user.role == 'staff':
            enterprise_id = request.data.get('enterprise') or request.data.get('enterprise_id')
            enterprise = User.objects.filter(id=enterprise_id, user_type='enterprise').first()
            if not enterprise or enterprise.id not in staff_customer_ids(request.user):
                raise DjangoValidationError("Bạn chỉ được thêm nhân viên cho doanh nghiệp đang được mình tư vấn.")
            return enterprise
        if request.user.user_type != 'enterprise':
            raise DjangoValidationError("Chỉ doanh nghiệp hoặc admin/staff được thêm nhân viên.")
        return request.user

    def _resolve_or_create_employee_user(self):
        phone = (self.request.data.get('phone') or '').strip()
        if not phone:
            raise DjangoValidationError("Vui lòng nhập số điện thoại nhân viên.")
        full_name = (self.request.data.get('full_name') or '').strip()
        email = (self.request.data.get('email') or '').strip()
        password = self.request.data.get('password') or self.request.data.get('temporary_password') or phone[-6:].rjust(6, '0')
        user = User.objects.filter(phone=phone).first() or User.objects.filter(username=phone).first()
        if user:
            return user
        name_parts = full_name.split(maxsplit=1)
        return User.objects.create_user(
            username=phone,
            phone=phone,
            password=password,
            email=email,
            first_name=name_parts[-1] if name_parts else '',
            last_name=name_parts[0] if len(name_parts) > 1 else '',
            role='customer',
            user_type='individual',
            is_active=True,
            email_verified=True,
        )

    @action(detail=False, methods=['get'], url_path='my-coverages')
    def my_coverages(self, request):
        queryset = EmployeeInsurance.objects.select_related('employee__enterprise', 'package__product__category', 'order')
        if request.user.user_type == 'enterprise':
            queryset = queryset.filter(employee__enterprise=request.user)
        else:
            queryset = queryset.filter(employee__user=request.user)
        return Response(EmployeeInsuranceSerializer(queryset, many=True, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='add-coverage')
    def add_coverage(self, request, pk=None):
        employee = self.get_object()
        if not (
            is_admin_user(request.user)
            or (request.user.role == 'staff' and employee.enterprise_id in staff_customer_ids(request.user))
            or employee.enterprise_id == request.user.id
        ):
            return Response({"detail": "Bạn không có quyền gắn bảo hiểm cho nhân viên này."}, status=status.HTTP_403_FORBIDDEN)

        order_item = None
        package = None
        order = None
        order_item_id = request.data.get('order_item')
        package_id = request.data.get('package')
        if order_item_id:
            order_item = OrderItem.objects.select_related('order', 'package').filter(id=order_item_id, order__user=employee.enterprise).first()
            if not order_item:
                return Response({"detail": "Sản phẩm trong đơn không hợp lệ với doanh nghiệp này."}, status=status.HTTP_400_BAD_REQUEST)
            order = order_item.order
            package = order_item.package
        elif package_id:
            package = ProductPackage.objects.filter(id=package_id).first()
            if not package:
                return Response({"detail": "Gói bảo hiểm không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"detail": "Vui lòng chọn gói bảo hiểm hoặc sản phẩm trong đơn."}, status=status.HTTP_400_BAD_REQUEST)

        coverage = EmployeeInsurance.objects.create(
            employee=employee,
            order=order,
            order_item=order_item,
            package=package,
            start_date=request.data.get('start_date') or timezone.localdate(),
            end_date=request.data.get('end_date') or None,
            status=request.data.get('status') or 'active',
            note=request.data.get('note') or '',
        )
        return Response(EmployeeInsuranceSerializer(coverage, context={'request': request}).data, status=status.HTTP_201_CREATED)
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

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        user = request.user if request.user.is_authenticated and request.user.role == 'customer' else None

        # Client không được tự truyền user để tránh giả mạo thành viên khác.
        data.pop('user', None)
        if user:
            display_name = (
                user.company_name
                or user.get_full_name()
                or user.username
                or user.phone
                or 'Khách hàng'
            )
            data['user'] = user.id
            data['customer_name'] = data.get('customer_name') or display_name
            data['customer_contact'] = data.get('customer_contact') or user.phone or user.email or ''

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get('product') and not serializer.validated_data.get('category'):
            data['category'] = serializer.validated_data['product'].category_id
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        # Nếu chưa đăng nhập (trường hợp hiếm khi lọt vào get_queryset trừ khi code lỗi) thì trả rỗng
        if self.action == 'messages':
            return ConsultationRequest.objects.all()

        if not self.request.user.is_authenticated:
            return ConsultationRequest.objects.none()

        user = self.request.user
        # Admin thấy tất cả, leader thấy danh mục được giao, staff thấy phạm vi phụ trách/chuyên môn.
        if is_admin_user(user):
            return ConsultationRequest.objects.all().order_by('-created_at')
        if user.role == 'leader':
            return ConsultationRequest.objects.filter(
                leader_consultation_filter(user)
            ).order_by('-created_at')
        if user.role == 'staff':
            include_claimable = self.request.query_params.get('scope') != 'chat'
            return ConsultationRequest.objects.filter(
                staff_consultation_filter(user, include_claimable=include_claimable)
            ).order_by('-created_at')
        return ConsultationRequest.objects.filter(user=user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def assign_processor(self, request, pk=None):
        consultation = self.get_object()
        if request.user.role == 'leader':
            return Response({"detail": "Leader chỉ phân công staff, không tiếp nhận xử lý trực tiếp."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == 'staff':
            can_claim = ConsultationRequest.objects.filter(
                pk=consultation.pk
            ).filter(staff_consultation_filter(request.user, include_claimable=True)).exists()
            if not can_claim:
                return Response({"detail": "Bạn không có quyền tiếp nhận yêu cầu tư vấn này."}, status=status.HTTP_403_FORBIDDEN)
            if consultation.processor and consultation.processor_id != request.user.id:
                return Response({"detail": "Yêu cầu này đã có staff khác tiếp nhận."}, status=status.HTTP_400_BAD_REQUEST)
            if consultation.assigned_staff and consultation.assigned_staff_id != request.user.id:
                return Response({"detail": "Yêu cầu này đã được chỉ định cho staff khác."}, status=status.HTTP_403_FORBIDDEN)
        elif not is_admin_user(request.user):
            return Response({"detail": "Bạn không có quyền tiếp nhận yêu cầu tư vấn."}, status=status.HTTP_403_FORBIDDEN)

        if not consultation.processor:
            consultation.processor = request.user
        consultation.status = 'processed'
        consultation.save(update_fields=['processor', 'status', 'updated_at'])
        return Response({"status": "assigned", "processor": request.user.username})

    @action(detail=True, methods=['post'], url_path='assign-staff')
    def assign_staff(self, request, pk=None):
        if not (is_admin_user(request.user) or request.user.role == 'leader'):
            return Response({"detail": "Bạn không có quyền chỉ định staff."}, status=status.HTTP_403_FORBIDDEN)
        consultation = self.get_object()
        if request.user.role == 'leader' and not ConsultationRequest.objects.filter(
            pk=consultation.pk
        ).filter(leader_consultation_filter(request.user)).exists():
            return Response({"detail": "Leader chỉ được chỉ định yêu cầu thuộc danh mục mình quản lý."}, status=status.HTTP_403_FORBIDDEN)
        staff_id = request.data.get('staff_id') or request.data.get('assigned_staff')
        staff = User.objects.filter(id=staff_id, role='staff', is_active=True).first()
        if not staff:
            return Response({"detail": "Staff không hợp lệ hoặc đang bị khóa."}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.role == 'leader':
            leader_category_ids = set(get_staff_category_ids(request.user))
            staff_category_ids = set(get_staff_category_ids(staff))
            consultation_category_id = consultation.category_id or (consultation.product.category_id if consultation.product_id else None)
            if consultation_category_id and consultation_category_id not in leader_category_ids:
                return Response({"detail": "Yêu cầu không thuộc danh mục leader quản lý."}, status=status.HTTP_403_FORBIDDEN)
            if not (leader_category_ids & staff_category_ids):
                return Response({"detail": "Staff không thuộc danh mục leader quản lý."}, status=status.HTTP_400_BAD_REQUEST)
            if consultation_category_id and consultation_category_id not in staff_category_ids:
                return Response({"detail": "Staff chưa được phân quyền danh mục của yêu cầu này."}, status=status.HTTP_400_BAD_REQUEST)
        consultation.assigned_staff = staff
        consultation.status = 'processed'
        consultation.save(update_fields=['assigned_staff', 'status', 'updated_at'])
        return Response(ConsultationRequestSerializer(consultation, context={'request': request}).data)

    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        consultation = self.get_object()
        if not user_can_access_consultation(request.user, consultation):
            return Response({"detail": "Bạn không có quyền xem hội thoại này."}, status=status.HTTP_403_FORBIDDEN)

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
    queryset = News.objects.all().order_by('-created_at')
    serializer_class = NewsSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTISAdminOrStaff()]
        return [permissions.AllowAny()]


class BannerViewSet(viewsets.ModelViewSet):
    queryset = Banner.objects.all().order_by('sort_order', '-created_at')
    serializer_class = BannerSerializer

    def get_queryset(self):
        queryset = Banner.objects.all().order_by('sort_order', '-created_at')
        if self.action in ['list', 'retrieve'] and not (
            self.request.user.is_authenticated
            and is_admin_user(self.request.user)
        ):
            queryset = queryset.filter(is_active=True)
        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsTISAdminOrStaff()]

    @action(detail=True, methods=['post'], url_path='slides')
    def add_slide(self, request, pk=None):
        banner = self.get_object()
        serializer = BannerSlideSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(banner=banner)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='slides/reorder')
    def reorder_slides(self, request, pk=None):
        banner = self.get_object()
        slide_ids = request.data.get('slide_ids', [])
        if not isinstance(slide_ids, list):
            return Response({"detail": "slide_ids phải là danh sách."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            slide_ids = [int(slide_id) for slide_id in slide_ids]
        except (TypeError, ValueError):
            return Response({"detail": "Danh sách slide không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

        slides = {slide.id: slide for slide in BannerSlide.objects.filter(banner=banner, id__in=slide_ids)}
        if len(slides) != len(slide_ids):
            return Response({"detail": "Danh sách slide không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

        for index, slide_id in enumerate(slide_ids):
            slide = slides.get(slide_id)
            if slide:
                slide.sort_order = index
                slide.save(update_fields=['sort_order'])
        serializer = BannerSerializer(self.get_object(), context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['patch', 'delete'], url_path='slides/(?P<slide_id>[^/.]+)')
    def slide_detail(self, request, pk=None, slide_id=None):
        banner = self.get_object()
        try:
            slide = BannerSlide.objects.get(id=slide_id, banner=banner)
        except BannerSlide.DoesNotExist:
            return Response({"detail": "Không tìm thấy slide."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'DELETE':
            slide.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = BannerSlideSerializer(slide, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PaymentSettingViewSet(viewsets.ViewSet):
    permission_classes = [IsTISAdminOrStaff]

    def list(self, request):
        setting = PaymentSetting.get_solo()
        return Response([PaymentSettingSerializer(setting, context={'request': request}).data])

    @action(detail=False, methods=['get', 'patch'], url_path='current')
    def current(self, request):
        setting = PaymentSetting.get_solo()
        if request.method == 'GET':
            return Response(PaymentSettingSerializer(setting, context={'request': request}).data)
        serializer = PaymentSettingSerializer(setting, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        setting = PaymentSetting.get_solo()
        return Response(PaymentSettingSerializer(setting, context={'request': request}).data)

    def update(self, request, pk=None):
        setting = PaymentSetting.get_solo()
        serializer = PaymentSettingSerializer(setting, data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        setting = PaymentSetting.get_solo()
        serializer = PaymentSettingSerializer(setting, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class CartViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        items = cart.items.select_related('package__product').prefetch_related('package__product__images')
        total_price = sum(item.package.price * item.quantity for item in items)
        return Response({
            "items": CartItemSerializer(items, many=True, context={'request': request}).data,
            "total_price": total_price,
            "total_items": sum(item.quantity for item in items)
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

