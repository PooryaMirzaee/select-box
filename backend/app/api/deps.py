"""
وابستگی‌های مشترک FastAPI — هدرهای استاندارد سشن مهمان و غیره.
"""

import uuid

from fastapi import Header, HTTPException

# نام هدری که فرانت یا کلاینت باید پس از ساخت سشن ارسال کند
SESSION_HEADER = "X-Session-Id"


def session_id_or_generate(x_session_id: str | None = Header(default=None, alias=SESSION_HEADER)) -> str:
    """
    در صورت نبود هدر خطا می‌دهد؛ برای مسیرهایی که حتماً باید سشن از قبل وجود داشته باشد.
    """
    if x_session_id and x_session_id.strip():
        return x_session_id.strip()
    raise HTTPException(
        status_code=400,
        detail=f"Missing {SESSION_HEADER}; client must create and persist a UUID session id.",
    )


def session_id_optional(x_session_id: str | None = Header(default=None, alias=SESSION_HEADER)) -> str:
    """
    اگر هدر نبود UUID جدید برمی‌گرداند — کاربر باید آن را از پاسخ یا کوکی بگیرد؛ فعلاً در اندپوینت‌ها کمتر استفاده شده است.
    """
    if x_session_id and x_session_id.strip():
        return x_session_id.strip()
    return str(uuid.uuid4())
