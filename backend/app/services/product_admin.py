"""حذف امن محصول — سبدها، سفارش‌ها، تصاویر، طرح یتیم + تنوع پیش‌فرض."""

from __future__ import annotations

import re

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import CartItem, Design, OrderItem, Product, ProductVariation
from app.services.storage import delete_upload


def is_default_variation(v: ProductVariation) -> bool:
    """تنوع داخلی محصول ساده — بدون رنگ و سایز."""
    return not (v.color_name or "").strip() and not (v.size_label or "").strip()


def _default_sku(product: Product) -> str:
    prefix = (product.sku_prefix or "").strip()
    if prefix:
        base = re.sub(r"[^\w-]+", "-", prefix.upper()).strip("-") or "PRD"
    else:
        base = re.sub(r"[^\w-]+", "-", (product.slug or "product").upper()).strip("-") or "PRD"
    return f"{base[:100]}-STD"


def ensure_default_variation(
    db: Session,
    product: Product,
    *,
    stock_quantity: int | None = None,
) -> ProductVariation:
    """
    اگر محصول هیچ تنوعی ندارد، یک SKU داخلی می‌سازد.
    اگر فقط یک تنوع پیش‌فرض دارد و stock داده شده، موجودی را به‌روز می‌کند.
    """
    variations = list(product.variations or [])
    stock = 10 if stock_quantity is None else max(0, int(stock_quantity))

    if not variations:
        sku = _default_sku(product)
        # جلوگیری از برخورد sku یکتا
        exists = db.scalar(select(ProductVariation.id).where(ProductVariation.sku == sku))
        if exists is not None:
            sku = f"{sku}-{product.id}"
        v = ProductVariation(
            product_id=product.id,
            sku=sku[:128],
            color_name=None,
            color_hex=None,
            size_label=None,
            price_delta=0,
            stock_quantity=stock,
            is_active=True,
        )
        db.add(v)
        db.flush()
        if product.variations is not None:
            product.variations.append(v)
        return v

    if len(variations) == 1 and is_default_variation(variations[0]) and stock_quantity is not None:
        variations[0].stock_quantity = stock
        db.flush()

    return variations[0]


def delete_product_safe(db: Session, product_id: int) -> None:
    """
    حذف محصول و وابستگی‌ها.
    اگر تنوع در سفارش باشد ValueError('has_orders') می‌دهد.
    طرح داخلی بدون محصول دیگر هم پاک می‌شود.
    """
    p = db.scalar(
        select(Product)
        .where(Product.id == product_id)
        .options(joinedload(Product.images), joinedload(Product.variations))
    )
    if p is None:
        raise ValueError("not_found")

    design_id = p.design_id

    variation_ids = [v.id for v in (p.variations or []) if v.id]
    if variation_ids:
        order_count = (
            db.scalar(
                select(func.count())
                .select_from(OrderItem)
                .where(OrderItem.variation_id.in_(variation_ids))
            )
            or 0
        )
        if order_count > 0:
            raise ValueError("has_orders")
        db.execute(delete(CartItem).where(CartItem.variation_id.in_(variation_ids)))

    for img in list(p.images or []):
        if img.storage_key:
            delete_upload(img.storage_key)

    size_key = None
    if isinstance(p.size_guide_json, dict):
        size_key = p.size_guide_json.get("image_key")
    if size_key:
        delete_upload(str(size_key))

    db.delete(p)
    db.flush()

    # پاک کردن طرح یتیم (stub داخلی فروش کالا)
    if design_id:
        sibling_count = (
            db.scalar(
                select(func.count()).select_from(Product).where(Product.design_id == design_id)
            )
            or 0
        )
        if sibling_count == 0:
            design = db.scalar(
                select(Design)
                .where(Design.id == design_id)
                .options(joinedload(Design.assets))
            )
            if design is not None:
                for asset in list(design.assets or []):
                    if asset.storage_key:
                        delete_upload(asset.storage_key)
                    db.delete(asset)
                db.delete(design)


def delete_products_bulk(db: Session, ids: list[int]) -> dict:
    """حذف گروهی — هر مورد جدا commit می‌شود."""
    unique_ids = list(dict.fromkeys(ids))
    deleted: list[int] = []
    failed: list[dict] = []

    reasons = {
        "not_found": "محصول یافت نشد",
        "has_orders": "در سفارش ثبت شده و قابل حذف نیست — می‌توانید پیش‌نویس کنید",
    }

    for pid in unique_ids:
        try:
            delete_product_safe(db, pid)
            db.commit()
            deleted.append(pid)
        except ValueError as e:
            db.rollback()
            failed.append({"id": pid, "reason": reasons.get(str(e), str(e))})
        except Exception as e:  # noqa: BLE001
            db.rollback()
            failed.append({"id": pid, "reason": str(e) or "خطای ناشناخته"})

    return {"deleted": deleted, "failed": failed, "deleted_count": len(deleted)}
