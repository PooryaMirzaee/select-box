"""اسکیمای Pydantic برای چت پشتیبانی."""

from datetime import datetime

from pydantic import BaseModel, Field


class ChatMessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_type: str
    sender_user_id: int | None
    sender_name: str | None = None
    message_type: str
    body: str
    attachment_key: str | None = None
    attachment_name: str | None = None
    attachment_url: str | None = None
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatPageVisitOut(BaseModel):
    id: int
    conversation_id: int
    page_url: str
    page_title: str | None
    visited_at: datetime

    model_config = {"from_attributes": True}


class ChatConversationOut(BaseModel):
    id: int
    visitor_id: str
    customer_user_id: int | None
    assigned_admin_id: int | None
    status: str
    priority: str = "normal"
    tags: list[str] = Field(default_factory=list)
    visitor_name: str | None
    visitor_phone: str | None
    visitor_email: str | None = None
    current_page_url: str | None
    current_page_title: str | None
    visitor_online: bool
    visitor_last_seen_at: datetime | None
    referrer_url: str | None = None
    browser: str | None = None
    os_name: str | None = None
    device_type: str | None = None
    admin_notes: str | None = None
    page_visit_count: int = 0
    admin_unread_count: int
    visitor_unread_count: int
    last_message_at: datetime | None
    last_message_preview: str | None
    created_at: datetime
    updated_at: datetime
    customer_name: str | None = None
    assigned_admin_name: str | None = None

    model_config = {"from_attributes": True}


class ChatConversationListOut(BaseModel):
    items: list[ChatConversationOut]
    total: int
    unread_total: int


class ChatMessageListOut(BaseModel):
    items: list[ChatMessageOut]
    has_more: bool


class ChatPageVisitListOut(BaseModel):
    items: list[ChatPageVisitOut]
    total: int


class ChatStartIn(BaseModel):
    visitor_id: str = Field(min_length=8, max_length=64)
    visitor_name: str | None = Field(default=None, max_length=120)
    visitor_phone: str | None = Field(default=None, max_length=20)
    visitor_email: str | None = Field(default=None, max_length=255)
    page_url: str | None = Field(default=None, max_length=512)
    page_title: str | None = Field(default=None, max_length=255)
    referrer_url: str | None = Field(default=None, max_length=512)
    user_agent: str | None = Field(default=None, max_length=512)
    initial_message: str | None = Field(default=None, max_length=4000)


class ChatSendMessageIn(BaseModel):
    body: str = Field(default="", max_length=4000)
    attachment_key: str | None = Field(default=None, max_length=512)
    attachment_name: str | None = Field(default=None, max_length=255)
    message_type: str | None = None


class ChatPresenceIn(BaseModel):
    page_url: str | None = Field(default=None, max_length=512)
    page_title: str | None = Field(default=None, max_length=255)
    online: bool = True


class ChatPageVisitIn(BaseModel):
    page_url: str = Field(min_length=1, max_length=512)
    page_title: str | None = Field(default=None, max_length=255)


class ChatConversationPatchIn(BaseModel):
    status: str | None = None
    assigned_admin_id: int | None = None
    priority: str | None = None
    tags: list[str] | None = None
    admin_notes: str | None = None
    visitor_name: str | None = None
    visitor_phone: str | None = None
    visitor_email: str | None = None


class ChatVisitorPatchIn(BaseModel):
    visitor_name: str | None = Field(default=None, max_length=120)
    visitor_phone: str | None = Field(default=None, max_length=20)
    visitor_email: str | None = Field(default=None, max_length=255)


class ChatStatsOut(BaseModel):
    open_count: int
    unread_total: int
    online_visitors: int


class OnlineVisitorOut(BaseModel):
    visitor_id: str
    page_url: str | None = None
    page_title: str | None = None
    current_page_url: str | None = None
    current_page_title: str | None = None
    user_id: int | None = None
    conversation_id: int | None = None
    visitor_name: str | None = None
    visitor_phone: str | None = None
    has_chatted: bool = False
    admin_unread_count: int = 0
    connected_at: datetime | None = None
    last_seen: datetime | None = None
    online_seconds: int = 0


class OnlineVisitorListOut(BaseModel):
    items: list[OnlineVisitorOut]
    total: int


class ProactiveMessageIn(BaseModel):
    visitor_id: str = Field(min_length=8, max_length=64)
    body: str = Field(min_length=1, max_length=4000)


class ChatCannedResponseOut(BaseModel):
    id: int
    title: str
    body: str
    sort_order: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatCannedResponseIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=4000)
    sort_order: int = 0
    is_active: bool = True


class ChatExportOut(BaseModel):
    conversation_id: int
    transcript: str
    page_visits: list[ChatPageVisitOut]
