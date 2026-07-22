"""کلاینت HTTP مشترک enrichment — اجبار IPv4 برای جلوگیری از Errno 101 روی سرور."""

from __future__ import annotations

import httpx

_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

# bind روی IPv4 → getaddrinfo ترجیح AAAA را دور می‌زند (ENETUNREACH رایج روی VPS)
_TRANSPORT = httpx.HTTPTransport(local_address="0.0.0.0")


def enrichment_client(*, timeout: float = 20.0) -> httpx.Client:
    return httpx.Client(
        timeout=timeout,
        follow_redirects=True,
        transport=_TRANSPORT,
        headers={
            "User-Agent": _UA,
            "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
        },
    )


def friendly_network_error(exc: BaseException) -> str:
    msg = str(exc)
    if "101" in msg or "Network is unreachable" in msg or "Name or service not known" in msg:
        return (
            "سرور به اینترنت بیرون دسترسی ندارد (Network unreachable). "
            "روی هاست این را چک کنید: "
            "docker compose exec api python -c \"import httpx; "
            "print(httpx.get('https://www.bing.com',timeout=15,"
            "transport=__import__('httpx').HTTPTransport(local_address='0.0.0.0')).status_code)\""
        )
    return msg[:800]
