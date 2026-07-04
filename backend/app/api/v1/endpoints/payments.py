"""
پرداخت — mock، زرین‌پال، کارت‌به‌کارت؛ تأیید و کاهش موجودی.
"""

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile
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
from app.services.storage import public_url, save_upload_secure

router = APIRouter(prefix="/payments", tags=["payments"])

RECEIPT_MAX_BYTES = 8 * 1024 * 1024
RECEIPT_EXT = frozenset({".jpg", ".jpeg", ".png", ".webp", ".pdf"})


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


def _card_transfer_settings(cfg: dict) -> dict:
    return {
        "enabled": bool(cfg.get("card_transfer_enabled", True)),
        "card_number": str(cfg.get("card_number") or "").strip(),
        "card_holder": str(cfg.get("card_holder") or "").strip(),
        "card_bank_name": str(cfg.get("card_bank_name") or "").strip(),
        "instructions": str(cfg.get("card_transfer_instructions") or "").strip(),
    }


@router.get("/card-transfer/info")
def card_transfer_info(db: Session = Depends(get_db)):
    cfg = shop_settings.get_all_settings(db)
    info = _card_transfer_settings(cfg)
    if not info["enabled"]:
        raise HTTPException(status_code=404, detail="کارت‌به‌کارت غیرفعال است")
    return info


@router.post("/orders/{order_id}/card-transfer")
def initiate_card_transfer(
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
    card = _card_transfer_settings(cfg)
    if not card["enabled"]:
        raise HTTPException(status_code=400, detail="کارت‌به‌کارت غیرفعال است")
    if not card["card_number"]:
        raise HTTPException(status_code=400, detail="شماره کارت در تنظیمات ثبت نشده")

    existing = db.scalar(
        select(Payment)
        .where(
            Payment.order_id == order.id,
            Payment.gateway == "card_transfer",
            Payment.status.in_(("redirected", "failed")),
        )
        .order_by(Payment.id.desc())
    )
    if existing:
        payment = existing
    else:
        payment = Payment(
            order_id=order.id,
            gateway="card_transfer",
            amount=order.total,
            status="redirected",
        )
        db.add(payment)
        db.flush()

    db.commit()
    frontend = str(cfg.get("site_url") or env.frontend_url).rstrip("/")
    return {
        "payment_id": payment.id,
        "gateway": "card_transfer",
        "amount": str(order.total),
        "tracking_code": order.tracking_code,
        "card_number": card["card_number"],
        "card_holder": card["card_holder"],
        "card_bank_name": card["card_bank_name"],
        "instructions": card["instructions"],
        "receipt_uploaded": bool(payment.receipt_storage_key),
        "payment_url": f"{frontend}/checkout/card-transfer?order_id={order.id}&payment_id={payment.id}",
    }


@router.post("/{payment_id}/receipt")
async def upload_card_receipt(
    payment_id: int,
    file: UploadFile = File(...),
    customer_note: str = Form(default=""),
    db: Session = Depends(get_db),
    session_id: str | None = Depends(_session_id_optional),
    user: User | None = Depends(get_current_user_optional),
):
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.gateway != "card_transfer":
        raise HTTPException(status_code=400, detail="Invalid payment type")

    order = db.get(Order, payment.order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    verify_order_access(order, session_id, user)
    if order.status != "pending_payment":
        raise HTTPException(status_code=400, detail="سفارش قابل پرداخت نیست")
    if payment.status not in ("redirected", "created", "failed"):
        raise HTTPException(status_code=400, detail="این پرداخت قابل آپلود رسید نیست")

    raw = await file.read()
    if len(raw) > RECEIPT_MAX_BYTES:
        raise HTTPException(status_code=400, detail="حجم فایل بیش از حد مجاز است")
    if not raw:
        raise HTTPException(status_code=400, detail="فایل خالی است")

    ext = ""
    if file.filename and "." in file.filename:
        ext = "." + file.filename.rsplit(".", 1)[-1].lower()
    if ext not in RECEIPT_EXT:
        raise HTTPException(status_code=400, detail="فرمت مجاز: jpg, png, webp, pdf")

    storage_key = save_upload_secure(
        raw,
        f"receipts/order-{order.id}",
        f"payment-{payment.id}{ext}",
    )
    payment.receipt_storage_key = storage_key
    payment.customer_note = (customer_note or "").strip() or None
    payment.status = "redirected"
    payment.admin_note = None
    payment.reviewed_at = None
    db.commit()

    return {
        "ok": True,
        "payment_id": payment.id,
        "receipt_url": public_url(storage_key),
        "message": "رسید ثبت شد. پس از تأیید ادمین، سفارش پردازش می‌شود.",
    }


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
        shop_name = str(cfg.get("shop_name", "SelectBox"))
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
