"""
پنل مدیریت — CRUD طرح، محصول، دسته، آپلود موکاپ، سفارش‌ها.
"""

from decimal import Decimal
import re
import secrets

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.models import (
    Category,
    Coupon,
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
    ProductQuickUpdateIn,
    ProductUpdateIn,
    StatusPatch,
    VariationBulkIn,
    VariationIn,
    VariationOut,
)
from app.services.catalog import primary_product_image_url
from app.services.category_helpers import (
    build_admin_category_tree,
    category_admin_out,
    category_product_counts,
    collect_category_subtree_ids,
    normalize_category_slug,
)
from app.services.product_admin import ensure_default_variation, set_product_stock_total
from app.services.storage import public_url
from app.services.upload_security import secure_image_upload

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    from app.services.order_ops import LOW_STOCK_THRESHOLD, PAID_LIKE

    pub = db.scalar(select(func.count()).select_from(Product).where(Product.status == "published")) or 0
    draft = db.scalar(select(func.count()).select_from(Product).where(Product.status == "draft")) or 0
    designs = db.scalar(select(func.count()).select_from(Design)) or 0
    orders = db.scalar(select(func.count()).select_from(Order)) or 0
    rev = db.scalar(
        select(func.coalesce(func.sum(Order.total), 0)).where(Order.status.in_(tuple(PAID_LIKE)))
    ) or 0
    pending_payment = (
        db.scalar(select(func.count()).select_from(Order).where(Order.status == "pending_payment")) or 0
    )
    pending_receipts = (
        db.scalar(
            select(func.count())
            .select_from(Payment)
            .where(
                Payment.gateway == "card_transfer",
                Payment.status == "redirected",
                Payment.receipt_storage_key.is_not(None),
            )
        )
        or 0
    )
    to_ship = (
        db.scalar(
            select(func.count()).select_from(Order).where(Order.status.in_(("paid", "processing")))
        )
        or 0
    )
    low_stock = (
        db.scalar(
            select(func.count())
            .select_from(ProductVariation)
            .where(
                ProductVariation.is_active.is_(True),
                ProductVariation.stock_quantity <= LOW_STOCK_THRESHOLD,
            )
        )
        or 0
    )
    recent_rows = db.scalars(
        select(Order)
        .options(joinedload(Order.items), joinedload(Order.payments))
        .order_by(Order.id.desc())
        .limit(8)
    ).unique().all()
    recent = [_order_list_item(o) for o in recent_rows]
    return DashboardOut(
        products_published=pub,
        products_draft=draft,
        designs=designs,
        orders=orders,
        revenue_paid=str(rev),
        pending_payment=pending_payment,
        pending_receipts=pending_receipts,
        to_ship=to_ship,
        low_stock=low_stock,
        recent_orders=recent,
    )


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    rows = db.scalars(select(Category).order_by(Category.sort_order, Category.id)).all()
    counts = category_product_counts(db)
    # برای لیست تخت، subtree = direct (بدون درخت)
    return [
        category_admin_out(
            c,
            product_count=counts.get(c.id, 0),
            product_count_subtree=counts.get(c.id, 0),
        )
        for c in rows
    ]


@router.get("/categories/tree")
def list_categories_tree(db: Session = Depends(get_db)):
    rows = db.scalars(select(Category).order_by(Category.sort_order, Category.id)).all()
    return build_admin_category_tree(rows, product_counts=category_product_counts(db))


def _normalize_category_slug(raw: str) -> str:
    try:
        return normalize_category_slug(raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="اسلاگ دسته نامعتبر است — از / ٪ # استفاده نکنید") from None


@router.post("/categories", response_model=CategoryOut)
def create_category(body: CategoryIn, db: Session = Depends(get_db)):
    data = body.model_dump()
    data["slug"] = _normalize_category_slug(data["slug"])
    c = Category(**data)
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
        joinedload(Product.parent_category),
    )


def _product_admin_out(p: Product) -> ProductAdminOut:
    design = p.design
    thematic_id = design.thematic_category_id if design else None
    var_count = len(p.variations) if p.variations is not None else 0
    published_at = None
    if p.published_at is not None:
        published_at = p.published_at.isoformat() if hasattr(p.published_at, "isoformat") else str(p.published_at)
    checked_at = None
    if getattr(p, "checked_at", None) is not None:
        checked_at = (
            p.checked_at.isoformat() if hasattr(p.checked_at, "isoformat") else str(p.checked_at)
        )
    cat = p.parent_category
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
        stock_quantity=sum(int(v.stock_quantity or 0) for v in (p.variations or [])),
        is_checked=bool(getattr(p, "is_checked", False)),
        checked_at=checked_at,
        image_mismatch=bool(getattr(p, "image_mismatch", False)),
        published_at=published_at,
        category_name_fa=cat.name_fa if cat else None,
    )


