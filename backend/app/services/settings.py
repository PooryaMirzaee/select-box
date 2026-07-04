"""
تنظیمات فروشگاه — خواندن/نوشتن از جدول site_settings با پیش‌فرض‌های امن.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings as env
from app.models.site_setting import SiteSetting

API_KEY_MASK = "••••••••"


def normalize_site_url(url: str, *, default_scheme: str = "https") -> str:
    """دامنهٔ خام (selectbox.ir) → https://selectbox.ir"""
    raw = (url or "").strip().rstrip("/")
    if not raw:
        return raw
    if "://" in raw:
        return raw
    if raw.startswith("localhost") or raw.startswith("127.0.0.1"):
        return f"http://{raw}"
    return f"{default_scheme}://{raw.lstrip('/')}"


def default_sms_templates() -> list[dict[str, object]]:
    return [
        {
            "id": "otp_login",
            "label_fa": "کد ورود (OTP)",
            "template_id": 0,
            "enabled": True,
            "parameters": [{"name": "Code", "label_fa": "کد تأیید"}],
        },
        {
            "id": "order_confirmed",
            "label_fa": "تأیید سفارش",
            "template_id": 0,
            "enabled": False,
            "parameters": [
                {"name": "OrderId", "label_fa": "شماره سفارش"},
                {"name": "Amount", "label_fa": "مبلغ (تومان)"},
            ],
        },
        {
            "id": "order_shipped",
            "label_fa": "ارسال سفارش",
            "template_id": 0,
            "enabled": False,
            "parameters": [
                {"name": "OrderId", "label_fa": "شماره سفارش"},
                {"name": "TrackingCode", "label_fa": "کد رهگیری"},
            ],
        },
        {
            "id": "order_delivered",
            "label_fa": "تحویل سفارش",
            "template_id": 0,
            "enabled": False,
            "parameters": [{"name": "OrderId", "label_fa": "شماره سفارش"}],
        },
    ]


def mask_api_key(key: str) -> str:
    return API_KEY_MASK if (key or "").strip() else ""

DEFAULTS: dict[str, object] = {
    "shop_name": "SelectBox",
    "shop_description": "فروشگاه آنلاین لوازم خانگی، سبک زندگی و وسایل روزمره",
    "default_meta_title": "SelectBox — لوازم خانگی و سبک زندگی",
    "default_meta_description": "خرید آنلاین لوازم خانگی، سبک زندگی و وسایل روزمره با گارانتی اصلی، قیمت رقابتی و ارسال سریع.",
    "site_url": "http://localhost:3000",
    "shipping_flat_toman": 49000,
    "currency_label": "تومان",
    "payment_gateway": "mock",
    "zarinpal_merchant_id": "",
    "zarinpal_sandbox": True,
    "zarinpal_callback_url": "",
    "google_analytics_id": "",
    "contact_phone": "021-91001234",
    "contact_email": "support@selectbox.ir",
    "contact_whatsapp": "",
    "contact_telegram": "",
    "contact_instagram": "",
    "contact_address": "تهران",
    "contact_hours": "شنبه تا پنج‌شنبه · ۱۰ تا ۱۸",
    "creator_commission_percent": 15,
    # sms.ir — https://sms.ir/
    "sms_enabled": False,
    "sms_ir_api_key": "",
    "sms_ir_api_base": "https://api.sms.ir",
    "sms_ir_line_number": "",
    "dev_otp_code": "123456",
    "sms_templates": default_sms_templates(),
    # AvalAI — https://docs.avalai.ir/fa/
    "avalai_enabled": False,
    "avalai_api_key": "",
    "avalai_image_model": "gemini-2.5-flash-image",
    "avalai_require_login": True,
    "avalai_max_per_user_hour": 3,
    "avalai_max_per_user_day": 8,
    "avalai_max_global_day": 50,
    "avalai_max_per_ip_hour": 5,
    "avalai_cooldown_seconds": 45,
    "avalai_system_prompt_suffix": (
        "خروجی باید یک تصویر محصول لوازم خانگی با کیفیت بالا باشد.\n"
        "پس‌زمینه: سفید یا خاکستری روشن یکدست.\n"
        "محصول در مرکز با نورپردازی حرفه‌ای — بدون متن اضافی یا واترمارک."
    ),
}


