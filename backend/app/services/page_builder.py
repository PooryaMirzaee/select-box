"""صفحهٔ‌ساز Puck + ظاهر سایت — ذخیره در site_settings."""

from __future__ import annotations

import re
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.site_setting import SiteSetting
from app.schemas.page_builder import (
    PageBuilderCreate,
    PageBuilderData,
    PageBuilderListItem,
    PageBuilderPublic,
    PageBuilderPut,
    ThemeAppearance,
    ThemeAppearancePatch,
)
from app.services import settings as shop_settings

PAGE_KEY_PREFIX = "page_builder:"
APPEARANCE_KEY = "theme_appearance"
HOME_SLUG = "home"
# key در site_settings حداکثر ۶۴ کاراکتر است؛ پیشوند page_builder: = ۱۳
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,49}$")

DEFAULT_APPEARANCE = ThemeAppearance().model_dump()

_CSS_BLOCKED = [
    re.compile(p, re.I)
    for p in (
        r"@import\b",
        r"@charset\b",
        r"expression\s*\(",
        r"javascript\s*:",
        r"behavior\s*:",
        r"-moz-binding\s*:",
        r"url\s*\(\s*['\"]?\s*javascript:",
        r"</?\s*script",
        r"</?\s*style",
        r"</?\s*iframe",
        r"</?\s*link",
        r"</?\s*meta",
    )
]


def sanitize_css(raw: str | None) -> str:
    if not raw or not isinstance(raw, str):
        return ""
    out = raw[:50_000]
    for pat in _CSS_BLOCKED:
        out = pat.sub("/* blocked */", out)
    out = re.sub(r"<[^>]+>", "", out)
    return out.strip()


def _sanitize_puck_tree(node: Any) -> Any:
    """Sanitize customCss / pageCustomCss recursively in Puck JSON."""
    if isinstance(node, dict):
        out: dict[str, Any] = {}
        for k, v in node.items():
            if k in ("customCss", "pageCustomCss") and isinstance(v, str):
                out[k] = sanitize_css(v)
            elif k == "html" and isinstance(v, str):
                cleaned = re.sub(
                    r"<script[\s\S]*?>[\s\S]*?</script>", "", v, flags=re.I
                )
                cleaned = re.sub(r"\son\w+\s*=", " data-blocked=", cleaned, flags=re.I)
                cleaned = re.sub(r"javascript:", "", cleaned, flags=re.I)
                out[k] = cleaned[:100_000]
            else:
                out[k] = _sanitize_puck_tree(v)
        return out
    if isinstance(node, list):
        return [_sanitize_puck_tree(x) for x in node]
    return node


# چیدمان پیش‌فرض هم‌تراز صفحهٔ فعلی فروشگاه
DEFAULT_HOME_DATA: dict[str, Any] = {
    "root": {
        "props": {
            "title": "صفحه اصلی",
            "paddingY": "none",
            "pageBg": "",
            "pageCustomCss": "",
            "seoTitle": "",
            "seoDescription": "",
            "schemaVersion": 2,
        }
    },
    "content": [
        {
            "type": "HeroCarousel",
            "props": {
                "id": "HeroCarousel-1",
                "sourceMode": "live",
                "autoplay": True,
                "intervalMs": 5000,
                "slides": [],
            },
        },
        {
            "type": "TrustStrip",
            "props": {"id": "TrustStrip-1"},
        },
        {
            "type": "AmazingDeals",
            "props": {
                "id": "AmazingDeals-1",
                "sourceMode": "live",
                "title": "پیشنهاد شگفت‌انگیز",
                "href": "/catalog",
                "productCount": 10,
                "source": "amazing",
                "manualProducts": [],
            },
        },
        {
            "type": "CategoryCircles",
            "props": {
                "id": "CategoryCircles-1",
                "sourceMode": "live",
                "title": "دسته‌بندی‌ها",
                "limit": 12,
                "href": "/browse",
                "manualCategories": [],
            },
        },
        {
            "type": "ProductRail",
            "props": {
                "id": "ProductRail-1",
                "sourceMode": "live",
                "title": "پرفروش‌ترین‌ها",
                "subtitle": "محصولات منتخب",
                "href": "/catalog",
                "hrefLabel": "مشاهده همه",
                "productCount": 12,
                "source": "latest",
                "manualProducts": [],
            },
        },
        {
            "type": "PromoBanners",
            "props": {
                "id": "PromoBanners-1",
                "sourceMode": "live",
                "showFallback": True,
            },
        },
    ],
}


