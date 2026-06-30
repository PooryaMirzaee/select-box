"""
سهمیه و ضد سوءاستفاده AI — محدودیت بر اساس کاربر، IP و سقف سراسری.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import User, UserRole
from app.models.ai import AiGenerationLog
from app.services import settings as shop_settings

_DUP_WINDOW_SEC = 300
_MIN_PROMPT_LEN = 3
_MAX_PROMPT_LEN = 400


@dataclass(frozen=True)
class AiLimits:
    require_login: bool
    max_per_user_hour: int
    max_per_user_day: int
    max_global_day: int
    max_per_ip_hour: int
    cooldown_seconds: int


@dataclass(frozen=True)
class AiQuotaStatus:
    require_login: bool
    logged_in: bool
    max_per_user_hour: int
    max_per_user_day: int
    cooldown_seconds: int
    used_hour: int
    used_day: int
    remaining_hour: int
    remaining_day: int
    can_generate: bool
    block_reason: str | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(dt: datetime) -> datetime:
    """SQLite زمان naive برمی‌گرداند — همه را UTC aware می‌کنیم."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _db_since(dt: datetime) -> datetime:
    """مقایسه با ستون‌های datetime در SQLite (معمولاً naive)."""
    return _as_utc(dt).replace(tzinfo=None)


def _setting_bool(value: object) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return bool(value)


def _clamp_int(value: object, default: int, *, min_val: int, max_val: int) -> int:
    try:
        n = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
    return max(min_val, min(max_val, n))


def get_limits(db: Session) -> AiLimits:
    cfg = shop_settings.get_all_settings(db)
    return AiLimits(
        require_login=bool(cfg.get("avalai_require_login", True)),
        max_per_user_hour=_clamp_int(cfg.get("avalai_max_per_user_hour"), 3, min_val=1, max_val=20),
        max_per_user_day=_clamp_int(cfg.get("avalai_max_per_user_day"), 8, min_val=1, max_val=50),
        max_global_day=_clamp_int(cfg.get("avalai_max_global_day"), 50, min_val=5, max_val=500),
        max_per_ip_hour=_clamp_int(cfg.get("avalai_max_per_ip_hour"), 5, min_val=1, max_val=30),
        cooldown_seconds=_clamp_int(cfg.get("avalai_cooldown_seconds"), 45, min_val=10, max_val=300),
    )


def normalize_prompt(prompt: str) -> str:
    text = re.sub(r"\s+", " ", prompt.strip())
    if len(text) < _MIN_PROMPT_LEN:
        raise HTTPException(status_code=400, detail="توضیح طرح خیلی کوتاه است")
    if len(text) > _MAX_PROMPT_LEN:
        raise HTTPException(status_code=400, detail=f"حداکثر {_MAX_PROMPT_LEN} کاراکتر مجاز است")
    if re.fullmatch(r"(.)\1{8,}", text):
        raise HTTPException(status_code=400, detail="متن تکراری مجاز نیست")
    return text


def prompt_hash(prompt: str) -> str:
    return hashlib.sha256(normalize_prompt(prompt).encode("utf-8")).hexdigest()


def _successful_clause():
    return AiGenerationLog.status == "success"


def _count_since(db: Session, *, since: datetime, user_id: int | None = None, ip: str | None = None) -> int:
    since_db = _db_since(since)
    q = (
        select(func.count())
        .select_from(AiGenerationLog)
        .where(AiGenerationLog.created_at >= since_db, _successful_clause())
    )
    if user_id is not None:
        q = q.where(AiGenerationLog.user_id == user_id)
    if ip is not None:
        q = q.where(AiGenerationLog.ip_address == ip)
    return int(db.scalar(q) or 0)


def _last_user_generation(db: Session, user_id: int) -> datetime | None:
    return db.scalar(
        select(AiGenerationLog.created_at)
        .where(AiGenerationLog.user_id == user_id, _successful_clause())
        .order_by(AiGenerationLog.created_at.desc())
        .limit(1)
    )


def _is_staff(user: User | None) -> bool:
    return user is not None and user.role in (UserRole.admin, UserRole.operator)


