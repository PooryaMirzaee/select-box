"""CLI غنی‌سازی — برای تست یا کران بدون UI.

  python scripts/enrich_products.py --limit 5
  python scripts/enrich_products.py --ids 1,2,3 --no-auto-apply
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import func, select

import app.models  # noqa: F401
from app.db.session import SessionLocal
from app.models import Product, ProductImage
from app.services.enrichment.jobs import claim_next_job, enqueue_products, process_job
from app.services.enrichment.runner import kick_enrichment_worker


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--limit", type=int, default=10)
    p.add_argument("--ids", type=str, default="", help="comma product ids")
    p.add_argument("--missing-images", action="store_true", default=True)
    p.add_argument("--no-auto-apply", action="store_true")
    p.add_argument("--sync", action="store_true", help="اجرا در همین پروسه تا تمام")
    args = p.parse_args()

    db = SessionLocal()
    try:
        if args.ids.strip():
            ids = [int(x) for x in args.ids.split(",") if x.strip()]
        else:
            q = select(Product.id).order_by(Product.id)
            if args.missing_images:
                img_count = (
                    select(func.count(ProductImage.id))
                    .where(ProductImage.product_id == Product.id)
                    .correlate(Product)
                    .scalar_subquery()
                )
                q = q.where(img_count == 0)
            ids = list(db.scalars(q.limit(args.limit)).all())

        if not ids:
            print("محصولی برای صف نشد")
            return

        job_ids, skipped = enqueue_products(db, ids, auto_apply=not args.no_auto_apply)
        print(f"queued={len(job_ids)} skipped={skipped} ids={job_ids}")

        if args.sync:
            while True:
                job = claim_next_job(db)
                if job is None:
                    break
                print(f"  processing job {job.id} product={job.product_id} …")
                process_job(db, job.id)
                time.sleep(0.3)
            print("done (sync)")
        else:
            kick_enrichment_worker()
            print("worker kicked (background)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
