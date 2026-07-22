"""کلاینت HTTP enrichment — ترجیح IPv4 بدون local_address (که روی بعضی VPS Errno -9 می‌دهد)."""

from __future__ import annotations

import socket
from contextlib import contextmanager

import httpx

_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

_orig_getaddrinfo = socket.getaddrinfo


def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    """فقط A record؛ اگر نبود به حالت پیش‌فرض برگرد."""
    try:
        return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
    except OSError:
        return _orig_getaddrinfo(host, port, family, type, proto, flags)


@contextmanager
def _prefer_ipv4():
    socket.getaddrinfo = _ipv4_getaddrinfo  # type: ignore[assignment]
    try:
        yield
    finally:
        socket.getaddrinfo = _orig_getaddrinfo  # type: ignore[assignment]


class _IPv4Client(httpx.Client):
    """Client که resolve را به IPv4 محدود می‌کند."""

    def request(self, *args, **kwargs):
        with _prefer_ipv4():
            return super().request(*args, **kwargs)


def enrichment_client(*, timeout: float = 20.0) -> httpx.Client:
    return _IPv4Client(
        timeout=timeout,
        follow_redirects=True,
        headers={
            "User-Agent": _UA,
            "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
        },
    )


def friendly_network_error(exc: BaseException) -> str:
    msg = str(exc)
    low = msg.lower()
    if any(
        x in low
        for x in (
            "101",
            "network is unreachable",
            "address family",
            "name or service not known",
            "errno -9",
            "connecterror",
        )
    ):
        return (
            "خروجی اینترنت کانتینر api مشکل دارد. "
            "روی سرور بزنید: docker compose exec -T api python scripts/diagnose_egress.py"
        )
    return msg[:800]