def get_quota_status(
    db: Session,
    *,
    user: User | None,
    ip: str,
) -> AiQuotaStatus:
    limits = get_limits(db)
    now = _now()
    hour_ago = now - timedelta(hours=1)
    day_ago = now - timedelta(days=1)

    if not _setting_bool(shop_settings.get_all_settings(db).get("avalai_enabled")):
        return AiQuotaStatus(
            require_login=limits.require_login,
            logged_in=user is not None,
            max_per_user_hour=limits.max_per_user_hour,
            max_per_user_day=limits.max_per_user_day,
            cooldown_seconds=limits.cooldown_seconds,
            used_hour=0,
            used_day=0,
            remaining_hour=0,
            remaining_day=0,
            can_generate=False,
            block_reason="طراحی هوشمند غیرفعال است",
        )

    if limits.require_login and user is None:
        return AiQuotaStatus(
            require_login=True,
            logged_in=False,
            max_per_user_hour=limits.max_per_user_hour,
            max_per_user_day=limits.max_per_user_day,
            cooldown_seconds=limits.cooldown_seconds,
            used_hour=0,
            used_day=0,
            remaining_hour=0,
            remaining_day=0,
            can_generate=False,
            block_reason="برای طراحی هوشمند وارد حساب شوید",
        )

    global_day = _count_since(db, since=day_ago)
    if global_day >= limits.max_global_day and not _is_staff(user):
        return AiQuotaStatus(
            require_login=limits.require_login,
            logged_in=user is not None,
            max_per_user_hour=limits.max_per_user_hour,
            max_per_user_day=limits.max_per_user_day,
            cooldown_seconds=limits.cooldown_seconds,
            used_hour=0,
            used_day=0,
            remaining_hour=0,
            remaining_day=0,
            can_generate=False,
            block_reason="سقف روزانه سایت پر شده — فردا دوباره تلاش کنید",
        )

    used_hour = 0
    used_day = 0
    if user is not None:
        used_hour = _count_since(db, since=hour_ago, user_id=user.id)
        used_day = _count_since(db, since=day_ago, user_id=user.id)

    remaining_hour = max(0, limits.max_per_user_hour - used_hour)
    remaining_day = max(0, limits.max_per_user_day - used_day)

    block_reason: str | None = None
    can_generate = True

    if user is not None and not _is_staff(user):
        if used_hour >= limits.max_per_user_hour:
            can_generate = False
            block_reason = "سقف ساعتی شما پر شده — یک ساعت بعد دوباره تلاش کنید"
        elif used_day >= limits.max_per_user_day:
            can_generate = False
            block_reason = "سقف روزانه شما پر شده — فردا دوباره تلاش کنید"
        else:
            last_at = _last_user_generation(db, user.id)
            if last_at is not None:
                elapsed = (_now() - _as_utc(last_at)).total_seconds()
                if elapsed < limits.cooldown_seconds:
                    wait = int(limits.cooldown_seconds - elapsed)
                    can_generate = False
                    block_reason = f"لطفاً {wait} ثانیه صبر کنید"

    return AiQuotaStatus(
        require_login=limits.require_login,
        logged_in=user is not None,
        max_per_user_hour=limits.max_per_user_hour,
        max_per_user_day=limits.max_per_user_day,
        cooldown_seconds=limits.cooldown_seconds,
        used_hour=used_hour,
        used_day=used_day,
        remaining_hour=remaining_hour,
        remaining_day=remaining_day,
        can_generate=can_generate,
        block_reason=block_reason,
    )


def enforce_generation(
    db: Session,
    *,
    user: User | None,
    ip: str,
    prompt: str,
    skip_duplicate: bool = False,
) -> str:
    """اعتبارسنجی قبل از فراخوانی AvalAI — prompt نرمال‌شده را برمی‌گرداند."""
    limits = get_limits(db)
    normalized = normalize_prompt(prompt)
    p_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    now = _now()
    hour_ago = now - timedelta(hours=1)
    day_ago = now - timedelta(days=1)
    dup_since = now - timedelta(seconds=_DUP_WINDOW_SEC)

    if limits.require_login and user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="برای طراحی هوشمند وارد حساب شوید")

    ip_hour = _count_since(db, since=hour_ago, ip=ip)
    if ip_hour >= limits.max_per_ip_hour and not _is_staff(user):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="تعداد درخواست از این شبکه بیش از حد — بعداً تلاش کنید",
        )

    global_day = _count_since(db, since=day_ago)
    if global_day >= limits.max_global_day and not _is_staff(user):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="سقف روزانه سایت پر شده — فردا دوباره تلاش کنید",
        )

    if user is not None and not _is_staff(user):
        user_hour = _count_since(db, since=hour_ago, user_id=user.id)
        if user_hour >= limits.max_per_user_hour:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="سقف ساعتی شما پر شده — یک ساعت بعد دوباره تلاش کنید",
            )

        user_day = _count_since(db, since=day_ago, user_id=user.id)
        if user_day >= limits.max_per_user_day:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="سقف روزانه شما پر شده — فردا دوباره تلاش کنید",
            )

        last_at = _last_user_generation(db, user.id)
        if last_at is not None:
            elapsed = (_now() - _as_utc(last_at)).total_seconds()
            if elapsed < limits.cooldown_seconds:
                wait = int(limits.cooldown_seconds - elapsed)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"لطفاً {wait} ثانیه صبر کنید",
                )

        if not skip_duplicate:
            dup_count = db.scalar(
                select(func.count())
                .select_from(AiGenerationLog)
                .where(
                    AiGenerationLog.user_id == user.id,
                    AiGenerationLog.prompt_hash == p_hash,
                    AiGenerationLog.created_at >= _db_since(dup_since),
                    _successful_clause(),
                )
            )
            if int(dup_count or 0) > 0:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="همین طرح اخیراً ساخته شده — prompt دیگری امتحان کنید",
                )

    return normalized


def record_ai_attempt(
    db: Session,
    *,
    user: User | None,
    ip: str,
    prompt: str,
    model: str,
    status: str,
    error_message: str | None = None,
    storage_key: str | None = None,
    aspect_ratio: str = "1:1",
    generation_type: str = "text",
    tool_id: int | None = None,
) -> None:
    text = re.sub(r"\s+", " ", prompt.strip())
    p_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    db.add(
        AiGenerationLog(
            user_id=user.id if user else None,
            ip_address=ip[:45],
            prompt_hash=p_hash,
            prompt_preview=text[:120],
            prompt_text=text,
            model=model,
            status=status,
            error_message=error_message,
            storage_key=storage_key,
            aspect_ratio=aspect_ratio,
            generation_type=generation_type,
            tool_id=tool_id,
        )
    )
    db.commit()


def record_generation(
    db: Session,
    *,
    user: User | None,
    ip: str,
    prompt: str,
    model: str,
    storage_key: str | None = None,
    aspect_ratio: str = "1:1",
    generation_type: str = "text",
    tool_id: int | None = None,
) -> None:
    record_ai_attempt(
        db,
        user=user,
        ip=ip,
        prompt=prompt,
        model=model,
        status="success",
        storage_key=storage_key,
        aspect_ratio=aspect_ratio,
        generation_type=generation_type,
        tool_id=tool_id,
    )
