"""حذف امن محصول — سبدها، سفارش‌ها، تصاویر."""

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import CartItem, OrderItem, Product
from app.services.storage import delete_upload


def delete_product_safe(db: Session, product_id: int) -> None:
    """
    حذف محصول و وابستگی‌ها.
    اگر تنوع در سفارش باشد ValueError('has_orders') می‌دهد.
    """
    p = db.scalar(
        select(Product)
        .where(Product.id == product_id)
        .options(joinedload(Product.images), joinedload(Product.variations))
    )
    if p is None:
        raise ValueError("not_found")

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
