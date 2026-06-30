"""
پرداخت — mock یا زرین‌پال؛ تأیید و کاهش موجودی.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import SESSION_HEADER
from app.core.config import settings as env
from app.core.deps_auth import get_current_user_optional
from app.db.session import get_db
from app.models import Order, OrderItem, Payment, ProductVariation, User
from app.services import customizer as customizer_service
from app.services import settings as shop_settings
from app.services import zarinpal
from app.services.order_access import verify_order_access

router = APIRouter(prefix="/payments", tags=["payments"])


def _session_id_optional(
    x_session_id: str | None = Header(default=None, alias=SESSION_HEADER),
) -> str | None:
    if x_session_id and x_session_id.strip():
        return x_session_id.strip()
    return None


def _mark_order_paid(db: Session, order: Order) -> None:
    if order.status == "paid":
        return
    for oi in order.items:
        v = db.get(ProductVariation, oi.variation_id)
        if v is None or v.stock_quantity < oi.quantity:
            raise HTTPException(status_code=400, detail="Stock error")
        v.stock_quantity -= oi.quantity
    order.status = "paid"
    customizer_service.process_creator_commissions(db, order)


@router.post("/orders/{order_id}/initiate")
async def initiate_payment(
    order_id: int,
    db: Session = Depends(get_db),
    session_id: str | None = Depends(_session_id_optional),
    user: User | None = Depends(get_current_user_optional),
):
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    verify_order_access(order, session_id, user)
    if order.status != "pending_payment":
        raise HTTPException(status_code=400, detail="Order not payable")

    cfg = shop_settings.get_all_settings(db)
    gateway = str(cfg.get("payment_gateway", "mock"))
    amount_toman = int(Decimal(str(order.total)))

    payment = Payment(
        order_id=order.id,
        gateway=gateway,
        amount=order.total,
        status="created",
    )
    db.add(payment)
    db.flush()

    if gateway == "zarinpal":
        merchant = str(cfg.get("zarinpal_merchant_id") or env.zarinpal_merchant_id or "")
        sandbox = bool(cfg.get("zarinpal_sandbox", env.zarinpal_sandbox))
        callback = str(cfg.get("zarinpal_callback_url") or "").strip()
        if not callback:
            callback = f"{env.public_api_url.rstrip('/')}/api/v1/payments/zarinpal/callback"
        shop_name = str(cfg.get("shop_name", "CORALAY"))
        try:
            result = await zarinpal.request_payment(
                merchant_id=merchant,
                amount_toman=amount_toman,
                callback_url=callback,
                description=f"سفارش {order.tracking_code} — {shop_name}",
                sandbox=sandbox,
                metadata={"order_id": order.id},
            )
        except ValueError as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=str(e)) from e
        payment.gateway_ref = result["authority"]
        payment.status = "redirected"
        payment.raw_request = result
        db.commit()
        return {
            "payment_id": payment.id,
            "payment_url": result["payment_url"],
            "gateway": "zarinpal",
            "amount": str(order.total),
            "authority": result["authority"],
        }

    if not env.debug:
        raise HTTPException(status_code=400, detail="درگاه mock فقط در حالت توسعه مجاز است")

    payment.gateway = "mock"
    payment.status = "redirected"
    db.commit()
    frontend = str(cfg.get("site_url") or env.frontend_url).rstrip("/")
    return {
        "payment_id": payment.id,
        "payment_url": f"{frontend}/checkout/mock-pay?order_id={order.id}",
        "gateway": "mock",
        "amount": str(order.total),
    }


@router.post("/orders/{order_id}/confirm")
def confirm_payment(
    order_id: int,
    db: Session = Depends(get_db),
    session_id: str | None = Depends(_session_id_optional),
    user: User | None = Depends(get_current_user_optional),
    x_mock_payment_secret: str | None = Header(default=None, alias="X-Mock-Payment-Secret"),
):
    order = db.scalar(
        select(Order).options(joinedload(Order.items)).where(Order.id == order_id)
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    verify_order_access(order, session_id, user)

    cfg = shop_settings.get_all_settings(db)
    gateway = str(cfg.get("payment_gateway", env.payment_gateway or "mock"))

    if gateway == "zarinpal":
        raise HTTPException(
            status_code=400,
            detail="تأیید پرداخت زرین‌پال فقط از callback انجام می‌شود",
        )

    if not env.debug:
        secret = env.mock_payment_secret.strip()
        if not secret or x_mock_payment_secret != secret:
            raise HTTPException(status_code=403, detail="تأیید mock در تولید مجاز نیست")

    if order.status == "paid":
        return {"ok": True, "status": "paid", "tracking_code": order.tracking_code}

    _mark_order_paid(db, order)
    pay = db.scalar(
        select(Payment).where(Payment.order_id == order_id).order_by(Payment.id.desc())
    )
    if pay:
        pay.status = "verified"
    db.commit()
    return {"ok": True, "status": "paid", "tracking_code": order.tracking_code}


@router.get("/zarinpal/callback")
async def zarinpal_callback(
    Authority: str = Query(...),
    Status: str = Query(...),
    db: Session = Depends(get_db),
):
    cfg = shop_settings.get_all_settings(db)
    frontend = str(cfg.get("site_url") or env.frontend_url).rstrip("/")

    payment = db.scalar(
        select(Payment)
        .where(Payment.gateway == "zarinpal", Payment.gateway_ref == Authority)
        .order_by(Payment.id.desc())
    )
    if payment is None:
        return RedirectResponse(f"{frontend}/checkout?error=payment_not_found")

    order = db.scalar(
        select(Order).options(joinedload(Order.items)).where(Order.id == payment.order_id)
    )
    if order is None:
        return RedirectResponse(f"{frontend}/checkout?error=order_not_found")

    if Status != "OK":
        payment.status = "failed"
        payment.raw_callback = {"Status": Status, "Authority": Authority}
        db.commit()
        return RedirectResponse(f"{frontend}/orders/{order.tracking_code}?failed=1")

    if order.status == "paid":
        return RedirectResponse(f"{frontend}/orders/{order.tracking_code}?success=1")

    merchant = str(cfg.get("zarinpal_merchant_id") or env.zarinpal_merchant_id or "")
    sandbox = bool(cfg.get("zarinpal_sandbox", env.zarinpal_sandbox))
    amount_toman = int(Decimal(str(order.total)))

    try:
        verified = await zarinpal.verify_payment(
            merchant_id=merchant,
            amount_toman=amount_toman,
            authority=Authority,
            sandbox=sandbox,
        )
    except ValueError:
        return RedirectResponse(f"{frontend}/orders/{order.tracking_code}?failed=verify")

    payment.raw_callback = verified.get("raw")
    if not verified.get("ok"):
        payment.status = "failed"
        db.commit()
        return RedirectResponse(f"{frontend}/orders/{order.tracking_code}?failed=1")

    try:
        _mark_order_paid(db, order)
    except HTTPException:
        payment.status = "failed"
        db.commit()
        return RedirectResponse(f"{frontend}/orders/{order.tracking_code}?failed=stock")

    payment.status = "verified"
    if verified.get("ref_id"):
        payment.gateway_ref = f"{Authority}:{verified['ref_id']}"
    db.commit()
    return RedirectResponse(f"{frontend}/orders/{order.tracking_code}?success=1")
