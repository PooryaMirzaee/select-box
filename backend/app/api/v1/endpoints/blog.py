"""API عمومی وبلاگ."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.blog import (
    BlogCategoryOut,
    BlogPostDetail,
    BlogPostListResponse,
    BlogPostSummary,
    BlogTagOut,
)
from app.services import blog as blog_service
from app.services.storage import public_url

router = APIRouter(prefix="/catalog/blog", tags=["blog"])


def _cover_url(post) -> str | None:
    return public_url(post.cover_image_key) if post.cover_image_key else None


@router.get("", response_model=BlogPostListResponse)
def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=48),
    category: str | None = None,
    tag: str | None = None,
    featured: bool = False,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    rows, total = blog_service.list_published_posts(
        db,
        page=page,
        page_size=page_size,
        category_slug=category,
        tag_slug=tag,
        featured_only=featured,
        search=q,
    )
    items = [
        BlogPostSummary(**blog_service.post_to_summary(r, _cover_url(r))) for r in rows
    ]
    return BlogPostListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/categories", response_model=list[BlogCategoryOut])
def list_categories(db: Session = Depends(get_db)):
    pairs = blog_service.list_categories_with_counts(db)
    return [
        BlogCategoryOut(
            id=cat.id,
            slug=cat.slug,
            name_fa=cat.name_fa,
            description=cat.description,
            post_count=count,
        )
        for cat, count in pairs
    ]


@router.get("/tags", response_model=list[BlogTagOut])
def list_tags(db: Session = Depends(get_db)):
    return [BlogTagOut.model_validate(t) for t in blog_service.list_all_tags(db)]


@router.get("/slugs")
def list_slugs(db: Session = Depends(get_db)):
    rows, _ = blog_service.list_published_posts(db, page=1, page_size=500)
    return {"slugs": [r.slug for r in rows]}


@router.get("/{slug}", response_model=BlogPostDetail)
def get_post(slug: str, db: Session = Depends(get_db)):
    post = blog_service.get_published_post_by_slug(db, slug)
    if post is None:
        raise HTTPException(status_code=404, detail="مقاله یافت نشد")

    blog_service.increment_view_count(db, post)
    related_rows = blog_service.get_related_posts(db, post)
    related = [
        BlogPostSummary(**blog_service.post_to_summary(r, _cover_url(r)))
        for r in related_rows
    ]
    data = blog_service.post_to_detail(post, _cover_url(post), [r.model_dump() for r in related])
    return BlogPostDetail(**data)
