"""
درگاه زرین‌پال — درخواست پرداخت و تأیید (REST v4).
مبلغ ورودی به تومان است.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

SANDBOX_BASE = "https://sandbox.zarinpal.com/pg/v4/payment"
PROD_BASE = "https://api.zarinpal.com/pg/v4/payment"
SANDBOX_START = "https://sandbox.zarinpal.com/pg/StartPay"
PROD_START = "https://www.zarinpal.com/pg/StartPay"


def _base(sandbox: bool) -> str:
    return SANDBOX_BASE if sandbox else PROD_BASE


def _start_url(sandbox: bool, authority: str) -> str:
    base = SANDBOX_START if sandbox else PROD_START
    return f"{base}/{authority}"


async def request_payment(
    *,
    merchant_id: str,
    amount_toman: int,
    callback_url: str,
    description: str,
    sandbox: bool = True,
    metadata: dict | None = None,
) -> dict[str, Any]:
    if not merchant_id:
        raise ValueError("zarinpal_merchant_missing")
    payload = {
        "merchant_id": merchant_id,
        "amount": amount_toman,
        "callback_url": callback_url,
        "description": description[:255],
    }
    if metadata:
        payload["metadata"] = metadata
    url = f"{_base(sandbox)}/request.json"
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(url, json=payload)
        data = res.json()
    if data.get("data", {}).get("code") != 100:
        errors = data.get("errors") or data
        logger.warning("ZarinPal request failed: %s", errors)
        raise ValueError(f"zarinpal_request_failed: {errors}")
    authority = data["data"]["authority"]
    return {
        "authority": authority,
        "payment_url": _start_url(sandbox, authority),
        "fee": data["data"].get("fee"),
    }


async def verify_payment(
    *,
    merchant_id: str,
    amount_toman: int,
    authority: str,
    sandbox: bool = True,
) -> dict[str, Any]:
    if not merchant_id:
        raise ValueError("zarinpal_merchant_missing")
    payload = {
        "merchant_id": merchant_id,
        "amount": amount_toman,
        "authority": authority,
    }
    url = f"{_base(sandbox)}/verify.json"
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(url, json=payload)
        data = res.json()
    code = data.get("data", {}).get("code")
    if code == 100:
        return {"ok": True, "ref_id": data["data"].get("ref_id"), "raw": data}
    if code == 101:
        return {"ok": True, "already_verified": True, "ref_id": data["data"].get("ref_id"), "raw": data}
    return {"ok": False, "raw": data}
