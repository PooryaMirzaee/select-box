"""بنرهای صفحهٔ اول — فیلتر زمان‌بندی و آدرس عمومی تصاویر."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.home_banner import HomeBanner
from app.schemas.home_banner import HomeBannerAdmin, HomeBannerOut
from app.services.storage import public_url


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _is_visible(row: HomeBanner, now: datetime | None = None) -> bool:
    if not row.is_active:
        return False
    current = now or _now()
    if row.starts_at and row.starts_at > current:
        return False
    if row.ends_at and row.ends_at < current:
        return False
    if row.variant == "image" and not row.image_key:
        return False
    if row.variant == "text" and not row.title_fa:
        return False
    return True


def _to_public(row: HomeBanner) -> HomeBannerOut:
    return HomeBannerOut(
        id=row.id,
        title_fa=row.title_fa,
        subtitle_fa=row.subtitle_fa,
        eyebrow_fa=row.eyebrow_fa,
        cta_label=row.cta_label,
        cta_href=row.cta_href,
        image_url=public_url(row.image_key) if row.image_key else None,
        image_mobile_url=public_url(row.image_mobile_key) if row.image_mobile_key else None,
        placement=row.placement,
        variant=row.variant,
        text_align=row.text_align,
        overlay_opacity=row.overlay_opacity,
        accent_style=row.accent_style,
        sort_order=row.sort_order,
        open_in_new_tab=row.open_in_new_tab,
    )


def to_admin(row: HomeBanner) -> HomeBannerAdmin:
    pub = _to_public(row)
    return HomeBannerAdmin(
        **pub.model_dump(),
        image_key=row.image_key,
        image_mobile_key=row.image_mobile_key,
        is_active=row.is_active,
        starts_at=row.starts_at,
        ends_at=row.ends_at,
    )


def list_public(db: Session, *, placement: str | None = None) -> list[HomeBannerOut]:
    q = select(HomeBanner).order_by(HomeBanner.sort_order, HomeBanner.id)
    if placement:
        q = q.where(HomeBanner.placement == placement)
    rows = list(db.scalars(q).all())
    return [_to_public(r) for r in rows if _is_visible(r)]


def list_admin(db: Session, *, placement: str | None = None) -> list[HomeBannerAdmin]:
    q = select(HomeBanner).order_by(HomeBanner.placement, HomeBanner.sort_order, HomeBanner.id)
    if placement:
        q = q.where(HomeBanner.placement == placement)
    rows = list(db.scalars(q).all())
    return [to_admin(r) for r in rows]


def next_sort_order(db: Session, placement: str) -> int:
    current = db.scalar(
        select(func.max(HomeBanner.sort_order)).where(HomeBanner.placement == placement)
    ) or 0
    return int(current) + 10
