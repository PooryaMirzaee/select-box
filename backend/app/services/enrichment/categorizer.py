"""دسته‌بندی خودکار محصول بر اساس نام — AvalAI و fallback هیوریستیک.

اگر دسته مناسب وجود نداشته باشد، زیر والد درست ساخته می‌شود.
"""

from __future__ import annotations

import json
import logging
import re
import secrets
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Category
from app.services import avalai, settings as shop_settings
from app.services.enrichment.http_client import enrichment_client

logger = logging.getLogger(__name__)

_CHAT_MODELS = ("gpt-4o-mini", "gpt-5.6-sol")
_MAX_TREE_LINES = 300


@dataclass
class CategorySuggestion:
    category: Category
    created: bool
    reason: str


def _category_paths(db: Session) -> list[tuple[Category, str]]:
    """همه دسته‌های فعال با مسیر کامل «والد › فرزند»."""
    rows = list(db.scalars(select(Category).order_by(Category.parent_id, Category.sort_order, Category.id)).all())
    by_id = {c.id: c for c in rows}

    def path(c: Category) -> str:
        parts = [c.name_fa]
        cur = c
        seen = {c.id}
        while cur.parent_id and cur.parent_id in by_id and cur.parent_id not in seen:
            cur = by_id[cur.parent_id]
            seen.add(cur.id)
            parts.append(cur.name_fa)
        return " › ".join(reversed(parts))

    return [(c, path(c)) for c in rows if c.is_active]


def _slugify(text: str) -> str:
    from app.services.category_helpers import normalize_category_slug

    try:
        return normalize_category_slug(text)[:150]
    except ValueError:
        s = text.strip().lower()
        s = re.sub(r"[^\w\s\u0600-\u06FF-]", "", s, flags=re.UNICODE)
        s = re.sub(r"[\s_]+", "-", s)
        return (s[:150] or secrets.token_hex(4))


def _find_by_name(db: Session, name: str, parent_id: int | None) -> Category | None:
    norm = re.sub(r"\s+", " ", name).strip()
    if not norm:
        return None
    rows = db.scalars(select(Category).where(Category.parent_id == parent_id)).all()
    for c in rows:
        if re.sub(r"\s+", " ", c.name_fa).strip() == norm:
            return c
    return None


def _create_category(db: Session, *, name_fa: str, parent_id: int | None) -> Category:
    slug = _slugify(name_fa)
    # یکتایی slug داخل همان والد
    existing_slugs = set(
        db.scalars(select(Category.slug).where(Category.parent_id == parent_id)).all()
    )
    final_slug = slug
    i = 2
    while final_slug in existing_slugs:
        final_slug = f"{slug}-{i}"
        i += 1
    row = Category(
        parent_id=parent_id,
        slug=final_slug,
        name_fa=name_fa.strip()[:255],
        sort_order=999,
        is_active=True,
    )
    db.add(row)
    db.flush()
    return row


