"""مدل‌های چت پشتیبانی آنلاین — مکالمه، پیام، بازدید صفحه، پاسخ آماده."""

from __future__ import annotations

import enum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ChatConversationStatus(str, enum.Enum):
    open = "open"
    closed = "closed"
    pending = "pending"


class ChatPriority(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class ChatSenderType(str, enum.Enum):
    visitor = "visitor"
    admin = "admin"
    system = "system"


class ChatMessageType(str, enum.Enum):
    text = "text"
    system = "system"
    internal = "internal"
    image = "image"
    file = "file"


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    visitor_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    customer_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    assigned_admin_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    status: Mapped[ChatConversationStatus] = mapped_column(
        Enum(ChatConversationStatus, name="chat_conversation_status", native_enum=False, length=16),
        default=ChatConversationStatus.open,
        nullable=False,
    )
    priority: Mapped[ChatPriority] = mapped_column(
        Enum(ChatPriority, name="chat_priority", native_enum=False, length=16),
        default=ChatPriority.normal,
        nullable=False,
    )
    tags: Mapped[list | None] = mapped_column(JSON, default=list)
    visitor_name: Mapped[str | None] = mapped_column(String(120))
    visitor_phone: Mapped[str | None] = mapped_column(String(20))
    visitor_email: Mapped[str | None] = mapped_column(String(255))
    current_page_url: Mapped[str | None] = mapped_column(String(512))
    current_page_title: Mapped[str | None] = mapped_column(String(255))
    visitor_online: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    visitor_last_seen_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))
    referrer_url: Mapped[str | None] = mapped_column(String(512))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    browser: Mapped[str | None] = mapped_column(String(64))
    os_name: Mapped[str | None] = mapped_column(String(64))
    device_type: Mapped[str | None] = mapped_column(String(32))
    admin_notes: Mapped[str | None] = mapped_column(Text)
    admin_unread_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    visitor_unread_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_message_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))
    last_message_preview: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    customer: Mapped["User | None"] = relationship(foreign_keys=[customer_user_id])
    assigned_admin: Mapped["User | None"] = relationship(foreign_keys=[assigned_admin_id])
    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="conversation",
        order_by="ChatMessage.created_at",
    )
    page_visits: Mapped[list["ChatPageVisit"]] = relationship(
        back_populates="conversation",
        order_by="ChatPageVisit.visited_at",
    )

    __table_args__ = (
        Index("idx_chat_conv_status_updated", "status", "updated_at"),
        Index("idx_chat_conv_customer", "customer_user_id"),
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False
    )
    sender_type: Mapped[ChatSenderType] = mapped_column(
        Enum(ChatSenderType, name="chat_sender_type", native_enum=False, length=16),
        nullable=False,
    )
    sender_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    message_type: Mapped[ChatMessageType] = mapped_column(
        Enum(ChatMessageType, name="chat_message_type", native_enum=False, length=16),
        default=ChatMessageType.text,
        nullable=False,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    attachment_key: Mapped[str | None] = mapped_column(String(512))
    attachment_name: Mapped[str | None] = mapped_column(String(255))
    read_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversation: Mapped["ChatConversation"] = relationship(back_populates="messages")
    sender: Mapped["User | None"] = relationship(foreign_keys=[sender_user_id])

    __table_args__ = (Index("idx_chat_msg_conv_created", "conversation_id", "created_at"),)


class ChatPageVisit(Base):
    __tablename__ = "chat_page_visits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False
    )
    page_url: Mapped[str] = mapped_column(String(512), nullable=False)
    page_title: Mapped[str | None] = mapped_column(String(255))
    visited_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversation: Mapped["ChatConversation"] = relationship(back_populates="page_visits")

    __table_args__ = (Index("idx_chat_page_conv_time", "conversation_id", "visited_at"),)


class ChatCannedResponse(Base):
    __tablename__ = "chat_canned_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
