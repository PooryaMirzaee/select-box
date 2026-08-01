"""تولید توضیح فارسی محصول از کرال وب + AvalAI (web search / Responses).

مستندات: https://docs.avalai.ir/en/guides/tools-web-search
         https://docs.avalai.ir/en/api-reference/search
"""

from __future__ import annotations

import logging
import re

from sqlalchemy.orm import Session

from app.services import avalai, settings as shop_settings
from app.services.enrichment.http_client import enrichment_client
from app.services.enrichment.scrape_descriptions import (
    DescriptionHit,
    format_context,
    search_product_descriptions,
)

logger = logging.getLogger(__name__)

# مدل‌های متنی با جستجوی وب — طبق مستندات AvalAI
_SEARCH_CHAT_MODELS = (
    "gpt-4o-mini-search-preview",
    "gpt-4o-search-preview",
)
_RESPONSES_MODELS = (
    "gpt-4o-mini",
    "gpt-5.6-sol",
    "gpt-4o",
)
_REWRITE_MODELS = (
    "gpt-4o-mini",
    "gpt-5.6-sol",
)

_DESC_RE = re.compile(r"DESCRIPTION:\s*(.+?)(?:\nMETA:|$)", re.S | re.I)
_META_RE = re.compile(r"META:\s*(.+)$", re.S | re.I)


def _parse_copy(content: str, title: str) -> tuple[str, str] | None:
    text = (content or "").strip()
    if not text:
        return None
    desc_m = _DESC_RE.search(text)
    meta_m = _META_RE.search(text)
    desc = (desc_m.group(1).strip() if desc_m else text)[:2000].strip()
    meta = (meta_m.group(1).strip() if meta_m else f"{title} | SelectBox")[:255].strip()
    if not desc or len(desc) < 40:
        return None
    # رد کردن خروجی‌های استاتیک/الگویی بی‌فایده
    low = desc.lower()
    if "مناسب استفاده روزمره" in desc and "selectbox" in low:
        return None
    return desc, meta


def _build_user_prompt(title: str, query: str, context: str, *, with_web: bool) -> str:
    web_line = (
        "اگر لازم است از جستجوی وب برای مشخصات واقعی همین کالا استفاده کن. "
        if with_web
        else ""
    )
    return (
        f"برای فروشگاه اینترنتی ایرانی SelectBox یک توضیح فروشگاهی بنویس.\n"
        f"نام کالا در فروشگاه ما: {title}\n"
        f"عبارت جستجو: {query}\n"
        f"{web_line}"
        f"از محتوای منابع زیر به عنوان مرجع واقعی استفاده کن؛ جزئیات ساختگی اضافه نکن. "
        f"متن را بازنویسی کن (کپی تحت‌اللفظی نکن)، فارسی روان، ۲ تا ۵ جمله.\n"
        f"خروجی دقیقاً به این شکل:\nDESCRIPTION: ...\nMETA: ...\n"
        f"(META حداکثر ۱۵۰ کاراکتر سئو)\n\n"
        f"--- منابع کرال‌شده ---\n{context or 'منبعی پیدا نشد؛ فقط با جستجوی وب و نام کالا کار کن.'}"
    )


def _from_hits_without_ai(title: str, hits: list[DescriptionHit]) -> tuple[str, str] | None:
    if not hits:
        return None
    best = hits[0]
    parts: list[str] = []
    if best.description:
        # کوتاه کردن توضیح کرال‌شده به چند جمله اول
        raw = best.description.replace("\n", " ").strip()
        sentences = re.split(r"(?<=[.!?…])\s+|(?<=۔)\s+", raw)
        chunk = " ".join(s.strip() for s in sentences if s.strip())[:900]
        if chunk:
            parts.append(chunk)
    if best.specs:
        parts.append("ویژگی‌ها: " + "؛ ".join(best.specs[:6]))
    if not parts:
        return None
    desc = " ".join(parts)[:2000]
    meta = f"{title} | {_clean_meta_bit(best.title)} | SelectBox"[:255]
    return desc, meta


