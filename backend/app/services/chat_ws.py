"""مدیریت اتصالات WebSocket چت — broadcast به اتاق‌ها."""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket


@dataclass
class ChatConnection:
    websocket: WebSocket
    role: str  # visitor | staff
    conversation_id: int | None = None
    user_id: int | None = None
    visitor_id: str | None = None


@dataclass
class VisitorPresence:
    visitor_id: str
    page_url: str | None = None
    page_title: str | None = None
    user_id: int | None = None
    conversation_id: int | None = None
    visitor_name: str | None = None
    has_chatted: bool = False
    connected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class ChatConnectionManager:
    def __init__(self) -> None:
        self._connections: list[ChatConnection] = []
        self._visitors: dict[str, VisitorPresence] = {}
        self._lock = asyncio.Lock()

    @property
    def online_visitor_count(self) -> int:
        return len(self._visitors)

    def is_visitor_online(self, visitor_id: str) -> bool:
        return visitor_id in self._visitors

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()

    async def register(self, conn: ChatConnection) -> None:
        async with self._lock:
            self._connections.append(conn)
            if conn.role == "visitor" and conn.visitor_id:
                vid = conn.visitor_id
                if vid not in self._visitors:
                    self._visitors[vid] = VisitorPresence(visitor_id=vid, user_id=conn.user_id)
                else:
                    self._visitors[vid].last_seen = datetime.now(timezone.utc)
                    if conn.user_id:
                        self._visitors[vid].user_id = conn.user_id

    async def disconnect(self, conn: ChatConnection) -> None:
        visitor_went_offline: str | None = None
        async with self._lock:
            if conn in self._connections:
                self._connections.remove(conn)
            if conn.role == "visitor" and conn.visitor_id:
                still = any(
                    c.visitor_id == conn.visitor_id and c.role == "visitor"
                    for c in self._connections
                )
                if not still:
                    self._visitors.pop(conn.visitor_id, None)
                    visitor_went_offline = conn.visitor_id
        if visitor_went_offline:
            await self.broadcast_staff(
                {"type": "visitor_offline", "visitor_id": visitor_went_offline}
            )

    async def update_visitor_browse(
        self,
        visitor_id: str,
        *,
        page_url: str | None = None,
        page_title: str | None = None,
        user_id: int | None = None,
        conversation_id: int | None = None,
        visitor_name: str | None = None,
        has_chatted: bool | None = None,
    ) -> VisitorPresence:
        now = datetime.now(timezone.utc)
        async with self._lock:
            pres = self._visitors.get(visitor_id)
            if pres is None:
                pres = VisitorPresence(visitor_id=visitor_id)
                self._visitors[visitor_id] = pres
            pres.last_seen = now
            if page_url is not None:
                pres.page_url = page_url
            if page_title is not None:
                pres.page_title = page_title
            if user_id is not None:
                pres.user_id = user_id
            if conversation_id is not None:
                pres.conversation_id = conversation_id
            if visitor_name is not None:
                pres.visitor_name = visitor_name
            if has_chatted is not None:
                pres.has_chatted = has_chatted
        return pres

    def list_online_visitors(self) -> list[dict[str, Any]]:
        now = datetime.now(timezone.utc)
        out: list[dict[str, Any]] = []
        for pres in self._visitors.values():
            out.append(
                {
                    "visitor_id": pres.visitor_id,
                    "page_url": pres.page_url,
                    "page_title": pres.page_title,
                    "user_id": pres.user_id,
                    "conversation_id": pres.conversation_id,
                    "visitor_name": pres.visitor_name,
                    "has_chatted": pres.has_chatted,
                    "connected_at": pres.connected_at,
                    "last_seen": pres.last_seen,
                    "online_seconds": int((now - pres.connected_at).total_seconds()),
                }
            )
        out.sort(key=lambda x: x["last_seen"], reverse=True)
        return out

    async def send_json(self, ws: WebSocket, payload: dict[str, Any]) -> None:
        try:
            await ws.send_text(json.dumps(payload, default=str))
        except Exception:
            pass

    async def send_to_visitor(self, visitor_id: str, payload: dict[str, Any]) -> bool:
        async with self._lock:
            targets = [
                c for c in self._connections if c.role == "visitor" and c.visitor_id == visitor_id
            ]
        if not targets:
            return False
        for conn in targets:
            await self.send_json(conn.websocket, payload)
        return True

    async def broadcast_conversation(self, conversation_id: int, payload: dict[str, Any]) -> None:
        async with self._lock:
            targets = [
                c
                for c in self._connections
                if c.role == "staff" or c.conversation_id == conversation_id
            ]
        for conn in targets:
            await self.send_json(conn.websocket, payload)

    async def broadcast_staff(self, payload: dict[str, Any]) -> None:
        async with self._lock:
            targets = [c for c in self._connections if c.role == "staff"]
        for conn in targets:
            await self.send_json(conn.websocket, payload)

    async def broadcast_visitor_online(self, pres: VisitorPresence) -> None:
        await self.broadcast_staff(
            {
                "type": "visitor_online",
                "visitor": {
                    "visitor_id": pres.visitor_id,
                    "page_url": pres.page_url,
                    "page_title": pres.page_title,
                    "user_id": pres.user_id,
                    "conversation_id": pres.conversation_id,
                    "visitor_name": pres.visitor_name,
                    "has_chatted": pres.has_chatted,
                    "connected_at": pres.connected_at,
                    "last_seen": pres.last_seen,
                },
            }
        )

    async def send_typing(
        self,
        conversation_id: int,
        *,
        role: str,
        user_id: int | None,
        is_typing: bool,
    ) -> None:
        await self.broadcast_conversation(
            conversation_id,
            {
                "type": "typing",
                "conversation_id": conversation_id,
                "role": role,
                "user_id": user_id,
                "is_typing": is_typing,
            },
        )

    async def send_presence(
        self,
        conversation_id: int,
        *,
        page_url: str | None,
        page_title: str | None,
        online: bool,
        visitor_id: str | None = None,
    ) -> None:
        await self.broadcast_staff(
            {
                "type": "presence",
                "conversation_id": conversation_id,
                "visitor_id": visitor_id,
                "page_url": page_url,
                "page_title": page_title,
                "online": online,
            }
        )


chat_manager = ChatConnectionManager()
