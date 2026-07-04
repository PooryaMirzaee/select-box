"""
پنل مدیریت — CRUD طرح، محصول، دسته، آپلود موکاپ، سفارش‌ها.
"""

from decimal import Decimal

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.models import (
    Category,
    Design,
    DesignAsset,
    Order,
    Payment,
    Product,
    ProductVariation,
)
from app.schemas.admin import (
    CategoryIn,
    CategoryOut,
    DashboardOut,
    DesignIn,
    DesignOut,
    ORDER_STATUSES,
    OrderAdminListItem,
    OrderStatusPatch,
    PaymentAdminOut,
    PaymentReviewIn,
    ProductAdminOut,
    ProductIn,
    ProductUpdateIn,
    StatusPatch,
    VariationBulkIn,
    VariationIn,
    VariationOut,
)
from app.services.catalog import primary_product_image_url
from app.services.category_helpers import build_admin_category_tree, category_admin_out
from app.services.storage import public_url
from app.services.upload_security import secure_image_upload

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    pub = db.scalar(select(func.count()).select_from(Product).where(Product.status == "published")) or 0
    draft = db.scalar(select(func.count()).select_from(Product).where(Product.status == "draft")) or 0
    designs = db.scalar(select(func.count()).select_from(Design)) or 0
    orders = db.scalar(select(func.count()).select_from(Order)) or 0
    rev = db.scalar(
        select(func.coalesce(func.sum(Order.total), 0)).where(Order.status == "paid")
    ) or 0
    return DashboardOut(
        products_published=pub,
        products_draft=draft,
        designs=designs,
        orders=orders,
        revenue_paid=str(rev),
    )


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    rows = db.scalars(select(Category).order_by(Category.sort_order, Category.id)).all()
    return [category_admin_out(c) for c in rows]


@router.get("/categories/tree")
def list_categories_tree(db: Session = Depends(get_db)):
    rows = db.scalars(select(Category).order_by(Category.sort_order, Category.id)).all()
    return build_admin_category_tree(rows)


