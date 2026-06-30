"""اعتبارسنجی JWT ترب (EdDSA) — Product API v3."""

from __future__ import annotations

import jwt
from fastapi import HTTPException, Request, status

# کلید عمومی رسمی ترب — https://github.com/Torob/Torob-Sync/blob/main/torob_api_token_guide.md
TOROB_PUBLIC_KEY = """-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAt6Mu4T0pBORY11W+QeM35UsmLO3vsf+6yKpFDEImFk0=
-----END PUBLIC KEY-----"""


def request_audience(request: Request) -> str:
    """مقدار aud باید با Host درخواست یکی باشد."""
    host = (request.headers.get("host") or "").strip()
    if not host:
        raise HTTPException(status_code=400, detail="Host header missing")
    return host.split(",")[0].strip()


def verify_torob_request(
    request: Request,
    *,
    token: str | None,
    token_version: str | None,
) -> None:
    if not token:
        raise HTTPException(status_code=401, detail="X-Torob-Token required")
    if token_version and token_version != "1":
        raise HTTPException(status_code=401, detail="Unsupported X-Torob-Token-Version")

    audience = request_audience(request)
    try:
        jwt.decode(
            token,
            key=TOROB_PUBLIC_KEY,
            algorithms=["EdDSA"],
            audience=audience,
            options={"require": ["exp", "aud"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.ImmatureSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token not yet valid") from exc
    except jwt.InvalidAudienceError as exc:
        raise HTTPException(status_code=401, detail="Invalid token audience") from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid Torob token") from exc
