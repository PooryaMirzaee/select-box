"""دانلود و بهینه‌سازی تصویر از URL برای enrichment — نسخه پرکیفیت."""

from __future__ import annotations

import logging
import uuid
from io import BytesIO
from urllib.parse import urlparse

from app.services.enrichment.http_client import enrichment_client
from app.services.storage import save_upload_secure
from app.services.upload_security import _detect_image

logger = logging.getLogger(__name__)

MAX_BYTES = 12 * 1024 * 1024
MIN_EDGE_PX = 400
TARGET_MAX_EDGE = 1600
WEBP_QUALITY = 90
JPEG_QUALITY = 92


def _enhance_image(data: bytes) -> tuple[bytes, str, str]:
    """
    تصویر را به نسخه نمایشی باکیفیت تبدیل می‌کند.
    برمی‌گرداند: (bytes, mime, ext)
    """
    detected = _detect_image(data)
    if not detected:
        raise ValueError("فایل تصویر معتبر نیست")

    try:
        from PIL import Image, ImageFilter, ImageOps
    except ImportError:
        logger.warning("Pillow missing — saving raw image")
        mime, ext = detected
        return data, mime, ext

    img = Image.open(BytesIO(data))
    img = ImageOps.exif_transpose(img)

    # تصاویر خیلی کوچک را رد کن — کیفیت پایین برای فروشگاه
    w, h = img.size
    if min(w, h) < MIN_EDGE_PX:
        raise ValueError(f"تصویر خیلی کوچک است ({w}×{h})")

    # RGB برای ذخیره (شفافیت → پس‌زمینه سفید فروشگاهی)
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        bg = Image.new("RGB", rgba.size, (255, 255, 255))
        bg.paste(rgba, mask=rgba.split()[-1])
        img = bg
    else:
        img = img.convert("RGB")

    # اگر خیلی بزرگ است، با کیفیت بالا کوچک کن
    max_edge = max(img.size)
    if max_edge > TARGET_MAX_EDGE:
        img.thumbnail((TARGET_MAX_EDGE, TARGET_MAX_EDGE), Image.Resampling.LANCZOS)

    # تیزکنندگی خیلی ملایم — thumbnail نرم را شاداب‌تر می‌کند
    if max(img.size) < 1200:
        img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=3))

    out = BytesIO()
    try:
        img.save(out, format="WEBP", quality=WEBP_QUALITY, method=6)
        return out.getvalue(), "image/webp", ".webp"
    except Exception:
        out = BytesIO()
        img.save(out, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        return out.getvalue(), "image/jpeg", ".jpg"


def download_image_to_storage(url: str, relative_dir: str) -> tuple[str, str]:
    """برمی‌گرداند: (storage_key, mime_type)"""
    with enrichment_client(timeout=40.0) as client:
        res = client.get(url)
        if res.status_code >= 400:
            raise ValueError(f"download HTTP {res.status_code}")
        data = res.content
    if not data or len(data) > MAX_BYTES:
        raise ValueError("حجم تصویر نامعتبر است")

    try:
        processed, mime, ext = _enhance_image(data)
    except ValueError:
        raise
    except Exception as e:
        logger.warning("image enhance failed, using raw: %s", e)
        detected = _detect_image(data)
        if not detected:
            raise ValueError("فایل تصویر معتبر نیست") from e
        mime, ext = detected
        processed = data

    name = f"{uuid.uuid4().hex[:12]}{ext}"
    key = save_upload_secure(processed, relative_dir, name)
    return key, mime


def host_of(url: str) -> str:
    try:
        return urlparse(url).netloc or ""
    except Exception:
        return ""
