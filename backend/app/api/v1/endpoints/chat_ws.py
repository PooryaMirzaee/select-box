"""WebSocket endpoint برای چت real-time."""

from __future__ import annotations

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models import User, UserRole
from app.services import chat as chat_service
from app.services.chat_security import validate_visitor_id
from app.services.chat_ws import ChatConnection, chat_manager

router = APIRouter(tags=["chat-ws"])


def _auth_user(db: Session, token: str | None) -> User | None:
    if not token:
        return None
    try:
        payload = decode_token(token)
        phone = payload.get("sub")
        if not phone:
            return None
    except JWTError:
        return None
    from sqlalchemy import select

    return db.scalar(select(User).where(User.phone == phone, User.is_active.is_(True)))


async def _handle_browse_presence(
    db: Session,
    conn: ChatConnection,
    data: dict,
) -> None:
    visitor_id = conn.visitor_id or data.get("visitor_id")
    if not visitor_id:
        return
    conn.visitor_id = str(visitor_id)
    page_url = data.get("page_url")
    page_title = data.get("page_title")
    conv_id = data.get("conversation_id")

    has_chatted = chat_service.visitor_has_chatted(db, conn.visitor_id)
    pres = await chat_manager.update_visitor_browse(
        conn.visitor_id,
        page_url=page_url,
        page_title=page_title,
        user_id=conn.user_id,
        conversation_id=int(conv_id) if conv_id else None,
        has_chatted=has_chatted,
    )
    await chat_manager.broadcast_visitor_online(pres)

    if conv_id:
        conv = chat_service.get_conversation_for_visitor(db, int(conv_id), conn.visitor_id)
        if conv:
            chat_service.update_presence(
                db, conv, page_url=page_url, page_title=page_title, online=True
            )


@router.websocket("/ws/chat")
async def chat_websocket(ws: WebSocket):
    await chat_manager.connect(ws)
    db = SessionLocal()
    conn = ChatConnection(websocket=ws, role="visitor")
    is_new_visitor = False
    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await chat_manager.send_json(ws, {"type": "error", "detail": "Invalid JSON"})
                continue

            msg_type = data.get("type")

            if msg_type == "auth":
                token = data.get("token")
                user = _auth_user(db, token)
                if user and user.role in (UserRole.admin, UserRole.operator):
                    conn.role = "staff"
                    conn.user_id = user.id
                    await chat_manager.register(conn)
                    await chat_manager.send_json(
                        ws,
                        {
                            "type": "auth_ok",
                            "role": "staff",
                            "user_id": user.id,
                            "online_visitors": chat_manager.online_visitor_count,
                        },
                    )
                elif user:
                    conn.role = "visitor"
                    conn.user_id = user.id
                    visitor_id = data.get("visitor_id")
                    if visitor_id:
                        conn.visitor_id = str(visitor_id)
                    await chat_manager.register(conn)
                    if conn.visitor_id:
                        is_new_visitor = True
                        pres = await chat_manager.update_visitor_browse(
                            conn.visitor_id,
                            user_id=user.id,
                            visitor_name=user.full_name,
                            has_chatted=chat_service.visitor_has_chatted(db, conn.visitor_id),
                        )
                        await chat_manager.broadcast_visitor_online(pres)
                    await chat_manager.send_json(
                        ws, {"type": "auth_ok", "role": "visitor", "user_id": user.id}
                    )
                else:
                    visitor_id = data.get("visitor_id")
                    if visitor_id:
                        try:
                            vid = validate_visitor_id(str(visitor_id))
                        except Exception:
                            await chat_manager.send_json(
                                ws, {"type": "error", "detail": "Invalid visitor id"}
                            )
                            continue
                        conn.role = "visitor"
                        conn.visitor_id = vid
                        await chat_manager.register(conn)
                        is_new_visitor = True
                        pres = await chat_manager.update_visitor_browse(
                            conn.visitor_id,
                            has_chatted=chat_service.visitor_has_chatted(db, conn.visitor_id),
                        )
                        await chat_manager.broadcast_visitor_online(pres)
                        await chat_manager.send_json(ws, {"type": "auth_ok", "role": "visitor"})
                    else:
                        await chat_manager.send_json(
                            ws, {"type": "error", "detail": "Authentication failed"}
                        )

            elif msg_type in ("browse_presence", "presence"):
                if conn.role != "visitor":
                    continue
                await _handle_browse_presence(db, conn, data)

            elif msg_type == "join":
                conv_id = data.get("conversation_id")
                if not conv_id:
                    continue
                conv_id = int(conv_id)
                conn.conversation_id = conv_id
                if conn.role == "visitor":
                    visitor_id = data.get("visitor_id") or conn.visitor_id
                    if not visitor_id:
                        continue
                    conn.visitor_id = str(visitor_id)
                    conv = chat_service.get_conversation_for_visitor(db, conv_id, conn.visitor_id)
                    if conv is None:
                        await chat_manager.send_json(
                            ws, {"type": "error", "detail": "Conversation not found"}
                        )
                        continue
                    await chat_manager.update_visitor_browse(
                        conn.visitor_id,
                        conversation_id=conv_id,
                        has_chatted=chat_service.visitor_has_chatted(db, conn.visitor_id),
                    )
                else:
                    conv = chat_service.get_conversation(db, conv_id)
                    if conv is None:
                        await chat_manager.send_json(
                            ws, {"type": "error", "detail": "Conversation not found"}
                        )
                        continue
                    chat_service.mark_read_admin(db, conv)
                await chat_manager.send_json(ws, {"type": "joined", "conversation_id": conv_id})

            elif msg_type == "typing":
                conv_id = conn.conversation_id or data.get("conversation_id")
                if not conv_id:
                    continue
                is_typing = bool(data.get("is_typing", False))
                await chat_manager.send_typing(
                    int(conv_id),
                    role=conn.role,
                    user_id=conn.user_id,
                    is_typing=is_typing,
                )

            elif msg_type == "read":
                conv_id = conn.conversation_id or data.get("conversation_id")
                if not conv_id:
                    continue
                conv = chat_service.get_conversation(db, int(conv_id))
                if conv is None:
                    continue
                if conn.role == "staff":
                    chat_service.mark_read_admin(db, conv)
                elif conn.visitor_id:
                    conv = chat_service.get_conversation_for_visitor(
                        db, int(conv_id), conn.visitor_id
                    )
                    if conv:
                        chat_service.mark_read_visitor(db, conv)

    except WebSocketDisconnect:
        pass
    finally:
        if conn.role == "visitor" and conn.visitor_id:
            if conn.conversation_id:
                conv = chat_service.get_conversation_for_visitor(
                    db, conn.conversation_id, conn.visitor_id
                )
                if conv:
                    chat_service.update_presence(db, conv, online=False)
                    await chat_manager.send_presence(
                        conn.conversation_id,
                        page_url=conv.current_page_url,
                        page_title=conv.current_page_title,
                        online=False,
                        visitor_id=conn.visitor_id,
                    )
        await chat_manager.disconnect(conn)
        db.close()
