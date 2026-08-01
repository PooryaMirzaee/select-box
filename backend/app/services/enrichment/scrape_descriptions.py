"""کرال توضیح واقعی محصول از منابع ایرانی (دیجی‌کالا / ترب)."""

from __future__ import annotations

import logging
import random
import re
import time
from dataclasses import dataclass, field

from app.services.enrichment.http_client import enrichment_client

logger = logging.getLogger(__name__)

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


@dataclass
class DescriptionHit:
    title: str
    source: str
    url: str | None
    description: str
    specs: list[str] = field(default_factory=list)
    score: float = 0.0


def _clean(text: str | None) -> str:
    if not text:
        return ""
    t = _TAG_RE.sub(" ", str(text))
    t = t.replace("\u200c", "\u200c")
    return _WS_RE.sub(" ", t).strip()


def _specs_lines(specifications) -> list[str]:
    out: list[str] = []
    if not isinstance(specifications, list):
        return out
    for block in specifications:
        attrs = (block or {}).get("attributes") if isinstance(block, dict) else None
        if not isinstance(attrs, list):
            continue
        for attr in attrs:
            if not isinstance(attr, dict):
                continue
            title = _clean(attr.get("title"))
            values = attr.get("values") or []
            if isinstance(values, list):
                val = "، ".join(_clean(v) for v in values if _clean(str(v)))
            else:
                val = _clean(values)
            if title and val:
                out.append(f"{title}: {val}")
            if len(out) >= 12:
                return out
    return out


def _digikala(query: str, limit: int) -> list[DescriptionHit]:
    hits: list[DescriptionHit] = []
    with enrichment_client(timeout=25.0) as client:
        res = client.get("https://api.digikala.com/v1/search/", params={"q": query})
        if res.status_code >= 400:
            logger.warning("digikala desc search HTTP %s", res.status_code)
            return hits
        try:
            products = res.json().get("data", {}).get("products", []) or []
        except Exception:
            return hits

        for i, p in enumerate(products[: max(limit * 2, 6)]):
            pid = p.get("id")
            if not pid:
                continue
            title = _clean(p.get("title_fa") or p.get("title") or "")
            detail = client.get(f"https://api.digikala.com/v2/product/{pid}/")
            if detail.status_code >= 400:
                continue
            try:
                prod = detail.json().get("data", {}).get("product") or {}
            except Exception:
                continue

            expert = prod.get("expert_reviews") or {}
            review = prod.get("review") or {}
            desc_parts = [
                _clean(expert.get("description") if isinstance(expert, dict) else None),
                _clean(expert.get("short_review") if isinstance(expert, dict) else None),
                _clean(review.get("description") if isinstance(review, dict) else None),
                _clean(prod.get("description")),
            ]
            description = "\n\n".join(part for part in desc_parts if part)
            specs = _specs_lines(prod.get("specifications"))
            if not description and not specs:
                continue

            url = f"https://www.digikala.com/product/dkp-{pid}/"
            hits.append(
                DescriptionHit(
                    title=title or query,
                    source="digikala",
                    url=url,
                    description=description[:4000],
                    specs=specs,
                    score=float(100 - i),
                )
            )
            if len(hits) >= limit:
                break
    return hits


def _torob(query: str, limit: int) -> list[DescriptionHit]:
    hits: list[DescriptionHit] = []
    with enrichment_client(timeout=25.0) as client:
        res = client.get(
            "https://api.torob.com/v4/base-product/search/",
            params={"q": query, "page": 0, "size": max(limit, 5)},
            headers={"Origin": "https://torob.com", "Referer": "https://torob.com/"},
        )
        if res.status_code >= 400:
            logger.warning("torob desc search HTTP %s", res.status_code)
            return hits
        try:
            results = res.json().get("results") or []
        except Exception:
            return hits

        for i, row in enumerate(results):
            name = _clean(row.get("name1") or row.get("name") or "")
            rk = row.get("random_key")
            description = ""
            specs: list[str] = []
            url = None
            if rk:
                url = f"https://torob.com/p/{rk}/"
                try:
                    det = client.get(
                        "https://api.torob.com/v4/base-product/details/",
                        params={"prk": rk},
                        headers={"Origin": "https://torob.com", "Referer": "https://torob.com/"},
                    )
                    if det.status_code < 400:
                        data = det.json()
                        description = _clean(
                            data.get("description")
                            or data.get("content")
                            or ""
                        )
                        for key in ("key_features", "attributes", "structural_specs"):
                            raw = data.get(key)
                            if isinstance(raw, list):
                                for item in raw[:8]:
                                    if isinstance(item, str) and item.strip():
                                        specs.append(_clean(item))
                                    elif isinstance(item, dict):
                                        t = _clean(item.get("title") or item.get("name"))
                                        v = _clean(item.get("value") or item.get("values"))
                                        if t and v:
                                            specs.append(f"{t}: {v}")
                                    elif isinstance(item, list) and len(item) >= 2:
                                        specs.append(f"{_clean(item[0])}: {_clean(item[1])}")
                except Exception as e:
                    logger.info("torob detail skip: %s", e)

            if not description and not specs and not name:
                continue
            if not description and name:
                description = name

            hits.append(
                DescriptionHit(
                    title=name or query,
                    source="torob",
                    url=url,
                    description=description[:4000],
                    specs=specs[:12],
                    score=float(90 - i),
                )
            )
            if len(hits) >= limit:
                break
    return hits


def search_product_descriptions(query: str, *, limit: int = 3) -> list[DescriptionHit]:
    q = (query or "").strip()
    if not q:
        return []
    time.sleep(0.2 + random.random() * 0.3)

    hits: list[DescriptionHit] = []
    errors: list[str] = []
    for name, fn in (("digikala", _digikala), ("torob", _torob)):
        if len(hits) >= limit:
            break
        try:
            found = fn(q, limit)
            logger.info("description crawl %s → %s hits", name, len(found))
            for h in found:
                if h.url and any(x.url == h.url for x in hits):
                    continue
                hits.append(h)
        except Exception as e:
            logger.warning("description crawl %s failed: %s", name, e)
            errors.append(f"{name}: {e}")

    out = sorted(hits, key=lambda x: -x.score)[:limit]
    if not out and errors:
        raise ConnectionError("; ".join(errors)[:700])
    return out


def format_context(hits: list[DescriptionHit]) -> str:
    blocks: list[str] = []
    for h in hits:
        lines = [f"منبع: {h.source}", f"عنوان مرجع: {h.title}"]
        if h.url:
            lines.append(f"لینک: {h.url}")
        if h.specs:
            lines.append("مشخصات:")
            lines.extend(f"- {s}" for s in h.specs)
        if h.description:
            lines.append("توضیح منبع:")
            lines.append(h.description[:1800])
        blocks.append("\n".join(lines))
    return "\n\n---\n\n".join(blocks)
