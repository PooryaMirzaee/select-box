"""ساخت فید محصول برای Product API v3 ترب."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from math import ceil
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Design, Product, ProductVariation
from app.schemas.torob import TorobProductOut, TorobProductsRequest, TorobProductsResponse
from app.services import catalog as catalog_service
from app.services import settings as shop_settings

PAGE_SIZE = 100


@dataclass(frozen=True)
class TorobRow:
    product: Product
    variation: ProductVariation | None


def page_unique(product_id: int, variation_id: int) -> str:
    return f"{product_id}_{variation_id}"


def parse_page_unique(value: str) -> tuple[int, int] | None:
    parts = value.strip().split("_", 1)
    if len(parts) != 2:
        return None
    try:
        return int(parts[0]), int(parts[1])
    except ValueError:
        return None


def _iso_dt(value: object | None) -> str:
    if value is None:
        return datetime.now(timezone.utc).isoformat()
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(str(value))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _toman_int(value: Decimal | float | str) -> int:
    return int(Decimal(str(value)).quantize(Decimal("1")))


def _short_text(text: str | None, limit: int = 500) -> str | None:
    if not text:
        return None
    cleaned = " ".join(text.split())
    return cleaned[:limit] if cleaned else None


def _product_page_url(site_url: str, slug: str) -> str:
    return f"{site_url.rstrip('/')}/product/{slug}"


def slug_from_page_url(page_url: str) -> str | None:
    path = urlparse(page_url.strip()).path or page_url.strip()
    prefix = "/product/"
    if not path.startswith(prefix):
        return None
    slug = path[len(prefix) :].strip("/")
    return slug or None


def _variation_spec(variation: ProductVariation | None) -> dict[str, str] | None:
    if variation is None:
        return None
    spec: dict[str, str] = {}
    if variation.color_name:
        spec["color"] = variation.color_name
    if variation.size_label:
        spec["size"] = variation.size_label
    if variation.sku:
        spec["sku"] = variation.sku
    return spec or None


def _build_product_item(row: TorobRow, site_url: str) -> TorobProductOut:
    product = row.product
    variation = row.variation
    vid = variation.id if variation else 0

    if variation:
        unit_price = catalog_service.effective_price(product.base_price, variation.price_delta)
        in_stock = variation.is_active and variation.stock_quantity > 0
    else:
        unit_price = product.base_price
        in_stock = False

    current_price = _toman_int(unit_price)
    old_price: int | None = None
    if product.compare_at_price is not None:
        compare = _toman_int(product.compare_at_price)
        if compare > current_price:
            old_price = compare

    category_name = product.parent_category.name_fa if product.parent_category else None
    image_links = [u for u in catalog_service.product_image_urls(product) if u][:10]
    if not image_links:
        image_links = [f"{site_url.rstrip('/')}/favicon.ico"]

    return TorobProductOut(
        page_unique=page_unique(product.id, vid),
        page_url=_product_page_url(site_url, product.slug),
        product_group_id=str(product.id),
        title=product.title[:500],
        subtitle=(product.design.title[:500] if product.design else None),
        current_price=current_price,
        old_price=old_price,
        availability=in_stock,
        category_name=category_name[:200] if category_name else None,
        image_links=image_links,
        short_desc=_short_text(product.meta_description or product.description),
        spec=_variation_spec(variation),
        date_added=_iso_dt(product.created_at),
        date_updated=_iso_dt(product.updated_at),
    )


def _product_load_options():
    return (
        joinedload(Product.parent_category),
        joinedload(Product.design).joinedload(Design.assets),
        joinedload(Product.images),
        joinedload(Product.variations),
    )


def _load_product_graph(db: Session, product_id: int) -> Product | None:
    return db.scalar(
        select(Product)
        .where(Product.id == product_id, Product.status == "published")
        .options(*_product_load_options())
    )


def _rows_for_product(product: Product) -> list[TorobRow]:
    active = [v for v in (product.variations or []) if v.is_active]
    if active:
        return [TorobRow(product=product, variation=v) for v in active]
    return [TorobRow(product=product, variation=None)]


def _sort_key(row: TorobRow, sort: str) -> tuple:
    if sort == "date_updated_desc":
        primary = row.product.updated_at or row.product.created_at
    else:
        primary = row.product.created_at
    vid = row.variation.id if row.variation else 0
    ts = primary.timestamp() if primary else 0.0
    return (ts, row.product.id, vid)


def _all_sorted_rows(db: Session, sort: str) -> list[TorobRow]:
    products = db.scalars(
        select(Product)
        .where(Product.status == "published")
        .options(*_product_load_options())
    ).unique().all()

    rows: list[TorobRow] = []
    for product in products:
        rows.extend(_rows_for_product(product))
    rows.sort(key=lambda r: _sort_key(r, sort), reverse=True)
    return rows


def _site_url(db: Session) -> str:
    url = str(shop_settings.public_shop_settings(db).get("site_url") or "").strip()
    return url or "http://localhost:3000"


def _paginated_list(db: Session, *, page: int, sort: str, site_url: str) -> TorobProductsResponse:
    all_rows = _all_sorted_rows(db, sort)
    total = len(all_rows)
    max_pages = max(1, ceil(total / PAGE_SIZE)) if total else 1
    offset = (page - 1) * PAGE_SIZE
    page_rows = all_rows[offset : offset + PAGE_SIZE]
    products = [_build_product_item(row, site_url) for row in page_rows]
    return TorobProductsResponse(
        current_page=page,
        total=total,
        max_pages=max_pages,
        products=products,
    )


def _fetch_by_urls(db: Session, urls: list[str], site_url: str) -> TorobProductsResponse:
    items: list[TorobProductOut] = []
    seen: set[str] = set()
    for url in urls:
        slug = slug_from_page_url(url)
        if not slug:
            continue
        product = catalog_service.get_product_by_slug(db, catalog_service.normalize_slug_param(slug))
        if product is None:
            continue
        product = _load_product_graph(db, product.id) or product
        for row in _rows_for_product(product):
            item = _build_product_item(row, site_url)
            if item.page_unique in seen:
                continue
            seen.add(item.page_unique)
            items.append(item)
    return TorobProductsResponse(current_page=1, total=len(items), max_pages=1, products=items)


def _fetch_by_uniques(db: Session, uniques: list[str], site_url: str) -> TorobProductsResponse:
    items: list[TorobProductOut] = []
    for unique in uniques:
        parsed = parse_page_unique(unique)
        if parsed is None:
            continue
        product_id, variation_id = parsed
        product = _load_product_graph(db, product_id)
        if product is None:
            continue
        rows = _rows_for_product(product)
        if variation_id == 0:
            target = next((r for r in rows if r.variation is None), None)
        else:
            target = next((r for r in rows if r.variation and r.variation.id == variation_id), None)
        if target is None:
            continue
        items.append(_build_product_item(target, site_url))
    return TorobProductsResponse(current_page=1, total=len(items), max_pages=1, products=items)


def build_response(db: Session, body: TorobProductsRequest) -> TorobProductsResponse:
    site_url = _site_url(db)
    if body.page_urls is not None:
        return _fetch_by_urls(db, body.page_urls, site_url)
    if body.page_uniques is not None:
        return _fetch_by_uniques(db, body.page_uniques, site_url)
    assert body.page is not None and body.sort is not None
    return _paginated_list(db, page=body.page, sort=body.sort, site_url=site_url)
