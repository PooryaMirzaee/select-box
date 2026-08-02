"""API ادمین برای غنی‌سازی خودکار محصولات از وب."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.models.enrichment import ProductEnrichmentJob
from app.schemas.enrichment import (
    EnrichmentApproveIn,
    EnrichmentBulkIn,
    EnrichmentBulkOut,
    EnrichmentEnqueueIn,
    EnrichmentEnqueueOut,
    EnrichmentJobListOut,
    EnrichmentJobOut,
    EnrichmentStatsOut,
)
from app.services.enrichment import jobs as enrich_jobs
from app.services.enrichment.runner import kick_enrichment_worker

router = APIRouter(prefix="/admin/enrichment", tags=["admin-enrichment"], dependencies=[Depends(require_admin)])


@router.post("/enqueue", response_model=EnrichmentEnqueueOut)
def enqueue(body: EnrichmentEnqueueIn, db: Session = Depends(get_db)):
    try:
        job_ids, skipped = enrich_jobs.enqueue_products(
            db,
            body.product_ids,
            auto_apply=body.auto_apply,
            mode=body.mode,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    if job_ids:
        kick_enrichment_worker()
    return EnrichmentEnqueueOut(queued=len(job_ids), skipped=skipped, job_ids=job_ids)


@router.get("/stats", response_model=EnrichmentStatsOut)
def stats(db: Session = Depends(get_db)):
    return EnrichmentStatsOut(**enrich_jobs.job_stats(db))


@router.get("/jobs", response_model=EnrichmentJobListOut)
def list_jobs(
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    rows, total = enrich_jobs.list_jobs_page(db, status=status, limit=limit, offset=offset)
    return EnrichmentJobListOut(
        items=[EnrichmentJobOut(**enrich_jobs.serialize_job(db, j)) for j in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/jobs/bulk", response_model=EnrichmentBulkOut)
def bulk_action(body: EnrichmentBulkIn, db: Session = Depends(get_db)):
    """اعمال/رد/تلاش مجدد گروهی — با job_ids یا status_filter."""
    job_ids = list(body.job_ids or [])
    if body.status_filter and not job_ids:
        # برای approve معمولاً needs_review؛ برای retry معمولاً failed
        job_ids = enrich_jobs.job_ids_for_status(db, body.status_filter, limit=2000)
    if not job_ids:
        raise HTTPException(status_code=400, detail="هیچ جابی برای عملیات گروهی انتخاب نشده")

    result = enrich_jobs.run_bulk_action(db, action=body.action, job_ids=job_ids)
    if body.action == "retry" and result["done"]:
        kick_enrichment_worker()
    return EnrichmentBulkOut(**result)


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
