"""مدیریت لندینگ و درخواست‌های سفارش سازمانی — ادمین."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.models.business import BusinessLanding, BusinessQuoteRequest
from app.schemas.business import (
    BusinessLandingAdmin,
    BusinessLandingPatch,
    BusinessQuoteAdmin,
    BusinessQuoteStatusPatch,
)
from app.services import business as business_service
from app.services.storage import delete_upload, public_url
from app.services.upload_security import secure_image_upload

router = APIRouter(prefix="/admin/business", tags=["admin-business"], dependencies=[Depends(require_admin)])


def _landing_admin(row: BusinessLanding) -> BusinessLandingAdmin:
    pub = business_service.landing_to_public(row)
    return BusinessLandingAdmin(
        **pub.model_dump(),
        id=row.id,
        hero_image_key=row.hero_image_key,
        is_published=row.is_published,
        sort_order=row.sort_order,
    )


@router.get("/landings", response_model=list[BusinessLandingAdmin])
def list_landings(db: Session = Depends(get_db)):
    return [_landing_admin(r) for r in business_service.list_all_landings(db)]


@router.get("/landings/{landing_id}", response_model=BusinessLandingAdmin)
def get_landing(landing_id: int, db: Session = Depends(get_db)):
    row = db.get(BusinessLanding, landing_id)
    if row is None:
        raise HTTPException(status_code=404, detail="لندینگ یافت نشد")
    return _landing_admin(row)


@router.patch("/landings/{landing_id}", response_model=BusinessLandingAdmin)
def update_landing(landing_id: int, body: BusinessLandingPatch, db: Session = Depends(get_db)):
    row = db.get(BusinessLanding, landing_id)
    if row is None:
        raise HTTPException(status_code=404, detail="لندینگ یافت نشد")
    for key, value in body.model_dump(exclude_unset=True).items():
        if value is not None and hasattr(value, "__iter__") and not isinstance(value, (str, dict)):
            value = [v.model_dump() if hasattr(v, "model_dump") else v for v in value]
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return _landing_admin(row)


@router.post("/landings/{landing_id}/hero-image")
async def upload_hero_image(
    landing_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    row = db.get(BusinessLanding, landing_id)
    if row is None:
        raise HTTPException(status_code=404, detail="لندینگ یافت نشد")
    if row.hero_image_key:
        delete_upload(row.hero_image_key)
    key, _ = await secure_image_upload(
        file,
        f"business/{landing_id}",
        max_bytes=8 * 1024 * 1024,
    )
    row.hero_image_key = key
    db.commit()
    db.refresh(row)
    return {"storage_key": key, "hero_image_url": public_url(key)}


@router.delete("/landings/{landing_id}/hero-image")
def remove_hero_image(landing_id: int, db: Session = Depends(get_db)):
    row = db.get(BusinessLanding, landing_id)
    if row is None:
        raise HTTPException(status_code=404, detail="لندینگ یافت نشد")
    if row.hero_image_key:
        delete_upload(row.hero_image_key)
        row.hero_image_key = None
        db.commit()
    return {"ok": True}


@router.post("/landings/{landing_id}/gallery")
async def upload_gallery_image(
    landing_id: int,
    file: UploadFile = File(...),
    caption_fa: str = Form(""),
    db: Session = Depends(get_db),
):
    row = db.get(BusinessLanding, landing_id)
    if row is None:
        raise HTTPException(status_code=404, detail="لندینگ یافت نشد")
    key, _ = await secure_image_upload(
        file,
        f"business/{landing_id}/gallery",
        max_bytes=8 * 1024 * 1024,
    )
    gallery = list(row.gallery_images or [])
    new_id = str(max([int(g.get("id", 0)) for g in gallery if str(g.get("id", "")).isdigit()] + [0]) + 1)
    gallery.append(
        {
            "id": new_id,
            "storage_key": key,
            "caption_fa": caption_fa.strip() or None,
            "sort_order": len(gallery),
        }
    )
    row.gallery_images = gallery
    db.commit()
    db.refresh(row)
    return _landing_admin(row)


@router.delete("/landings/{landing_id}/gallery/{item_id}")
def delete_gallery_image(landing_id: int, item_id: str, db: Session = Depends(get_db)):
    row = db.get(BusinessLanding, landing_id)
    if row is None:
        raise HTTPException(status_code=404, detail="لندینگ یافت نشد")
    gallery = list(row.gallery_images or [])
    kept = []
    for item in gallery:
        if str(item.get("id")) == item_id:
            if item.get("storage_key"):
                delete_upload(item["storage_key"])
        else:
            kept.append(item)
    row.gallery_images = kept
    db.commit()
    db.refresh(row)
    return _landing_admin(row)


@router.post("/landings/{landing_id}/trust-logos")
async def upload_trust_logo(
    landing_id: int,
    file: UploadFile = File(...),
    name_fa: str = Form(""),
    db: Session = Depends(get_db),
):
    row = db.get(BusinessLanding, landing_id)
    if row is None:
        raise HTTPException(status_code=404, detail="لندینگ یافت نشد")
    key, _ = await secure_image_upload(
        file,
        f"business/{landing_id}/logos",
        max_bytes=2 * 1024 * 1024,
    )
    logos = list(row.trust_logos or [])
    logos.append({"name_fa": name_fa.strip() or "مشتری", "storage_key": key})
    row.trust_logos = logos
    db.commit()
    db.refresh(row)
    return _landing_admin(row)


@router.get("/quotes", response_model=list[BusinessQuoteAdmin])
def list_quotes(
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    return business_service.list_quotes(db, status=status, limit=min(limit, 200), offset=offset)


@router.patch("/quotes/{quote_id}", response_model=BusinessQuoteAdmin)
def update_quote(quote_id: int, body: BusinessQuoteStatusPatch, db: Session = Depends(get_db)):
    row = db.get(BusinessQuoteRequest, quote_id)
    if row is None:
        raise HTTPException(status_code=404, detail="درخواست یافت نشد")
    if body.status is not None:
        allowed = {"pending", "reviewing", "quoted", "accepted", "closed"}
        if body.status not in allowed:
            raise HTTPException(status_code=400, detail="وضعیت نامعتبر")
        row.status = body.status
    if body.admin_notes is not None:
        row.admin_notes = body.admin_notes
    db.commit()
    db.refresh(row)
    return row