def _extract_json(text: str) -> dict | None:
    if not text:
        return None
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _ask_avalai(api_key: str, title: str, tree_lines: list[str]) -> dict | None:
    tree_text = "\n".join(tree_lines[:_MAX_TREE_LINES]) or "(هیچ دسته‌ای وجود ندارد)"
    prompt = (
        "دسته مناسب این کالا را از فهرست زیر انتخاب کن.\n"
        f"نام کالا: {title}\n\n"
        "فهرست دسته‌های موجود (شناسه | مسیر):\n"
        f"{tree_text}\n\n"
        "قوانین:\n"
        "- اگر دسته مناسبی هست، دقیق‌ترین (عمیق‌ترین) را انتخاب کن.\n"
        "- اگر نیست، یک دستهٔ جدید کوتاه پیشنهاد بده و آن را زیر مناسب‌ترین والد موجود بگذار "
        "(parent_id از فهرست؛ اگر هیچ والدی مناسب نیست null).\n"
        "- فقط JSON خالص برگردان، بدون توضیح:\n"
        '{"action":"existing","category_id":12}\n'
        "یا\n"
        '{"action":"new","name_fa":"نام دسته","parent_id":3}'
    )
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    for model in _CHAT_MODELS:
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "تو متخصص دسته‌بندی کالا در فروشگاه اینترنتی ایرانی هستی. فقط JSON برگردان.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
            "max_tokens": 150,
        }
        try:
            with enrichment_client(timeout=60.0) as client:
                res = client.post(
                    f"{avalai.AVALAI_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                )
            if res.status_code >= 400:
                logger.warning("avalai categorize HTTP %s model=%s", res.status_code, model)
                continue
            content = (
                (res.json().get("choices") or [{}])[0]
                .get("message", {})
                .get("content")
                or ""
            )
            data = _extract_json(content)
            if data:
                return data
        except Exception as e:
            logger.warning("avalai categorize %s failed: %s", model, e)
    return None


def _heuristic_match(title: str, paths: list[tuple[Category, str]]) -> Category | None:
    """تطبیق نام دسته داخل عنوان کالا — طولانی‌ترین نام برنده است."""
    t = re.sub(r"\s+", " ", title).strip()
    best: Category | None = None
    best_len = 0
    for cat, _path in paths:
        name = re.sub(r"\s+", " ", cat.name_fa).strip()
        if len(name) >= 2 and name in t and len(name) > best_len:
            best = cat
            best_len = len(name)
    return best


def suggest_category(db: Session, *, title: str) -> CategorySuggestion:
    """بهترین دسته برای عنوان — در صورت نیاز دسته جدید زیر والد مناسب ساخته می‌شود."""
    t = (title or "").strip()
    if not t:
        raise ValueError("عنوان محصول خالی است")

    paths = _category_paths(db)
    by_id = {c.id: c for c, _ in paths}
    tree_lines = [f"{c.id} | {p}" for c, p in paths]

    api_key = shop_settings.avalai_raw_key(db) if avalai.is_enabled(db) else ""
    if api_key:
        data = _ask_avalai(api_key, t, tree_lines)
        if data:
            action = str(data.get("action") or "").strip().lower()
            if action == "existing":
                try:
                    cid = int(data.get("category_id"))
                except (TypeError, ValueError):
                    cid = 0
                cat = by_id.get(cid)
                if cat:
                    return CategorySuggestion(category=cat, created=False, reason="انتخاب هوش مصنوعی")
            elif action == "new":
                name = str(data.get("name_fa") or "").strip()
                raw_parent = data.get("parent_id")
                parent_id: int | None = None
                if raw_parent is not None:
                    try:
                        pid = int(raw_parent)
                        parent_id = pid if pid in by_id else None
                    except (TypeError, ValueError):
                        parent_id = None
                if name:
                    existing = _find_by_name(db, name, parent_id)
                    if existing:
                        return CategorySuggestion(category=existing, created=False, reason="دسته هم‌نام موجود بود")
                    cat = _create_category(db, name_fa=name, parent_id=parent_id)
                    return CategorySuggestion(category=cat, created=True, reason="ساخت دسته جدید توسط هوش مصنوعی")

    # fallback بدون AI: تطبیق نام دسته در عنوان
    match = _heuristic_match(t, paths)
    if match:
        return CategorySuggestion(category=match, created=False, reason="تطبیق نام دسته در عنوان")

    raise ValueError(
        "دسته مناسبی تشخیص داده نشد. AvalAI را فعال کنید یا دسته‌ها را کامل‌تر کنید."
    )


def category_full_path(db: Session, category: Category) -> str:
    parts = [category.name_fa]
    cur = category
    seen = {category.id}
    while cur.parent_id and cur.parent_id not in seen:
        parent = db.get(Category, cur.parent_id)
        if parent is None:
            break
        seen.add(parent.id)
        parts.append(parent.name_fa)
        cur = parent
    return " › ".join(reversed(parts))
