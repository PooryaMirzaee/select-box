"""API مدیریت AI — ادمین."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.schemas.ai import (
    AiAdminConfigOut,
    AiAdminConfigPatch,
    AiLogOut,
    AiLogsPageOut,
    AiStatsOut,
    AiSuggestedPromptAdminOut,
    AiSuggestedPromptIn,
    AiToolAdminOut,
    AiToolIn,
)
from app.services import ai_admin

router = APIRouter(
    prefix="/admin/ai",
    tags=["admin-ai"],
    dependencies=[Depends(require_admin)],
)


@router.get("/config", response_model=AiAdminConfigOut)
def admin_ai_config(db: Session = Depends(get_db)):
    return AiAdminConfigOut(system_prompt_suffix=ai_admin.get_system_prompt_suffix(db))


@router.patch("/config", response_model=AiAdminConfigOut)
def admin_ai_config_patch(body: AiAdminConfigPatch, db: Session = Depends(get_db)):
    result = ai_admin.set_admin_config(db, system_prompt_suffix=body.system_prompt_suffix)
    return AiAdminConfigOut(system_prompt_suffix=str(result["system_prompt_suffix"]))


@router.get("/tools", response_model=list[AiToolAdminOut])
def admin_list_tools(db: Session = Depends(get_db)):
    return [
        AiToolAdminOut(
            id=t.id,
            name=t.name,
            description=t.description,
            prompt=t.prompt,
            sort_order=t.sort_order,
            enabled=t.enabled,
            created_at=t.created_at,  # type: ignore[arg-type]
        )
        for t in ai_admin.list_all_tools(db)
    ]


@router.post("/tools", response_model=AiToolAdminOut)
def admin_create_tool(body: AiToolIn, db: Session = Depends(get_db)):
    row = ai_admin.create_tool(
        db,
        name=body.name,
        description=body.description,
        prompt=body.prompt,
        sort_order=body.sort_order,
        enabled=body.enabled,
    )
    return AiToolAdminOut(
        id=row.id,
        name=row.name,
        description=row.description,
        prompt=row.prompt,
        sort_order=row.sort_order,
        enabled=row.enabled,
        created_at=row.created_at,  # type: ignore[arg-type]
    )


@router.patch("/tools/{tool_id}", response_model=AiToolAdminOut)
def admin_update_tool(tool_id: int, body: AiToolIn, db: Session = Depends(get_db)):
    row = ai_admin.update_tool(
        db,
        tool_id,
        name=body.name,
        description=body.description,
        prompt=body.prompt,
        sort_order=body.sort_order,
        enabled=body.enabled,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="ابزار یافت نشد")
    return AiToolAdminOut(
        id=row.id,
        name=row.name,
        description=row.description,
        prompt=row.prompt,
        sort_order=row.sort_order,
        enabled=row.enabled,
        created_at=row.created_at,  # type: ignore[arg-type]
    )


@router.delete("/tools/{tool_id}")
def admin_delete_tool(tool_id: int, db: Session = Depends(get_db)):
    if not ai_admin.delete_tool(db, tool_id):
        raise HTTPException(status_code=404, detail="ابزار یافت نشد")
    return {"ok": True}


@router.get("/prompts", response_model=list[AiSuggestedPromptAdminOut])
def admin_list_prompts(db: Session = Depends(get_db)):
    return [
        AiSuggestedPromptAdminOut(
            id=p.id,
            text=p.text,
            label=p.label,
            sort_order=p.sort_order,
            enabled=p.enabled,
            created_at=p.created_at,  # type: ignore[arg-type]
        )
        for p in ai_admin.list_all_suggested_prompts(db)
    ]


@router.post("/prompts", response_model=AiSuggestedPromptAdminOut)
def admin_create_prompt(body: AiSuggestedPromptIn, db: Session = Depends(get_db)):
    row = ai_admin.create_suggested_prompt(
        db,
        text=body.text,
        label=body.label,
        sort_order=body.sort_order,
        enabled=body.enabled,
    )
    return AiSuggestedPromptAdminOut(
        id=row.id,
        text=row.text,
        label=row.label,
        sort_order=row.sort_order,
        enabled=row.enabled,
        created_at=row.created_at,  # type: ignore[arg-type]
    )


@router.patch("/prompts/{prompt_id}", response_model=AiSuggestedPromptAdminOut)
def admin_update_prompt(prompt_id: int, body: AiSuggestedPromptIn, db: Session = Depends(get_db)):
    row = ai_admin.update_suggested_prompt(
        db,
        prompt_id,
        text=body.text,
        label=body.label,
        sort_order=body.sort_order,
        enabled=body.enabled,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="پرامپت یافت نشد")
    return AiSuggestedPromptAdminOut(
        id=row.id,
        text=row.text,
        label=row.label,
        sort_order=row.sort_order,
        enabled=row.enabled,
        created_at=row.created_at,  # type: ignore[arg-type]
    )


@router.delete("/prompts/{prompt_id}")
def admin_delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    if not ai_admin.delete_suggested_prompt(db, prompt_id):
        raise HTTPException(status_code=404, detail="پرامپت یافت نشد")
    return {"ok": True}


@router.get("/logs", response_model=AiLogsPageOut)
def admin_list_logs(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    status: str | None = Query(None, pattern=r"^(success|failed)$"),
    search: str | None = Query(None, max_length=200),
    user_id: int | None = Query(None, ge=1),
):
    rows, total = ai_admin.list_logs(
        db,
        page=page,
        page_size=page_size,
        status=status,
        search=search,
        user_id=user_id,
    )
    items = [
        AiLogOut(
            id=log.id,
            user_id=log.user_id,
            user_phone=user.phone if user else None,
            ip_address=log.ip_address,
            prompt_text=log.prompt_text or log.prompt_preview,
            model=log.model,
            status=log.status or "success",
            error_message=log.error_message,
            storage_key=log.storage_key,
            aspect_ratio=log.aspect_ratio or "1:1",
            generation_type=log.generation_type or "text",
            tool_id=log.tool_id,
            tool_name=tool.name if tool else None,
            created_at=log.created_at,  # type: ignore[arg-type]
        )
        for log, user, tool in rows
    ]
    return AiLogsPageOut(items=items, total=total, page=page, page_size=page_size)


@router.get("/stats", response_model=AiStatsOut)
def admin_ai_stats(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    data = ai_admin.stats(db, days=days)
    return AiStatsOut.model_validate(data)
