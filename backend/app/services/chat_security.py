"""امنیت چت — اعتبارسنجی فایل، visitor_id، rate limit."""

from __future__ import annotations

import re
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

from app.services.storage import resolve_local_path
from app.services.upload_security import validate_chat_bytes

# UUID v4 — همان فرمت crypto.randomUUID() در مرورگر
VISITOR_ID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.I,
)

MAX_CHAT_FILE_BYTES = 5 * 1024 * 1024  # 5MB


def validate_visitor_id(visitor_id: str) -> str:
    vid = visitor_id.strip()
    if not VISITOR_ID_RE.match(vid):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="شناسه بازدیدکننده نامعتبر است",
        )
    return vid


def validate_chat_upload(data: bytes, filename: str, declared_mime: str | None) -> tuple[str, str, str]:
    """اعتبارسنجی محتوای فایل با magic bytes."""
    return validate_chat_bytes(
        data,
        filename,
        declared_mime,
        max_bytes=MAX_CHAT_FILE_BYTES,
    )


def validate_attachment_key(key: str, conv_id: int) -> str:
    """فقط فایل‌های آپلودشده در همان گفتگو قابل پیوست هستند."""
    normalized = key.strip().replace("\\", "/").lstrip("/")
    if ".." in normalized.split("/"):
        raise HTTPException(status_code=400, detail="مسیر فایل نامعتبر")
    expected = f"chat/{conv_id}/"
    if not normalized.startswith(expected):
        raise HTTPException(status_code=400, detail="فایل متعلق به این گفتگو نیست")
    if resolve_local_path(normalized) is None:
        raise HTTPException(status_code=400, detail="فایل پیوست یافت نشد")
    return normalized


def sanitize_message_body(body: str, max_len: int = 4000) -> str:
    text = body.strip()
    if len(text) > max_len:
        raise HTTPException(status_code=400, detail="پیام بیش از حد طولانی است")
    text = re.sub(r"<script[\s\S]*?</script>", "", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return text


class ChatRateLimiter:
    """Rate limit در حافظه — برای جلوگیری از spam و آپلود انبوه."""

    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = defaultdict(list)

    def _prune(self, key: str, window: float) -> None:
        now = time.time()
        self._hits[key] = [t for t in self._hits[key] if now - t < window]

    def allow(self, key: str, *, max_calls: int, window_sec: int) -> bool:
        self._prune(key, window_sec)
        if len(self._hits[key]) >= max_calls:
            return False
        self._hits[key].append(time.time())
        return True

    def check_or_raise(self, key: str, *, max_calls: int, window_sec: int, label: str) -> None:
        if not self.allow(key, max_calls=max_calls, window_sec=window_sec):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"تعداد درخواست‌ها بیش از حد — {label}",
            )


chat_rate_limiter = ChatRateLimiter()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def rate_limit_chat(request: Request, action: str, *, max_calls: int, window_sec: int) -> None:
    ip = client_ip(request)
    chat_rate_limiter.check_or_raise(
        f"{action}:{ip}",
        max_calls=max_calls,
        window_sec=window_sec,
        label=action,
    )
