"""
حذف پس‌زمینه — rembg + U²-Net (ONNX محلی، بدون API خارجی).
"""

from __future__ import annotations

import logging
from io import BytesIO
from threading import Lock

from fastapi import HTTPException
from PIL import Image

logger = logging.getLogger(__name__)

_MAX_EDGE_PX = 4096
_session = None
_session_lock = Lock()


def _get_session():
    global _session
    with _session_lock:
        if _session is not None:
            return _session
        try:
            from rembg import new_session
        except ImportError as exc:
            logger.exception("rembg not installed")
            raise HTTPException(
                status_code=503,
                detail="سرویس حذف پس‌زمینه روی سرور فعال نیست — rembg نصب نشده",
            ) from exc
        # isnet-general-use: کیفیت بالا برای افراد، اشیاء و طرح‌ها
        _session = new_session("isnet-general-use")
        logger.info("rembg session ready (isnet-general-use)")
        return _session


def _fit_max_edge(img: Image.Image, max_px: int) -> Image.Image:
    w, h = img.size
    longest = max(w, h)
    if longest <= max_px:
        return img
    scale = max_px / longest
    return img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)


def _crop_transparent(img: Image.Image, *, pad: int = 4) -> Image.Image:
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    alpha = img.split()[3]
    bbox = alpha.getbbox()
    if not bbox:
        return img
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(img.width, bbox[2] + pad)
    bottom = min(img.height, bbox[3] + pad)
    return img.crop((left, top, right, bottom))


def remove_background(image_bytes: bytes) -> bytes:
    if not image_bytes:
        raise HTTPException(status_code=400, detail="فایل خالی است")

    try:
        from rembg import remove
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="سرویس حذف پس‌زمینه روی سرور فعال نیست",
        ) from exc

    try:
        src = Image.open(BytesIO(image_bytes))
        if src.mode not in ("RGBA", "RGB", "L"):
            src = src.convert("RGBA")
        elif src.mode == "RGB":
            src = src.convert("RGBA")

        if max(src.size) > _MAX_EDGE_PX:
            src = _fit_max_edge(src, _MAX_EDGE_PX)

        buf = BytesIO()
        src.save(buf, format="PNG", compress_level=3)
        input_png = buf.getvalue()

        session = _get_session()
        out_bytes = remove(input_png, session=session)

        out = Image.open(BytesIO(out_bytes)).convert("RGBA")
        out = _crop_transparent(out, pad=8)
        result = BytesIO()
        out.save(result, format="PNG", compress_level=3)
        return result.getvalue()
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("background removal failed")
        raise HTTPException(status_code=500, detail="خطا در حذف پس‌زمینه — تصویر دیگری امتحان کنید") from exc
