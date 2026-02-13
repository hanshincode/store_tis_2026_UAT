# backend/chat/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from api.models import ConsultationRequest, ChatMessage, User
from django.utils import timezone

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Lấy consultation_id từ URL (ws://.../ws/chat/<id>/)
        self.consultation_id = self.scope['url_route']['kwargs']['consultation_id']
        self.room_group_name = f'chat_{self.consultation_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Nhận tin nhắn từ WebSocket (Client gửi lên)
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        sender_id = text_data_json.get('sender_id') # ID người gửi (nếu có)
        is_staff = text_data_json.get('is_staff', False)

        # Lưu tin nhắn vào Database
        saved_message = await self.save_message(message, sender_id, is_staff)

        # Gửi tin nhắn đến Group (để các client khác cùng nhận được)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': saved_message['message'],
                'sender_name': saved_message['sender_name'],
                'is_staff_reply': saved_message['is_staff_reply'],
                'created_at': saved_message['created_at'],
                'avatar': saved_message['avatar']
            }
        )

    # Nhận tin nhắn từ Group (Server broadcast xuống)
    async def chat_message(self, event):
        # Gửi JSON xuống Client
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender_name': event['sender_name'],
            'is_staff_reply': event['is_staff_reply'],
            'created_at': event['created_at'],
            'avatar': event['avatar']
        }))

    @database_sync_to_async
    def save_message(self, message, sender_id, is_staff):
        consultation = ConsultationRequest.objects.get(id=self.consultation_id)
        sender = None
        if sender_id:
            try:
                sender = User.objects.get(id=sender_id)
            except User.DoesNotExist:
                pass

        msg = ChatMessage.objects.create(
            consultation=consultation,
            sender=sender,
            message=message,
            is_staff_reply=is_staff
        )
        
        # Format dữ liệu để trả về
        avatar_url = None
        if sender and sender.avatar:
            avatar_url = sender.avatar.url # Cần xử lý full URL nếu cần

        return {
            'message': msg.message,
            'sender_name': f"{sender.last_name} {sender.first_name}" if sender else "Khách hàng",
            'is_staff_reply': msg.is_staff_reply,
            'created_at': msg.created_at.strftime('%H:%M'),
            'avatar': avatar_url
        }