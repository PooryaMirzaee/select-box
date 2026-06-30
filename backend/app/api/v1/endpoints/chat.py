"""REST API چت — بازدیدکننده و ادمین."""

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.deps_auth import get_current_user, get_current_user_optional, require_admin
from app.db.session import get_db
from app.models import User
from app.models.chat import ChatMessageType
from app.schemas.chat import (
    ChatCannedResponseIn,
    ChatCannedResponseOut,
    ChatConversationListOut,
    ChatConversationOut,
    ChatConversationPatchIn,
    ChatExportOut,
    ChatMessageListOut,
    ChatMessageOut,
    ChatPageVisitIn,
    ChatPageVisitListOut,
    ChatPageVisitOut,
    ChatPresenceIn,
    ChatSendMessageIn,
    ChatStartIn,
    ChatStatsOut,
    OnlineVisitorListOut,
    OnlineVisitorOut,
    ProactiveMessageIn,
)
from app.services import chat as chat_service
from app.services.chat_security import (
    MAX_CHAT_FILE_BYTES,
    rate_limit_chat,
    sanitize_message_body,
    validate_attachment_key,
    validate_chat_upload,
    validate_visitor_id,
)
from app.services.upload_security import sanitize_filename
from app.services.chat_ws import chat_manager
from app.services.storage import save_upload_secure

router = APIRouter(prefix="/chat", tags=["chat"])


async def _secure_chat_upload(conv_id: int, file: UploadFile) -> dict:
    data = await file.read()
    if len(data) > MAX_CHAT_FILE_BYTES:
        raise HTTPException(status_code=400, detail="حداکثر حجم فایل ۵ مگابایت")
    storage_name, mime, ext = validate_chat_upload(
        data, file.filename or "file", file.content_type
    )
    display_name = sanitize_filename(file.filename or f"file{ext}")
    key = save_upload_secure(data, f"chat/{conv_id}", storage_name)
    mt = chat_service.infer_message_type(mime, ext)
    return {
        "attachment_key": key,
        "attachment_name": display_name,
        "message_type": mt.value,
    }


def _validated_attachment(body: ChatSendMessageIn, conv_id: int) -> tuple[str | None, str | None]:
    if not body.attachment_key:
        return None, sanitize_filename(body.attachment_name) if body.attachment_name else None
    key = validate_attachment_key(body.attachment_key, conv_id)
    name = sanitize_filename(body.attachment_name or "file")
    return key, name


def _msg_type(body: ChatSendMessageIn, conv_id: int) -> ChatMessageType:
    if body.message_type:
        try:
            return ChatMessageType(body.message_type)
        except ValueError:
            pass
    if body.attachment_key:
        key = validate_attachment_key(body.attachment_key, conv_id)
        name = body.attachment_name or key
        return chat_service.infer_message_type("", name)
    return ChatMessageType.text


