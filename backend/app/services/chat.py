"""منطق کسب‌وکار چت پشتیبانی."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import User, UserRole
from app.models.chat import (
    ChatCannedResponse,
    ChatConversation,
    ChatConversationStatus,
    ChatMessage,
    ChatMessageType,
    ChatPageVisit,
    ChatPriority,
    ChatSenderType,
)
from app.services.storage import public_url
from app.services.user_agent import parse_user_agent as _parse_user_agent


def _preview(body: str, limit: int = 120) -> str:
    text = body.strip().replace("\n", " ")
    return text[:limit] + ("…" if len(text) > limit else "")


def _user_display(user: User | None) -> str | None:
    if user is None:
        return None
    return user.full_name or user.phone


def _page_visit_count(db: Session, conv_id: int) -> int:
    return db.scalar(select(func.count()).where(ChatPageVisit.conversation_id == conv_id)) or 0


def conversation_out(db: Session, conv: ChatConversation) -> dict:
    customer = conv.customer
    if conv.customer_user_id and customer is None:
        customer = db.get(User, conv.customer_user_id)
    admin = conv.assigned_admin
    if conv.assigned_admin_id and admin is None:
        admin = db.get(User, conv.assigned_admin_id)
    return {
        "id": conv.id,
        "visitor_id": conv.visitor_id,
        "customer_user_id": conv.customer_user_id,
        "assigned_admin_id": conv.assigned_admin_id,
        "status": conv.status.value,
        "priority": conv.priority.value if conv.priority else "normal",
        "tags": conv.tags or [],
        "visitor_name": conv.visitor_name,
        "visitor_phone": conv.visitor_phone,
        "visitor_email": conv.visitor_email,
        "current_page_url": conv.current_page_url,
        "current_page_title": conv.current_page_title,
        "visitor_online": conv.visitor_online,
        "visitor_last_seen_at": conv.visitor_last_seen_at,
        "referrer_url": conv.referrer_url,
        "browser": conv.browser,
        "os_name": conv.os_name,
        "device_type": conv.device_type,
        "admin_notes": conv.admin_notes,
        "page_visit_count": _page_visit_count(db, conv.id),
        "admin_unread_count": conv.admin_unread_count,
        "visitor_unread_count": conv.visitor_unread_count,
        "last_message_at": conv.last_message_at,
        "last_message_preview": conv.last_message_preview,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "customer_name": _user_display(customer),
        "assigned_admin_name": _user_display(admin),
    }


def message_out(db: Session, msg: ChatMessage) -> dict:
    sender_name = None
    if msg.sender_user_id:
        sender = msg.sender or db.get(User, msg.sender_user_id)
        sender_name = _user_display(sender)
    elif msg.sender_type == ChatSenderType.visitor:
        conv = msg.conversation
        sender_name = conv.visitor_name if conv else "بازدیدکننده"
    attachment_url = public_url(msg.attachment_key) if msg.attachment_key else None
    return {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "sender_type": msg.sender_type.value,
        "sender_user_id": msg.sender_user_id,
        "sender_name": sender_name,
        "message_type": msg.message_type.value,
        "body": msg.body,
        "attachment_key": msg.attachment_key,
        "attachment_name": msg.attachment_name,
        "attachment_url": attachment_url,
        "read_at": msg.read_at,
        "created_at": msg.created_at,
    }


def page_visit_out(v: ChatPageVisit) -> dict:
    return {
        "id": v.id,
        "conversation_id": v.conversation_id,
        "page_url": v.page_url,
        "page_title": v.page_title,
        "visited_at": v.visited_at,
    }


def _apply_session_meta(conv: ChatConversation, *, referrer_url: str | None, user_agent: str | None) -> None:
    if referrer_url and not conv.referrer_url:
        conv.referrer_url = referrer_url[:512]
    if user_agent and not conv.user_agent:
        conv.user_agent = user_agent[:512]
        browser, os_name, device = _parse_user_agent(user_agent)
        conv.browser = browser
        conv.os_name = os_name
        conv.device_type = device


def record_page_visit(
    db: Session,
    conv: ChatConversation,
    *,
    page_url: str,
    page_title: str | None = None,
) -> ChatPageVisit:
    now = datetime.now(timezone.utc)
    visit = ChatPageVisit(
        conversation_id=conv.id,
        page_url=page_url[:512],
        page_title=page_title[:255] if page_title else None,
        visited_at=now,
    )
    db.add(visit)
    conv.current_page_url = page_url[:512]
    if page_title:
        conv.current_page_title = page_title[:255]
    conv.visitor_last_seen_at = now
    db.commit()
    db.refresh(visit)
    return visit


def list_page_visits(db: Session, conv_id: int, *, limit: int = 200) -> tuple[list[ChatPageVisit], int]:
    total = db.scalar(select(func.count()).where(ChatPageVisit.conversation_id == conv_id)) or 0
    rows = list(
        db.scalars(
            select(ChatPageVisit)
            .where(ChatPageVisit.conversation_id == conv_id)
            .order_by(ChatPageVisit.visited_at.desc())
            .limit(limit)
        )
    )
    rows.reverse()
    return rows, int(total)


def get_or_create_conversation(
    db: Session,
    *,
    visitor_id: str,
    customer_user: User | None = None,
    visitor_name: str | None = None,
    visitor_phone: str | None = None,
    visitor_email: str | None = None,
    page_url: str | None = None,
    page_title: str | None = None,
    referrer_url: str | None = None,
    user_agent: str | None = None,
    initial_message: str | None = None,
) -> tuple[ChatConversation, ChatMessage | None]:
    now = datetime.now(timezone.utc)
    conv = db.scalar(
        select(ChatConversation)
        .where(
            ChatConversation.visitor_id == visitor_id,
            ChatConversation.status != ChatConversationStatus.closed,
        )
        .order_by(ChatConversation.updated_at.desc())
        .limit(1)
    )

    if conv is None:
        conv = ChatConversation(
            visitor_id=visitor_id,
            customer_user_id=customer_user.id if customer_user else None,
            visitor_name=visitor_name or (customer_user.full_name if customer_user else None),
            visitor_phone=visitor_phone or (customer_user.phone if customer_user else None),
            visitor_email=visitor_email or (customer_user.email if customer_user else None),
            current_page_url=page_url,
            current_page_title=page_title,
            visitor_online=True,
            visitor_last_seen_at=now,
            status=ChatConversationStatus.open,
        )
        _apply_session_meta(conv, referrer_url=referrer_url, user_agent=user_agent)
        db.add(conv)
        db.flush()
        if page_url:
            db.add(
                ChatPageVisit(
                    conversation_id=conv.id,
                    page_url=page_url[:512],
                    page_title=page_title[:255] if page_title else None,
                    visited_at=now,
                )
            )
        system_msg = _add_message(
            db,
            conv,
            sender_type=ChatSenderType.system,
            body="گفتگو شروع شد. تیم پشتیبانی به زودی پاسخ می‌دهد.",
            message_type=ChatMessageType.system,
        )
        db.commit()
        db.refresh(conv)
        first_msg = None
        if initial_message and initial_message.strip():
            first_msg = send_visitor_message(db, conv, initial_message.strip())
        return conv, first_msg or system_msg

    changed = False
    if customer_user and conv.customer_user_id != customer_user.id:
        conv.customer_user_id = customer_user.id
        changed = True
    if visitor_name and not conv.visitor_name:
        conv.visitor_name = visitor_name
        changed = True
    if visitor_phone and not conv.visitor_phone:
        conv.visitor_phone = visitor_phone
        changed = True
    if visitor_email and not conv.visitor_email:
        conv.visitor_email = visitor_email
        changed = True
    _apply_session_meta(conv, referrer_url=referrer_url, user_agent=user_agent)
    if page_url:
        conv.current_page_url = page_url
        changed = True
    if page_title:
        conv.current_page_title = page_title
        changed = True
    conv.visitor_online = True
    conv.visitor_last_seen_at = now
    if page_url:
        record_page_visit(db, conv, page_url=page_url, page_title=page_title)
    elif changed:
        db.commit()
        db.refresh(conv)
    else:
        db.commit()

    first_msg = None
    if initial_message and initial_message.strip():
        first_msg = send_visitor_message(db, conv, initial_message.strip())
    return conv, first_msg


def ensure_conversation_for_proactive(
    db: Session,
    visitor_id: str,
    *,
    page_url: str | None = None,
    page_title: str | None = None,
) -> ChatConversation:
    """گفتگو برای پیام proactive ادمین — بدون نیاز به شروع توسط بازدیدکننده."""
    now = datetime.now(timezone.utc)
    conv = db.scalar(
        select(ChatConversation)
        .where(
            ChatConversation.visitor_id == visitor_id,
            ChatConversation.status != ChatConversationStatus.closed,
        )
        .order_by(ChatConversation.updated_at.desc())
        .limit(1)
    )
    if conv:
        conv.visitor_online = True
        conv.visitor_last_seen_at = now
        if page_url:
            conv.current_page_url = page_url[:512]
        if page_title:
            conv.current_page_title = page_title[:255]
        db.commit()
        db.refresh(conv)
        return conv

    conv = ChatConversation(
        visitor_id=visitor_id,
        current_page_url=page_url,
        current_page_title=page_title,
        visitor_online=True,
        visitor_last_seen_at=now,
        status=ChatConversationStatus.open,
    )
    db.add(conv)
    db.flush()
    if page_url:
        db.add(
            ChatPageVisit(
                conversation_id=conv.id,
                page_url=page_url[:512],
                page_title=page_title[:255] if page_title else None,
                visited_at=now,
            )
        )
    db.commit()
    db.refresh(conv)
    return conv


def visitor_has_chatted(db: Session, visitor_id: str) -> bool:
    conv = db.scalar(
        select(ChatConversation)
        .where(ChatConversation.visitor_id == visitor_id)
        .order_by(ChatConversation.updated_at.desc())
        .limit(1)
    )
    if conv is None:
        return False
    count = db.scalar(
        select(func.count()).where(
            ChatMessage.conversation_id == conv.id,
            ChatMessage.sender_type == ChatSenderType.visitor,
        )
    )
    return (count or 0) > 0


def enrich_online_visitors(db: Session, visitors: list[dict]) -> list[dict]:
    out = []
    for v in visitors:
        vid = v["visitor_id"]
        conv = db.scalar(
            select(ChatConversation)
            .where(
                ChatConversation.visitor_id == vid,
                ChatConversation.status != ChatConversationStatus.closed,
            )
            .order_by(ChatConversation.updated_at.desc())
            .limit(1)
        )
        row = dict(v)
        if conv:
            row["conversation_id"] = conv.id
            row["visitor_name"] = row.get("visitor_name") or conv.visitor_name
            row["visitor_phone"] = conv.visitor_phone
            row["admin_unread_count"] = conv.admin_unread_count
            row["has_chatted"] = visitor_has_chatted(db, vid)
            row["current_page_url"] = row.get("page_url") or conv.current_page_url
            row["current_page_title"] = row.get("page_title") or conv.current_page_title
        else:
            row["conversation_id"] = None
            row["visitor_phone"] = None
            row["admin_unread_count"] = 0
            row["has_chatted"] = False
            row["current_page_url"] = row.get("page_url")
            row["current_page_title"] = row.get("page_title")
        out.append(row)
    return out


def send_visitor_message(
    db: Session,
    conv: ChatConversation,
    body: str,
    *,
    attachment_key: str | None = None,
    attachment_name: str | None = None,
    message_type: ChatMessageType = ChatMessageType.text,
) -> ChatMessage:
    msg = _add_message(
        db,
        conv,
        sender_type=ChatSenderType.visitor,
        body=body or (attachment_name or "فایل"),
        sender_user_id=conv.customer_user_id,
        message_type=message_type,
        attachment_key=attachment_key,
        attachment_name=attachment_name,
    )
    conv.admin_unread_count += 1
    if conv.status == ChatConversationStatus.pending:
        conv.status = ChatConversationStatus.open
    db.commit()
    db.refresh(msg)
    return msg


def send_admin_message(
    db: Session,
    conv: ChatConversation,
    admin: User,
    body: str,
    *,
    internal: bool = False,
    attachment_key: str | None = None,
    attachment_name: str | None = None,
    message_type: ChatMessageType | None = None,
) -> ChatMessage:
    mt = message_type or (ChatMessageType.internal if internal else ChatMessageType.text)
    msg = _add_message(
        db,
        conv,
        sender_type=ChatSenderType.admin,
        body=body or (attachment_name or "فایل"),
        sender_user_id=admin.id,
        message_type=mt,
        attachment_key=attachment_key,
        attachment_name=attachment_name,
    )
    if not internal and mt not in (ChatMessageType.internal,):
        conv.visitor_unread_count += 1
    db.commit()
    db.refresh(msg)
    return msg


def _add_message(
    db: Session,
    conv: ChatConversation,
    *,
    sender_type: ChatSenderType,
    body: str,
    sender_user_id: int | None = None,
    message_type: ChatMessageType = ChatMessageType.text,
    attachment_key: str | None = None,
    attachment_name: str | None = None,
) -> ChatMessage:
    now = datetime.now(timezone.utc)
    preview = body
    if message_type in (ChatMessageType.image, ChatMessageType.file):
        preview = f"📎 {attachment_name or body or 'فایل'}"
    msg = ChatMessage(
        conversation_id=conv.id,
        sender_type=sender_type,
        sender_user_id=sender_user_id,
        message_type=message_type,
        body=body,
        attachment_key=attachment_key,
        attachment_name=attachment_name,
    )
    db.add(msg)
    conv.last_message_at = now
    conv.last_message_preview = _preview(preview)
    conv.updated_at = now
    db.flush()
    return msg


def list_messages(
    db: Session,
    conv_id: int,
    *,
    before_id: int | None = None,
    limit: int = 50,
    include_internal: bool = False,
    q: str | None = None,
) -> tuple[list[ChatMessage], bool]:
    stmt = select(ChatMessage).where(ChatMessage.conversation_id == conv_id)
    if not include_internal:
        stmt = stmt.where(ChatMessage.message_type != ChatMessageType.internal)
    if q and q.strip():
        stmt = stmt.where(ChatMessage.body.ilike(f"%{q.strip()}%"))
    if before_id:
        stmt = stmt.where(ChatMessage.id < before_id)
    stmt = stmt.order_by(ChatMessage.id.desc()).limit(limit + 1)
    rows = list(db.scalars(stmt))
    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]
    rows.reverse()
    return rows, has_more


def list_conversations_admin(
    db: Session,
    *,
    status: str | None = None,
    q: str | None = None,
    priority: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[ChatConversation], int, int]:
    base = select(ChatConversation)
    if status:
        try:
            base = base.where(ChatConversation.status == ChatConversationStatus(status))
        except ValueError:
            pass
    if priority:
        try:
            base = base.where(ChatConversation.priority == ChatPriority(priority))
        except ValueError:
            pass
    if q and q.strip():
        term = f"%{q.strip()}%"
        base = base.where(
            or_(
                ChatConversation.visitor_name.ilike(term),
                ChatConversation.visitor_phone.ilike(term),
                ChatConversation.visitor_email.ilike(term),
                ChatConversation.last_message_preview.ilike(term),
            )
        )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    unread_total = db.scalar(
        select(func.coalesce(func.sum(ChatConversation.admin_unread_count), 0)).where(
            ChatConversation.status != ChatConversationStatus.closed
        )
    ) or 0
    rows = list(
        db.scalars(
            base.order_by(ChatConversation.updated_at.desc()).offset(offset).limit(limit)
        )
    )
    return rows, int(total), int(unread_total)


def get_conversation(db: Session, conv_id: int) -> ChatConversation | None:
    return db.get(ChatConversation, conv_id)


def get_conversation_for_visitor(db: Session, conv_id: int, visitor_id: str) -> ChatConversation | None:
    conv = db.get(ChatConversation, conv_id)
    if conv is None or conv.visitor_id != visitor_id:
        return None
    return conv


def update_presence(
    db: Session,
    conv: ChatConversation,
    *,
    page_url: str | None = None,
    page_title: str | None = None,
    online: bool = True,
) -> ChatConversation:
    now = datetime.now(timezone.utc)
    if page_url is not None:
        conv.current_page_url = page_url
    if page_title is not None:
        conv.current_page_title = page_title
    conv.visitor_online = online
    conv.visitor_last_seen_at = now
    db.commit()
    db.refresh(conv)
    return conv


def mark_read_admin(db: Session, conv: ChatConversation) -> None:
    now = datetime.now(timezone.utc)
    unread = list(
        db.scalars(
            select(ChatMessage).where(
                ChatMessage.conversation_id == conv.id,
                ChatMessage.sender_type == ChatSenderType.visitor,
                ChatMessage.read_at.is_(None),
            )
        )
    )
    for msg in unread:
        msg.read_at = now
    conv.admin_unread_count = 0
    db.commit()


def mark_read_visitor(db: Session, conv: ChatConversation) -> None:
    now = datetime.now(timezone.utc)
    unread = list(
        db.scalars(
            select(ChatMessage).where(
                ChatMessage.conversation_id == conv.id,
                ChatMessage.sender_type == ChatSenderType.admin,
                ChatMessage.message_type != ChatMessageType.internal,
                ChatMessage.read_at.is_(None),
            )
        )
    )
    for msg in unread:
        msg.read_at = now
    conv.visitor_unread_count = 0
    db.commit()


def patch_conversation(
    db: Session,
    conv: ChatConversation,
    *,
    status: str | None = None,
    assigned_admin_id: int | None = None,
    priority: str | None = None,
    tags: list[str] | None = None,
    admin_notes: str | None = None,
    visitor_name: str | None = None,
    visitor_phone: str | None = None,
    visitor_email: str | None = None,
) -> ChatConversation:
    if status is not None:
        conv.status = ChatConversationStatus(status)
    if assigned_admin_id is not None:
        conv.assigned_admin_id = assigned_admin_id
    if priority is not None:
        conv.priority = ChatPriority(priority)
    if tags is not None:
        conv.tags = tags[:20]
    if admin_notes is not None:
        conv.admin_notes = admin_notes.strip()[:5000] if admin_notes.strip() else None
    if visitor_name is not None:
        conv.visitor_name = visitor_name.strip()[:120] if visitor_name.strip() else None
    if visitor_phone is not None:
        conv.visitor_phone = visitor_phone.strip()[:20] if visitor_phone.strip() else None
    if visitor_email is not None:
        conv.visitor_email = visitor_email.strip()[:255] if visitor_email.strip() else None
    db.commit()
    db.refresh(conv)
    return conv


def chat_stats(db: Session, online_visitors: int) -> dict:
    open_count = db.scalar(
        select(func.count()).where(ChatConversation.status == ChatConversationStatus.open)
    ) or 0
    unread_total = db.scalar(
        select(func.coalesce(func.sum(ChatConversation.admin_unread_count), 0)).where(
            ChatConversation.status != ChatConversationStatus.closed
        )
    ) or 0
    return {
        "open_count": int(open_count),
        "unread_total": int(unread_total),
        "online_visitors": online_visitors,
    }


def export_conversation(db: Session, conv_id: int) -> tuple[str, list[ChatPageVisit]]:
    conv = db.get(ChatConversation, conv_id)
    if conv is None:
        raise ValueError("not_found")
    msgs, _ = list_messages(db, conv_id, limit=500, include_internal=True)
    visits, _ = list_page_visits(db, conv_id, limit=500)
    lines = [
        f"گفتگو #{conv.id}",
        f"بازدیدکننده: {conv.visitor_name or '—'} | {conv.visitor_phone or '—'}",
        f"وضعیت: {conv.status.value}",
        "—" * 40,
    ]
    for m in msgs:
        ts = m.created_at.strftime("%Y-%m-%d %H:%M") if m.created_at else ""
        who = m.sender_type.value
        lines.append(f"[{ts}] {who}: {m.body}")
    return "\n".join(lines), visits


def list_canned_responses(db: Session, *, active_only: bool = True) -> list[ChatCannedResponse]:
    stmt = select(ChatCannedResponse).order_by(ChatCannedResponse.sort_order, ChatCannedResponse.id)
    if active_only:
        stmt = stmt.where(ChatCannedResponse.is_active.is_(True))
    return list(db.scalars(stmt))


def create_canned_response(db: Session, admin: User, *, title: str, body: str, sort_order: int = 0) -> ChatCannedResponse:
    row = ChatCannedResponse(
        title=title,
        body=body,
        sort_order=sort_order,
        created_by_id=admin.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_canned_response(
    db: Session,
    canned_id: int,
    *,
    title: str | None = None,
    body: str | None = None,
    sort_order: int | None = None,
    is_active: bool | None = None,
) -> ChatCannedResponse | None:
    row = db.get(ChatCannedResponse, canned_id)
    if row is None:
        return None
    if title is not None:
        row.title = title
    if body is not None:
        row.body = body
    if sort_order is not None:
        row.sort_order = sort_order
    if is_active is not None:
        row.is_active = is_active
    db.commit()
    db.refresh(row)
    return row


def delete_canned_response(db: Session, canned_id: int) -> bool:
    row = db.get(ChatCannedResponse, canned_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def infer_message_type(mime: str, filename: str) -> ChatMessageType:
    if mime.startswith("image/") or re.search(r"\.(jpe?g|png|gif|webp)$", filename, re.I):
        return ChatMessageType.image
    return ChatMessageType.file


def is_staff(user: User) -> bool:
    return user.role in (UserRole.admin, UserRole.operator)


def seed_default_canned(db: Session) -> None:
    if db.scalar(select(ChatCannedResponse).limit(1)):
        return
    defaults = [
        ("سلام", "سلام! چطور می‌تونم کمکتون کنم؟"),
        ("منتظر باشید", "ممنون از پیام شما. لطفاً چند لحظه صبر کنید، به زودی پاسخ می‌دهم."),
        ("ساعات کاری", "ساعات پاسخگویی ما: شنبه تا پنج‌شنبه ۹ تا ۱۸"),
        ("پیگیری سفارش", "لطفاً کد پیگیری سفارش خود را ارسال کنید تا بررسی کنم."),
    ]
    for i, (title, body) in enumerate(defaults):
        db.add(ChatCannedResponse(title=title, body=body, sort_order=i))
    db.commit()
