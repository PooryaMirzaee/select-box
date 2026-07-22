"""Worker پس‌زمینه enrichment — درخواست HTTP را بلاک نمی‌کند."""

from __future__ import annotations

import logging
import threading
import time

from app.db.session import SessionLocal
from app.services.enrichment.jobs import claim_next_job, process_job

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_running = False
_stop = threading.Event()


def kick_enrichment_worker() -> None:
    """اگر worker روشن نیست، یک thread daemon شروع کن."""
    global _running
    with _lock:
        if _running:
            return
        _running = True
        _stop.clear()
        t = threading.Thread(target=_loop, name="enrichment-worker", daemon=True)
        t.start()


def _loop() -> None:
    global _running
    idle_rounds = 0
    try:
        while not _stop.is_set():
            db = SessionLocal()
            try:
                job = claim_next_job(db)
                if job is None:
                    idle_rounds += 1
                    if idle_rounds >= 30:
                        # ~30 ثانیه بیکار → خاموش تا kick بعدی
                        break
                    time.sleep(1.0)
                    continue
                idle_rounds = 0
                process_job(db, job.id)
                time.sleep(0.6)
            except Exception:
                logger.exception("enrichment worker loop error")
                time.sleep(2.0)
            finally:
                db.close()
    finally:
        with _lock:
            _running = False
