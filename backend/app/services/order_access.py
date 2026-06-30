"""بررسی دسترسی به سفارش — فقط صاحب سشن یا کاربر لاگین."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.models import Order, User


def order_session_id(order: Order) -> str | None:
    snapshot = order.cart_snapshot or {}
    if not isinstance(snapshot, dict):
        return None
    sid = snapshot.get("session_id")
    if sid and str(sid).strip():
        return str(sid).strip()
    return None


def verify_order_access(
    order: Order,
    session_id: str | None,
    user: User | None,
) -> None:
    """اجازه فقط اگر سشن سبد با سفارش یکی باشد یا user_id سفارش با کاربر جاری."""
    if user is not None and order.user_id is not None and order.user_id == user.id:
        return

    expected = order_session_id(order)
    if expected and session_id and session_id.strip() == expected:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="دسترسی به این سفارش مجاز نیست",
    )
