"""منطق کسب‌وکار وبلاگ."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import User
from app.models.blog import BlogCategory, BlogPost, BlogPostStatus, BlogTag

_WORDS_PER_MINUTE = 200


def estimate_reading_time(html: str) -> int:
    text = re.sub(r"<[^>]+>", " ", html or "")
    words = len(text.split())
    return max(1, round(words / _WORDS_PER_MINUTE))


def _author_out(user: User | None):
    if user is None:
        return None
    name = (user.full_name or "").strip() or user.phone
    return {"id": user.id, "display_name": name}


def _category_out(cat: BlogCategory | None, post_count: int = 0):
    if cat is None:
        return None
    return {
        "id": cat.id,
        "slug": cat.slug,
        "name_fa": cat.name_fa,
        "description": cat.description,
        "post_count": post_count,
    }


def _tags_out(tags: list[BlogTag]):
    return [{"id": t.id, "slug": t.slug, "name_fa": t.name_fa} for t in tags]


def post_to_summary(post: BlogPost, cover_url: str | None = None) -> dict:
    return {
        "id": post.id,
        "slug": post.slug,
        "title": post.title,
        "excerpt": post.excerpt,
        "cover_image_url": cover_url,
        "category": _category_out(post.category),
        "tags": _tags_out(post.tags),
        "author": _author_out(getattr(post, "author", None)),
        "is_featured": post.is_featured,
        "reading_time_minutes": post.reading_time_minutes,
        "published_at": post.published_at,
    }


def post_to_detail(post: BlogPost, cover_url: str | None, related: list[dict]) -> dict:
    base = post_to_summary(post, cover_url)
    base.update(
        {
            "content_html": post.content_html,
            "meta_title": post.meta_title,
            "meta_description": post.meta_description,
            "view_count": post.view_count,
            "related": related,
        }
    )
    return base


def post_to_admin(post: BlogPost, cover_url: str | None = None) -> dict:
    return {
        "id": post.id,
        "slug": post.slug,
        "title": post.title,
        "excerpt": post.excerpt,
        "content_html": post.content_html,
        "cover_image_key": post.cover_image_key,
        "cover_image_url": cover_url,
        "category_id": post.category_id,
        "category": _category_out(post.category),
        "tag_ids": [t.id for t in post.tags],
        "tags": _tags_out(post.tags),
        "author_id": post.author_id,
        "author": _author_out(getattr(post, "author", None)),
        "status": post.status.value if isinstance(post.status, BlogPostStatus) else post.status,
        "is_featured": post.is_featured,
        "reading_time_minutes": post.reading_time_minutes,
        "meta_title": post.meta_title,
        "meta_description": post.meta_description,
        "published_at": post.published_at,
        "view_count": post.view_count,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
    }


def _post_query_options():
    return [
        joinedload(BlogPost.category),
        joinedload(BlogPost.tags),
        joinedload(BlogPost.author),
    ]


def _published_filter():
    now = datetime.now(timezone.utc)
    return (
        BlogPost.status == BlogPostStatus.published,
        or_(BlogPost.published_at.is_(None), BlogPost.published_at <= now),
    )


def list_published_posts(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 12,
    category_slug: str | None = None,
    tag_slug: str | None = None,
    featured_only: bool = False,
    search: str | None = None,
) -> tuple[list[BlogPost], int]:
    q = select(BlogPost).options(*_post_query_options())
    q = q.where(*_published_filter())

    if category_slug:
        q = q.join(BlogCategory, BlogPost.category_id == BlogCategory.id).where(
            BlogCategory.slug == category_slug
        )
    if tag_slug:
        q = q.join(BlogPost.tags).where(BlogTag.slug == tag_slug)
    if featured_only:
        q = q.where(BlogPost.is_featured.is_(True))
    if search:
        term = f"%{search.strip()}%"
        q = q.where(or_(BlogPost.title.ilike(term), BlogPost.excerpt.ilike(term)))

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    rows = db.scalars(
        q.order_by(BlogPost.published_at.desc(), BlogPost.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).unique().all()
    return list(rows), total


def get_published_post_by_slug(db: Session, slug: str) -> BlogPost | None:
    q = (
        select(BlogPost)
        .options(*_post_query_options())
        .where(BlogPost.slug == slug, *_published_filter())
    )
    return db.scalars(q).unique().first()


def get_related_posts(db: Session, post: BlogPost, limit: int = 3) -> list[BlogPost]:
    q = (
        select(BlogPost)
        .options(*_post_query_options())
        .where(BlogPost.id != post.id, *_published_filter())
    )
    if post.category_id:
        q = q.where(BlogPost.category_id == post.category_id)
    rows = db.scalars(
        q.order_by(BlogPost.published_at.desc()).limit(limit)
    ).unique().all()
    if len(rows) < limit:
        extra = db.scalars(
            select(BlogPost)
            .options(*_post_query_options())
            .where(BlogPost.id != post.id, *_published_filter())
            .order_by(BlogPost.published_at.desc())
            .limit(limit)
        ).unique().all()
        seen = {r.id for r in rows}
        for r in extra:
            if r.id not in seen:
                rows.append(r)
                seen.add(r.id)
            if len(rows) >= limit:
                break
    return rows[:limit]


def increment_view_count(db: Session, post: BlogPost) -> None:
    post.view_count = (post.view_count or 0) + 1
    db.commit()


def list_categories_with_counts(db: Session, published_only: bool = True) -> list[tuple[BlogCategory, int]]:
    q = select(BlogCategory).order_by(BlogCategory.sort_order, BlogCategory.name_fa)
    cats = db.scalars(q).all()
    result = []
    for cat in cats:
        count_q = select(func.count()).select_from(BlogPost).where(BlogPost.category_id == cat.id)
        if published_only:
            count_q = count_q.where(*_published_filter())
        count = db.scalar(count_q) or 0
        result.append((cat, count))
    return result


def list_all_tags(db: Session) -> list[BlogTag]:
    return list(db.scalars(select(BlogTag).order_by(BlogTag.name_fa)).all())


def list_all_posts_admin(db: Session) -> list[BlogPost]:
    return list(
        db.scalars(
            select(BlogPost)
            .options(*_post_query_options())
            .order_by(BlogPost.updated_at.desc())
        ).unique().all()
    )


def get_post_admin(db: Session, post_id: int) -> BlogPost | None:
    return db.scalars(
        select(BlogPost).options(*_post_query_options()).where(BlogPost.id == post_id)
    ).unique().first()


def _resolve_tags(db: Session, tag_ids: list[int]) -> list[BlogTag]:
    if not tag_ids:
        return []
    tags = list(db.scalars(select(BlogTag).where(BlogTag.id.in_(tag_ids))).all())
    return tags


def _apply_status(post: BlogPost, status: str, published_at: datetime | None) -> None:
    try:
        post.status = BlogPostStatus(status)
    except ValueError:
        post.status = BlogPostStatus.draft
    if post.status == BlogPostStatus.published and post.published_at is None:
        post.published_at = published_at or datetime.now(timezone.utc)
    elif published_at is not None:
        post.published_at = published_at


def create_post(db: Session, data: dict, author_id: int | None = None) -> BlogPost:
    tag_ids = data.pop("tag_ids", [])
    status = data.pop("status", "draft")
    published_at = data.pop("published_at", None)
    content = data.get("content_html", "")
    post = BlogPost(**data, author_id=author_id)
    post.reading_time_minutes = estimate_reading_time(content)
    _apply_status(post, status, published_at)
    post.tags = _resolve_tags(db, tag_ids)
    db.add(post)
    db.commit()
    db.refresh(post)
    return get_post_admin(db, post.id)  # type: ignore[return-value]


def update_post(db: Session, post: BlogPost, data: dict) -> BlogPost:
    tag_ids = data.pop("tag_ids", None)
    status = data.pop("status", None)
    published_at = data.pop("published_at", None)

    for key, value in data.items():
        if value is not None:
            setattr(post, key, value)

    if "content_html" in data and data["content_html"] is not None:
        post.reading_time_minutes = estimate_reading_time(post.content_html)

    if tag_ids is not None:
        post.tags = _resolve_tags(db, tag_ids)

    if status is not None:
        _apply_status(post, status, published_at)
    elif published_at is not None:
        post.published_at = published_at

    db.commit()
    db.refresh(post)
    return post


def delete_post(db: Session, post: BlogPost) -> None:
    db.delete(post)
    db.commit()


def create_category(db: Session, data: dict) -> BlogCategory:
    cat = BlogCategory(**data)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def update_category(db: Session, cat: BlogCategory, data: dict) -> BlogCategory:
    for key, value in data.items():
        setattr(cat, key, value)
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, cat: BlogCategory) -> None:
    db.delete(cat)
    db.commit()


def create_tag(db: Session, data: dict) -> BlogTag:
    tag = BlogTag(**data)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def delete_tag(db: Session, tag: BlogTag) -> None:
    db.delete(tag)
    db.commit()
