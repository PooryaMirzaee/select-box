from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AiQuotaOut(BaseModel):
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


class AiSuggestedPromptOut(BaseModel):
    id: int
    text: str
    label: str | None = None


class AiToolOut(BaseModel):
    id: int
    name: str
    description: str | None = None


class AiConfigOut(BaseModel):
    suggested_prompts: list[AiSuggestedPromptOut]
    tools: list[AiToolOut]


class AiHistoryItemOut(BaseModel):
    prompt: str
    created_at: datetime
    status: str
    storage_key: str | None = None
    generation_type: str = "text"
    tool_name: str | None = None


class AiStatusOut(BaseModel):
    enabled: bool
    quota: AiQuotaOut | None = None
    config: AiConfigOut | None = None
    history: list[AiHistoryItemOut] = Field(default_factory=list)


class AiGenerateImageIn(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=400)
    aspect_ratio: str = Field(default="1:1", pattern=r"^\d+:\d+$")


class AiGenerateImageOut(BaseModel):
    image_url: str
    storage_key: str
    remaining_hour: int
    remaining_day: int


# --- Admin ---


class AiSuggestedPromptIn(BaseModel):
    text: str = Field(..., min_length=3, max_length=400)
    label: str | None = Field(default=None, max_length=80)
    sort_order: int = 0
    enabled: bool = True


class AiSuggestedPromptAdminOut(AiSuggestedPromptIn):
    id: int
    created_at: datetime


class AiToolIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=240)
    prompt: str = Field(..., min_length=10, max_length=2000)
    sort_order: int = 0
    enabled: bool = True


class AiToolAdminOut(AiToolIn):
    id: int
    created_at: datetime


class AiAdminConfigOut(BaseModel):
    system_prompt_suffix: str


class AiAdminConfigPatch(BaseModel):
    system_prompt_suffix: str | None = Field(default=None, max_length=2000)


class AiLogOut(BaseModel):
    id: int
    user_id: int | None
    user_phone: str | None = None
    ip_address: str
    prompt_text: str
    model: str
    status: str
    error_message: str | None = None
    storage_key: str | None = None
    aspect_ratio: str
    generation_type: str = "text"
    tool_id: int | None = None
    tool_name: str | None = None
    created_at: datetime


class AiLogsPageOut(BaseModel):
    items: list[AiLogOut]
    total: int
    page: int
    page_size: int


class AiStatsOut(BaseModel):
    total: int
    success: int
    failed: int
    today: int
    today_success: int
    unique_users_today: int
    top_prompts: list[dict[str, object]]
