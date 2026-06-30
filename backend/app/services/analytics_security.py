"""امنیت آنالیتیکس — اعتبارسنجی ورودی و rate limit."""

from __future__ import annotations

import re
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

SESSION_ID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.I,
)
VISITOR_ID_RE = SESSION_ID_RE
PATH_RE = re.compile(r"^/[a-zA-Z0-9/_\-%.?=&]*$")
EVENT_NAME_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")

ALLOWED_EVENTS = frozenset({
    "add_to_cart",
    "remove_from_cart",
    "begin_checkout",
    "purchase",
    "product_view",
    "search",
    "signup",
    "login",
})


def validate_session_id(session_id: str) -> str:
    sid = session_id.strip()
    if not SESSION_ID_RE.match(sid):
        raise HTTPException(status_code=400, detail="شناسه نشست نامعتبر است")
    return sid


def validate_visitor_id(visitor_id: str | None) -> str | None:
    if not visitor_id:
        return None
    vid = visitor_id.strip()
    if not VISITOR_ID_RE.match(vid):
        return None
    return vid


def validate_path(path: str) -> str:
    p = path.strip()
    if not p.startswith("/"):
        p = f"/{p}"
    if len(p) > 512:
        p = p[:512]
    if not PATH_RE.match(p):
        raise HTTPException(status_code=400, detail="مسیر نامعتبر است")
    return p


def validate_event_name(name: str | None) -> str | None:
    if not name:
        return None
    n = name.strip().lower()
    if not EVENT_NAME_RE.match(n) or n not in ALLOWED_EVENTS:
        raise HTTPException(status_code=400, detail="نام رویداد مجاز نیست")
    return n


def truncate(value: str | None, max_len: int) -> str | None:
    if value is None:
        return None
    v = value.strip()
    if not v:
        return None
    return v[:max_len]


class AnalyticsRateLimiter:
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


analytics_rate_limiter = AnalyticsRateLimiter()


def check_collect_rate(request: Request, session_id: str) -> None:
    ip = request.client.host if request.client else "unknown"
    key = f"{ip}:{session_id[:8]}"
    if not analytics_rate_limiter.allow(key, max_calls=120, window_sec=60):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="تعداد درخواست زیاد است")
