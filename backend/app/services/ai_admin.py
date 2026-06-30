"""
مدیریت AI — پرامپت‌های پیشنهادی، ابزارهای آماده، لاگ‌ها و آمار ادمین.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import User
from app.models.ai import AiGenerationLog, AiSuggestedPrompt, AiTool
from app.services import settings as shop_settings

DEFAULT_SYSTEM_PROMPT_SUFFIX = (
    "خروجی باید فقط یک طرح گرافیکی تخت (flat artwork) برای چاپ روی پارچه باشد.\n"
    "ممنوع: تیشرت، هودی، لباس، مانکن، مدل انسانی، موکاپ محصول، قاب، سایهٔ زمین.\n"
    "ممنوع: الگوی شطرنجی خاکستری/سفید (checkerboard) — شفافیت را شبیه‌سازی نکن.\n"
    "پس‌زمینه: یکدست و کاملاً مجنتا (#FF00FF) در تمام اطراف طرح.\n"
    "فقط خودِ نقاشی/لوگو/گرافیک در مرکز — بدون لباس، بدون شطرنجی، آمادهٔ چاپ."
)

DEFAULT_SUGGESTED_PROMPTS: list[tuple[str, str | None]] = [
    ("گل‌های رنگی مینیمال", None),
    ("نقشه ایران با استایل مدرن", None),
    ("گربه فضانورد کارتونی", None),
    ("طرح هندسی سیاه و سفید", None),
]

DEFAULT_AI_TOOLS: list[tuple[str, str, str]] = [
    (
        "شاهنامه‌ای",
        "تبدیل عکس به سبک مینیاتور شاهنامه — پس‌زمینه حذف می‌شود",
        "این عکس را به سبک نقاشی شاهنامه و مینیاتور ایرانی تبدیل کن. "
        "پس‌زمینه را کاملاً حذف کن و فقط شخص یا موضوع اصلی را نگه دار.",
    ),
    (
        "کارتونی",
        "تبدیل به کارتون رنگی — مناسب چاپ تیشرت",
        "این عکس را به سبک کارتونی رنگی و دوستانه تبدیل کن. پس‌زمینه را حذف کن.",
    ),
    (
        "خطی سیاه",
        "طرح خطی سیاه‌سفید ساده — پس‌زمینه حذف",
        "این عکس را به طرح خطی سیاه و سفید ساده تبدیل کن. پس‌زمینه را حذف کن.",
    ),
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _db_since(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def get_system_prompt_suffix(db: Session) -> str:
    raw = shop_settings.get_setting(db, "avalai_system_prompt_suffix", DEFAULT_SYSTEM_PROMPT_SUFFIX)
    text = str(raw or "").strip()
    return text or DEFAULT_SYSTEM_PROMPT_SUFFIX


def list_enabled_tools(db: Session) -> list[AiTool]:
    return list(
        db.scalars(
            select(AiTool)
            .where(AiTool.enabled.is_(True))
            .order_by(AiTool.sort_order.asc(), AiTool.id.asc())
        ).all()
    )


def list_all_tools(db: Session) -> list[AiTool]:
    return list(
        db.scalars(select(AiTool).order_by(AiTool.sort_order.asc(), AiTool.id.asc())).all()
    )


def get_tool(db: Session, tool_id: int) -> AiTool | None:
    return db.get(AiTool, tool_id)


def create_tool(
    db: Session,
    *,
    name: str,
    description: str | None,
    prompt: str,
    sort_order: int,
    enabled: bool,
) -> AiTool:
    row = AiTool(
        name=name.strip(),
        description=description.strip() if description else None,
        prompt=prompt.strip(),
        sort_order=sort_order,
        enabled=enabled,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_tool(
    db: Session,
    tool_id: int,
    *,
    name: str | None = None,
    description: str | None = None,
    prompt: str | None = None,
    sort_order: int | None = None,
    enabled: bool | None = None,
) -> AiTool | None:
    row = db.get(AiTool, tool_id)
    if row is None:
        return None
    if name is not None:
        row.name = name.strip()
    if description is not None:
        row.description = description.strip() or None
    if prompt is not None:
        row.prompt = prompt.strip()
    if sort_order is not None:
        row.sort_order = sort_order
    if enabled is not None:
        row.enabled = enabled
    db.commit()
    db.refresh(row)
    return row


def delete_tool(db: Session, tool_id: int) -> bool:
    row = db.get(AiTool, tool_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def list_enabled_suggested_prompts(db: Session) -> list[AiSuggestedPrompt]:
    return list(
        db.scalars(
            select(AiSuggestedPrompt)
            .where(AiSuggestedPrompt.enabled.is_(True))
            .order_by(AiSuggestedPrompt.sort_order.asc(), AiSuggestedPrompt.id.asc())
        ).all()
    )


def list_all_suggested_prompts(db: Session) -> list[AiSuggestedPrompt]:
    return list(
        db.scalars(
            select(AiSuggestedPrompt).order_by(
                AiSuggestedPrompt.sort_order.asc(),
                AiSuggestedPrompt.id.asc(),
            )
        ).all()
    )


def create_suggested_prompt(db: Session, *, text: str, label: str | None, sort_order: int, enabled: bool) -> AiSuggestedPrompt:
    row = AiSuggestedPrompt(text=text.strip(), label=label, sort_order=sort_order, enabled=enabled)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_suggested_prompt(
    db: Session,
    prompt_id: int,
    *,
    text: str | None = None,
    label: str | None = None,
    sort_order: int | None = None,
    enabled: bool | None = None,
) -> AiSuggestedPrompt | None:
    row = db.get(AiSuggestedPrompt, prompt_id)
    if row is None:
        return None
    if text is not None:
        row.text = text.strip()
    if label is not None:
        row.label = label.strip() or None
    if sort_order is not None:
        row.sort_order = sort_order
    if enabled is not None:
        row.enabled = enabled
    db.commit()
    db.refresh(row)
    return row


def delete_suggested_prompt(db: Session, prompt_id: int) -> bool:
    row = db.get(AiSuggestedPrompt, prompt_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def set_admin_config(db: Session, *, system_prompt_suffix: str | None = None) -> dict[str, object]:
    if system_prompt_suffix is not None:
        shop_settings.set_settings(
            db,
            {"avalai_system_prompt_suffix": system_prompt_suffix.strip() or DEFAULT_SYSTEM_PROMPT_SUFFIX},
        )
    return {"system_prompt_suffix": get_system_prompt_suffix(db)}


def tool_log_prompt(tool: AiTool) -> str:
    return f"[ابزار: {tool.name}] {tool.prompt}"


def user_prompt_history(db: Session, user_id: int, *, limit: int = 8) -> list[tuple[AiGenerationLog, AiTool | None]]:
    rows = list(
        db.scalars(
            select(AiGenerationLog)
            .where(AiGenerationLog.user_id == user_id)
            .order_by(AiGenerationLog.created_at.desc())
            .limit(limit)
        ).all()
    )
    tool_ids = {r.tool_id for r in rows if r.tool_id}
    tools: dict[int, AiTool] = {}
    if tool_ids:
        for tool in db.scalars(select(AiTool).where(AiTool.id.in_(tool_ids))).all():
            tools[tool.id] = tool
    return [(row, tools.get(row.tool_id) if row.tool_id else None) for row in rows]


def list_logs(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 30,
    status: str | None = None,
    search: str | None = None,
    user_id: int | None = None,
) -> tuple[list[tuple[AiGenerationLog, User | None, AiTool | None]], int]:
    q = (
        select(AiGenerationLog, User, AiTool)
        .outerjoin(User, User.id == AiGenerationLog.user_id)
        .outerjoin(AiTool, AiTool.id == AiGenerationLog.tool_id)
    )
    count_q = select(func.count()).select_from(AiGenerationLog)

    if status:
        q = q.where(AiGenerationLog.status == status)
        count_q = count_q.where(AiGenerationLog.status == status)
    if user_id is not None:
        q = q.where(AiGenerationLog.user_id == user_id)
        count_q = count_q.where(AiGenerationLog.user_id == user_id)
    if search:
        term = f"%{search.strip()}%"
        q = q.where(AiGenerationLog.prompt_text.ilike(term))
        count_q = count_q.where(AiGenerationLog.prompt_text.ilike(term))

    total = int(db.scalar(count_q) or 0)
    offset = max(0, (page - 1) * page_size)
    rows = list(
        db.execute(
            q.order_by(AiGenerationLog.created_at.desc()).offset(offset).limit(page_size)
        ).all()
    )
    return rows, total


def stats(db: Session, *, days: int = 30) -> dict[str, object]:
    since = _db_since(_now() - timedelta(days=days))
    today_start = _db_since(_now().replace(hour=0, minute=0, second=0, microsecond=0))

    total = int(
        db.scalar(select(func.count()).select_from(AiGenerationLog).where(AiGenerationLog.created_at >= since))
        or 0
    )
    success = int(
        db.scalar(
            select(func.count())
            .select_from(AiGenerationLog)
            .where(AiGenerationLog.created_at >= since, AiGenerationLog.status == "success")
        )
        or 0
    )
    failed = total - success
    today = int(
        db.scalar(
            select(func.count()).select_from(AiGenerationLog).where(AiGenerationLog.created_at >= today_start)
        )
        or 0
    )
    today_success = int(
        db.scalar(
            select(func.count())
            .select_from(AiGenerationLog)
            .where(AiGenerationLog.created_at >= today_start, AiGenerationLog.status == "success")
        )
        or 0
    )
    unique_users_today = int(
        db.scalar(
            select(func.count(func.distinct(AiGenerationLog.user_id)))
            .select_from(AiGenerationLog)
            .where(
                AiGenerationLog.created_at >= today_start,
                AiGenerationLog.user_id.is_not(None),
            )
        )
        or 0
    )

    top_rows = db.execute(
        select(AiGenerationLog.prompt_text, func.count().label("cnt"))
        .where(AiGenerationLog.created_at >= since, AiGenerationLog.status == "success")
        .group_by(AiGenerationLog.prompt_text)
        .order_by(func.count().desc())
        .limit(10)
    ).all()
    top_prompts = [{"prompt": row[0], "count": int(row[1])} for row in top_rows]

    return {
        "total": total,
        "success": success,
        "failed": failed,
        "today": today,
        "today_success": today_success,
        "unique_users_today": unique_users_today,
        "top_prompts": top_prompts,
    }


def seed_default_suggested_prompts(db: Session) -> None:
    count = int(db.scalar(select(func.count()).select_from(AiSuggestedPrompt)) or 0)
    if count > 0:
        return
    for idx, (text, label) in enumerate(DEFAULT_SUGGESTED_PROMPTS):
        db.add(AiSuggestedPrompt(text=text, label=label, sort_order=idx, enabled=True))
    db.commit()


def seed_default_tools(db: Session) -> None:
    count = int(db.scalar(select(func.count()).select_from(AiTool)) or 0)
    if count > 0:
        return
    for idx, (name, description, prompt) in enumerate(DEFAULT_AI_TOOLS):
        db.add(AiTool(name=name, description=description, prompt=prompt, sort_order=idx, enabled=True))
    db.commit()