@router.post("/categories", response_model=CategoryOut)
def create_category(body: CategoryIn, db: Session = Depends(get_db)):
    c = Category(**body.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return category_admin_out(c)


@router.get("/designs", response_model=list[DesignOut])
def list_designs(db: Session = Depends(get_db)):
    rows = db.scalars(select(Design).order_by(Design.id.desc())).all()
    return [DesignOut.model_validate(d) for d in rows]


@router.post("/designs", response_model=DesignOut)
def create_design(body: DesignIn, db: Session = Depends(get_db)):
    if db.scalar(select(Design).where(Design.code == body.code)):
        raise HTTPException(status_code=400, detail="Design code exists")
    d = Design(**body.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return DesignOut.model_validate(d)


@router.patch("/designs/{design_id}", response_model=DesignOut)
def update_design(design_id: int, body: DesignIn, db: Session = Depends(get_db)):
    d = db.get(Design, design_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Design not found")
    for k, v in body.model_dump().items():
        setattr(d, k, v)
    db.commit()
    db.refresh(d)
    return DesignOut.model_validate(d)


@router.post("/designs/{design_id}/assets")
async def upload_design_asset(
    design_id: int,
    variant_key: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    d = db.get(Design, design_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Design not found")
    key, mime = await secure_image_upload(
        file,
        f"designs/{design_id}",
        max_bytes=8 * 1024 * 1024,
        allow_svg=False,
    )
    existing = db.scalar(
        select(DesignAsset).where(
            DesignAsset.design_id == design_id,
            DesignAsset.variant_key == variant_key,
        )
    )
    if existing:
        existing.storage_key = key
        existing.mime_type = mime
    else:
        db.add(
            DesignAsset(
                design_id=design_id,
                variant_key=variant_key,
                storage_key=key,
                mime_type=mime,
            )
        )
    db.commit()
    return {"storage_key": key, "url": public_url(key)}


def _product_query():
    return select(Product).options(
        joinedload(Product.images),
        joinedload(Product.variations),
        joinedload(Product.design).joinedload(Design.assets),
    )


def _product_admin_out(p: Product) -> ProductAdminOut:
    design = p.design
    thematic_id = design.thematic_category_id if design else None
    var_count = len(p.variations) if p.variations is not None else 0
    published_at = None
    if p.published_at is not None:
        published_at = p.published_at.isoformat() if hasattr(p.published_at, "isoformat") else str(p.published_at)
    return ProductAdminOut(
        id=p.id,
        design_id=p.design_id,
        parent_category_id=p.parent_category_id,
        thematic_category_id=thematic_id,
        design_title=design.title if design else None,
        design_code=design.code if design else None,
        design_source_type=design.source_type if design else None,
        slug=p.slug,
        title=p.title,
        base_price=str(p.base_price),
        compare_at_price=str(p.compare_at_price) if p.compare_at_price is not None else None,
        status=p.status,
        meta_title=p.meta_title,
        meta_description=p.meta_description,
        description=p.description,
        size_guide_json=p.size_guide_json,
        thumbnail_url=primary_product_image_url(p),
        image_count=len(p.images or []),
        variation_count=var_count,
        published_at=published_at,
    )


def _set_product_published(p: Product, status: str) -> None:
    p.status = status
    if status == "published" and p.published_at is None:
        p.published_at = datetime.now(timezone.utc)
    if status == "draft":
        p.published_at = None


@router.get("/products", response_model=list[ProductAdminOut])
def list_products_admin(db: Session = Depends(get_db)):
    rows = db.scalars(_product_query().order_by(Product.id.desc())).unique().all()
    return [_product_admin_out(p) for p in rows]


@router.get("/products/{product_id}", response_model=ProductAdminOut)
def get_product_admin(product_id: int, db: Session = Depends(get_db)):
    p = db.scalar(_product_query().where(Product.id == product_id))
    if p is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return _product_admin_out(p)


@router.post("/products", response_model=ProductAdminOut)
def create_product(body: ProductIn, db: Session = Depends(get_db)):
    data = body.model_dump()
    status = data.pop("status", "draft")
    p = Product(**data, status=status)
    if status == "published":
        raise HTTPException(
            status_code=400,
            detail="محصول جدید را ابتدا به‌صورت پیش‌نویس بسازید، تنوع و تصویر اضافه کنید سپس منتشر کنید",
        )
    db.add(p)
    db.commit()
    p = db.scalar(_product_query().where(Product.id == p.id))
    return _product_admin_out(p)


@router.patch("/products/{product_id}", response_model=ProductAdminOut)
def update_product(product_id: int, body: ProductUpdateIn, db: Session = Depends(get_db)):
    p = db.scalar(_product_query().where(Product.id == product_id))
    if p is None:
        raise HTTPException(status_code=404, detail="Product not found")
    data = body.model_dump(exclude_unset=True)
    new_status = data.pop("status", None)
    for k, v in data.items():
        setattr(p, k, v)
    if new_status is not None:
        if new_status not in ("draft", "published"):
            raise HTTPException(status_code=400, detail="Invalid status")
        if new_status == "published":
            if not p.variations:
                raise HTTPException(status_code=400, detail="محصول باید حداقل یک تنوع داشته باشد")
            if not p.images:
                raise HTTPException(status_code=400, detail="محصول باید حداقل یک تصویر داشته باشد")
        _set_product_published(p, new_status)
    db.commit()
    p = db.scalar(_product_query().where(Product.id == product_id))
    return _product_admin_out(p)


@router.patch("/products/{product_id}/status", response_model=ProductAdminOut)
def patch_product_status(product_id: int, body: StatusPatch, db: Session = Depends(get_db)):
    p = db.scalar(_product_query().where(Product.id == product_id))
    if p is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if body.status not in ("draft", "published"):
        raise HTTPException(status_code=400, detail="Invalid status")
    if body.status == "published":
        if not p.variations:
            raise HTTPException(status_code=400, detail="محصول باید حداقل یک تنوع داشته باشد")
        if not p.images:
            raise HTTPException(status_code=400, detail="محصول باید حداقل یک تصویر داشته باشد")
    _set_product_published(p, body.status)
    db.commit()
    db.refresh(p)
    return _product_admin_out(p)


@router.get("/products/{product_id}/variations", response_model=list[VariationOut])
def list_variations(product_id: int, db: Session = Depends(get_db)):
    rows = db.scalars(
        select(ProductVariation).where(ProductVariation.product_id == product_id)
    ).all()
    return [
        VariationOut(
            id=v.id,
            product_id=v.product_id,
            sku=v.sku,
            color_name=v.color_name,
            color_hex=v.color_hex,
            size_label=v.size_label,
            price_delta=str(v.price_delta),
            stock_quantity=v.stock_quantity,
            is_active=v.is_active,
        )
        for v in rows
    ]


@router.post("/products/{product_id}/variations/bulk")
def bulk_create_variations(product_id: int, body: VariationBulkIn, db: Session = Depends(get_db)):
    p = db.get(Product, product_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if not body.colors:
        raise HTTPException(status_code=400, detail="colors required")
    import re

    def sku_part(s: str) -> str:
        s = re.sub(r"[^\w-]", "", s.strip().upper().replace(" ", "-"))
        return s or "X"

    prefix = sku_part(body.sku_prefix)
    created = 0
    sizes = [sku_part(str(s)) for s in (body.sizes or []) if str(s).strip()]

    if not sizes:
        for color in body.colors:
            cname = str(color.get("name", "")).strip()
            chex = color.get("hex")
            sku = f"{prefix}-{sku_part(cname)}"
            exists = db.scalar(select(ProductVariation).where(ProductVariation.sku == sku))
            if exists:
                continue
            db.add(
                ProductVariation(
                    product_id=product_id,
                    sku=sku,
                    color_name=cname or None,
                    color_hex=chex if chex else None,
                    size_label=None,
                    price_delta=body.price_delta,
                    stock_quantity=body.stock_quantity,
                    is_active=True,
                )
            )
            created += 1
    else:
        for color in body.colors:
            cname = str(color.get("name", "")).strip()
            chex = color.get("hex")
            for size in sizes:
                sku = f"{prefix}-{sku_part(cname)}-{size}"
                exists = db.scalar(select(ProductVariation).where(ProductVariation.sku == sku))
                if exists:
                    continue
                db.add(
                    ProductVariation(
                        product_id=product_id,
                        sku=sku,
                        color_name=cname or None,
                        color_hex=chex if chex else None,
                        size_label=size,
                        price_delta=body.price_delta,
                        stock_quantity=body.stock_quantity,
                        is_active=True,
                    )
                )
                created += 1
    db.commit()
    return {"created": created}


@router.post("/products/{product_id}/variations", response_model=VariationOut)
def create_variation(product_id: int, body: VariationIn, db: Session = Depends(get_db)):
    if db.get(Product, product_id) is None:
        raise HTTPException(status_code=404, detail="Product not found")
    v = ProductVariation(product_id=product_id, **body.model_dump())
    db.add(v)
    db.commit()
    db.refresh(v)
    return VariationOut(
        id=v.id,
        product_id=v.product_id,
        sku=v.sku,
        color_name=v.color_name,
        color_hex=v.color_hex,
        size_label=v.size_label,
        price_delta=str(v.price_delta),
        stock_quantity=v.stock_quantity,
        is_active=v.is_active,
    )


def _shipping_customer(shipping_address: dict | None) -> tuple[str | None, str | None]:
    if not shipping_address or not isinstance(shipping_address, dict):
        return None, None
    name = shipping_address.get("full_name") or shipping_address.get("name")
    phone = shipping_address.get("phone") or shipping_address.get("mobile")
    return (
        str(name) if name else None,
        str(phone) if phone else None,
    )


@router.get("/orders", response_model=list[OrderAdminListItem])
def list_orders(
    status: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = select(Order).options(joinedload(Order.items)).order_by(Order.id.desc()).limit(200)
    if status:
        if status not in ORDER_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        q = q.where(Order.status == status)
    rows = db.scalars(q).unique().all()
    out: list[OrderAdminListItem] = []
    for o in rows:
        customer_name, customer_phone = _shipping_customer(o.shipping_address)
        out.append(
            OrderAdminListItem(
                id=o.id,
                tracking_code=o.tracking_code,
                status=o.status,
                total=str(o.total),
                subtotal=str(o.subtotal),
                item_count=len(o.items or []),
                customer_name=customer_name,
                customer_phone=customer_phone,
                created_at=o.created_at.isoformat() if o.created_at else None,
            )
        )
    return out


@router.patch("/orders/{order_id}/status")
def update_order_status(order_id: int, body: OrderStatusPatch, db: Session = Depends(get_db)):
    o = db.get(Order, order_id)
    if o is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if body.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid order status")
    o.status = body.status
    db.commit()
    return {"ok": True, "status": o.status}


def _payment_admin_out(p: Payment) -> PaymentAdminOut:
    return PaymentAdminOut(
        id=p.id,
        gateway=p.gateway,
        gateway_ref=p.gateway_ref,
        amount=str(p.amount),
        status=p.status,
        receipt_url=public_url(p.receipt_storage_key) if p.receipt_storage_key else None,
        customer_note=p.customer_note,
        admin_note=p.admin_note,
        reviewed_at=p.reviewed_at.isoformat() if p.reviewed_at else None,
        created_at=p.created_at.isoformat() if p.created_at else None,
    )


@router.post("/payments/{payment_id}/approve-card", response_model=PaymentAdminOut)
def approve_card_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.gateway != "card_transfer":
        raise HTTPException(status_code=400, detail="Not a card transfer payment")
    if not payment.receipt_storage_key:
        raise HTTPException(status_code=400, detail="رسید آپلود نشده")
    if payment.status == "verified":
        return _payment_admin_out(payment)

    order = db.scalar(
        select(Order).options(joinedload(Order.items)).where(Order.id == payment.order_id)
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    from app.api.v1.endpoints.payments import _mark_order_paid

    try:
        _mark_order_paid(db, order)
    except HTTPException as e:
        raise HTTPException(status_code=400, detail=str(e.detail)) from e

    payment.status = "verified"
    payment.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(payment)
    return _payment_admin_out(payment)


@router.post("/payments/{payment_id}/reject-card", response_model=PaymentAdminOut)
def reject_card_payment(
    payment_id: int,
    body: PaymentReviewIn,
    db: Session = Depends(get_db),
):
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.gateway != "card_transfer":
        raise HTTPException(status_code=400, detail="Not a card transfer payment")
    if payment.status == "verified":
        raise HTTPException(status_code=400, detail="پرداخت قبلاً تأیید شده")

    payment.status = "failed"
    payment.admin_note = (body.admin_note or "").strip() or None
    payment.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(payment)
    return _payment_admin_out(payment)
