"""منطق صف enrichment: enqueue، process، approve."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Design, Product, ProductImage
from app.models.enrichment import ProductEnrichmentCandidate, ProductEnrichmentJob
from app.services.enrichment.copywriter import write_product_copy
from app.services.enrichment.download import download_image_to_storage
from app.services.enrichment.scrape_images import search_product_images
from app.services.storage import public_url

logger = logging.getLogger(__name__)

ACTIVE = ("pending", "running", "needs_review")


def enqueue_products(
    db: Session,
    product_ids: list[int],
    *,
    auto_apply: bool = True,
) -> tuple[list[int], int]:
    """برمی‌گرداند (job_ids, skipped)."""
    queued: list[int] = []
    skipped = 0
    for pid in product_ids:
        product = db.get(Product, pid)
        if product is None:
            skipped += 1
            continue
        existing = db.scalar(
            select(ProductEnrichmentJob.id).where(
                ProductEnrichmentJob.product_id == pid,
                ProductEnrichmentJob.status.in_(ACTIVE),
            )
        )
        if existing:
            skipped += 1
            continue
        design = db.get(Design, product.design_id)
        job = ProductEnrichmentJob(
            product_id=pid,
            design_code=(design.code if design else None),
            status="pending",
            auto_apply=auto_apply,
            attempts=0,
        )
        db.add(job)
        db.flush()
        queued.append(job.id)
    db.commit()
    return queued, skipped


def claim_next_job(db: Session) -> ProductEnrichmentJob | None:
    job = db.scalar(
        select(ProductEnrichmentJob)
        .where(ProductEnrichmentJob.status == "pending")
        .order_by(ProductEnrichmentJob.id)
        .limit(1)
    )
    if job is None:
        return None
    job.status = "running"
    job.attempts = int(job.attempts or 0) + 1
    db.commit()
    db.refresh(job)
    return job


def _apply_to_product(
    db: Session,
    job: ProductEnrichmentJob,
    candidate: ProductEnrichmentCandidate,
    *,
    apply_description: bool,
) -> None:
    product = db.get(Product, job.product_id)
    if product is None:
        raise ValueError("product missing")
    if not candidate.local_storage_key:
        raise ValueError("candidate has no local file")

    max_order = db.scalar(
        select(func.max(ProductImage.sort_order)).where(ProductImage.product_id == product.id)
    )
    db.add(
        ProductImage(
            product_id=product.id,
            storage_key=candidate.local_storage_key,
            mime_type=candidate.mime_type or "image/jpeg",
            alt_text=product.title[:255],
            sort_order=int(max_order or 0) + 1,
        )
    )
    for c in job.candidates:
        c.is_selected = c.id == candidate.id
    if apply_description:
        if job.description_draft:
            product.description = job.description_draft
        if job.meta_draft:
            product.meta_description = job.meta_draft
            if not product.meta_title:
                product.meta_title = f"{product.title} | SelectBox"
    job.status = "approved"
    job.finished_at = datetime.now(timezone.utc)
    job.error = None


def process_job(db: Session, job_id: int) -> None:
    job = db.scalar(
        select(ProductEnrichmentJob)
        .where(ProductEnrichmentJob.id == job_id)
        .options(joinedload(ProductEnrichmentJob.candidates))
    )
    if job is None:
        return
    product = db.get(Product, job.product_id)
    if product is None:
        job.status = "failed"
        job.error = "محصول یافت نشد"
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        return

    query = (product.title or "").strip()
    job.query_used = query
    db.commit()

    try:
        hits = search_product_images(query, limit=5)
        if not hits:
            raise ValueError("تصویری یافت نشد")

        # پاک کردن کاندیدهای قبلی
        for old in list(job.candidates):
            db.delete(old)
        db.flush()

        saved = 0
        for hit in hits:
            try:
                key, mime = download_image_to_storage(
                    hit.url, f"enrichment/{job.id}"
                )
            except Exception as e:
                logger.info("skip image %s: %s", hit.url[:80], e)
                continue
            db.add(
                ProductEnrichmentCandidate(
                    job_id=job.id,
                    image_url=hit.url[:1024],
                    source=hit.source,
                    score=hit.score,
                    local_storage_key=key,
                    mime_type=mime,
                )
            )
            saved += 1
        if saved == 0:
            raise ValueError("دانلود هیچ تصویری موفق نبود")

        desc, meta = write_product_copy(db, title=product.title, query=query)
        job.description_draft = desc
        job.meta_draft = meta
        db.commit()
        db.refresh(job)

        if job.auto_apply:
            best = db.scalar(
                select(ProductEnrichmentCandidate)
                .where(ProductEnrichmentCandidate.job_id == job.id)
                .order_by(
                    ProductEnrichmentCandidate.score.desc(),
                    ProductEnrichmentCandidate.id,
                )
                .limit(1)
            )
            if best is None:
                raise ValueError("کاندید موجود نیست")
            _apply_to_product(db, job, best, apply_description=True)
            db.commit()
        else:
            job.status = "needs_review"
            db.commit()
    except Exception as e:
        logger.exception("enrichment job %s failed", job_id)
        job.status = "failed"
        job.error = str(e)[:800]
        job.finished_at = datetime.now(timezone.utc)
        db.commit()


def approve_job(
    db: Session,
    job_id: int,
    *,
    candidate_id: int | None,
    apply_description: bool = True,
) -> ProductEnrichmentJob:
    job = db.scalar(
        select(ProductEnrichmentJob)
        .where(ProductEnrichmentJob.id == job_id)
        .options(joinedload(ProductEnrichmentJob.candidates))
    )
    if job is None:
        raise LookupError("job not found")
    if candidate_id is not None:
        cand = next((c for c in job.candidates if c.id == candidate_id), None)
    else:
        cand = next((c for c in job.candidates if c.is_selected), None) or (
            sorted(job.candidates, key=lambda c: (-c.score, c.id))[0] if job.candidates else None
        )
    if cand is None:
        raise ValueError("کاندید انتخاب نشده")
    _apply_to_product(db, job, cand, apply_description=apply_description)
    db.commit()
    db.refresh(job)
    return job


def reject_job(db: Session, job_id: int) -> ProductEnrichmentJob:
    job = db.get(ProductEnrichmentJob, job_id)
    if job is None:
        raise LookupError("job not found")
    job.status = "rejected"
    job.finished_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    return job


def retry_job(db: Session, job_id: int) -> ProductEnrichmentJob:
    job = db.get(ProductEnrichmentJob, job_id)
    if job is None:
        raise LookupError("job not found")
    job.status = "pending"
    job.error = None
    job.finished_at = None
    db.commit()
    db.refresh(job)
    return job


def job_stats(db: Session) -> dict[str, int]:
    rows = db.execute(
        select(ProductEnrichmentJob.status, func.count())
        .group_by(ProductEnrichmentJob.status)
    ).all()
    counts = {s: 0 for s in ("pending", "running", "needs_review", "approved", "rejected", "failed")}
    for status, n in rows:
        counts[str(status)] = int(n)
    return counts


def serialize_job(db: Session, job: ProductEnrichmentJob) -> dict:
    product = db.get(Product, job.product_id)
    cands = db.scalars(
        select(ProductEnrichmentCandidate)
        .where(ProductEnrichmentCandidate.job_id == job.id)
        .order_by(ProductEnrichmentCandidate.score.desc(), ProductEnrichmentCandidate.id)
    ).all()
    return {
        "id": job.id,
        "product_id": job.product_id,
        "product_title": product.title if product else "—",
        "product_slug": product.slug if product else "",
        "design_code": job.design_code,
        "status": job.status,
        "query_used": job.query_used,
        "description_draft": job.description_draft,
        "meta_draft": job.meta_draft,
        "error": job.error,
        "attempts": job.attempts,
        "auto_apply": job.auto_apply,
        "candidates": [
            {
                "id": c.id,
                "image_url": c.image_url,
                "source": c.source,
                "score": c.score,
                "local_url": public_url(c.local_storage_key) if c.local_storage_key else None,
                "is_selected": c.is_selected,
            }
            for c in cands
        ],
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
    }
