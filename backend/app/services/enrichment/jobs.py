"""منطق صف enrichment: enqueue، process، approve."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Category, Design, Product, ProductImage
from app.models.enrichment import ProductEnrichmentCandidate, ProductEnrichmentJob
from app.services.enrichment.categorizer import category_full_path, suggest_category
from app.services.enrichment.copywriter import write_product_copy
from app.services.enrichment.download import download_image_to_storage
from app.services.enrichment.http_client import friendly_network_error
from app.services.enrichment.scrape_images import search_product_images
from app.services.storage import public_url

logger = logging.getLogger(__name__)

ACTIVE = ("pending", "running", "needs_review")
VALID_MODES = ("images", "description", "both", "category")


def enqueue_products(
    db: Session,
    product_ids: list[int],
    *,
    auto_apply: bool = True,
    mode: str = "both",
) -> tuple[list[int], int]:
    """برمی‌گرداند (job_ids, skipped)."""
    mode_norm = (mode or "both").strip().lower()
    if mode_norm not in VALID_MODES:
        raise ValueError("mode باید images یا description یا both باشد")

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
            mode=mode_norm,
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


def _apply_images(
    db: Session,
    job: ProductEnrichmentJob,
    candidate: ProductEnrichmentCandidate,
) -> None:
    product = db.get(Product, job.product_id)
    if product is None:
        raise ValueError("product missing")
    if not candidate.local_storage_key:
        raise ValueError("candidate has no local file")

    existing = db.scalars(
        select(ProductImage)
        .where(ProductImage.product_id == product.id)
        .order_by(ProductImage.sort_order, ProductImage.id)
    ).all()
    if existing:
        img = existing[0]
        img.storage_key = candidate.local_storage_key
        img.mime_type = candidate.mime_type or img.mime_type or "image/jpeg"
        img.alt_text = product.title[:255]
    else:
        db.add(
            ProductImage(
                product_id=product.id,
                storage_key=candidate.local_storage_key,
                mime_type=candidate.mime_type or "image/jpeg",
                alt_text=product.title[:255],
                sort_order=1,
            )
        )
    for c in job.candidates:
        c.is_selected = c.id == candidate.id


def _apply_description(db: Session, job: ProductEnrichmentJob) -> None:
    product = db.get(Product, job.product_id)
    if product is None:
        raise ValueError("product missing")
    if job.description_draft:
        product.description = job.description_draft
    if job.meta_draft:
        product.meta_description = job.meta_draft
        if not product.meta_title:
            product.meta_title = f"{product.title} | فروشگاه دشتستان"


def _apply_category(db: Session, job: ProductEnrichmentJob) -> None:
    product = db.get(Product, job.product_id)
    if product is None:
        raise ValueError("product missing")
    if not job.category_draft_id:
        raise ValueError("دسته پیشنهادی وجود ندارد")
    category = db.get(Category, job.category_draft_id)
    if category is None:
        raise ValueError("دسته پیشنهادی حذف شده است")
    product.parent_category_id = category.id


def _apply_to_product(
    db: Session,
    job: ProductEnrichmentJob,
    candidate: ProductEnrichmentCandidate | None,
    *,
    apply_description: bool,
    apply_images: bool,
    apply_category: bool = False,
) -> None:
    mode = (job.mode or "both").strip().lower()
    want_images = apply_images and mode in ("images", "both")
    want_desc = apply_description and mode in ("description", "both")
    want_category = apply_category and mode == "category"

    if want_images:
        if candidate is None:
            raise ValueError("کاندید تصویر انتخاب نشده")
        _apply_images(db, job, candidate)
    if want_desc:
        _apply_description(db, job)
    if want_category:
        _apply_category(db, job)

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
    mode = (job.mode or "both").strip().lower()
    if mode not in VALID_MODES:
        mode = "both"
        job.mode = mode
    db.commit()

    try:
        if mode == "category":
            suggestion = suggest_category(db, title=product.title)
            job.category_draft_id = suggestion.category.id
            job.category_draft_name = category_full_path(db, suggestion.category)[:512]
            db.commit()
            db.refresh(job)

            if job.auto_apply:
                _apply_to_product(
                    db,
                    job,
                    None,
                    apply_description=False,
                    apply_images=False,
                    apply_category=True,
                )
            else:
                job.status = "needs_review"
            db.commit()
            return

        saved = 0
        if mode in ("images", "both"):
            hits = search_product_images(query, limit=5)
            if not hits and mode == "images":
                raise ValueError("تصویری یافت نشد")

            for old in list(job.candidates):
                db.delete(old)
            db.flush()

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
            if saved == 0 and mode == "images":
                raise ValueError("دانلود هیچ تصویری موفق نبود")
            if saved == 0 and mode == "both":
                logger.warning("enrichment job %s: no images, continuing with description", job_id)

        if mode in ("description", "both"):
            desc, meta = write_product_copy(db, title=product.title, query=query)
            job.description_draft = desc
            job.meta_draft = meta

        db.commit()
        db.refresh(job)

        if job.auto_apply:
            best = None
            if mode in ("images", "both"):
                best = db.scalar(
                    select(ProductEnrichmentCandidate)
                    .where(ProductEnrichmentCandidate.job_id == job.id)
                    .order_by(
                        ProductEnrichmentCandidate.score.desc(),
                        ProductEnrichmentCandidate.id,
                    )
                    .limit(1)
                )
                if best is None and mode == "images":
                    raise ValueError("کاندید موجود نیست")

            if mode == "description":
                _apply_to_product(
                    db, job, None, apply_description=True, apply_images=False
                )
            elif mode == "images":
                assert best is not None
                _apply_to_product(
                    db, job, best, apply_description=False, apply_images=True
                )
            else:
                # both: عکس اگر بود اعمال شود؛ توضیح اگر بود اعمال شود
                if best is None and not job.description_draft:
                    raise ValueError("نه تصویر و نه توضیح پیدا شد")
                _apply_to_product(
                    db,
                    job,
                    best,
                    apply_description=bool(job.description_draft),
                    apply_images=best is not None,
                )
            db.commit()
        else:
            job.status = "needs_review"
            db.commit()
    except Exception as e:
        logger.exception("enrichment job %s failed", job_id)
        job.status = "failed"
        job.error = friendly_network_error(e)
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

    mode = (job.mode or "both").strip().lower()

    if mode == "category":
        _apply_to_product(
            db,
            job,
            None,
            apply_description=False,
            apply_images=False,
            apply_category=True,
        )
        db.commit()
        db.refresh(job)
        return job

    cand: ProductEnrichmentCandidate | None = None
    if mode in ("images", "both") and job.candidates:
        if candidate_id is not None:
            cand = next((c for c in job.candidates if c.id == candidate_id), None)
        else:
            cand = next((c for c in job.candidates if c.is_selected), None) or (
                sorted(job.candidates, key=lambda c: (-c.score, c.id))[0]
            )
        if cand is None and mode == "images":
            raise ValueError("کاندید انتخاب نشده")

    apply_images = mode in ("images", "both") and cand is not None
    apply_desc = apply_description and mode in ("description", "both")
    if mode == "description":
        apply_images = False
        apply_desc = True
    if not apply_images and not apply_desc:
        raise ValueError("چیزی برای اعمال وجود ندارد")

    _apply_to_product(
        db,
        job,
        cand,
        apply_description=apply_desc,
        apply_images=apply_images,
    )
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
        "mode": getattr(job, "mode", None) or "both",
        "query_used": job.query_used,
        "description_draft": job.description_draft,
        "meta_draft": job.meta_draft,
        "category_draft_id": getattr(job, "category_draft_id", None),
        "category_draft_name": getattr(job, "category_draft_name", None),
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
