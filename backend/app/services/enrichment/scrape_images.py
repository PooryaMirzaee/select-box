"""جستجوی تصویر از وب (بدون API پولی) — DuckDuckGo + Bing fallback."""

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


def _ddg_vqd(client, query: str) -> str | None:
    res = client.get(
        "https://duckduckgo.com/",
        params={"q": query},
        headers={"Referer": "https://duckduckgo.com/"},
    )
    if res.status_code >= 400:
        return None
    m = re.search(r"vqd=([\d-]+)", res.text)
    if m:
        return m.group(1)
    m = re.search(r'vqd="([^"]+)"', res.text)
    return m.group(1) if m else None


def _search_duckduckgo(query: str, limit: int) -> list[ImageHit]:
    hits: list[ImageHit] = []
    with enrichment_client() as client:
        vqd = _ddg_vqd(client, query)
        if not vqd:
            return hits
        res = client.get(
            "https://duckduckgo.com/i.js",
            params={
                "l": "wt-wt",
                "o": "json",
                "q": query,
                "vqd": vqd,
                "f": ",,,,,",
                "p": "1",
            },
            headers={
                "Referer": f"https://duckduckgo.com/?q={quote_plus(query)}&iax=images&ia=images",
                "Accept": "application/json",
            },
        )
        if res.status_code >= 400:
            logger.warning("ddg images HTTP %s", res.status_code)
            return hits
        try:
            data = res.json()
        except Exception:
            return hits
        for i, row in enumerate(data.get("results") or []):
            url = (row.get("image") or row.get("url") or "").strip()
            if not url.startswith("http"):
                continue
            hits.append(
                ImageHit(
                    url=url,
                    thumb=(row.get("thumbnail") or None),
                    source="duckduckgo",
                    score=float(max(0, 100 - i)),
                )
            )
            if len(hits) >= limit:
                break
    return hits


def _search_bing(query: str, limit: int) -> list[ImageHit]:
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
            hits.append(
                ImageHit(url=url, thumb=None, source="bing", score=float(max(0, 90 - i)))
            )
            if len(hits) >= limit:
                break
        if not hits:
            for i, m in enumerate(re.finditer(r'"murl"\s*:\s*"(https?://[^"]+)"', res.text)):
                url = m.group(1).encode().decode("unicode_escape", errors="ignore")
                hits.append(
                    ImageHit(url=url, thumb=None, source="bing", score=float(max(0, 90 - i)))
                )
                if len(hits) >= limit:
                    break
    return hits


def search_product_images(query: str, *, limit: int = 5) -> list[ImageHit]:
    q = (query or "").strip()
    if not q:
        return []
    time.sleep(0.4 + random.random() * 0.4)
    hits = _search_duckduckgo(q, limit)
    if len(hits) < max(1, limit // 2):
        time.sleep(0.3)
        for h in _search_bing(q, limit):
            if all(h.url != x.url for x in hits):
                hits.append(h)
            if len(hits) >= limit:
                break
    seen: set[str] = set()
    out: list[ImageHit] = []
    for h in hits:
        if h.url in seen:
            continue
        seen.add(h.url)
        out.append(h)
        if len(out) >= limit:
            break
    return out
