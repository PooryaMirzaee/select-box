"""CRUD تکمیلی ادمین — حذف، کوپن، تنظیمات، دارایی طرح."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, joinedload

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.models import (
    CartItem,
    Category,
    Coupon,
    Design,
    DesignAsset,
    Order,
    OrderItem,
    Payment,
    Product,
    ProductImage,
    ProductVariation,
)
from app.schemas.admin import (
    BulkDeleteOut,
    BulkIdsIn,
    CategoryIn,
    CategoryOut,
    CouponIn,
    CouponOut,
    DesignAssetOut,
    DesignIn,
    DesignOut,
    OrderAdminDetail,
    OrderItemOut,
    PaymentAdminOut,
    ProductImageOut,
    SizeGuideImageOut,
    VariationIn,
    VariationOut,
)
from app.schemas.settings import ShopSettingsAdmin, ShopSettingsPatch
from app.schemas.sms import SmsTestIn, SmsTestOut
from app.services import settings as shop_settings
from app.services.sms import send_test_sms
from app.services.category_helpers import (
    category_admin_out,
    delete_categories_bulk,
    delete_category_subtree,
)
from app.services.product_admin import delete_product_safe, delete_products_bulk
from app.services.storage import delete_upload, public_url, resolve_local_path
from app.services.upload_security import secure_image_upload

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# --- Categories ---
@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: int, body: CategoryIn, db: Session = Depends(get_db)):
    c = db.get(Category, category_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Category not found")
    for k, v in body.model_dump().items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return category_admin_out(c)


@router.post("/categories/{category_id}/icon")
async def upload_category_icon(
    category_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    c = db.get(Category, category_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Category not found")
    if c.icon_storage_key:
        delete_upload(c.icon_storage_key)
    key, mime = await secure_image_upload(
        file,
        f"categories/{category_id}",
        max_bytes=2 * 1024 * 1024,
    )
    c.icon_storage_key = key
    db.commit()
    db.refresh(c)
    return {"storage_key": key, "icon_url": public_url(key)}


@router.delete("/categories/{category_id}/icon")
def remove_category_icon(category_id: int, db: Session = Depends(get_db)):
    c = db.get(Category, category_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Category not found")
    if c.icon_storage_key:
        delete_upload(c.icon_storage_key)
        c.icon_storage_key = None
        db.commit()
    return {"ok": True}


@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    try:
        delete_category_subtree(db, category_id)
    except ValueError as e:
        code = str(e)
        if code == "not_found":
            raise HTTPException(status_code=404, detail="دسته پیدا نشد") from e
        if code == "has_products":
            raise HTTPException(
                status_code=400,
                detail="این دسته یا زیردسته‌هایش محصول دارد — ابتدا محصولات را حذف یا منتقل کنید",
            ) from e
        if code == "has_designs":
            raise HTTPException(
                status_code=400,
                detail="این دسته یا زیردسته‌هایش هنوز به محصول داخلی وصل است",
            ) from e
        if code == "has_templates":
            raise HTTPException(
                status_code=400,
                detail="این دسته در قالب قدیمی استفاده شده",
            ) from e
        raise
    return {"ok": True}


@router.post("/categories/bulk-delete", response_model=BulkDeleteOut)
def bulk_delete_categories(body: BulkIdsIn, db: Session = Depends(get_db)):
    result = delete_categories_bulk(db, body.ids)
    return BulkDeleteOut(**result)


# --- Designs ---
@router.get("/designs/{design_id}", response_model=DesignOut)
def get_design(design_id: int, db: Session = Depends(get_db)):
    d = db.get(Design, design_id)
    if d is None:
        raise HTTPException(status_code=404, detail="Design not found")
    return DesignOut.model_validate(d)


@router.delete("/designs/{design_id}")
def delete_design(design_id: int, db: Session = Depends(get_db)):
    d = db.scalar(
        select(Design)
        .where(Design.id == design_id)
        .options(joinedload(Design.assets))
    )
    if d is None:
        raise HTTPException(status_code=404, detail="Design not found")

    products = db.scalars(
        select(Product)
        .where(Product.design_id == design_id)
        .options(joinedload(Product.variations), joinedload(Product.images))
    ).unique().all()

    variation_ids = [v.id for p in products for v in p.variations if v.id]
    if variation_ids:
        order_count = db.scalar(
            select(func.count())
            .select_from(OrderItem)
            .where(OrderItem.variation_id.in_(variation_ids))
        ) or 0
        if order_count > 0:
            raise HTTPException(
                status_code=409,
                detail="این طرح در سفارش‌ها استفاده شده و قابل حذف نیست",
            )
        db.execute(delete(CartItem).where(CartItem.variation_id.in_(variation_ids)))

    for p in products:
        for img in list(p.images):
            delete_upload(img.storage_key)
            db.delete(img)
        db.delete(p)

    for asset in list(d.assets):
        if resolve_local_path(asset.storage_key):
            delete_upload(asset.storage_key)
        db.delete(asset)

    db.delete(d)
    db.commit()
    return {"ok": True}


@router.get("/designs/{design_id}/assets", response_model=list[DesignAssetOut])
def list_design_assets(design_id: int, db: Session = Depends(get_db)):
    if db.get(Design, design_id) is None:
        raise HTTPException(status_code=404, detail="Design not found")
    rows = db.scalars(
        select(DesignAsset).where(DesignAsset.design_id == design_id).order_by(DesignAsset.sort_order)
    ).all()
    return [
        DesignAssetOut(
            id=a.id,
            design_id=a.design_id,
            variant_key=a.variant_key,
            mime_type=a.mime_type,
            storage_key=a.storage_key,
            url=public_url(a.storage_key),
            sort_order=a.sort_order,
        )
        for a in rows
    ]


@router.delete("/designs/{design_id}/assets/{asset_id}")
def delete_design_asset(design_id: int, asset_id: int, db: Session = Depends(get_db)):
    a = db.scalar(
        select(DesignAsset).where(DesignAsset.id == asset_id, DesignAsset.design_id == design_id)
    )
    if a is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    delete_upload(a.storage_key)
    db.delete(a)
    db.commit()
    return {"ok": True}


# --- Products ---
@router.get("/products/{product_id}/images", response_model=list[ProductImageOut])
def list_product_images(product_id: int, db: Session = Depends(get_db)):
    if db.get(Product, product_id) is None:
        raise HTTPException(status_code=404, detail="Product not found")
    rows = db.scalars(
        select(ProductImage)
        .where(ProductImage.product_id == product_id)
        .order_by(ProductImage.sort_order, ProductImage.id)
    ).all()
    return [
        ProductImageOut(
            id=i.id,
            product_id=i.product_id,
            storage_key=i.storage_key,
            mime_type=i.mime_type,
            alt_text=i.alt_text,
            sort_order=i.sort_order,
            url=public_url(i.storage_key),
        )
        for i in rows
    ]


@router.post("/products/{product_id}/images", response_model=ProductImageOut)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    alt_text: str | None = Form(None),
    db: Session = Depends(get_db),
):
    p = db.get(Product, product_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Product not found")
    key, mime = await secure_image_upload(
        file,
        f"products/{product_id}",
        max_bytes=8 * 1024 * 1024,
    )
    max_order = db.scalar(
        select(func.max(ProductImage.sort_order)).where(ProductImage.product_id == product_id)
    )
    sort_order = int(max_order or 0) + 1
    img = ProductImage(
        product_id=product_id,
        storage_key=key,
        mime_type=mime,
        alt_text=alt_text or None,
        sort_order=sort_order,
    )
    db.add(img)
    db.commit()
    db.refresh(img)
    return ProductImageOut(
        id=img.id,
        product_id=img.product_id,
        storage_key=img.storage_key,
        mime_type=img.mime_type,
        alt_text=img.alt_text,
        sort_order=img.sort_order,
        url=public_url(img.storage_key),
    )


@router.delete("/products/{product_id}/images/{image_id}")
def delete_product_image(product_id: int, image_id: int, db: Session = Depends(get_db)):
    img = db.scalar(
        select(ProductImage).where(
            ProductImage.id == image_id,
            ProductImage.product_id == product_id,
        )
    )
    if img is None:
        raise HTTPException(status_code=404, detail="Image not found")
    delete_upload(img.storage_key)
    db.delete(img)
    db.commit()
    return {"ok": True}


@router.post("/products/{product_id}/size-guide-image", response_model=SizeGuideImageOut)
async def upload_size_guide_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    p = db.get(Product, product_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Product not found")
    old_key = (p.size_guide_json or {}).get("image_key")
    key, _mime = await secure_image_upload(
        file,
        f"products/{product_id}",
        max_bytes=8 * 1024 * 1024,
    )
    if old_key and old_key != key:
        delete_upload(old_key)
    return SizeGuideImageOut(image_key=key, url=public_url(key))


@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    try:
        delete_product_safe(db, product_id)
        db.commit()
    except ValueError as e:
        db.rollback()
        code = str(e)
        if code == "not_found":
            raise HTTPException(status_code=404, detail="محصول یافت نشد") from e
        if code == "has_orders":
            raise HTTPException(
                status_code=409,
                detail="این محصول در سفارش ثبت شده و قابل حذف نیست. می‌توانید آن را پیش‌نویس کنید.",
            ) from e
        raise HTTPException(status_code=400, detail=code) from e
    return {"ok": True}


@router.post("/products/bulk-delete", response_model=BulkDeleteOut)
def bulk_delete_products(body: BulkIdsIn, db: Session = Depends(get_db)):
    result = delete_products_bulk(db, body.ids)
    return BulkDeleteOut(**result)


# --- Variations ---
@router.patch("/variations/{variation_id}", response_model=VariationOut)
def update_variation(variation_id: int, body: VariationIn, db: Session = Depends(get_db)):
    v = db.get(ProductVariation, variation_id)
    if v is None:
        raise HTTPException(status_code=404, detail="Variation not found")
    for k, val in body.model_dump().items():
        setattr(v, k, val)
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


@router.delete("/variations/{variation_id}")
def delete_variation(variation_id: int, db: Session = Depends(get_db)):
    v = db.get(ProductVariation, variation_id)
    if v is None:
        raise HTTPException(status_code=404, detail="Variation not found")
    db.delete(v)
    db.commit()
    return {"ok": True}


# --- Orders ---
def _order_item_out(item: OrderItem) -> OrderItemOut:
    custom = item.customization_json
    preview = None
    is_custom = bool(custom)
    if isinstance(custom, dict):
        preview = custom.get("preview_url") or custom.get("previewUrl")
        if preview is not None:
            preview = str(preview)
    design_id = None
    product_id = None
    if item.variation and item.variation.product:
        product_id = item.variation.product.id
        design_id = item.variation.product.design_id
    return OrderItemOut(
        id=item.id,
        variation_id=item.variation_id,
        quantity=item.quantity,
        unit_price=str(item.unit_price),
        title_snapshot=item.title_snapshot,
        sku_snapshot=item.sku_snapshot,
        is_custom=is_custom,
        preview_url=preview,
        design_id=design_id,
        product_id=product_id,
    )


@router.get("/orders/{order_id}", response_model=OrderAdminDetail)
def get_order_admin(order_id: int, db: Session = Depends(get_db)):
    o = db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(
            joinedload(Order.items).joinedload(OrderItem.variation).joinedload(ProductVariation.product),
            joinedload(Order.payments),
            joinedload(Order.coupon),
        )
    )
    if o is None:
        raise HTTPException(status_code=404, detail="Order not found")
    coupon_code = o.coupon.code if o.coupon else None
    return OrderAdminDetail(
        id=o.id,
        tracking_code=o.tracking_code,
        status=o.status,
        subtotal=str(o.subtotal),
        discount_total=str(o.discount_total),
        shipping_total=str(o.shipping_total),
        total=str(o.total),
        shipping_address=o.shipping_address,
        cart_snapshot=o.cart_snapshot,
        items=[_order_item_out(i) for i in (o.items or [])],
        payments=[
            PaymentAdminOut(
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
            for p in (o.payments or [])
        ],
        coupon_code=coupon_code,
        created_at=o.created_at.isoformat() if o.created_at else None,
        updated_at=o.updated_at.isoformat() if o.updated_at else None,
    )


# --- Coupons ---
def _coupon_out(c: Coupon) -> CouponOut:
    return CouponOut(
        id=c.id,
        code=c.code,
        discount_type=c.discount_type,
        discount_value=str(c.discount_value),
        min_cart_total=str(c.min_cart_total) if c.min_cart_total is not None else None,
        max_uses=c.max_uses,
        used_count=c.used_count,
        is_active=c.is_active,
    )


@router.get("/coupons", response_model=list[CouponOut])
def list_coupons(db: Session = Depends(get_db)):
    rows = db.scalars(select(Coupon).order_by(Coupon.id.desc())).all()
    return [_coupon_out(c) for c in rows]


@router.post("/coupons", response_model=CouponOut)
def create_coupon(body: CouponIn, db: Session = Depends(get_db)):
    if db.scalar(select(Coupon).where(Coupon.code == body.code.upper())):
        raise HTTPException(status_code=400, detail="Coupon exists")
    c = Coupon(**{**body.model_dump(), "code": body.code.upper()})
    db.add(c)
    db.commit()
    db.refresh(c)
    return _coupon_out(c)


@router.patch("/coupons/{coupon_id}", response_model=CouponOut)
def update_coupon(coupon_id: int, body: CouponIn, db: Session = Depends(get_db)):
    c = db.get(Coupon, coupon_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    data = body.model_dump()
    data["code"] = body.code.upper()
    for k, v in data.items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return _coupon_out(c)


@router.delete("/coupons/{coupon_id}")
def delete_coupon(coupon_id: int, db: Session = Depends(get_db)):
    c = db.get(Coupon, coupon_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Coupon not found")
    db.delete(c)
    db.commit()
    return {"ok": True}


# --- Settings ---
@router.get("/settings", response_model=ShopSettingsAdmin)
def get_settings(db: Session = Depends(get_db)):
    return ShopSettingsAdmin.model_validate(shop_settings.get_admin_settings(db))


@router.patch("/settings", response_model=ShopSettingsAdmin)
def patch_settings(body: ShopSettingsPatch, db: Session = Depends(get_db)):
    data = body.model_dump(exclude_unset=True)
    if body.payment_gateway and body.payment_gateway not in ("mock", "zarinpal"):
        raise HTTPException(status_code=400, detail="Invalid gateway")
    if body.sms_templates is not None:
        ids = [t.id for t in body.sms_templates]
        if len(ids) != len(set(ids)):
            raise HTTPException(status_code=400, detail="شناسه پترن‌ها باید یکتا باشد")
        data["sms_templates"] = [t.model_dump() for t in body.sms_templates]
    shop_settings.set_settings(db, data)
    return ShopSettingsAdmin.model_validate(shop_settings.get_admin_settings(db))


@router.post("/settings/sms/test", response_model=SmsTestOut)
async def test_sms_settings(body: SmsTestIn, db: Session = Depends(get_db)):
    ok, detail, sms_sent = await send_test_sms(db, body.phone.strip(), body.template_id)
    return SmsTestOut(ok=ok, detail=detail, sms_sent=sms_sent)
