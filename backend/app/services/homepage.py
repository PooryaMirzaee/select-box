"""تنظیمات صفحهٔ اصلی — ذخیره در site_settings."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.site_setting import SiteSetting
from app.schemas.homepage import HomepageConfig, HomepageConfigPatch, HomepagePublic
from app.services import settings as shop_settings

SETTING_KEY = "homepage"

DEFAULT_SECTIONS = [
    {"id": "carousel", "enabled": True},
    {"id": "hero", "enabled": True},
    {"id": "featured", "enabled": True},
    {"id": "promo", "enabled": True},
]

DEFAULT_CONFIG: dict[str, object] = {
    "sections": DEFAULT_SECTIONS,
    "hero": {
        "badge": "لوازم خانگی و سبک زندگی",
        "title": "خانه‌ای مدرن با SelectBox",
        "subtitle": "یخچال، ماشین لباسشویی، لوازم روزمره و صدها محصول با گارانتی اصلی — ارسال سریع به سراسر کشور.",
        "primary_cta": {"label": "مشاهده محصولات", "href": "/catalog"},
        "secondary_cta": {"label": "دسته‌بندی‌ها", "href": "/browse"},
        "mobile_categories_cta": {"label": "مرور دسته‌ها", "href": "/browse"},
        "categories_link_label": "همه دسته‌ها",
        "categories_link_href": "/browse",
        "show_categories_bento": True,
        "category_limit": 6,
    },
    "featured": {
        "title": "پرفروش‌ترین‌ها",
        "subtitle": "محصولات منتخب",
        "catalog_label": "کاتالوگ ←",
        "catalog_href": "/catalog",
        "product_count": 8,
        "parent_slug": None,
    },
    "show_promo_fallback": True,
}

VALID_SECTION_IDS = frozenset({"carousel", "hero", "featured", "promo"})


def _normalize_sections(sections: list[dict[str, object]]) -> list[dict[str, object]]:
    seen: set[str] = set()
    normalized: list[dict[str, object]] = []
    for item in sections:
        sid = str(item.get("id", "")).strip()
        if sid not in VALID_SECTION_IDS or sid in seen:
            continue
        seen.add(sid)
        normalized.append({"id": sid, "enabled": bool(item.get("enabled", True))})
    for default in DEFAULT_SECTIONS:
        if default["id"] not in seen:
            normalized.append(default)
    return normalized


def get_config(db: Session) -> HomepageConfig:
    raw = shop_settings.get_setting(db, SETTING_KEY, DEFAULT_CONFIG)
    if not isinstance(raw, dict):
        raw = DEFAULT_CONFIG
    merged = {**DEFAULT_CONFIG, **raw}
    if isinstance(merged.get("sections"), list):
        merged["sections"] = _normalize_sections(merged["sections"])
    return HomepageConfig.model_validate(merged)


def get_public(db: Session) -> HomepagePublic:
    cfg = get_config(db)
    return HomepagePublic(
        sections=cfg.sections,
        hero=cfg.hero,
        featured=cfg.featured,
        show_promo_fallback=cfg.show_promo_fallback,
    )


def patch_config(db: Session, body: HomepageConfigPatch) -> HomepageConfig:
    current = get_config(db)
    data = current.model_dump()
    patch = body.model_dump(exclude_unset=True)
    if "sections" in patch and patch["sections"] is not None:
        data["sections"] = _normalize_sections([s.model_dump() for s in patch["sections"]])
    if "hero" in patch and patch["hero"] is not None:
        data["hero"] = {**data["hero"], **patch["hero"].model_dump()}
    if "featured" in patch and patch["featured"] is not None:
        data["featured"] = {**data["featured"], **patch["featured"].model_dump()}
    if "show_promo_fallback" in patch:
        data["show_promo_fallback"] = patch["show_promo_fallback"]
    shop_settings.set_setting(db, SETTING_KEY, data)
    return get_config(db)


def ensure_default(db: Session) -> None:
    if db.get(SiteSetting, SETTING_KEY) is None:
        shop_settings.set_setting(db, SETTING_KEY, DEFAULT_CONFIG)