def get_setting(db: Session, key: str, default: object | None = None) -> object:
    row = db.get(SiteSetting, key)
    if row is None:
        return DEFAULTS.get(key, default)
    return row.value


def get_all_settings(db: Session) -> dict[str, object]:
    rows = db.scalars(select(SiteSetting)).all()
    merged = dict(DEFAULTS)
    for r in rows:
        merged[r.key] = r.value
    if not merged.get("zarinpal_merchant_id") and env.zarinpal_merchant_id:
        merged["zarinpal_merchant_id"] = env.zarinpal_merchant_id
    if merged.get("payment_gateway") == "mock" and env.payment_gateway:
        merged["payment_gateway"] = env.payment_gateway
    if not merged.get("sms_ir_api_key") and env.sms_ir_api_key:
        merged["sms_ir_api_key"] = env.sms_ir_api_key
    if env.sms_ir_api_key and not merged.get("sms_enabled"):
        merged["sms_enabled"] = True
    if not merged.get("dev_otp_code") and env.dev_otp_code:
        merged["dev_otp_code"] = env.dev_otp_code
    if merged.get("sms_ir_api_base") in ("https://api.sms.ir/v1", "https://api.sms.ir/v1/"):
        merged["sms_ir_api_base"] = "https://api.sms.ir"
    return merged


def get_admin_settings(db: Session) -> dict[str, object]:
    merged = get_all_settings(db)
    raw_key = str(merged.get("sms_ir_api_key") or "").strip()
    merged["sms_ir_api_key_set"] = bool(raw_key)
    merged["sms_ir_api_key"] = mask_api_key(raw_key)
    avalai_key = str(merged.get("avalai_api_key") or "").strip()
    merged["avalai_api_key_set"] = bool(avalai_key)
    merged["avalai_api_key"] = mask_api_key(avalai_key)
    return merged


def shop_settings_raw_key(db: Session) -> str:
    row = db.get(SiteSetting, "sms_ir_api_key")
    if row is not None and str(row.value or "").strip():
        return str(row.value)
    return str(env.sms_ir_api_key or "")


def avalai_raw_key(db: Session) -> str:
    row = db.get(SiteSetting, "avalai_api_key")
    if row is not None and str(row.value or "").strip():
        return str(row.value)
    return ""


def set_setting(db: Session, key: str, value: object) -> None:
    row = db.get(SiteSetting, key)
    if row is None:
        db.add(SiteSetting(key=key, value=value))
    else:
        row.value = value
    db.commit()


def set_settings(db: Session, data: dict[str, object]) -> dict[str, object]:
    for key, value in data.items():
        if key not in DEFAULTS:
            continue
        if key in ("sms_ir_api_key", "avalai_api_key"):
            raw = str(value or "").strip()
            if not raw or raw == API_KEY_MASK:
                continue
        if key == "site_url" and value:
            value = normalize_site_url(str(value))
        row = db.get(SiteSetting, key)
        if row is None:
            db.add(SiteSetting(key=key, value=value))
        else:
            row.value = value
    db.commit()
    return get_all_settings(db)


def shipping_flat_toman(db: Session) -> int:
    v = get_setting(db, "shipping_flat_toman", DEFAULTS["shipping_flat_toman"])
    return int(v)


def public_shop_settings(db: Session) -> dict:
    all_s = get_all_settings(db)
    return {
        "shop_name": all_s["shop_name"],
        "shop_description": all_s["shop_description"],
        "default_meta_title": all_s["default_meta_title"],
        "default_meta_description": all_s["default_meta_description"],
        "site_url": normalize_site_url(str(all_s["site_url"])),
        "shipping_flat_toman": all_s["shipping_flat_toman"],
        "currency_label": all_s["currency_label"],
        "payment_gateway": all_s["payment_gateway"],
        "contact_phone": all_s.get("contact_phone", ""),
        "contact_email": all_s.get("contact_email", ""),
        "contact_whatsapp": all_s.get("contact_whatsapp", ""),
        "contact_telegram": all_s.get("contact_telegram", ""),
        "contact_instagram": all_s.get("contact_instagram", ""),
        "contact_address": all_s.get("contact_address", ""),
        "contact_hours": all_s.get("contact_hours", ""),
        "google_analytics_id": all_s.get("google_analytics_id", ""),
    }