def _set_product_published(p: Product, status: str) -> None:
    p.status = status
    if status == "published" and p.published_at is None:
        p.published_at = datetime.now(timezone.utc)
    if status == "draft":
        p.published_at = None


def _apply_checked(p: Product, is_checked: bool) -> None:
    p.is_checked = bool(is_checked)
    p.checked_at = datetime.now(timezone.utc) if is_checked else None


@router.get("/products", response_model=list[ProductAdminOut])
def list_products_admin(
    db: Session = Depends(get_db),
    category_id: int | None = Query(default=None),
    include_subtree: bool = Query(default=True),
):
    q = _product_query()
    if category_id is not None:
        if include_subtree:
            ids = collect_category_subtree_ids(db, category_id)
            q = q.where(Product.parent_category_id.in_(ids))
        else:
            q = q.where(Product.parent_category_id == category_id)
    rows = db.scalars(q.order_by(Product.id.desc())).unique().all()
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
    design_id = data.pop("design_id", None)

    if status == "published":
        raise HTTPException(
            status_code=400,
            detail="محصول جدید را ابتدا به‌صورت پیش‌نویس بسازید، تصویر اضافه کنید سپس منتشر کنید",
        )

    if design_id is not None:
        if db.get(Design, design_id) is None:
            raise HTTPException(status_code=400, detail="شناسه داخلی نامعتبر است")
    else:
        # فروش ساده کالا — طرح داخلی خودکار ساخته می‌شود (سازگاری با مدل قدیمی)
        parent_id = data["parent_category_id"]
        if db.get(Category, parent_id) is None:
            raise HTTPException(status_code=400, detail="دسته نامعتبر است")
        slug_base = re.sub(r"[^a-z0-9-]+", "-", str(data["slug"]).lower()).strip("-") or "product"
        code = f"PRD-{secrets.token_hex(4).upper()}"
        design_slug = f"{slug_base}-{secrets.token_hex(3)}"
        stub = Design(
            code=code,
            title=str(data["title"])[:255],
            slug=design_slug[:200],
            thematic_category_id=parent_id,
            status="published",
            source_type="admin",
        )
        db.add(stub)
        db.flush()
        design_id = stub.id

    p = Product(**data, design_id=design_id, status=status)
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
    is_checked = data.pop("is_checked", None)
    image_mismatch = data.pop("image_mismatch", None)
    for k, v in data.items():
        setattr(p, k, v)
    if is_checked is not None:
        _apply_checked(p, is_checked)
    if image_mismatch is not None:
        p.image_mismatch = bool(image_mismatch)
    if new_status is not None:
        if new_status not in ("draft", "published"):
            raise HTTPException(status_code=400, detail="Invalid status")
        if new_status == "published":
            ensure_default_variation(db, p)
            db.refresh(p, attribute_names=["variations", "images"])
            _require_publishable(p)
        _set_product_published(p, new_status)
    db.commit()
    p = db.scalars(_product_query().where(Product.id == product_id)).unique().first()
    return _product_admin_out(p)


@router.patch("/products/{product_id}/quick", response_model=ProductAdminOut)
def quick_update_product(
    product_id: int,
    body: ProductQuickUpdateIn,
    db: Session = Depends(get_db),
):
    """ویرایش سریع قیمت / موجودی / دسته / چک از جدول محصولات."""
    p = db.scalars(_product_query().where(Product.id == product_id)).unique().first()
    if p is None:
        raise HTTPException(status_code=404, detail="Product not found")
    data = body.model_dump(exclude_unset=True)
    if "base_price" in data and data["base_price"] is not None:
        p.base_price = Decimal(str(data["base_price"]))
    if data.get("mark_out_of_stock"):
        set_product_stock_total(db, p, 0)
    elif "stock_quantity" in data and data["stock_quantity"] is not None:
        set_product_stock_total(db, p, int(data["stock_quantity"]))
    if "parent_category_id" in data and data["parent_category_id"] is not None:
        new_cat_id = int(data["parent_category_id"])
        if db.get(Category, new_cat_id) is None:
            raise HTTPException(status_code=400, detail="دسته نامعتبر است")
        p.parent_category_id = new_cat_id
    if "is_checked" in data and data["is_checked"] is not None:
        _apply_checked(p, bool(data["is_checked"]))
    if "image_mismatch" in data and data["image_mismatch"] is not None:
        p.image_mismatch = bool(data["image_mismatch"])
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="تغییر دسته ممکن نبود — ممکن است همین طرح در این دسته قبلاً ثبت شده باشد",
        ) from e
    p = db.scalars(_product_query().where(Product.id == product_id)).unique().first()
    return _product_admin_out(p)