def _empty_page_data(title: str) -> dict[str, Any]:
    return {
        "root": {
            "props": {
                "title": title,
                "paddingY": "sm",
                "pageBg": "",
                "pageCustomCss": "",
                "seoTitle": title,
                "seoDescription": "",
                "schemaVersion": 2,
            }
        },
        "content": [
            {
                "type": "Heading",
                "props": {"id": "Heading-1", "text": title, "level": "h1"},
            },
            {
                "type": "Paragraph",
                "props": {
                    "id": "Paragraph-1",
                    "text": "محتوای این صفحه را از ادیتور ویرایش کنید.",
                },
            },
        ],
    }


def _page_key(slug: str) -> str:
    return f"{PAGE_KEY_PREFIX}{slug.strip() or HOME_SLUG}"


def _normalize_slug(slug: str) -> str:
    s = (slug or "").strip().lower()
    if not SLUG_RE.match(s):
        raise HTTPException(
            status_code=400,
            detail="slug فقط حروف کوچک، عدد، خط تیره و زیرخط؛ حداکثر ۵۰ کاراکتر",
        )
    if s == "home":
        return HOME_SLUG
    return s


_HEX = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
_RGBA = re.compile(
    r"^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+\s*)?\)$"
)
_LENGTH = re.compile(r"^[\d.]+(px|rem|em|%)$")

_COLOR_KEYS = {
    "accent",
    "accent_hot",
    "accent_fg",
    "amazing_from",
    "amazing_to",
    "bg",
    "fg",
    "fg_muted",
    "border",
    "card",
    "header_bg",
}
_LENGTH_KEYS = {"shop_max", "radius"}


def _sanitize_appearance(data: dict[str, object]) -> dict[str, object]:
    out = dict(DEFAULT_APPEARANCE)
    for key, value in data.items():
        if key not in out or not isinstance(value, str):
            continue
        v = value.strip()
        if key in _COLOR_KEYS and (_HEX.match(v) or _RGBA.match(v)):
            out[key] = v
        elif key in _LENGTH_KEYS and _LENGTH.match(v):
            out[key] = v
    return out


def get_appearance(db: Session) -> ThemeAppearance:
    raw = shop_settings.get_setting(db, APPEARANCE_KEY, DEFAULT_APPEARANCE)
    if not isinstance(raw, dict):
        raw = DEFAULT_APPEARANCE
    return ThemeAppearance.model_validate(
        _sanitize_appearance({**DEFAULT_APPEARANCE, **raw})
    )


def patch_appearance(db: Session, body: ThemeAppearancePatch) -> ThemeAppearance:
    current = get_appearance(db).model_dump()
    patch = body.model_dump(exclude_unset=True)
    current.update(patch)
    validated = ThemeAppearance.model_validate(_sanitize_appearance(current))
    shop_settings.set_setting(db, APPEARANCE_KEY, validated.model_dump())
    return validated


def _title_from_data(data: dict[str, Any], slug: str) -> str:
    root = data.get("root") if isinstance(data, dict) else None
    props = root.get("props") if isinstance(root, dict) else None
    if isinstance(props, dict):
        t = props.get("title")
        if isinstance(t, str) and t.strip():
            return t.strip()
    return "صفحه اصلی" if slug == HOME_SLUG else slug


def get_page_raw(db: Session, slug: str = HOME_SLUG, *, missing_ok: bool = True) -> dict[str, Any]:
    key = _page_key(slug)
    raw = shop_settings.get_setting(db, key, None)
    if not isinstance(raw, dict) or "content" not in raw:
        if slug != HOME_SLUG and not missing_ok:
            raise HTTPException(status_code=404, detail="صفحه پیدا نشد")
        return {
            "slug": slug,
            "title": "صفحه اصلی" if slug == HOME_SLUG else slug,
            "data": DEFAULT_HOME_DATA if slug == HOME_SLUG else _empty_page_data(slug),
            "published": True,
            "exists": slug == HOME_SLUG,
        }
    data = {
        "content": raw.get("content") or [],
        "root": raw.get("root") or {},
        "zones": raw.get("zones"),
    }
    return {
        "slug": slug,
        "title": raw.get("title") or _title_from_data(data, slug),
        "data": data,
        "published": bool(raw.get("published", True)),
        "exists": True,
    }


