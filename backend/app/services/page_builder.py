"""صفحهٔ‌ساز Puck + ظاهر سایت — ذخیره در site_settings."""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from app.models.site_setting import SiteSetting
from app.schemas.page_builder import (
    PageBuilderData,
    PageBuilderPublic,
    PageBuilderPut,
    ThemeAppearance,
    ThemeAppearancePatch,
)
from app.services import settings as shop_settings

PAGE_KEY_PREFIX = "page_builder:"
APPEARANCE_KEY = "theme_appearance"
HOME_SLUG = "home"

DEFAULT_APPEARANCE = ThemeAppearance().model_dump()

# چیدمان پیش‌فرض هم‌تراز صفحهٔ فعلی فروشگاه
DEFAULT_HOME_DATA: dict[str, Any] = {
    "root": {
        "props": {
            "title": "صفحه اصلی",
            "paddingY": "none",
        }
    },
    "content": [
        {
            "type": "HeroCarousel",
            "props": {"id": "HeroCarousel-1", "autoplay": True, "intervalMs": 5000},
        },
        {
            "type": "TrustStrip",
            "props": {"id": "TrustStrip-1"},
        },
        {
            "type": "AmazingDeals",
            "props": {
                "id": "AmazingDeals-1",
                "title": "پیشنهاد شگفت‌انگیز",
                "href": "/catalog",
                "productCount": 10,
                "source": "amazing",
            },
        },
        {
            "type": "CategoryCircles",
            "props": {
                "id": "CategoryCircles-1",
                "title": "دسته‌بندی‌ها",
                "limit": 12,
                "href": "/browse",
            },
        },
        {
            "type": "ProductRail",
            "props": {
                "id": "ProductRail-1",
                "title": "پرفروش‌ترین‌ها",
                "subtitle": "محصولات منتخب",
                "href": "/catalog",
                "hrefLabel": "مشاهده همه",
                "productCount": 12,
                "source": "latest",
            },
        },
        {
            "type": "PromoBanners",
            "props": {"id": "PromoBanners-1", "showFallback": True},
        },
    ],
}


def _page_key(slug: str) -> str:
    return f"{PAGE_KEY_PREFIX}{slug.strip() or HOME_SLUG}"


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
    return ThemeAppearance.model_validate(_sanitize_appearance({**DEFAULT_APPEARANCE, **raw}))


def patch_appearance(db: Session, body: ThemeAppearancePatch) -> ThemeAppearance:
    current = get_appearance(db).model_dump()
    patch = body.model_dump(exclude_unset=True)
    current.update(patch)
    validated = ThemeAppearance.model_validate(_sanitize_appearance(current))
    shop_settings.set_setting(db, APPEARANCE_KEY, validated.model_dump())
    return validated


def get_page_raw(db: Session, slug: str = HOME_SLUG) -> dict[str, Any]:
    key = _page_key(slug)
    raw = shop_settings.get_setting(db, key, None)
    if not isinstance(raw, dict) or "content" not in raw:
        return {
            "slug": slug,
            "data": DEFAULT_HOME_DATA if slug == HOME_SLUG else {"content": [], "root": {}},
            "published": True,
        }
    return {
        "slug": slug,
        "data": {
            "content": raw.get("content") or [],
            "root": raw.get("root") or {},
            "zones": raw.get("zones"),
        },
        "published": bool(raw.get("published", True)),
    }


def get_public(db: Session, slug: str = HOME_SLUG) -> PageBuilderPublic:
    page = get_page_raw(db, slug)
    published = bool(page["published"])
    data = page["data"]
    if not published:
        # پیش‌نویس — برای عموم چیدمان پیش‌فرض برمی‌گردد
        data = DEFAULT_HOME_DATA if slug == HOME_SLUG else {"content": [], "root": {}}
    # zones=null را از پاسخ حذف‌شده‌گونه پاک می‌کنیم تا کلاینت گیج نشود
    if isinstance(data, dict) and data.get("zones") is None:
        data = {k: v for k, v in data.items() if k != "zones"}
    return PageBuilderPublic(
        slug=page["slug"],
        data=PageBuilderData.model_validate(data),
        published=published,
        appearance=get_appearance(db),
    )


def put_page(db: Session, slug: str, body: PageBuilderPut) -> PageBuilderPublic:
    dumped = body.data.model_dump(exclude_none=True)
    # اگر zones در body نباشد، zones قبلی را نگه می‌داریم تا بلوک‌های تو در تو پاک نشوند
    if "zones" not in dumped:
        prev = get_page_raw(db, slug)
        prev_zones = (prev.get("data") or {}).get("zones") if isinstance(prev.get("data"), dict) else None
        if prev_zones:
            dumped["zones"] = prev_zones
    payload = {
        **dumped,
        "published": body.published,
    }
    shop_settings.set_setting(db, _page_key(slug), payload)
    return get_public(db, slug)


def ensure_defaults(db: Session) -> None:
    if db.get(SiteSetting, APPEARANCE_KEY) is None:
        shop_settings.set_setting(db, APPEARANCE_KEY, DEFAULT_APPEARANCE)
    home_key = _page_key(HOME_SLUG)
    if db.get(SiteSetting, home_key) is None:
        shop_settings.set_setting(
            db,
            home_key,
            {**DEFAULT_HOME_DATA, "published": True},
        )
