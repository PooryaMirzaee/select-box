"""منطق کاربر — خالق بودن، ادغام سبد، سفارش‌ها."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Cart, CartItem, Design, Order, User
from app.services import catalog as catalog_service
from app.services.studio import studio_slug_for_user


def user_is_creator(db: Session, user_id: int) -> bool:
    n = db.scalar(
        select(func.count())
        .select_from(Design)
        .where(Design.creator_id == user_id, Design.source_type == "user")
    )
    return int(n or 0) > 0


def me_payload(db: Session, user: User) -> dict:
    creator = user_is_creator(db, user.id)
    order_count = int(
        db.scalar(select(func.count()).select_from(Order).where(Order.user_id == user.id)) or 0
    )
    return {
        "id": user.id,
        "phone": user.phone,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value,
        "is_active": user.is_active,
        "is_creator": creator,
        "studio_slug": studio_slug_for_user(user) if creator else None,
        "order_count": order_count,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def get_or_create_user_cart(db: Session, user_id: int) -> Cart:
    cart = db.scalar(select(Cart).where(Cart.user_id == user_id))
    if cart:
        return cart
    cart = Cart(user_id=user_id, session_id=None)
    db.add(cart)
    db.commit()
    db.refresh(cart)
    return cart


def merge_session_cart_into_user(db: Session, session_id: str, user_id: int) -> dict:
    """آیتم‌های سبد مهمان را به سبد کاربر منتقل می‌کند."""
    session_cart = db.scalar(
        select(Cart)
        .options(joinedload(Cart.items).joinedload(CartItem.variation))
        .where(Cart.session_id == session_id)
    )
    if session_cart is None or not session_cart.items:
        return {"merged": 0, "message": "سبد مهمان خالی است"}

    user_cart = get_or_create_user_cart(db, user_id)
    merged = 0
    for item in list(session_cart.items):
        try:
            catalog_service.add_cart_line(
                db,
                user_cart,
                item.variation_id,
                item.quantity,
                item.customization_json,
            )
            merged += 1
        except ValueError:
            continue

    db.execute(delete(CartItem).where(CartItem.cart_id == session_cart.id))
    db.delete(session_cart)
    db.commit()
    return {"merged": merged, "message": f"{merged} قلم به سبد شما اضافه شد"}


def list_user_orders(db: Session, user_id: int, *, limit: int = 50) -> list[dict]:
    rows = db.scalars(
        select(Order)
        .where(Order.user_id == user_id)
        .order_by(Order.id.desc())
        .limit(limit)
    ).all()
    out: list[dict] = []
    for o in rows:
        lines = (o.cart_snapshot or {}).get("lines") or []
        out.append(
            {
                "id": o.id,
                "tracking_code": o.tracking_code,
                "status": o.status,
                "total": str(o.total),
                "subtotal": str(o.subtotal),
                "item_count": len(lines),
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
        )
    return out


def get_user_order(db: Session, user_id: int, order_id: int) -> dict | None:
    order = db.scalar(
        select(Order)
        .options(joinedload(Order.items))
        .where(Order.id == order_id, Order.user_id == user_id)
    )
    if order is None:
        return None
    return {
        "id": order.id,
        "tracking_code": order.tracking_code,
        "status": order.status,
        "total": str(order.total),
        "subtotal": str(order.subtotal),
        "discount_total": str(order.discount_total),
        "shipping_total": str(order.shipping_total),
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "shipping_address": order.shipping_address,
        "snapshot": order.cart_snapshot,
        "items": [
            {
                "id": i.id,
                "title": i.title_snapshot,
                "sku": i.sku_snapshot,
                "quantity": i.quantity,
                "unit_price": str(i.unit_price),
            }
            for i in order.items
        ],
    }