@router.post("/start", response_model=ChatConversationOut)
def start_chat(
    body: ChatStartIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    rate_limit_chat(request, "chat_start", max_calls=20, window_sec=60)
    vid = validate_visitor_id(body.visitor_id)
    conv, _ = chat_service.get_or_create_conversation(
        db,
        visitor_id=vid,
        customer_user=user,
        visitor_name=body.visitor_name,
        visitor_phone=body.visitor_phone,
        visitor_email=body.visitor_email,
        page_url=body.page_url,
        page_title=body.page_title,
        referrer_url=body.referrer_url,
        user_agent=body.user_agent,
        initial_message=sanitize_message_body(body.initial_message) if body.initial_message else None,
    )
    return ChatConversationOut.model_validate(chat_service.conversation_out(db, conv))


@router.get("/conversations/{conv_id}", response_model=ChatConversationOut)
def get_conversation_visitor(
    conv_id: int,
    visitor_id: str = Query(min_length=8),
    db: Session = Depends(get_db),
):
    conv = chat_service.get_conversation_for_visitor(db, conv_id, validate_visitor_id(visitor_id))
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    return ChatConversationOut.model_validate(chat_service.conversation_out(db, conv))


@router.get("/conversations/{conv_id}/messages", response_model=ChatMessageListOut)
def list_messages_visitor(
    conv_id: int,
    visitor_id: str = Query(min_length=8),
    before_id: int | None = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    conv = chat_service.get_conversation_for_visitor(db, conv_id, validate_visitor_id(visitor_id))
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    rows, has_more = chat_service.list_messages(db, conv_id, before_id=before_id, limit=limit)
    return ChatMessageListOut(
        items=[ChatMessageOut.model_validate(chat_service.message_out(db, m)) for m in rows],
        has_more=has_more,
    )


@router.post("/conversations/{conv_id}/messages", response_model=ChatMessageOut)
async def send_message_visitor(
    conv_id: int,
    body: ChatSendMessageIn,
    request: Request,
    visitor_id: str = Query(min_length=8),
    db: Session = Depends(get_db),
):
    rate_limit_chat(request, "chat_send", max_calls=60, window_sec=60)
    conv = chat_service.get_conversation_for_visitor(db, conv_id, validate_visitor_id(visitor_id))
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    if not body.body.strip() and not body.attachment_key:
        raise HTTPException(status_code=400, detail="پیام خالی است")
    att_key, att_name = _validated_attachment(body, conv_id)
    msg = chat_service.send_visitor_message(
        db,
        conv,
        sanitize_message_body(body.body) if body.body.strip() else "",
        attachment_key=att_key,
        attachment_name=att_name,
        message_type=_msg_type(body, conv_id),
    )
    payload = chat_service.message_out(db, msg)
    await chat_manager.broadcast_conversation(
        conv_id,
        {"type": "message", "message": payload, "conversation": chat_service.conversation_out(db, conv)},
    )
    await chat_manager.broadcast_staff(
        {"type": "conversation_updated", "conversation": chat_service.conversation_out(db, conv)}
    )
    return ChatMessageOut.model_validate(payload)


@router.post("/conversations/{conv_id}/upload")
async def upload_visitor_file(
    conv_id: int,
    request: Request,
    visitor_id: str = Query(min_length=8),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    rate_limit_chat(request, "chat_upload", max_calls=10, window_sec=60)
    conv = chat_service.get_conversation_for_visitor(db, conv_id, validate_visitor_id(visitor_id))
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    return await _secure_chat_upload(conv_id, file)


@router.post("/conversations/{conv_id}/page-visit", response_model=ChatPageVisitOut)
async def record_page_visit(
    conv_id: int,
    body: ChatPageVisitIn,
    visitor_id: str = Query(min_length=8),
    db: Session = Depends(get_db),
):
    conv = chat_service.get_conversation_for_visitor(db, conv_id, validate_visitor_id(visitor_id))
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    visit = chat_service.record_page_visit(
        db, conv, page_url=body.page_url, page_title=body.page_title
    )
    out = chat_service.page_visit_out(visit)
    await chat_manager.broadcast_staff(
        {
            "type": "page_visit",
            "conversation_id": conv_id,
            "visit": out,
            "conversation": chat_service.conversation_out(db, conv),
        }
    )
    await chat_manager.send_presence(
        conv_id,
        page_url=conv.current_page_url,
        page_title=conv.current_page_title,
        online=conv.visitor_online,
    )
    return ChatPageVisitOut.model_validate(out)


@router.patch("/conversations/{conv_id}/presence", response_model=ChatConversationOut)
async def update_presence_visitor(
    conv_id: int,
    body: ChatPresenceIn,
    visitor_id: str = Query(min_length=8),
    db: Session = Depends(get_db),
):
    conv = chat_service.get_conversation_for_visitor(db, conv_id, validate_visitor_id(visitor_id))
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    conv = chat_service.update_presence(
        db,
        conv,
        page_url=body.page_url,
        page_title=body.page_title,
        online=body.online,
    )
    await chat_manager.send_presence(
        conv_id,
        page_url=conv.current_page_url,
        page_title=conv.current_page_title,
        online=conv.visitor_online,
    )
    return ChatConversationOut.model_validate(chat_service.conversation_out(db, conv))


@router.post("/conversations/{conv_id}/read")
def mark_read_visitor(
    conv_id: int,
    visitor_id: str = Query(min_length=8),
    db: Session = Depends(get_db),
):
    conv = chat_service.get_conversation_for_visitor(db, conv_id, validate_visitor_id(visitor_id))
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    chat_service.mark_read_visitor(db, conv)
    return {"ok": True}


# --- Admin endpoints ---

admin_router = APIRouter(prefix="/admin/chat", tags=["admin-chat"], dependencies=[Depends(require_admin)])


@admin_router.get("/stats", response_model=ChatStatsOut)
def admin_stats(db: Session = Depends(get_db)):
    return ChatStatsOut.model_validate(
        chat_service.chat_stats(db, chat_manager.online_visitor_count)
    )


@admin_router.get("/online-visitors", response_model=OnlineVisitorListOut)
def admin_online_visitors(db: Session = Depends(get_db)):
    raw = chat_manager.list_online_visitors()
    items = chat_service.enrich_online_visitors(db, raw)
    return OnlineVisitorListOut(
        items=[OnlineVisitorOut.model_validate(i) for i in items],
        total=len(items),
    )


@admin_router.post("/proactive", response_model=ChatMessageOut)
async def admin_proactive_message(
    body: ProactiveMessageIn,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rate_limit_chat(request, "chat_proactive", max_calls=30, window_sec=60)
    visitor_id = validate_visitor_id(body.visitor_id)
    pres_list = chat_manager.list_online_visitors()
    pres = next((p for p in pres_list if p["visitor_id"] == visitor_id), None)
    page_url = pres.get("page_url") if pres else None
    page_title = pres.get("page_title") if pres else None

    conv = chat_service.ensure_conversation_for_proactive(
        db, visitor_id, page_url=page_url, page_title=page_title
    )
    msg = chat_service.send_admin_message(db, conv, admin, sanitize_message_body(body.body))
    payload = chat_service.message_out(db, msg)
    conv_out = chat_service.conversation_out(db, conv)

    await chat_manager.update_visitor_browse(
        visitor_id, conversation_id=conv.id, has_chatted=False
    )
    delivered = await chat_manager.send_to_visitor(
        visitor_id,
        {
            "type": "proactive_message",
            "message": payload,
            "conversation": conv_out,
        },
    )
    if not delivered:
        await chat_manager.broadcast_conversation(
            conv.id,
            {"type": "message", "message": payload, "conversation": conv_out},
        )
    await chat_manager.broadcast_staff(
        {"type": "conversation_updated", "conversation": conv_out}
    )
    return ChatMessageOut.model_validate(payload)


@admin_router.get("/conversations", response_model=ChatConversationListOut)
def admin_list_conversations(
    status: str | None = None,
    priority: str | None = None,
    q: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    rows, total, unread_total = chat_service.list_conversations_admin(
        db, status=status, priority=priority, q=q, limit=limit, offset=offset
    )
    return ChatConversationListOut(
        items=[ChatConversationOut.model_validate(chat_service.conversation_out(db, r)) for r in rows],
        total=total,
        unread_total=unread_total,
    )


@admin_router.get("/conversations/{conv_id}", response_model=ChatConversationOut)
def admin_get_conversation(conv_id: int, db: Session = Depends(get_db)):
    conv = chat_service.get_conversation(db, conv_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    return ChatConversationOut.model_validate(chat_service.conversation_out(db, conv))


@admin_router.get("/conversations/{conv_id}/page-visits", response_model=ChatPageVisitListOut)
def admin_page_visits(conv_id: int, db: Session = Depends(get_db)):
    conv = chat_service.get_conversation(db, conv_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    rows, total = chat_service.list_page_visits(db, conv_id)
    return ChatPageVisitListOut(
        items=[ChatPageVisitOut.model_validate(chat_service.page_visit_out(v)) for v in rows],
        total=total,
    )


@admin_router.get("/conversations/{conv_id}/export", response_model=ChatExportOut)
def admin_export(conv_id: int, db: Session = Depends(get_db)):
    try:
        transcript, visits = chat_service.export_conversation(db, conv_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد") from None
    return ChatExportOut(
        conversation_id=conv_id,
        transcript=transcript,
        page_visits=[ChatPageVisitOut.model_validate(chat_service.page_visit_out(v)) for v in visits],
    )


@admin_router.get("/conversations/{conv_id}/messages", response_model=ChatMessageListOut)
def admin_list_messages(
    conv_id: int,
    before_id: int | None = None,
    q: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    conv = chat_service.get_conversation(db, conv_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    rows, has_more = chat_service.list_messages(
        db, conv_id, before_id=before_id, limit=limit, include_internal=True, q=q
    )
    return ChatMessageListOut(
        items=[ChatMessageOut.model_validate(chat_service.message_out(db, m)) for m in rows],
        has_more=has_more,
    )


@admin_router.post("/conversations/{conv_id}/messages", response_model=ChatMessageOut)
async def admin_send_message(
    conv_id: int,
    body: ChatSendMessageIn,
    request: Request,
    internal: bool = False,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rate_limit_chat(request, "chat_admin_send", max_calls=120, window_sec=60)
    conv = chat_service.get_conversation(db, conv_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    if not body.body.strip() and not body.attachment_key:
        raise HTTPException(status_code=400, detail="پیام خالی است")
    att_key, att_name = _validated_attachment(body, conv_id)
    mt = ChatMessageType.internal if internal else _msg_type(body, conv_id)
    msg = chat_service.send_admin_message(
        db,
        conv,
        admin,
        sanitize_message_body(body.body) if body.body.strip() else "",
        internal=internal,
        attachment_key=att_key,
        attachment_name=att_name,
        message_type=mt,
    )
    payload = chat_service.message_out(db, msg)
    if not internal:
        await chat_manager.broadcast_conversation(
            conv_id,
            {"type": "message", "message": payload, "conversation": chat_service.conversation_out(db, conv)},
        )
    await chat_manager.broadcast_staff(
        {"type": "conversation_updated", "conversation": chat_service.conversation_out(db, conv)}
    )
    return ChatMessageOut.model_validate(payload)


@admin_router.post("/conversations/{conv_id}/upload")
async def admin_upload_file(
    conv_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    rate_limit_chat(request, "chat_upload", max_calls=30, window_sec=60)
    conv = chat_service.get_conversation(db, conv_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    return await _secure_chat_upload(conv_id, file)


@admin_router.patch("/conversations/{conv_id}", response_model=ChatConversationOut)
async def admin_patch_conversation(
    conv_id: int,
    body: ChatConversationPatchIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    conv = chat_service.get_conversation(db, conv_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    data = body.model_dump(exclude_unset=True)
    if "assigned_admin_id" in data and data["assigned_admin_id"] is None:
        data["assigned_admin_id"] = admin.id
    conv = chat_service.patch_conversation(db, conv, **data)
    out = chat_service.conversation_out(db, conv)
    await chat_manager.broadcast_staff({"type": "conversation_updated", "conversation": out})
    return ChatConversationOut.model_validate(out)


@admin_router.post("/conversations/{conv_id}/read")
def admin_mark_read(conv_id: int, db: Session = Depends(get_db)):
    conv = chat_service.get_conversation(db, conv_id)
    if conv is None:
        raise HTTPException(status_code=404, detail="گفتگو پیدا نشد")
    chat_service.mark_read_admin(db, conv)
    return {"ok": True}


@admin_router.get("/canned", response_model=list[ChatCannedResponseOut])
def admin_list_canned(active_only: bool = True, db: Session = Depends(get_db)):
    rows = chat_service.list_canned_responses(db, active_only=active_only)
    return [ChatCannedResponseOut.model_validate(r) for r in rows]


@admin_router.post("/canned", response_model=ChatCannedResponseOut)
def admin_create_canned(
    body: ChatCannedResponseIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = chat_service.create_canned_response(
        db, admin, title=body.title, body=body.body, sort_order=body.sort_order
    )
    return ChatCannedResponseOut.model_validate(row)


@admin_router.patch("/canned/{canned_id}", response_model=ChatCannedResponseOut)
def admin_patch_canned(
    canned_id: int,
    body: ChatCannedResponseIn,
    db: Session = Depends(get_db),
):
    row = chat_service.update_canned_response(
        db,
        canned_id,
        title=body.title,
        body=body.body,
        sort_order=body.sort_order,
        is_active=body.is_active,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="پیدا نشد")
    return ChatCannedResponseOut.model_validate(row)


@admin_router.delete("/canned/{canned_id}")
def admin_delete_canned(canned_id: int, db: Session = Depends(get_db)):
    if not chat_service.delete_canned_response(db, canned_id):
        raise HTTPException(status_code=404, detail="پیدا نشد")
    return {"ok": True}
