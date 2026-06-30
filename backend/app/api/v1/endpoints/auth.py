"""
احراز هویت — ورود ادمین با رمز، OTP مشتری (sms.ir یا حالت توسعه).
"""

import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps_auth import get_current_user
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models import OtpCode, User, UserRole
from app.schemas.auth import (
    AdminLoginIn,
    CartMergeIn,
    MeOut,
    OtpRequestIn,
    OtpVerifyIn,
    ProfilePatchIn,
    TokenOut,
)
from app.services import auth_user as auth_user_service
from app.services.sms import generate_otp_code, normalize_phone, resolve_sms_config, send_otp_sms
from app.core.config import settings
from app.services.rate_limit import rate_limit_auth

router = APIRouter(prefix="/auth", tags=["auth"])

OTP_MAX_PER_WINDOW = 5
OTP_WINDOW_MINUTES = 10


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _token_out(user: User) -> TokenOut:
    token = create_access_token(user.phone, user.role.value)
    return TokenOut(
        access_token=token,
        role=user.role.value,
        phone=user.phone,
        full_name=user.full_name,
        user_id=user.id,
    )


@router.post("/admin/login", response_model=TokenOut)
def admin_login(body: AdminLoginIn, request: Request, db: Session = Depends(get_db)):
    rate_limit_auth(request, "admin_login", max_calls=10, window_sec=900)
    user = db.scalar(select(User).where(User.phone == body.phone.strip()))
    if user is None or user.password_hash is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.role not in (UserRole.admin, UserRole.operator):
        raise HTTPException(status_code=403, detail="Not an admin account")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="حساب غیرفعال است")
    return _token_out(user)


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return MeOut.model_validate(auth_user_service.me_payload(db, user))


@router.patch("/me", response_model=MeOut)
def patch_me(
    body: ProfilePatchIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = body.model_dump(exclude_unset=True)
    if "full_name" in data:
        fn = data["full_name"]
        user.full_name = fn.strip()[:255] if fn and fn.strip() else None
    if "email" in data:
        em = data["email"]
        user.email = em.strip()[:255] if em and em.strip() else None
    db.commit()
    db.refresh(user)
    return MeOut.model_validate(auth_user_service.me_payload(db, user))


@router.post("/otp/request")
async def otp_request(body: OtpRequestIn, request: Request, db: Session = Depends(get_db)):
    rate_limit_auth(request, "otp_request", max_calls=20, window_sec=600)
    phone = normalize_phone(body.phone)
    existing = db.scalar(select(User).where(User.phone == phone))
    if existing is not None and not existing.is_active:
        raise HTTPException(status_code=403, detail="این حساب غیرفعال شده است — با پشتیبانی تماس بگیرید")

    window_start = datetime.now(timezone.utc) - timedelta(minutes=OTP_WINDOW_MINUTES)
    recent_count = int(
        db.scalar(
            select(func.count())
            .select_from(OtpCode)
            .where(OtpCode.phone == phone, OtpCode.created_at >= window_start)
        )
        or 0
    )
    if recent_count >= OTP_MAX_PER_WINDOW:
        raise HTTPException(
            status_code=429,
            detail=f"حداکثر {OTP_MAX_PER_WINDOW} درخواست در {OTP_WINDOW_MINUTES} دقیقه — کمی بعد تلاش کنید",
        )

    code = generate_otp_code(db)
    code_hash = _hash_code(code)
    db.add(
        OtpCode(
            phone=phone,
            code_hash=code_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
    )
    db.commit()

    sent = await send_otp_sms(db, phone, code)
    cfg = resolve_sms_config(db)
    if sent:
        detail = "کد تأیید پیامک شد"
    elif cfg.is_configured:
        detail = "ارسال پیامک ناموفق — دوباره تلاش کنید"
    elif settings.debug:
        detail = f"حالت توسعه — کد: {code}"
        print(f"[DEV OTP] {phone}: {code}")
    else:
        detail = "ارسال پیامک ناموفق — دوباره تلاش کنید"

    return {"ok": True, "phone": phone, "detail": detail, "sms_sent": sent}


@router.post("/otp/verify", response_model=TokenOut)
def otp_verify(body: OtpVerifyIn, request: Request, db: Session = Depends(get_db)):
    rate_limit_auth(request, "otp_verify", max_calls=15, window_sec=600)
    phone = normalize_phone(body.phone)
    code = body.code.strip()
    now = datetime.now(timezone.utc)

    otp_row = db.scalar(
        select(OtpCode).where(OtpCode.phone == phone).order_by(OtpCode.id.desc()).limit(1)
    )

    cfg = resolve_sms_config(db)
    otp_tpl = next((t for t in cfg.templates if t.get("id") == "otp_login"), None)
    sms_mode = cfg.is_configured and otp_tpl and int(otp_tpl.get("template_id") or 0)

    if sms_mode:
        if otp_row is None or otp_row.expires_at < now:
            raise HTTPException(status_code=400, detail="کد منقضی شده — دوباره درخواست دهید")
        if otp_row.consumed_at is not None:
            raise HTTPException(status_code=400, detail="این کد قبلاً استفاده شده — کد جدید بگیرید")
        if _hash_code(code) != otp_row.code_hash:
            raise HTTPException(status_code=400, detail="کد نامعتبر")
    elif code != cfg.dev_otp_code:
        if otp_row is not None and otp_row.expires_at >= now and _hash_code(code) == otp_row.code_hash:
            pass
        else:
            raise HTTPException(status_code=400, detail="کد نامعتبر")

    if otp_row is not None:
        otp_row.consumed_at = now
        db.commit()

    user = db.scalar(select(User).where(User.phone == phone))
    if user is None:
        user = User(phone=phone, role=UserRole.customer, full_name=None)
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.is_active:
        raise HTTPException(status_code=403, detail="حساب غیرفعال شده است")

    return _token_out(user)


@router.post("/session/merge")
def merge_cart(
    body: CartMergeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return auth_user_service.merge_session_cart_into_user(db, body.session_id.strip(), user.id)


@router.get("/orders")
def my_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"orders": auth_user_service.list_user_orders(db, user.id)}


@router.get("/orders/{order_id}")
def my_order_detail(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = auth_user_service.get_user_order(db, user.id, order_id)
    if row is None:
        raise HTTPException(status_code=404, detail="سفارش پیدا نشد")
    return row
