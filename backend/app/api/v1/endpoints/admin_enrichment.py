"""API ادمین برای غنی‌سازی خودکار محصولات از وب."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.models.enrichment import ProductEnrichmentJob
from app.schemas.enrichment import (
    EnrichmentApproveIn,
    EnrichmentEnqueueIn,
    EnrichmentEnqueueOut,
    EnrichmentJobOut,
    EnrichmentStatsOut,
)
from app.services.enrichment import jobs as enrich_jobs
from app.services.enrichment.runner import kick_enrichment_worker

router = APIRouter(prefix="/admin/enrichment", tags=["admin-enrichment"], dependencies=[Depends(require_admin)])


@router.post("/enqueue", response_model=EnrichmentEnqueueOut)
def enqueue(body: EnrichmentEnqueueIn, db: Session = Depends(get_db)):
    job_ids, skipped = enrich_jobs.enqueue_products(
        db, body.product_ids, auto_apply=body.auto_apply
    )
    if job_ids:
        kick_enrichment_worker()
    return EnrichmentEnqueueOut(queued=len(job_ids), skipped=skipped, job_ids=job_ids)


@router.get("/stats", response_model=EnrichmentStatsOut)
def stats(db: Session = Depends(get_db)):
    return EnrichmentStatsOut(**enrich_jobs.job_stats(db))


@router.get("/jobs", response_model=list[EnrichmentJobOut])
def list_jobs(
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = select(ProductEnrichmentJob).order_by(ProductEnrichmentJob.id.desc()).limit(limit)
    if status:
        q = q.where(ProductEnrichmentJob.status == status)
    rows = db.scalars(q).all()
    return [EnrichmentJobOut(**enrich_jobs.serialize_job(db, j)) for j in rows]


@router.get("/jobs/{job_id}", response_model=EnrichmentJobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(ProductEnrichmentJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="جاب یافت نشد")
    return EnrichmentJobOut(**enrich_jobs.serialize_job(db, job))


@router.post("/jobs/{job_id}/approve", response_model=EnrichmentJobOut)
def approve(job_id: int, body: EnrichmentApproveIn, db: Session = Depends(get_db)):
    try:
        job = enrich_jobs.approve_job(
            db,
            job_id,
            candidate_id=body.candidate_id,
            apply_description=body.apply_description,
        )
    except LookupError:
        raise HTTPException(status_code=404, detail="جاب یافت نشد") from None
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return EnrichmentJobOut(**enrich_jobs.serialize_job(db, job))


@router.post("/jobs/{job_id}/reject", response_model=EnrichmentJobOut)
def reject(job_id: int, db: Session = Depends(get_db)):
    try:
        job = enrich_jobs.reject_job(db, job_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="جاب یافت نشد") from None
    return EnrichmentJobOut(**enrich_jobs.serialize_job(db, job))


@router.post("/jobs/{job_id}/retry", response_model=EnrichmentJobOut)
def retry(job_id: int, db: Session = Depends(get_db)):
    try:
        job = enrich_jobs.retry_job(db, job_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="جاب یافت نشد") from None
    kick_enrichment_worker()
    return EnrichmentJobOut(**enrich_jobs.serialize_job(db, job))


@router.post("/worker/kick")
def kick_worker():
    kick_enrichment_worker()
    return {"ok": True}
