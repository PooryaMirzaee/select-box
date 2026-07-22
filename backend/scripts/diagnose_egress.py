"""تشخیص خروجی اینترنت کانتینر api برای enrichment.

  python scripts/diagnose_egress.py
"""

from __future__ import annotations

import socket
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.services.enrichment.http_client import enrichment_client


def _tcp(host: str, port: int = 443) -> str:
    try:
        with socket.create_connection((host, port), timeout=5):
            return "OK"
    except Exception as e:
        return f"FAIL {e}"


def main() -> None:
    print("=== DNS ===")
    for host in ("api.digikala.com", "api.torob.com", "www.bing.com", "1.1.1.1"):
        try:
            infos = socket.getaddrinfo(host, 443, socket.AF_UNSPEC, socket.SOCK_STREAM)
            addrs = sorted({i[4][0] for i in infos})
            print(f"  {host}: {', '.join(addrs)}")
        except Exception as e:
            print(f"  {host}: DNS FAIL {e}")

    print("=== TCP ===")
    for host in ("1.1.1.1", "8.8.8.8", "api.digikala.com", "api.torob.com"):
        print(f"  {host}: {_tcp(host)}")

    print("=== HTTP (IPv4 prefer) ===")
    for url in (
        "https://api.digikala.com/v1/search/?q=ماگ",
        "https://api.torob.com/v4/base-product/search/?q=ماگ&page=0&size=2",
        "https://www.bing.com/",
    ):
        try:
            with enrichment_client(timeout=15) as c:
                r = c.get(url)
            print(f"  {url.split('/')[2]} → HTTP {r.status_code} ({len(r.content)} bytes)")
        except Exception as e:
            print(f"  {url.split('/')[2]} → FAIL {e}")


if __name__ == "__main__":
    main()
