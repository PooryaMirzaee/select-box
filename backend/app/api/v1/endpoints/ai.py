"""
API طراحی هوشمند — تولید تصویر برای Design Lab.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.core.deps_auth import get_current_user_optional
from app.db.session import get_db
from app.models import User
from app.schemas.ai import (
    AiConfigOut,
    AiGenerateImageIn,
    AiGenerateImageOut,
    AiHistoryItemOut,
    AiQuotaOut,
    AiStatusOut,
    AiSuggestedPromptOut,
    AiToolOut,
)
from app.services import avalai
from app.services.ai_admin import (
    get_tool,
    list_enabled_suggested_prompts,
    list_enabled_tools,
    tool_log_prompt,
    user_prompt_history,
)
from app.services.ai_image_post import prepare_print_artwork
from app.services.ai_errors import AiServiceError
from app.services.ai_quota import (
    enforce_generation,
    get_quota_status,
    record_ai_attempt,
    record_generation,
)
from app.services.rate_limit import auth_rate_limiter, client_ip
from app.services.storage import public_url, save_upload_secure
from app.services.upload_security import validate_image_bytes

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger(__name__)

_IP_BURST_MAX = 15
_IP_BURST_WINDOW = 3600
_MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def _public_config(db: Session) -> AiConfigOut:
    return AiConfigOut(
        suggested_prompts=[
            AiSuggestedPromptOut(id=p.id, text=p.text, label=p.label)
            for p in list_enabled_suggested_prompts(db)
        ],
        tools=[
            AiToolOut(id=t.id, name=t.name, description=t.description)
            for t in list_enabled_tools(db)
        ],
    )


def _check_burst(request: Request) -> str:
    ip = client_ip(request)
    auth_rate_limiter.check_or_raise(
        f"ai_burst:{ip}",
        max_calls=_IP_BURST_MAX,
        window_sec=_IP_BURST_WINDOW,
        detail="تلاش‌های مشکوک زیاد — بعداً تلاش کنید",
    )
    return ip


@router.get("/status", response_model=AiStatusOut)
def ai_status(
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    enabled = avalai.is_enabled(db)
    quota = None
    config = None
    history: list[AiHistoryItemOut] = []
    if enabled:
        try:
            status = get_quota_status(db, user=user, ip=client_ip(request))
            quota = AiQuotaOut.model_validate(status.__dict__)
            config = _public_config(db)
            if user is not None:
                history = [
                    AiHistoryItemOut(
                        prompt=row.prompt_text or row.prompt_preview,
                        created_at=row.created_at,  # type: ignore[arg-type]
                        status=row.status or "success",
                        storage_key=row.storage_key,
                        generation_type=row.generation_type or "text",
                        tool_name=tool.name if tool else None,
                    )
                    for row, tool in user_prompt_history(db, user.id)
                ]
        except Exception:
            logger.exception("AI quota status failed")
    return AiStatusOut(enabled=enabled, quota=quota, config=config, history=history)


@router.get("/config", response_model=AiConfigOut)
def ai_config(db: Session = Depends(get_db)):
    if not avalai.is_enabled(db):
        raise HTTPException(status_code=503, detail="طراحی هوشمند غیرفعال است")
    return _public_config(db)


@router.post("/generate-image", response_model=AiGenerateImageOut)
async def generate_image(
    body: AiGenerateImageIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    if not avalai.is_enabled(db):
        raise HTTPException(status_code=503, detail="طراحی هوشمند غیرفعال است")

    ip = _check_burst(request)
    normalized_prompt = enforce_generation(db, user=user, ip=ip, prompt=body.prompt)
    model = avalai.image_model(db)

    try:
        image_bytes = await avalai.generate_image(
            db,
            prompt=normalized_prompt,
            aspect_ratio=body.aspect_ratio,
        )
    except AiServiceError as exc:
        record_ai_attempt(
            db,
            user=user,
            ip=ip,
            prompt=normalized_prompt,
            model=model,
            status="failed",
            error_message=exc.user_message,
            aspect_ratio=body.aspect_ratio,
            generation_type="text",
        )
        logger.warning("AI generate user error: %s", exc.internal)
        status_code = 429 if exc.retryable else 502
        raise HTTPException(status_code=status_code, detail=exc.user_message) from exc

    storage_key = save_upload_secure(
        prepare_print_artwork(image_bytes),
        "ai-generated",
        "design.png",
    )
    record_generation(
        db,
        user=user,
        ip=ip,
        prompt=normalized_prompt,
        model=model,
        storage_key=storage_key,
        aspect_ratio=body.aspect_ratio,
        generation_type="text",
    )

    quota = get_quota_status(db, user=user, ip=ip)
    return AiGenerateImageOut(
        image_url=public_url(storage_key),
        storage_key=storage_key,
        remaining_hour=quota.remaining_hour,
        remaining_day=quota.remaining_day,
    )


@router.post("/transform-image", response_model=AiGenerateImageOut)
async def transform_image(
    request: Request,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
    tool_id: int = Form(..., ge=1),
    image: UploadFile = File(...),
):
    if not avalai.is_enabled(db):
        raise HTTPException(status_code=503, detail="طراحی هوشمند غیرفعال است")

    tool = get_tool(db, tool_id)
    if tool is None or not tool.enabled:
        raise HTTPException(status_code=404, detail="ابزار یافت نشد")

    ip = _check_burst(request)
    log_prompt = tool_log_prompt(tool)
    quota_prompt = f"[ابزار:{tool.id}] {tool.name}"
    enforce_generation(
        db,
        user=user,
        ip=ip,
        prompt=quota_prompt,
        skip_duplicate=True,
    )
    model = avalai.image_model(db)

    raw = await image.read()
    _storage_name, mime, _ext = validate_image_bytes(
        raw,
        image.filename or "upload.jpg",
        image.content_type,
        max_bytes=_MAX_UPLOAD_BYTES,
    )

    try:
        image_bytes = await avalai.transform_image(
            db,
            image_bytes=raw,
            mime=mime,
            tool_prompt=tool.prompt,
        )
    except AiServiceError as exc:
        record_ai_attempt(
            db,
            user=user,
            ip=ip,
            prompt=log_prompt,
            model=model,
            status="failed",
            error_message=exc.user_message,
            generation_type="image_tool",
            tool_id=tool.id,
        )
        logger.warning("AI transform user error: %s", exc.internal)
        status_code = 429 if exc.retryable else 502
        raise HTTPException(status_code=status_code, detail=exc.user_message) from exc

    storage_key = save_upload_secure(
        prepare_print_artwork(image_bytes),
        "ai-generated",
        "design.png",
    )
    record_generation(
        db,
        user=user,
        ip=ip,
        prompt=log_prompt,
        model=model,
        storage_key=storage_key,
        generation_type="image_tool",
        tool_id=tool.id,
    )

    quota = get_quota_status(db, user=user, ip=ip)
    return AiGenerateImageOut(
        image_url=public_url(storage_key),
        storage_key=storage_key,
        remaining_hour=quota.remaining_hour,
        remaining_day=quota.remaining_day,
    )
