"""مدیریت بنرهای صفحهٔ اول."""

from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.models.home_banner import HomeBanner
from app.schemas.home_banner import HomeBannerAdmin, HomeBannerIn
from app.services import home_banner as banner_service
from app.services.storage import delete_upload, public_url
from app.services.upload_security import secure_image_upload

router = APIRouter(
    prefix="/admin/home-banners",
    tags=["admin-banners"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=list[HomeBannerAdmin])
def list_banners(db: Session = Depends(get_db)):
    return banner_service.list_admin(db)


@router.post("", response_model=HomeBannerAdmin)
def create_banner(body: HomeBannerIn, db: Session = Depends(get_db)):
    data = body.model_dump()
    if data["sort_order"] == 0:
        data["sort_order"] = banner_service.next_sort_order(db, data["placement"])
    row = HomeBanner(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return banner_service.to_admin(row)


@router.patch("/{banner_id}", response_model=HomeBannerAdmin)
def update_banner(banner_id: int, body: HomeBannerIn, db: Session = Depends(get_db)):
    row = db.get(HomeBanner, banner_id)
    if not row:
        raise HTTPException(status_code=404, detail="بنر یافت نشد")
    for key, value in body.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return banner_service.to_admin(row)


@router.delete("/{banner_id}")
def delete_banner(banner_id: int, db: Session = Depends(get_db)):
    row = db.get(HomeBanner, banner_id)
    if not row:
        raise HTTPException(status_code=404, detail="بنر یافت نشد")
    if row.image_key:
        delete_upload(row.image_key)
    if row.image_mobile_key:
        delete_upload(row.image_mobile_key)
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.post("/{banner_id}/image")
async def upload_banner_image(
    banner_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    row = db.get(HomeBanner, banner_id)
    if not row:
        raise HTTPException(status_code=404, detail="بنر یافت نشد")
    if row.image_key:
        delete_upload(row.image_key)
    key, _ = await secure_image_upload(file, f"home-banners/{banner_id}", max_bytes=10 * 1024 * 1024)
    row.image_key = key
    row.variant = "image"
    db.commit()
    db.refresh(row)
    return {"storage_key": key, "image_url": public_url(key)}


@router.post("/{banner_id}/image-mobile")
async def upload_banner_image_mobile(
    banner_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    row = db.get(HomeBanner, banner_id)
    if not row:
        raise HTTPException(status_code=404, detail="بنر یافت نشد")
    if row.image_mobile_key:
        delete_upload(row.image_mobile_key)
    key, _ = await secure_image_upload(file, f"home-banners/{banner_id}/mobile", max_bytes=8 * 1024 * 1024)
    row.image_mobile_key = key
    db.commit()
    db.refresh(row)
    return {"storage_key": key, "image_mobile_url": public_url(key)}


@router.delete("/{banner_id}/image")
def remove_banner_image(banner_id: int, db: Session = Depends(get_db)):
    row = db.get(HomeBanner, banner_id)
    if not row:
        raise HTTPException(status_code=404, detail="بنر یافت نشد")
    if row.image_key:
        delete_upload(row.image_key)
        row.image_key = None
        db.commit()
    return {"ok": True}


@router.delete("/{banner_id}/image-mobile")
def remove_banner_image_mobile(banner_id: int, db: Session = Depends(get_db)):
    row = db.get(HomeBanner, banner_id)
    if not row:
        raise HTTPException(status_code=404, detail="بنر یافت نشد")
    if row.image_mobile_key:
        delete_upload(row.image_mobile_key)
        row.image_mobile_key = None
        db.commit()
    return {"ok": True}


@router.post("/reorder", response_model=list[HomeBannerAdmin])
def reorder_banners(ids: list[int] = Body(...), db: Session = Depends(get_db)):
    if not ids:
        return banner_service.list_admin(db)
    rows = db.scalars(select(HomeBanner).where(HomeBanner.id.in_(ids))).all()
    by_id = {row.id: row for row in rows}
    order = 10
    for banner_id in ids:
        row = by_id.get(banner_id)
        if not row:
            continue
        row.sort_order = order
        order += 10
    db.commit()
    return banner_service.list_admin(db)
