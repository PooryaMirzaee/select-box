"""عملیات روزمره سفارش: موجودی، کوپن، پیامک وضعیت."""

from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Coupon, Order, ProductVariation, User
from app.services.sms import normalize_phone, send_template_sms

logger = logging.getLogger(__name__)

LOW_STOCK_THRESHOLD = 3
PAID_LIKE = frozenset({"paid", "processing", "shipped", "delivered"})
RESTOCK_STATUSES = frozenset({"cancelled", "failed"})


def order_customer_phone(order: Order) -> str | None:
    addr = order.shipping_address if isinstance(order.shipping_address, dict) else {}
    raw = addr.get("phone") or addr.get("mobile")
    if not raw:
        return None
    phone = normalize_phone(str(raw))
    return phone if len(phone) >= 10 else None


def user_id_for_phone(db: Session, phone: str | None) -> int | None:
    if not phone:
        return None
    normalized = normalize_phone(phone)
    user = db.scalar(select(User).where(User.phone == normalized))
    if user is None and normalized.startswith("0"):
        user = db.scalar(select(User).where(User.phone == normalized[1:]))
    return user.id if user else None


def apply_coupon(db: Session, code: str, subtotal: Decimal) -> tuple[Coupon, Decimal]:
    coupon = db.scalar(select(Coupon).where(Coupon.code == code.upper(), Coupon.is_active.is_(True)))
    if coupon is None:
        raise HTTPException(status_code=400, detail="کد تخفیف نامعتبر است")
    now = datetime.now(timezone.utc)
    starts = coupon.starts_at
    ends = coupon.ends_at
    if starts is not None:
        if starts.tzinfo is None:
            starts = starts.replace(tzinfo=timezone.utc)
        if now < starts:
            raise HTTPException(status_code=400, detail="این کد تخفیف هنوز فعال نشده")
    if ends is not None:
        if ends.tzinfo is None:
            ends = ends.replace(tzinfo=timezone.utc)
        if now > ends:
            raise HTTPException(status_code=400, detail="مهلت این کد تخفیف تمام شده")
    if coupon.min_cart_total and subtotal < Decimal(str(coupon.min_cart_total)):
        raise HTTPException(status_code=400, detail="حداقل مبلغ سبد برای این کد رعایت نشده")
    if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
        raise HTTPException(status_code=400, detail="ظرفیت این کد تخفیف تمام شده")
    if coupon.discount_type == "percent":
        discount = subtotal * (Decimal(str(coupon.discount_value)) / Decimal("100"))
    else:
        discount = Decimal(str(coupon.discount_value))
    return coupon, min(discount, subtotal)


def reserve_stock(db: Session, order: Order) -> None:
    if getattr(order, "stock_reserved", False):
        return
    for oi in order.items:
        v = db.get(ProductVariation, oi.variation_id)
        if v is None or v.stock_quantity < oi.quantity:
            sku = oi.sku_snapshot or (v.sku if v else "?")
            raise HTTPException(status_code=400, detail=f"موجودی کافی نیست: {sku}")
        v.stock_quantity -= oi.quantity
    order.stock_reserved = True


def restore_stock(db: Session, order: Order) -> None:
    if not getattr(order, "stock_reserved", False):
        return
    for oi in order.items:
        v = db.get(ProductVariation, oi.variation_id)
        if v is None:
            continue
        v.stock_quantity += oi.quantity
    order.stock_reserved = False


def fire_order_sms(order_id: int, template_key: str) -> None:
    thread = threading.Thread(
        target=_send_order_sms,
        args=(order_id, template_key),
        daemon=True,
        name=f"sms-{template_key}-{order_id}",
    )
    thread.start()


def _send_order_sms(order_id: int, template_key: str) -> None:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        order = db.get(Order, order_id)
        if order is None:
            return
        phone = order_customer_phone(order)
        if not phone:
            return
        tracking = (getattr(order, "shipping_tracking", None) or order.tracking_code or "").strip()
        params = {
            "OrderId": order.tracking_code,
            "Amount": str(int(Decimal(str(order.total)))),
            "TrackingCode": tracking,
        }
        import asyncio

        asyncio.run(send_template_sms(db, template_key, phone, params))
    except Exception:
        logger.exception("order sms %s failed for order %s", template_key, order_id)
    finally:
        db.close()
