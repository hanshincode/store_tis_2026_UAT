import json
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from api.models import ConsultationRequest, ChatMessage, User
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.consultation_id = self.scope['url_route']['kwargs']['consultation_id']
        self.room_group_name = f'chat_{self.consultation_id}'
        self.scope_user = await self.get_token_user()

        if self.scope_user and not await self.user_can_access_room(self.scope_user):
            await self.close(code=4403)
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    @database_sync_to_async
    def get_token_user(self):
        query = parse_qs((self.scope.get('query_string') or b'').decode())
        token = (query.get('token') or [''])[0]
        if not token:
            return None
        try:
            access = AccessToken(token)
            return User.objects.filter(id=access.get('user_id'), is_active=True).first()
        except Exception:
            return None

    @database_sync_to_async
    def user_can_access_room(self, user):
        if user.is_superuser or user.role in ['super_admin', 'admin']:
            return True
        try:
            consultation = ConsultationRequest.objects.get(id=self.consultation_id)
        except ConsultationRequest.DoesNotExist:
            return False
        if user.role == 'staff':
            return consultation.processor_id == user.id or consultation.assigned_staff_id == user.id
        if user.role == 'leader':
            category_id = consultation.category_id or (consultation.product.category_id if consultation.product_id else None)
            if not category_id:
                return False
            return user.specialized_categories.filter(id=category_id).exists()
        return consultation.user_id == user.id

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')

        if msg_type in [
            'video_call_request', 'video_call_accept', 'video_call_reject',
            'video_offer', 'video_answer', 'video_ice_candidate', 'video_call_end'
        ]:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'video_signal',
                    'payload': data,
                }
            )
            return

        if msg_type in ['typing', 'stop_typing']:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_control',
                    'msg_type': msg_type,
                    'sender_id': data.get('sender_id'),
                    # ĐÃ SỬA: Lấy cờ is_staff từ Frontend gửi lên và đưa vào group_send
                    'is_staff': data.get('is_staff', False) 
                }
            )
            return

        message = data.get('message')
        sender_id = data.get('sender_id')
        sender_name_payload = data.get('sender_name') 
        is_staff = data.get('is_staff', False)
        # BỔ SUNG: Lấy thông tin đính kèm
        attachment_url = data.get('attachment_url')
        attachment_type = data.get('attachment_type')

        try:
            # Lưu tin nhắn và chờ kết quả
            saved_message = await self.save_message(
                message, sender_id, is_staff, sender_name_payload, attachment_url, attachment_type
            )
            
            # CHỈ KHI LƯU DB THÀNH CÔNG MỚI PHÁT (BROADCAST) ĐI
            if saved_message:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        **saved_message
                    }
                )
            else:
                print("Lỗi: Không lưu được vào DB, không broadcast.")
        except Exception as e:
            print(f"Lỗi WebSocket Receive: {e}")

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message', # ĐÃ SỬA: Bổ sung type cho chuẩn xác
            'message': event['message'],
            'sender_name': event['sender_name'],
            'is_staff_reply': event['is_staff_reply'],
            'is_staff': event['is_staff_reply'], # ĐÃ SỬA: Truyền kèm is_staff luôn để Frontend JS dễ xử lý
            'created_at': event['created_at'],
            'avatar': event['avatar'],
            'attachment_url': event.get('attachment_url'),
            'attachment_type': event.get('attachment_type'),
            'is_read': event.get('is_read')
        }))

    async def chat_control(self, event):
        await self.send(text_data=json.dumps({
            'type': event['msg_type'],
            'sender_id': event.get('sender_id'),
            # ĐÃ SỬA: Bắt buộc phải phát sóng (broadcast) cờ is_staff lại cho Frontend
            'is_staff': event.get('is_staff', False) 
        }))

    async def video_signal(self, event):
        await self.send(text_data=json.dumps(event['payload']))

    @database_sync_to_async
    def save_message(self, message, sender_id, is_staff, sender_name_payload, attachment_url, attachment_type):
        try:
            consultation = ConsultationRequest.objects.get(id=self.consultation_id)
        except ConsultationRequest.DoesNotExist:
            return None

        sender = None
        if sender_id:
            try:
                sender = User.objects.get(id=sender_id)
            except User.DoesNotExist:
                pass

        if sender and is_staff:
            if sender.is_superuser or sender.role in ['super_admin', 'admin']:
                pass
            elif sender.role == 'leader':
                category_id = consultation.category_id or (consultation.product.category_id if consultation.product_id else None)
                if not category_id or not sender.specialized_categories.filter(id=category_id).exists():
                    return None
            elif sender.role == 'staff':
                if consultation.processor_id != sender.id and consultation.assigned_staff_id != sender.id:
                    return None
            else:
                return None

        # Tạo bản ghi
# Tạo bản ghi (Đảm bảo model ChatMessage của bạn ĐÃ CÓ 2 trường này nhé)
        msg = ChatMessage.objects.create(
            consultation=consultation,
            sender=sender,
            guest_name=sender_name_payload if not sender else None, 
            message=message,
            is_staff_reply=is_staff,
            attachment_url=attachment_url,   # LƯU VÀO DB
            attachment_type=attachment_type  # LƯU VÀO DB
        )
        
        avatar_url = sender.avatar.url if sender and hasattr(sender, 'avatar') and sender.avatar else None
        
        # Xác định tên hiển thị hợp lý
        if sender:
            if is_staff:
                display_name = f"CSKH {sender.last_name} {sender.first_name}".strip()
            else:
                display_name = f"{sender.last_name} {sender.first_name}".strip() or sender.username
        else:
            # Sửa Khách vãng lai thành Khách hàng cho lịch sự
            display_name = sender_name_payload if sender_name_payload else "Khách hàng" 

        return {
            'message': msg.message,
            'sender_name': display_name,
            'is_staff_reply': msg.is_staff_reply,
            'created_at': timezone.localtime(msg.created_at).strftime('%H:%M'), 
            'avatar': avatar_url,
            'attachment_url': msg.attachment_url,   # TRẢ VỀ CHO FRONTEND RENDER
            'attachment_type': msg.attachment_type, # TRẢ VỀ CHO FRONTEND RENDER
            'is_read': False
        }
