"""تولید توضیح فارسی محصول — Avalai در صورت فعال، وگرنه fallback."""

from __future__ import annotations

import logging
import re

import httpx
from sqlalchemy.orm import Session

from app.services import avalai, settings as shop_settings
from app.services.enrichment.http_client import enrichment_client

logger = logging.getLogger(__name__)

_CHAT_MODEL = "gpt-4o-mini"


def _fallback(title: str) -> tuple[str, str]:
    t = (title or "کالا").strip()
    desc = (
        f"«{t}» از فروشگاه SelectBox — مناسب استفاده روزمره. "
        f"برای مشاهده موجودی و قیمت همین صفحه را ببینید."
    )
    meta = f"{t} | خرید آنلاین از SelectBox"
    return desc, meta[:255]


def write_product_copy(db: Session, *, title: str, query: str | None = None) -> tuple[str, str]:
    if not avalai.is_enabled(db):
        return _fallback(title)

    api_key = shop_settings.avalai_raw_key(db)
    if not api_key:
        return _fallback(title)

    prompt = (
        f"برای فروشگاه اینترنتی ایرانی، یک توضیح کوتاه فارسی (۲ تا ۴ جمله) "
        f"و یک متای سئو حداکثر ۱۵۰ کاراکتر بنویس.\n"
        f"نام کالا: {title}\n"
        f"جستجو: {query or title}\n"
        f"خروجی دقیقاً به این شکل:\nDESCRIPTION: ...\nMETA: ..."
    )
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": _CHAT_MODEL,
        "messages": [
            {"role": "system", "content": "تو نویسنده محتوا فروشگاهی فارسی هستی. اغراق نکن."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.5,
        "max_tokens": 350,
    }
    try:
        with enrichment_client(timeout=45.0) as client:
            res = client.post(
                f"{avalai.AVALAI_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            )
        if res.status_code >= 400:
            logger.warning("avalai copy HTTP %s", res.status_code)
            return _fallback(title)
        content = (
            (res.json().get("choices") or [{}])[0]
            .get("message", {})
            .get("content")
            or ""
        ).strip()
        desc_m = re.search(r"DESCRIPTION:\s*(.+?)(?:\nMETA:|$)", content, re.S | re.I)
        meta_m = re.search(r"META:\s*(.+)$", content, re.S | re.I)
        desc = (desc_m.group(1).strip() if desc_m else content)[:2000]
        meta = (meta_m.group(1).strip() if meta_m else f"{title} | SelectBox")[:255]
        if not desc:
            return _fallback(title)
        return desc, meta
    except Exception as e:
        logger.warning("avalai copy failed: %s", e)
        return _fallback(title)
