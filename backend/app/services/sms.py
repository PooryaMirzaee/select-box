"""ارسال پیامک — sms.ir (Verify + پترن‌های قابل تنظیم از پنل ادمین)."""

from __future__ import annotations

import logging
import secrets
from dataclasses import dataclass
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings as env
from app.services import settings as shop_settings

logger = logging.getLogger(__name__)

API_KEY_MASK = shop_settings.API_KEY_MASK


@dataclass(frozen=True)
class SmsConfig:
    enabled: bool
    api_key: str
    api_base: str
    line_number: str
    dev_otp_code: str
    templates: list[dict[str, Any]]

    @property
    def is_configured(self) -> bool:
        return bool(self.enabled and self.api_key.strip())


def resolve_sms_config(db: Session) -> SmsConfig:
    all_s = shop_settings.get_all_settings(db)
    api_key = str(all_s.get("sms_ir_api_key") or env.sms_ir_api_key or "").strip()
    templates = list(all_s.get("sms_templates") or shop_settings.default_sms_templates())

    # اگر template_id OTP از env آمده و در DB صفر است، env را اعمال کن
    env_tid = int(env.sms_ir_template_id or 0)
    if env_tid:
        for t in templates:
            if t.get("id") == "otp_login" and not int(t.get("template_id") or 0):
                t["template_id"] = env_tid

    return SmsConfig(
        enabled=bool(all_s.get("sms_enabled", False)),
        api_key=api_key,
        api_base=str(all_s.get("sms_ir_api_base") or env.sms_ir_api_base or "https://api.sms.ir").strip(),
        line_number=str(all_s.get("sms_ir_line_number") or "").strip(),
        dev_otp_code=str(all_s.get("dev_otp_code") or env.dev_otp_code or "123456"),
        templates=templates,
    )


def find_template(cfg: SmsConfig, template_key: str) -> dict[str, Any] | None:
    for t in cfg.templates:
        if t.get("id") == template_key:
            return t
    return None


def generate_otp_code(db: Session) -> str:
    cfg = resolve_sms_config(db)
    otp_tpl = find_template(cfg, "otp_login")
    if cfg.is_configured and otp_tpl and int(otp_tpl.get("template_id") or 0):
        return f"{secrets.randbelow(900_000) + 100_000:06d}"
    return cfg.dev_otp_code


def normalize_phone(phone: str) -> str:
    p = phone.strip().replace(" ", "").replace("-", "")
    if p.startswith("+98"):
        p = "0" + p[3:]
    elif p.startswith("98") and len(p) >= 12:
        p = "0" + p[2:]
    if not p.startswith("0") and len(p) == 10:
        p = "0" + p
    return p


def _mobile_for_api(phone: str) -> str:
    mobile = normalize_phone(phone)
    if mobile.startswith("0"):
        mobile = mobile[1:]
    return mobile


def _verify_url(api_base: str) -> str:
    base = api_base.rstrip("/")
    if base.endswith("/v1"):
        return f"{base}/send/verify"
    return f"{base}/v1/send/verify"


def _is_success(data: dict[str, Any]) -> bool:
    return bool(data.get("status") or data.get("IsSuccessful"))


async def send_verify_sms(
    cfg: SmsConfig,
    phone: str,
    template_id: int,
    parameters: list[dict[str, str]],
) -> tuple[bool, str]:
    if not cfg.is_configured:
        return False, "SMS غیرفعال یا API Key تنظیم نشده"
    if not template_id:
        return False, "شناسه قالب (Template ID) تنظیم نشده"

    url = _verify_url(cfg.api_base)
    payload = {
        "mobile": _mobile_for_api(phone),
        "templateId": template_id,
        "parameters": parameters,
    }
    headers = {"X-API-KEY": cfg.api_key, "Content-Type": "application/json", "Accept": "text/plain"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, json=payload, headers=headers)
            if res.status_code == 200:
                data = res.json()
                if _is_success(data):
                    return True, "پیامک ارسال شد"
                msg = data.get("message") or data.get("Message") or str(data)
                logger.warning("sms.ir verify rejected: %s", msg)
                return False, f"خطای sms.ir: {msg}"
            logger.warning("sms.ir verify failed: %s %s", res.status_code, res.text[:300])
            return False, f"خطای HTTP {res.status_code}"
    except Exception as exc:
        logger.exception("sms.ir request error")
        return False, f"خطای اتصال: {exc}"


async def send_template_sms(
    db: Session,
    template_key: str,
    phone: str,
    param_values: dict[str, str],
) -> tuple[bool, str]:
    cfg = resolve_sms_config(db)
    tpl = find_template(cfg, template_key)
    if tpl is None:
        return False, f"پترن «{template_key}» پیدا نشد"
    if not tpl.get("enabled", True):
        return False, f"پترن «{template_key}» غیرفعال است"

    template_id = int(tpl.get("template_id") or 0)
    parameters = [
        {"name": p["name"], "value": str(param_values.get(p["name"], ""))}
        for p in (tpl.get("parameters") or [])
        if p.get("name")
    ]
    if not parameters:
        return False, "پارامتر پترن تعریف نشده"

    return await send_verify_sms(cfg, phone, template_id, parameters)


async def send_otp_sms(db: Session, phone: str, code: str) -> bool:
    cfg = resolve_sms_config(db)
    tpl = find_template(cfg, "otp_login")
    param_values: dict[str, str] = {}
    if tpl:
        for p in tpl.get("parameters") or []:
            name = str(p.get("name") or "")
            if name:
                param_values[name] = code
    if not param_values:
        param_values = {"Code": code}
    ok, _ = await send_template_sms(db, "otp_login", phone, param_values)
    return ok


async def send_test_sms(db: Session, phone: str, template_key: str = "otp_login") -> tuple[bool, str, bool]:
    cfg = resolve_sms_config(db)
    tpl = find_template(cfg, template_key)
    if tpl is None:
        return False, f"پترن «{template_key}» پیدا نشد", False

    test_values: dict[str, str] = {}
    for p in tpl.get("parameters") or []:
        name = p.get("name", "")
        if not name:
            continue
        if name.lower() in ("code", "otp"):
            test_values[name] = cfg.dev_otp_code
        elif "order" in name.lower():
            test_values[name] = "12345"
        elif "track" in name.lower():
            test_values[name] = "POST-TEST"
        elif "amount" in name.lower():
            test_values[name] = "99000"
        else:
            test_values[name] = "TEST"

    ok, detail = await send_template_sms(db, template_key, phone, test_values)
    return ok, detail, ok
