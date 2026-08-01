"""جستجوی تصویر — اولویت منابع ایرانی (ترب/دیجی‌کالا)، بعد Bing."""

from __future__ import annotations

import logging
import random
import re
import time
from dataclasses import dataclass
from urllib.parse import quote_plus, unquote

from app.services.enrichment.http_client import enrichment_client

logger = logging.getLogger(__name__)


@dataclass
class ImageHit:
    url: str
    thumb: str | None
    source: str
    score: float


# نسخه پرکیفیت تصاویر — دیجی‌کالا thumbnail 300px می‌دهد؛ اصل تصویر را بخواه
_DK_HIRES_PARAMS = "?x-oss-process=image/resize,m_lfit,h_1600,w_1600/quality,q_95"
_TOROB_FIT_RE = re.compile(r"/fit-in/\d+x\d+/")
_SIZE_SUFFIX_RE = re.compile(r"/(\d{2,4})x\1(?=\.[a-zA-Z]{3,4}$)")


def upgrade_image_url(url: str) -> str:
    """URL تصویر را به بزرگ‌ترین نسخه ممکن تبدیل می‌کند."""
    u = (url or "").strip()
    if not u:
        return u
    if "x-oss-process" in u:
        return u.split("?", 1)[0] + _DK_HIRES_PARAMS
    if _TOROB_FIT_RE.search(u):
        return _TOROB_FIT_RE.sub("/fit-in/1600x1600/", u)
    if _SIZE_SUFFIX_RE.search(u):
        return _SIZE_SUFFIX_RE.sub("/1600x1600", u)
    return u


def _collect_http_urls(node) -> list[str]:
    out: list[str] = []
    if isinstance(node, str) and node.startswith("http"):
        out.append(node)
    elif isinstance(node, list):
        for x in node:
            out.extend(_collect_http_urls(x))
    elif isinstance(node, dict):
        for v in node.values():
            out.extend(_collect_http_urls(v))
    return out


def _digikala(query: str, limit: int) -> list[ImageHit]:
    hits: list[ImageHit] = []
    with enrichment_client(timeout=25.0) as client:
        res = client.get("https://api.digikala.com/v1/search/", params={"q": query})
        if res.status_code >= 400:
            logger.warning("digikala HTTP %s", res.status_code)
            return hits
        try:
            products = res.json().get("data", {}).get("products", []) or []
        except Exception:
            return hits

        for i, p in enumerate(products[:limit]):
            chosen = None
            thumb = None
            pid = p.get("id")

            # جزئیات محصول — تصاویر بزرگ‌تر (۸۰۰px) نسبت به سرچ (۳۰۰px)
            if pid:
                try:
                    detail = client.get(f"https://api.digikala.com/v2/product/{pid}/")
                    if detail.status_code < 400:
                        imgs = (detail.json().get("data") or {}).get("product", {}).get("images") or {}
                        main = imgs.get("main") if isinstance(imgs, dict) else None
                        if isinstance(main, dict):
                            urls = main.get("url") or []
                            if isinstance(urls, list) and urls:
                                chosen = urls[0]
                            webp = main.get("webp_url") or []
                            if not chosen and isinstance(webp, list) and webp:
                                chosen = webp[0]
                except Exception as e:
                    logger.info("digikala detail skip %s: %s", pid, e)

            if not chosen:
                urls = _collect_http_urls(p.get("images"))
                if not urls:
                    urls = _collect_http_urls(p.get("image_src") or p.get("image"))
                # ترجیح url معمولی بر webp کوچک سرچ
                chosen = next((u for u in urls if "format,webp" not in u), None) or (urls[0] if urls else None)
                thumb = urls[-1] if urls else None

            if not chosen:
                continue

            hits.append(
                ImageHit(
                    url=upgrade_image_url(chosen),
                    thumb=thumb or chosen,
                    source="digikala",
                    score=float(100 - i),
                )
            )
            if len(hits) >= limit:
                break
    return hits


