"""Schemas for product enrichment admin API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class EnrichmentEnqueueIn(BaseModel):
    product_ids: list[int] = Field(min_length=1, max_length=500)
    auto_apply: bool = True
    # images = فقط عکس | description = فقط توضیح | both = هر دو | category = دسته‌بندی خودکار
    mode: str = Field(default="both", pattern="^(images|description|both|category)$")


class EnrichmentEnqueueOut(BaseModel):
    queued: int
    skipped: int
    job_ids: list[int]


class EnrichmentCandidateOut(BaseModel):
    id: int
    image_url: str
    source: str | None = None
    score: float
    local_url: str | None = None
    is_selected: bool


class EnrichmentJobOut(BaseModel):
    id: int
    product_id: int
    product_title: str
    product_slug: str
    design_code: str | None = None
    status: str
    mode: str = "both"
    query_used: str | None = None
    description_draft: str | None = None
    meta_draft: str | None = None
    category_draft_id: int | None = None
    category_draft_name: str | None = None
    current_category_id: int | None = None
    current_category_name: str | None = None
    error: str | None = None
    attempts: int
    auto_apply: bool
    candidates: list[EnrichmentCandidateOut] = []
    created_at: str | None = None
    finished_at: str | None = None


class EnrichmentStatsOut(BaseModel):
    pending: int
    running: int
    needs_review: int
    approved: int
    rejected: int
    failed: int


class EnrichmentApproveIn(BaseModel):
    candidate_id: int | None = None
    apply_description: bool = True


class EnrichmentBulkIn(BaseModel):
    """عملیات گروهی روی جاب‌ها.

    یا job_ids بفرستید، یا status_filter تا همه جاب‌های آن وضعیت پردازش شوند.
    """

    job_ids: list[int] = Field(default_factory=list, max_length=2000)
    action: str = Field(pattern="^(approve|reject|retry)$")
    status_filter: str | None = Field(
        default=None,
        pattern="^(pending|running|needs_review|approved|rejected|failed)$",
    )


class EnrichmentBulkOut(BaseModel):
    done: int
    failed: int
    errors: list[str] = []


class EnrichmentJobListOut(BaseModel):
    items: list[EnrichmentJobOut]
    total: int
    limit: int
    offset: int
