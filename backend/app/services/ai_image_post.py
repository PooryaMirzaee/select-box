"""
پس‌پردازش تصویر AI — حذف پس‌زمینهٔ مجنتا و شطرنجی جعلی.
نیاز: Pillow (pip install -r requirements.txt)
"""

from __future__ import annotations

import logging
from io import BytesIO

logger = logging.getLogger(__name__)

CHROMA_MAGENTA = (255, 0, 255)
CHROMA_TOLERANCE = 48
_CHECKER_MAX_CHANNEL_DELTA = 12
_CHECKER_MIN_BRIGHTNESS = 200


def _is_chroma_magenta(r: int, g: int, b: int) -> bool:
    return (
        abs(r - CHROMA_MAGENTA[0]) <= CHROMA_TOLERANCE
        and g <= CHROMA_TOLERANCE
        and abs(b - CHROMA_MAGENTA[2]) <= CHROMA_TOLERANCE
    )


def _is_fake_checkerboard(r: int, g: int, b: int) -> bool:
    if max(r, g, b) - min(r, g, b) > _CHECKER_MAX_CHANNEL_DELTA:
        return False
    return (r + g + b) / 3 >= _CHECKER_MIN_BRIGHTNESS


def prepare_print_artwork(image_bytes: bytes) -> bytes:
    try:
        from PIL import Image
    except ImportError:
        logger.warning("Pillow not installed — AI image post-processing skipped")
        return image_bytes

    img = Image.open(BytesIO(image_bytes)).convert("RGBA")
    pixels = img.load()
    width, height = img.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if _is_chroma_magenta(r, g, b) or _is_fake_checkerboard(r, g, b):
                pixels[x, y] = (0, 0, 0, 0)

    bbox = img.getbbox()
    if bbox is None:
        out = BytesIO()
        img.save(out, format="PNG", optimize=True)
        return out.getvalue()

    cropped = img.crop(bbox)
    padded = Image.new("RGBA", (cropped.width + 8, cropped.height + 8), (0, 0, 0, 0))
    padded.paste(cropped, (4, 4))

    out = BytesIO()
    padded.save(out, format="PNG", optimize=True)
    return out.getvalue()
