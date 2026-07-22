"""دانلود و اعتبارسنجی تصویر از URL برای enrichment."""

from __future__ import annotations

import logging
import uuid
from urllib.parse import urlparse

from app.services.enrichment.http_client import enrichment_client
from app.services.storage import save_upload_secure
from app.services.upload_security import _detect_image

logger = logging.getLogger(__name__)

MAX_BYTES = 6 * 1024 * 1024


def download_image_to_storage(url: str, relative_dir: str) -> tuple[str, str]:
    """برمی‌گرداند: (storage_key, mime_type)"""
    with enrichment_client(timeout=25.0) as client:
        res = client.get(url)
        if res.status_code >= 400:
            raise ValueError(f"download HTTP {res.status_code}")
        data = res.content
    if not data or len(data) > MAX_BYTES:
        raise ValueError("حجم تصویر نامعتبر است")
    detected = _detect_image(data)
    if not detected:
        raise ValueError("فایل تصویر معتبر نیست")
    mime, ext = detected
    name = f"{uuid.uuid4().hex[:12]}{ext}"
    key = save_upload_secure(data, relative_dir, name)
    return key, mime


def host_of(url: str) -> str:
    try:
        return urlparse(url).netloc or ""
    except Exception:
        return ""