def _torob(query: str, limit: int) -> list[ImageHit]:
    hits: list[ImageHit] = []
    with enrichment_client() as client:
        res = client.get(
            "https://api.torob.com/v4/base-product/search/",
            params={"q": query, "page": 0, "size": max(limit, 5)},
            headers={"Origin": "https://torob.com", "Referer": "https://torob.com/"},
        )
        if res.status_code >= 400:
            logger.warning("torob HTTP %s", res.status_code)
            return hits
        try:
            results = res.json().get("results") or []
        except Exception:
            return hits
        for i, row in enumerate(results):
            img = (row.get("image_url") or row.get("image") or "").strip()
            if not img.startswith("http"):
                continue
            hits.append(ImageHit(url=upgrade_image_url(img), thumb=None, source="torob", score=float(95 - i)))
            if len(hits) >= limit:
                break
    return hits


def _bing(query: str, limit: int) -> list[ImageHit]:
    hits: list[ImageHit] = []
    with enrichment_client() as client:
        res = client.get(
            "https://www.bing.com/images/search",
            params={"q": query, "form": "HDRSC2", "first": "1"},
        )
        if res.status_code >= 400:
            return hits
        for i, m in enumerate(re.finditer(r'murl&quot;:&quot;(https?://[^&]+)&quot;', res.text)):
            url = unquote(m.group(1).replace("\\u0026", "&"))
            if not url.startswith("http"):
                continue
            hits.append(ImageHit(url=upgrade_image_url(url), thumb=None, source="bing", score=float(70 - i)))
            if len(hits) >= limit:
                break
        if not hits:
            for i, m in enumerate(re.finditer(r'"murl"\s*:\s*"(https?://[^"]+)"', res.text)):
                url = m.group(1).encode().decode("unicode_escape", errors="ignore")
                hits.append(ImageHit(url=upgrade_image_url(url), thumb=None, source="bing", score=float(70 - i)))
                if len(hits) >= limit:
                    break
    return hits


def _ddg(query: str, limit: int) -> list[ImageHit]:
    hits: list[ImageHit] = []
    with enrichment_client() as client:
        home = client.get("https://duckduckgo.com/", params={"q": query})
        if home.status_code >= 400:
            return hits
        m = re.search(r"vqd=([\d-]+)", home.text) or re.search(r'vqd="([^"]+)"', home.text)
        if not m:
            return hits
        vqd = m.group(1)
        res = client.get(
            "https://duckduckgo.com/i.js",
            params={"l": "wt-wt", "o": "json", "q": query, "vqd": vqd, "f": ",,,,,", "p": "1"},
            headers={
                "Referer": f"https://duckduckgo.com/?q={quote_plus(query)}&iax=images&ia=images",
                "Accept": "application/json",
            },
        )
        if res.status_code >= 400:
            return hits
        try:
            rows = res.json().get("results") or []
        except Exception:
            return hits
        for i, row in enumerate(rows):
            url = (row.get("image") or row.get("url") or "").strip()
            if not url.startswith("http"):
                continue
            hits.append(
                ImageHit(
                    url=upgrade_image_url(url),
                    thumb=row.get("thumbnail"),
                    source="duckduckgo",
                    score=float(60 - i),
                )
            )
            if len(hits) >= limit:
                break
    return hits


def search_product_images(query: str, *, limit: int = 5) -> list[ImageHit]:
    q = (query or "").strip()
    if not q:
        return []
    time.sleep(0.25 + random.random() * 0.35)

    hits: list[ImageHit] = []
    errors: list[str] = []

    for name, fn in (
        ("digikala", _digikala),
        ("torob", _torob),
        ("bing", _bing),
        ("duckduckgo", _ddg),
    ):
        if len(hits) >= limit:
            break
        try:
            found = fn(q, limit)
            logger.info("enrichment search %s → %s hits", name, len(found))
            for h in found:
                if all(h.url != x.url for x in hits):
                    hits.append(h)
        except Exception as e:
            logger.warning("enrichment search %s failed: %s", name, e)
            errors.append(f"{name}: {e}")

    seen: set[str] = set()
    out: list[ImageHit] = []
    for h in sorted(hits, key=lambda x: -x.score):
        if h.url in seen:
            continue
        seen.add(h.url)
        out.append(h)
        if len(out) >= limit:
            break

    if not out and errors:
        raise ConnectionError("; ".join(errors)[:700])
    return out