def get_public(db: Session, slug: str = HOME_SLUG) -> PageBuilderPublic:
    # صفحات سفارشی ناموجود برای عموم published=false + خالی تا فرانت 404 بدهد
    page = get_page_raw(db, slug, missing_ok=True)
    published = bool(page["published"])
    data = page["data"]
    if slug != HOME_SLUG and not page.get("exists"):
        published = False
        data = {"content": [], "root": {}}
    elif not published:
        data = DEFAULT_HOME_DATA if slug == HOME_SLUG else {"content": [], "root": {}}
    if isinstance(data, dict) and data.get("zones") is None:
        data = {k: v for k, v in data.items() if k != "zones"}
    return PageBuilderPublic(
        slug=page["slug"],
        title=page.get("title"),
        data=PageBuilderData.model_validate(data),
        published=published,
        appearance=get_appearance(db),
    )


def put_page(db: Session, slug: str, body: PageBuilderPut) -> PageBuilderPublic:
    slug = _normalize_slug(slug) if slug != HOME_SLUG else HOME_SLUG
    dumped = body.data.model_dump(exclude_none=True)
    dumped = _sanitize_puck_tree(dumped)
    if "zones" not in dumped:
        prev = get_page_raw(db, slug)
        prev_zones = (
            (prev.get("data") or {}).get("zones")
            if isinstance(prev.get("data"), dict)
            else None
        )
        if prev_zones:
            dumped["zones"] = prev_zones
    title = _title_from_data(dumped, slug)
    payload = {
        **dumped,
        "title": title,
        "published": body.published,
    }
    shop_settings.set_setting(db, _page_key(slug), payload)
    return get_public(db, slug)


def list_pages(db: Session) -> list[PageBuilderListItem]:
    ensure_defaults(db)
    rows = (
        db.query(SiteSetting)
        .filter(SiteSetting.key.like(f"{PAGE_KEY_PREFIX}%"))
        .all()
    )
    items: list[PageBuilderListItem] = []
    seen: set[str] = set()
    for row in rows:
        slug = row.key[len(PAGE_KEY_PREFIX) :]
        if not slug or slug in seen:
            continue
        seen.add(slug)
        raw = row.value if isinstance(row.value, dict) else {}
        data = {
            "content": raw.get("content") or [],
            "root": raw.get("root") or {},
        }
        items.append(
            PageBuilderListItem(
                slug=slug,
                title=raw.get("title") or _title_from_data(data, slug),
                published=bool(raw.get("published", True)),
            )
        )
    if HOME_SLUG not in seen:
        items.insert(
            0,
            PageBuilderListItem(slug=HOME_SLUG, title="صفحه اصلی", published=True),
        )
    items.sort(key=lambda x: (0 if x.slug == HOME_SLUG else 1, x.slug))
    return items


def create_page(db: Session, body: PageBuilderCreate) -> PageBuilderPublic:
    slug = _normalize_slug(body.slug)
    if slug == HOME_SLUG:
        raise HTTPException(status_code=400, detail="slug «home» رزرو شده است")
    key = _page_key(slug)
    if db.get(SiteSetting, key) is not None:
        raise HTTPException(status_code=409, detail="این slug از قبل وجود دارد")
    data = _empty_page_data(body.title.strip())
    payload = {
        **data,
        "title": body.title.strip(),
        "published": body.published,
    }
    shop_settings.set_setting(db, key, payload)
    return get_public(db, slug)


def delete_page(db: Session, slug: str) -> dict[str, str]:
    slug = _normalize_slug(slug)
    if slug == HOME_SLUG:
        raise HTTPException(status_code=400, detail="صفحه اصلی قابل حذف نیست")
    key = _page_key(slug)
    row = db.get(SiteSetting, key)
    if row is None:
        raise HTTPException(status_code=404, detail="صفحه پیدا نشد")
    db.delete(row)
    db.commit()
    return {"status": "ok", "slug": slug}


def ensure_defaults(db: Session) -> None:
    if db.get(SiteSetting, APPEARANCE_KEY) is None:
        shop_settings.set_setting(db, APPEARANCE_KEY, DEFAULT_APPEARANCE)
    home_key = _page_key(HOME_SLUG)
    if db.get(SiteSetting, home_key) is None:
        shop_settings.set_setting(
            db,
            home_key,
            {**DEFAULT_HOME_DATA, "title": "صفحه اصلی", "published": True},
        )
