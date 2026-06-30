"""Rate limiting در حافظه — برای auth و endpointهای حساس."""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status


class RateLimiter:
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

    def check_or_raise(
        self,
        key: str,
        *,
        max_calls: int,
        window_sec: int,
        detail: str = "تعداد درخواست‌ها بیش از حد",
    ) -> None:
        if not self.allow(key, max_calls=max_calls, window_sec=window_sec):
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)


auth_rate_limiter = RateLimiter()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def rate_limit_auth(request: Request, action: str, *, max_calls: int, window_sec: int) -> None:
    ip = client_ip(request)
    auth_rate_limiter.check_or_raise(
        f"auth:{action}:{ip}",
        max_calls=max_calls,
        window_sec=window_sec,
        detail="تعداد تلاش‌های ورود بیش از حد — کمی بعد تلاش کنید",
    )