def _clean_meta_bit(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()[:80]


def _avalai_chat_search(api_key: str, model: str, prompt: str) -> str | None:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "تو نویسنده محتوای فروشگاهی فارسی هستی. "
                    "فقط بر اساس اطلاعات واقعی وب/منابع بنویس؛ اغراق و ویژگی ساختگی ممنوع."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "web_search_options": {},
    }
    with enrichment_client(timeout=90.0) as client:
        res = client.post(
            f"{avalai.AVALAI_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        )
    if res.status_code >= 400:
        logger.warning("avalai search-chat HTTP %s model=%s body=%s", res.status_code, model, res.text[:200])
        return None
    return (
        (res.json().get("choices") or [{}])[0]
        .get("message", {})
        .get("content")
        or ""
    ).strip() or None


def _avalai_responses_web_search(api_key: str, model: str, prompt: str) -> str | None:
    """Responses API + ابزار web_search — https://docs.avalai.ir/en/guides/tools-web-search"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "tools": [{"type": "web_search"}],
        "tool_choice": {"type": "web_search"},
        "instructions": (
            "تو نویسنده محتوای فروشگاهی فارسی هستی. "
            "با جستجوی وب مشخصات واقعی کالا را پیدا کن و توضیح کوتاه بنویس. اغراق نکن."
        ),
        "input": prompt,
    }
    with enrichment_client(timeout=120.0) as client:
        res = client.post(
            f"{avalai.AVALAI_BASE_URL}/responses",
            headers=headers,
            json=payload,
        )
    if res.status_code >= 400:
        logger.warning("avalai responses HTTP %s model=%s body=%s", res.status_code, model, res.text[:200])
        return None
    data = res.json()
    text = (data.get("output_text") or "").strip()
    if text:
        return text
    # بعضی پاسخ‌ها فقط در output آرایه هستند
    for item in data.get("output") or []:
        if not isinstance(item, dict):
            continue
        if item.get("type") == "message":
            for part in item.get("content") or []:
                if isinstance(part, dict) and part.get("type") in ("output_text", "text"):
                    t = (part.get("text") or "").strip()
                    if t:
                        return t
    return None


def _avalai_rewrite(api_key: str, model: str, prompt: str) -> str | None:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "تو نویسنده محتوای فروشگاهی فارسی هستی. "
                    "فقط از منابع داده‌شده استفاده کن؛ ویژگی ساختگی ننویس."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 500,
    }
    with enrichment_client(timeout=60.0) as client:
        res = client.post(
            f"{avalai.AVALAI_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        )
    if res.status_code >= 400:
        logger.warning("avalai rewrite HTTP %s model=%s body=%s", res.status_code, model, res.text[:200])
        return None
    return (
        (res.json().get("choices") or [{}])[0]
        .get("message", {})
        .get("content")
        or ""
    ).strip() or None


def _avalai_direct_search(api_key: str, query: str) -> str:
    """Search API خام — https://docs.avalai.ir/en/api-reference/search"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    snippets: list[str] = []
    for tool in ("serper-search", "tavily-search", "perplexity-search"):
        try:
            with enrichment_client(timeout=45.0) as client:
                res = client.post(
                    f"{avalai.AVALAI_BASE_URL}/search/{tool}",
                    headers=headers,
                    json={
                        "query": f"{query} مشخصات توضیح محصول",
                        "max_results": 5,
                        "hl": "fa",
                        "gl": "ir",
                        "country": "IR",
                    },
                )
            if res.status_code >= 400:
                logger.info("avalai search tool %s HTTP %s", tool, res.status_code)
                continue
            results = res.json().get("results") or []
            for row in results:
                title = (row.get("title") or "").strip()
                snip = (row.get("snippet") or row.get("content") or "").strip()
                url = (row.get("url") or "").strip()
                if snip or title:
                    snippets.append(f"{title}\n{snip}\n{url}".strip())
            if snippets:
                break
        except Exception as e:
            logger.info("avalai search %s failed: %s", tool, e)
    return "\n\n".join(snippets[:6])


def write_product_copy(db: Session, *, title: str, query: str | None = None) -> tuple[str, str]:
    """کرال توضیح از وب + بازنویسی با AvalAI. بدون متن استاتیک الکی."""
    q = (query or title or "").strip()
    t = (title or q or "کالا").strip()

    hits: list[DescriptionHit] = []
    try:
        hits = search_product_descriptions(q, limit=3)
    except Exception as e:
        logger.warning("description crawl failed: %s", e)

    crawled = format_context(hits) if hits else ""
    api_key = shop_settings.avalai_raw_key(db) if avalai.is_enabled(db) else ""

    if api_key:
        # ۱) مدل‌های native search
        prompt_web = _build_user_prompt(t, q, crawled, with_web=True)
        for model in _SEARCH_CHAT_MODELS:
            try:
                content = _avalai_chat_search(api_key, model, prompt_web)
                parsed = _parse_copy(content or "", t)
                if parsed:
                    return parsed
            except Exception as e:
                logger.warning("avalai chat-search %s failed: %s", model, e)

        # ۲) Responses API + web_search
        for model in _RESPONSES_MODELS:
            try:
                content = _avalai_responses_web_search(api_key, model, prompt_web)
                parsed = _parse_copy(content or "", t)
                if parsed:
                    return parsed
            except Exception as e:
                logger.warning("avalai responses %s failed: %s", model, e)

        # ۳) Search API خام + بازنویسی
        try:
            search_ctx = _avalai_direct_search(api_key, q)
        except Exception as e:
            logger.warning("avalai direct search failed: %s", e)
            search_ctx = ""
        combined = "\n\n".join(x for x in (crawled, search_ctx) if x)
        if combined:
            prompt_rewrite = _build_user_prompt(t, q, combined, with_web=False)
            for model in _REWRITE_MODELS:
                try:
                    content = _avalai_rewrite(api_key, model, prompt_rewrite)
                    parsed = _parse_copy(content or "", t)
                    if parsed:
                        return parsed
                except Exception as e:
                    logger.warning("avalai rewrite %s failed: %s", model, e)

        # ۴) فقط بازنویسی کرال دیجی‌کالا/ترب
        if crawled:
            prompt_rewrite = _build_user_prompt(t, q, crawled, with_web=False)
            for model in _REWRITE_MODELS:
                try:
                    content = _avalai_rewrite(api_key, model, prompt_rewrite)
                    parsed = _parse_copy(content or "", t)
                    if parsed:
                        return parsed
                except Exception as e:
                    logger.warning("avalai rewrite crawled %s failed: %s", model, e)

    # بدون AvalAI یا بعد از شکست: متن واقعی کرال‌شده (نه استاتیک الکی)
    from_hits = _from_hits_without_ai(t, hits)
    if from_hits:
        return from_hits

    raise ValueError(
        "توضیح معتبری از وب پیدا نشد. AvalAI را فعال کنید یا نام کالا را دقیق‌تر کنید."
    )
