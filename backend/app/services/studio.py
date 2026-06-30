"""پروفایل عمومی خالق (استودیو) — لیست، صفحهٔ ویترین، ویرایش."""

from __future__ import annotations

import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Design, Product, User
from app.services.catalog import _product_summary_dict, list_published_products_by_creator
from app.services.customizer import creator_display_name
from app.services.storage import delete_upload, public_url

DEFAULT_ACCENT = "#c45c26"
SLUG_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$")


def studio_slug_for_user(user: User) -> str:
    if user.studio_slug and user.studio_slug.strip():
        return user.studio_slug.strip().lower()
    return str(user.id)


def normalize_studio_slug(raw: str) -> str:
    s = raw.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:80]


def _count_published_products(db: Session, creator_id: int) -> int:
    return int(
        db.scalar(
            select(func.count(func.distinct(Product.design_id)))
            .join(Design, Product.design_id == Design.id)
            .where(
                Design.creator_id == creator_id,
                Design.source_type == "user",
                Product.status == "published",
            )
        )
        or 0
    )


def _studio_preview_url(db: Session, creator_id: int) -> str | None:
    products = list_published_products_by_creator(db, creator_id)
    if not products:
        return None
    p = products[0]
    if p.images:
        key = p.images[0].storage_key
        return public_url(key) if key else None
    if p.design and p.design.assets:
        key = p.design.assets[0].storage_key
        return public_url(key) if key else None
    return None


def _media_url(key: str | None) -> str | None:
    return public_url(key) if key else None


def studio_public_dict(
    user: User,
    db: Session,
    *,
    product_count: int | None = None,
    preview_url: str | None = None,
) -> dict:
    if product_count is None:
        product_count = _count_published_products(db, user.id)
    if preview_url is None and product_count:
        preview_url = _studio_preview_url(db, user.id)
    return {
        "id": user.id,
        "display_name": creator_display_name(user),
        "studio_slug": studio_slug_for_user(user),
        "bio": user.studio_bio,
        "tagline": user.studio_tagline,
        "accent_hex": user.studio_accent_hex or DEFAULT_ACCENT,
        "product_count": product_count,
        "preview_image_url": preview_url,
        "avatar_url": _media_url(user.studio_avatar_key),
        "header_url": _media_url(user.studio_header_key),
    }


def creator_public(user: User | None, db: Session | None = None) -> dict | None:
    """خلاصهٔ خالق برای کارت محصول یا صفحهٔ کامل."""
    if user is None:
        return None
    if db is None:
        return {
            "id": user.id,
            "display_name": creator_display_name(user),
            "studio_slug": studio_slug_for_user(user),
            "accent_hex": user.studio_accent_hex or DEFAULT_ACCENT,
        }
    return studio_public_dict(user, db)


def resolve_studio_user(db: Session, slug_or_id: str) -> User | None:
    raw = slug_or_id.strip()
    if raw.isdigit():
        return db.get(User, int(raw))
    slug = normalize_studio_slug(raw)
    if not slug:
        return None
    user = db.scalar(select(User).where(User.studio_slug == slug))
    if user is not None:
        return user
    if slug.isdigit():
        return db.get(User, int(slug))
    return None


def list_featured_studios(db: Session) -> list[dict]:
    """خالقینی که حداقل یک محصول منتشرشده در ویترین دارند."""
    rows = db.execute(
        select(
            User.id,
            func.count(func.distinct(Product.design_id)).label("product_count"),
        )
        .join(Design, Design.creator_id == User.id)
        .join(Product, Product.design_id == Design.id)
        .where(Design.source_type == "user", Product.status == "published")
        .group_by(User.id)
        .order_by(func.count(func.distinct(Product.design_id)).desc(), User.id.desc())
    ).all()
    out: list[dict] = []
    for user_id, count in rows:
        user = db.get(User, user_id)
        if user is None:
            continue
        preview = _studio_preview_url(db, user.id) if count else None
        out.append(studio_public_dict(user, db, product_count=int(count), preview_url=preview))
    return out


def my_studio_dashboard(db: Session, user: User) -> dict:
    products = list(
        db.scalars(
            select(Product)
            .join(Design, Product.design_id == Design.id)
            .where(Design.creator_id == user.id, Design.source_type == "user")
            .order_by(Product.id.desc())
        ).all()
    )
    published = sum(1 for p in products if p.status == "published")
    pending = sum(1 for p in products if p.status != "published")
    slug = studio_slug_for_user(user)
    return {
        "profile": studio_public_dict(user, db, product_count=published),
        "full_name": user.full_name,
        "phone": user.phone,
        "public_path": f"/studio/{slug}",
        "published_count": published,
        "pending_count": pending,
        "total_products": len(products),
    }


def update_my_studio(db: Session, user: User, data: dict) -> User:
    if "full_name" in data and data["full_name"] is not None:
        name = data["full_name"].strip()
        user.full_name = name[:255] if name else None

    if "studio_bio" in data:
        bio = data["studio_bio"]
        user.studio_bio = (bio.strip()[:2000] if bio and bio.strip() else None)

    if "studio_tagline" in data:
        tag = data["studio_tagline"]
        user.studio_tagline = (tag.strip()[:255] if tag and tag.strip() else None)

    if "studio_accent_hex" in data and data["studio_accent_hex"] is not None:
        hx = data["studio_accent_hex"].strip()
        if not re.fullmatch(r"#[0-9A-Fa-f]{6}", hx):
            raise ValueError("invalid_accent")
        user.studio_accent_hex = hx.lower()

    if "studio_slug" in data and data["studio_slug"] is not None:
        slug = normalize_studio_slug(data["studio_slug"])
        if not slug or not SLUG_PATTERN.match(slug):
            raise ValueError("invalid_slug")
        if slug.isdigit():
            raise ValueError("invalid_slug")
        other = db.scalar(select(User).where(User.studio_slug == slug, User.id != user.id))
        if other is not None:
            raise ValueError("slug_taken")
        user.studio_slug = slug

    db.commit()
    db.refresh(user)
    return user


def set_studio_image(db: Session, user: User, kind: str, storage_key: str) -> User:
    """kind: avatar | header"""
    if kind == "avatar":
        old = user.studio_avatar_key
        user.studio_avatar_key = storage_key
    elif kind == "header":
        old = user.studio_header_key
        user.studio_header_key = storage_key
    else:
        raise ValueError("invalid_kind")
    db.commit()
    db.refresh(user)
    if old and old != storage_key:
        delete_upload(old)
    return user


def clear_studio_image(db: Session, user: User, kind: str) -> User:
    if kind == "avatar":
        old = user.studio_avatar_key
        user.studio_avatar_key = None
    elif kind == "header":
        old = user.studio_header_key
        user.studio_header_key = None
    else:
        raise ValueError("invalid_kind")
    db.commit()
    db.refresh(user)
    if old:
        delete_upload(old)
    return user
