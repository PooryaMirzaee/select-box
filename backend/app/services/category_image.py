"""تولید تصویر/آیکون دسته با AvalAI برای کاشی‌های فروشگاه."""

from __future__ import annotations

import logging
import uuid
from io import BytesIO

from sqlalchemy.orm import Session

from app.models import Category
from app.services import avalai
from app.services.category_helpers import category_admin_out, category_image_url
from app.services.storage import delete_upload, public_url, save_upload_secure

logger = logging.getLogger(__name__)

_ICON_SIZE = 1024


def category_ancestry_label(db: Session, cat: Category) -> str:
    """مسیر نام‌ها برای پرامپت — مثلاً لوازم آشپزخانه › یخچال و فریزر."""
    parts: list[str] = [cat.name_fa]
    cur: Category | None = cat
    seen = {cat.id}
    while cur and cur.parent_id and cur.parent_id not in seen:
        parent = db.get(Category, cur.parent_id)
        if parent is None:
            break
        seen.add(parent.id)
        parts.append(parent.name_fa)
        cur = parent
    return " › ".join(reversed(parts))


def build_category_image_prompt(
    db: Session,
    cat: Category,
    *,
    extra: str | None = None,
) -> str:
    path = category_ancestry_label(db, cat)
    extra_line = (extra or "").strip()
    extra_block = f"\nجزئیات اضافه از ادمین: {extra_line}\n" if extra_line else "\n"
    return (
        "Generate a square e-commerce category thumbnail for an Iranian home & lifestyle store.\n"
        f"Category path: {path}\n"
        f"Primary subject: {cat.name_fa}\n"
        f"{extra_block}"
        "Visual style:\n"
        "- Clean modern product photography or soft illustrated product still-life\n"
        "- Single clear subject related to the category, centered\n"
        "- Soft studio lighting, warm cream or light teal background atmosphere\n"
        "- No text, no logos, no watermarks, no UI mockups, no collage grids\n"
        "- Square 1:1 composition suitable as a category tile / mega-menu icon\n"
        "- Photorealistic or high-quality commercial look\n"
    )


def _prepare_category_icon(image_bytes: bytes) -> bytes:
    """مربع JPEG فشرده برای آیکون دسته — بدون پس‌پردازش چاپ."""
    try:
        from PIL import Image
    except ImportError:
        logger.warning("Pillow missing — saving raw category AI image")
        return image_bytes

    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    if side != _ICON_SIZE:
        img = img.resize((_ICON_SIZE, _ICON_SIZE), Image.Resampling.LANCZOS)
    out = BytesIO()
    img.save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue()


async def generate_and_attach_category_icon(
    db: Session,
    category_id: int,
    *,
    extra_prompt: str | None = None,
) -> dict:
    """تولید تصویر با AvalAI و جایگزینی آیکون دسته."""
    if not avalai.is_enabled(db):
        raise ValueError("avalai_disabled")

    cat = db.get(Category, category_id)
    if cat is None:
        raise ValueError("not_found")

    prompt = build_category_image_prompt(db, cat, extra=extra_prompt)
    image_bytes = await avalai.generate_image(
        db,
        prompt=prompt,
        aspect_ratio="1:1",
        include_system_suffix=False,
    )
    prepared = _prepare_category_icon(image_bytes)

    if cat.icon_storage_key:
        delete_upload(cat.icon_storage_key)

    key = save_upload_secure(
        prepared,
        f"categories/{category_id}",
        f"ai-{uuid.uuid4().hex[:10]}.jpg",
    )
    cat.icon_storage_key = key
    db.commit()
    db.refresh(cat)

    out = category_admin_out(cat)
    return {
        **out.model_dump(),
        "icon_url": category_image_url(cat) or public_url(key),
        "prompt_used": prompt,
    }
