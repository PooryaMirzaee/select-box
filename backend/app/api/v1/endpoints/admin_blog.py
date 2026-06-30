"""مدیریت وبلاگ — ادمین."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.models.blog import BlogCategory, BlogPost, BlogTag
from app.schemas.blog import (
    BlogCategoryAdmin,
    BlogCategoryIn,
    BlogPostAdmin,
    BlogPostIn,
    BlogPostPatch,
    BlogTagIn,
    BlogTagOut,
)
from app.services import blog as blog_service
from app.services.storage import delete_upload, public_url
from app.services.upload_security import secure_image_upload

router = APIRouter(prefix="/admin/blog", tags=["admin-blog"], dependencies=[Depends(require_admin)])


def _cover_url(post: BlogPost) -> str | None:
    return public_url(post.cover_image_key) if post.cover_image_key else None


def _post_admin(post: BlogPost) -> BlogPostAdmin:
    return BlogPostAdmin(**blog_service.post_to_admin(post, _cover_url(post)))


def _category_admin(cat: BlogCategory, db: Session) -> BlogCategoryAdmin:
    count = 0
    for c, n in blog_service.list_categories_with_counts(db, published_only=False):
        if c.id == cat.id:
            count = n
            break
    return BlogCategoryAdmin(
        id=cat.id,
        slug=cat.slug,
        name_fa=cat.name_fa,
        description=cat.description,
        meta_title=cat.meta_title,
        meta_description=cat.meta_description,
        sort_order=cat.sort_order,
        post_count=count,
    )


# --- Posts ---
@router.get("/posts", response_model=list[BlogPostAdmin])
def list_posts(db: Session = Depends(get_db)):
    return [_post_admin(p) for p in blog_service.list_all_posts_admin(db)]


@router.get("/posts/{post_id}", response_model=BlogPostAdmin)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = blog_service.get_post_admin(db, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="مقاله یافت نشد")
    return _post_admin(post)


@router.post("/posts", response_model=BlogPostAdmin)
def create_post(body: BlogPostIn, db: Session = Depends(get_db), admin=Depends(require_admin)):
    existing = db.query(BlogPost).filter(BlogPost.slug == body.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="اسلاگ تکراری است")
    post = blog_service.create_post(db, body.model_dump(), author_id=admin.id)
    return _post_admin(post)


@router.patch("/posts/{post_id}", response_model=BlogPostAdmin)
def update_post(post_id: int, body: BlogPostPatch, db: Session = Depends(get_db)):
    post = blog_service.get_post_admin(db, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="مقاله یافت نشد")
    if body.slug and body.slug != post.slug:
        dup = db.query(BlogPost).filter(BlogPost.slug == body.slug, BlogPost.id != post_id).first()
        if dup:
            raise HTTPException(status_code=400, detail="اسلاگ تکراری است")
    updated = blog_service.update_post(db, post, body.model_dump(exclude_unset=True))
    return _post_admin(updated)


@router.delete("/posts/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = blog_service.get_post_admin(db, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="مقاله یافت نشد")
    if post.cover_image_key:
        delete_upload(post.cover_image_key)
    blog_service.delete_post(db, post)
    return {"ok": True}


@router.post("/posts/{post_id}/cover-image")
async def upload_cover(
    post_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    post = blog_service.get_post_admin(db, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="مقاله یافت نشد")
    if post.cover_image_key:
        delete_upload(post.cover_image_key)
    key, _ = await secure_image_upload(
        file,
        f"blog/{post_id}",
        max_bytes=8 * 1024 * 1024,
    )
    post.cover_image_key = key
    db.commit()
    db.refresh(post)
    return {"storage_key": key, "cover_image_url": public_url(key)}


@router.delete("/posts/{post_id}/cover-image")
def remove_cover(post_id: int, db: Session = Depends(get_db)):
    post = blog_service.get_post_admin(db, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="مقاله یافت نشد")
    if post.cover_image_key:
        delete_upload(post.cover_image_key)
        post.cover_image_key = None
        db.commit()
    return {"ok": True}


# --- Categories ---
@router.get("/categories", response_model=list[BlogCategoryAdmin])
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(BlogCategory).order_by(BlogCategory.sort_order, BlogCategory.name_fa).all()
    return [_category_admin(c, db) for c in cats]


@router.post("/categories", response_model=BlogCategoryAdmin)
def create_category(body: BlogCategoryIn, db: Session = Depends(get_db)):
    if db.query(BlogCategory).filter(BlogCategory.slug == body.slug).first():
        raise HTTPException(status_code=400, detail="اسلاگ تکراری است")
    cat = blog_service.create_category(db, body.model_dump())
    return _category_admin(cat, db)


@router.patch("/categories/{category_id}", response_model=BlogCategoryAdmin)
def update_category(category_id: int, body: BlogCategoryIn, db: Session = Depends(get_db)):
    cat = db.get(BlogCategory, category_id)
    if cat is None:
        raise HTTPException(status_code=404, detail="دسته یافت نشد")
    if body.slug != cat.slug and db.query(BlogCategory).filter(BlogCategory.slug == body.slug).first():
        raise HTTPException(status_code=400, detail="اسلاگ تکراری است")
    cat = blog_service.update_category(db, cat, body.model_dump())
    return _category_admin(cat, db)


@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.get(BlogCategory, category_id)
    if cat is None:
        raise HTTPException(status_code=404, detail="دسته یافت نشد")
    blog_service.delete_category(db, cat)
    return {"ok": True}


# --- Tags ---
@router.get("/tags", response_model=list[BlogTagOut])
def list_tags(db: Session = Depends(get_db)):
    return [BlogTagOut.model_validate(t) for t in blog_service.list_all_tags(db)]


@router.post("/tags", response_model=BlogTagOut)
def create_tag(body: BlogTagIn, db: Session = Depends(get_db)):
    if db.query(BlogTag).filter(BlogTag.slug == body.slug).first():
        raise HTTPException(status_code=400, detail="اسلاگ تکراری است")
    tag = blog_service.create_tag(db, body.model_dump())
    return BlogTagOut.model_validate(tag)


@router.delete("/tags/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.get(BlogTag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="برچسب یافت نشد")
    blog_service.delete_tag(db, tag)
    return {"ok": True}
