"""اندپوینت‌های عمومی سفارش سازمانی."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.business import BusinessHubPublic, BusinessLandingPublic, BusinessQuoteIn, BusinessQuoteOut
from app.services import business as business_service

router = APIRouter(prefix="/catalog/business", tags=["business"])


@router.get("", response_model=BusinessHubPublic)
def get_business_hub(db: Session = Depends(get_db)):
    hub = business_service.get_hub(db)
    if hub is None:
        raise HTTPException(status_code=404, detail="صفحه سفارش سازمانی یافت نشد")
    products = business_service.list_published_product_landings(db)
    return BusinessHubPublic(
        hub=business_service.landing_to_public(hub),
        product_landings=[business_service.landing_to_public(p) for p in products],
    )


@router.get("/{slug}", response_model=BusinessLandingPublic)
def get_business_landing(slug: str, db: Session = Depends(get_db)):
    if slug == business_service.HUB_SLUG:
        row = business_service.get_hub(db)
    else:
        row = business_service.get_product_landing(db, slug)
    if row is None:
        raise HTTPException(status_code=404, detail="لندینگ یافت نشد")
    return business_service.landing_to_public(row)


@router.post("/quote", response_model=BusinessQuoteOut)
def submit_quote(body: BusinessQuoteIn, db: Session = Depends(get_db)):
    valid_types = business_service.PRODUCT_LANDING_SLUGS | {"mixed", "hub"}
    if body.product_type not in valid_types:
        raise HTTPException(status_code=400, detail="نوع محصول نامعتبر است")

    row = business_service.create_quote(
        db,
        {
            "company_name": body.company_name.strip(),
            "contact_name": body.contact_name.strip(),
            "phone": body.phone.strip(),
            "email": (body.email or "").strip() or None,
            "product_type": body.product_type,
            "quantity": body.quantity,
            "needs_custom_design": body.needs_custom_design,
            "message": (body.message or "").strip() or None,
            "landing_slug": body.landing_slug,
            "status": "pending",
        },
    )
    tracking_ref = f"B2B-{row.id:05d}"
    return BusinessQuoteOut(
        id=row.id,
        tracking_ref=tracking_ref,
        message="درخواست شما ثبت شد. ظرف ۲۴ ساعت با شما تماس می‌گیریم.",
    )
