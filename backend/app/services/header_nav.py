"""لینک‌های ناوبری هدر — خواندن عمومی و CRUD ادمین."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.header_nav import HeaderNavLink

DEFAULT_LINKS: list[dict[str, object]] = [
    {"label_fa": "سفارش عمده", "href": "/business", "sort_order": 10},
    {"label_fa": "کاتالوگ", "href": "/catalog", "sort_order": 20},
    {"label_fa": "مجله", "href": "/blog", "sort_order": 30},
]


def ensure_default_links(db: Session) -> None:
    if db.scalar(select(HeaderNavLink).limit(1)):
        return
    for item in DEFAULT_LINKS:
        db.add(HeaderNavLink(**item))
    db.commit()


def list_links(db: Session, *, active_only: bool = False) -> list[HeaderNavLink]:
    q = select(HeaderNavLink).order_by(HeaderNavLink.sort_order, HeaderNavLink.id)
    if active_only:
        q = q.where(HeaderNavLink.is_active.is_(True))
    return list(db.scalars(q).all())


def next_sort_order(db: Session) -> int:
    current = db.scalar(select(func.max(HeaderNavLink.sort_order))) or 0
    return int(current) + 10