def _require_publishable(p: Product) -> None:
    """قبل از انتشار — تصویر اجباری است؛ تنوع در صورت نبود به‌صورت خودکار ساخته می‌شود."""
    img_count = len(p.images or [])
    if img_count < 1:
        raise HTTPException(
            status_code=400,
            detail="محصول باید حداقل یک تصویر داشته باشد — از صفحهٔ ویرایش تصویر آپلود کنید",
        )
    if not (p.variations or []):
        raise HTTPException(
            status_code=400,
            detail="نتوانستیم تنوع پیش‌فرض بسازیم — دوباره تلاش کنید",
        )


@router.patch("/products/{product_id}/status", response_model=ProductAdminOut)
def patch_product_status(product_id: int, body: StatusPatch, db: Session = Depends(get_db)):
    p = db.scalars(_product_query().where(Product.id == product_id)).unique().first()
    if p is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if body.status not in ("draft", "published"):
        raise HTTPException(status_code=400, detail="Invalid status")
    if body.status == "published":
        ensure_default_variation(db, p, stock_quantity=body.stock_quantity)
        db.refresh(p, attribute_names=["variations", "images"])
        _require_publishable(p)
    elif body.stock_quantity is not None:
        ensure_default_variation(db, p, stock_quantity=body.stock_quantity)
    _set_product_published(p, body.status)
    db.commit()
    p = db.scalars(_product_query().where(Product.id == product_id)).unique().first()
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


def _order_list_item(o: Order) -> OrderAdminListItem:
    customer_name, customer_phone = _shipping_customer(o.shipping_address)
    has_pending_receipt = any(
        p.gateway == "card_transfer" and p.status == "redirected" and p.receipt_storage_key
        for p in (o.payments or [])
    )
    return OrderAdminListItem(
        id=o.id,
        tracking_code=o.tracking_code,
        status=o.status,
        total=str(o.total),
        subtotal=str(o.subtotal),
        item_count=len(o.items or []),
        customer_name=customer_name,
        customer_phone=customer_phone,
        created_at=o.created_at.isoformat() if o.created_at else None,
        shipping_tracking=getattr(o, "shipping_tracking", None),
        has_pending_receipt=has_pending_receipt,
    )


@router.get("/orders", response_model=list[OrderAdminListItem])
def list_orders(
    status: str | None = Query(None),
    q: str | None = Query(None),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = (
        select(Order)
        .options(joinedload(Order.items), joinedload(Order.payments))
        .order_by(Order.id.desc())
        .limit(limit)
    )
    if status:
        if status not in ORDER_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        query = query.where(Order.status == status)
    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.where(
            or_(
                Order.tracking_code.ilike(like),
                Order.shipping_tracking.ilike(like),
                cast(Order.shipping_address, String).ilike(like),
            )
        )
    rows = db.scalars(query).unique().all()
    return [_order_list_item(o) for o in rows]


@router.get("/orders/export")
def export_orders(
    status: str | None = Query(None),
    q: str | None = Query(None),
    db: Session = Depends(get_db),
):
    import csv
    import io

    from fastapi.responses import StreamingResponse

    rows = list_orders(status=status, q=q, limit=500, db=db)
    buf = io.StringIO()
    buf.write("\ufeff")
    writer = csv.writer(buf)
    writer.writerow(["کد رهگیری", "وضعیت", "نام", "تلفن", "مبلغ", "اقلام", "کد پستی/بارکد", "تاریخ"])
    for o in rows:
        writer.writerow(
            [
                o.tracking_code,
                o.status,
                o.customer_name or "",
                o.customer_phone or "",
                o.total,
                o.item_count,
                o.shipping_tracking or "",
                o.created_at or "",
            ]
        )
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=orders.csv"},
    )


@router.patch("/orders/{order_id}/status")
def update_order_status(order_id: int, body: OrderStatusPatch, db: Session = Depends(get_db)):
    from app.services.order_ops import RESTOCK_STATUSES, fire_order_sms, restore_stock

    o = db.scalar(
        select(Order).where(Order.id == order_id).options(joinedload(Order.items))
    )
    if o is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if body.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid order status")
    prev = o.status
    if body.shipping_tracking is not None:
        o.shipping_tracking = body.shipping_tracking.strip() or None
    if body.admin_note is not None:
        o.admin_note = body.admin_note.strip() or None
    o.status = body.status
    if body.status in RESTOCK_STATUSES and prev not in RESTOCK_STATUSES:
        restore_stock(db, o)
        if o.coupon_id:
            coupon = db.get(Coupon, o.coupon_id)
            if coupon is not None:
                coupon.used_count = max(0, int(coupon.used_count or 0) - 1)
    db.commit()
    if prev != body.status:
        if body.status == "shipped":
            fire_order_sms(o.id, "order_shipped")
        elif body.status == "delivered":
            fire_order_sms(o.id, "order_delivered")
        elif body.status == "paid" and prev == "pending_payment":
            fire_order_sms(o.id, "order_confirmed")
    return {"ok": True, "status": o.status, "shipping_tracking": o.shipping_tracking}


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
