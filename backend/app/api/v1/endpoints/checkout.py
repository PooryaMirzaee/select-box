"""
چک‌اوت — سفارش، کوپن، آدرس؛ پرداخت در payments.
"""

import secrets
from decimal import Decimal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import SESSION_HEADER
from app.core.deps_auth import get_current_user_optional
from app.db.session import get_db
from app.models import User
from app.models import CartItem, Coupon, Order, OrderItem, Payment, ProductVariation
from app.core.config import settings as env
from app.services import catalog as catalog_service
from app.services import settings as shop_settings

router = APIRouter(prefix="/checkout", tags=["checkout"])


def cart_line_title(item, product) -> str:
    custom = item.customization_json or {}
    if custom.get("title"):
        return f"{product.title} — {custom['title']}"
    return product.title


def _session_id(x_session_id: str | None = Header(default=None, alias=SESSION_HEADER)) -> str:
    if not x_session_id or not x_session_id.strip():
        raise HTTPException(status_code=400, detail=f"Header {SESSION_HEADER} is required.")
    return x_session_id.strip()


class OrderCreateIn(BaseModel):
    coupon_code: str | None = None
    shipping_address: dict | None = None


class CouponValidateIn(BaseModel):
    code: str
    subtotal: str


@router.post("/validate-coupon")
def validate_coupon(body: CouponValidateIn, db: Session = Depends(get_db)):
    subtotal = Decimal(body.subtotal)
    coupon = db.scalar(
        select(Coupon).where(Coupon.code == body.code.upper(), Coupon.is_active.is_(True))
    )
    if coupon is None:
        raise HTTPException(status_code=400, detail="Invalid coupon")
    if coupon.min_cart_total and subtotal < coupon.min_cart_total:
        raise HTTPException(status_code=400, detail="Minimum cart not met")
    if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
        raise HTTPException(status_code=400, detail="Coupon exhausted")
    if coupon.discount_type == "percent":
        discount = subtotal * (coupon.discount_value / Decimal("100"))
    else:
        discount = coupon.discount_value
    discount = min(discount, subtotal)
    return {"discount": str(discount), "code": coupon.code}


@router.post("/orders")
def create_order(
    body: OrderCreateIn,
    session_id: str = Depends(_session_id),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    cart = catalog_service.get_or_create_session_cart(db, session_id)
    cart = catalog_service.cart_with_items(db, cart.id)
    if cart is None or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    for item in cart.items:
        if item.variation.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {item.variation.sku}",
            )

    lines = catalog_service.cart_lines_out(cart)
    subtotal = sum(Decimal(str(x["unit_price"])) * x["quantity"] for x in lines)
    discount_total = Decimal("0")
    coupon_id = None

    if body.coupon_code:
        coupon = db.scalar(
            select(Coupon).where(Coupon.code == body.coupon_code.upper(), Coupon.is_active.is_(True))
        )
        if coupon:
            if coupon.discount_type == "percent":
                discount_total = subtotal * (coupon.discount_value / Decimal("100"))
            else:
                discount_total = coupon.discount_value
            discount_total = min(discount_total, subtotal)
            coupon_id = coupon.id
            coupon.used_count += 1

    ship_flat = shop_settings.shipping_flat_toman(db)
    shipping_total = Decimal(str(ship_flat)) if subtotal > 0 else Decimal("0")
    total = subtotal - discount_total + shipping_total
    tracking = secrets.token_hex(4).upper()

    order = Order(
        tracking_code=tracking,
        user_id=current_user.id if current_user else None,
        cart_snapshot={"lines": lines, "session_id": session_id},
        subtotal=subtotal,
        discount_total=discount_total,
        shipping_total=shipping_total,
        total=total,
        coupon_id=coupon_id,
        status="pending_payment",
        shipping_address=body.shipping_address,
    )
    db.add(order)
    db.flush()

    for item in cart.items:
        v = item.variation
        p = v.product
        unit = catalog_service.effective_price(p.base_price, v.price_delta)
        db.add(
            OrderItem(
                order_id=order.id,
                variation_id=v.id,
                quantity=item.quantity,
                unit_price=unit,
                title_snapshot=p.title if not item.customization_json else cart_line_title(item, p),
                sku_snapshot=v.sku,
                customization_json=item.customization_json,
            )
        )

    db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
    db.commit()
    db.refresh(order)

    return {
        "order_id": order.id,
        "tracking_code": order.tracking_code,
        "subtotal": str(order.subtotal),
        "discount_total": str(order.discount_total),
        "shipping_total": str(order.shipping_total),
        "total": str(order.total),
        "status": order.status,
    }


@router.get("/orders/{tracking_code}")
def get_order(tracking_code: str, db: Session = Depends(get_db)):
    order = db.scalar(select(Order).where(Order.tracking_code == tracking_code.upper()))
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    card_transfer_url: str | None = None
    if order.status == "pending_payment":
        pay = db.scalar(
            select(Payment)
            .where(Payment.order_id == order.id, Payment.gateway == "card_transfer")
            .order_by(Payment.id.desc())
        )
        if pay is not None and pay.status in ("redirected", "failed", "created"):
            cfg = shop_settings.get_all_settings(db)
            frontend = str(cfg.get("site_url") or env.frontend_url).rstrip("/")
            card_transfer_url = (
                f"{frontend}/checkout/card-transfer?order_id={order.id}&payment_id={pay.id}"
            )

    return {
        "id": order.id,
        "tracking_code": order.tracking_code,
        "status": order.status,
        "total": str(order.total),
        "subtotal": str(order.subtotal),
        "discount_total": str(order.discount_total),
        "shipping_total": str(order.shipping_total),
        "created_at": order.created_at.isoformat(),
        "snapshot": order.cart_snapshot,
        "shipping_address": order.shipping_address,
        "card_transfer_url": card_transfer_url,
    }
