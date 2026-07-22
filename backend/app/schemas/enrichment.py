"""Schemas for product enrichment admin API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class EnrichmentEnqueueIn(BaseModel):
    product_ids: list[int] = Field(min_length=1, max_length=200)
    auto_apply: bool = True


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
    query_used: str | None = None
    description_draft: str | None = None
    meta_draft: str | None = None
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
