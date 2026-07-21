"""منطق سفارشی‌سازی، انتشار طرح و محاسبهٔ سهم فروشنده."""

from __future__ import annotations

import hashlib
import json
import re
import secrets
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import (
    CartItem,
    Category,
    Design,
    DesignAsset,
    Order,
    OrderItem,
    Product,
    ProductImage,
    ProductTemplate,
    ProductVariation,
    User,
)
from app.models.customizer import CreatorEarning
from app.services import catalog as catalog_service
from app.services import settings as shop_settings

DEFAULT_COMMISSION_PERCENT = 15.0

PRODUCT_TYPE_SLUGS = {"tshirt", "mug", "hoodie"}


def _variation_sku(
    design_code: str,
    product_type: str,
    *,
    color_hex: str | None,
    size_label: str | None,
) -> str:
    """SKU یکتا برای هر تنوع — شامل کد کامل طرح، نه فقط پیشوند USR/ADM."""
    pt = product_type[:1].upper()
    color = (color_hex or "000000").replace("#", "").upper()[:6]
    size = size_label or "ONE"
    return f"{design_code}-{pt}-{color}-{size}"


def resolve_default_thematic_category_id(db: Session) -> int:
    """دستهٔ پیش‌فرض طرح‌های ارسالی کاربر."""
    cat = db.scalar(select(Category).where(Category.slug == "custom-designs"))
    if cat is None:
        cat = db.scalar(select(Category).where(Category.parent_id.is_(None)).order_by(Category.sort_order).limit(1))
    if cat is None:
        raise ValueError("invalid_category")
    return cat.id


def creator_display_name(user: User) -> str:
    if user.full_name and user.full_name.strip():
        return user.full_name.strip()
    phone = user.phone or ""
    if len(phone) >= 11:
        return f"{phone[:4]}***{phone[-4:]}"
    return phone or "خالق"


def customization_key(payload: dict | None) -> str:
    if not payload:
        return ""
    normalized = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(normalized.encode()).hexdigest()[:32]


def slugify_fa(text: str) -> str:
    s = text.strip().lower()
    s = re.sub(r"[^\w\s\u0600-\u06FF-]", "", s, flags=re.UNICODE)
    s = re.sub(r"[\s_]+", "-", s)
    return s[:180] or secrets.token_hex(4)


def list_templates(db: Session) -> list[ProductTemplate]:
    return list(
        db.scalars(
            select(ProductTemplate)
            .where(ProductTemplate.is_active.is_(True))
            .order_by(ProductTemplate.sort_order, ProductTemplate.id)
        ).all()
    )


def get_template(db: Session, slug: str) -> ProductTemplate | None:
    return db.scalar(
        select(ProductTemplate)
        .options(
            joinedload(ProductTemplate.category),
            joinedload(ProductTemplate.base_product).joinedload(Product.variations),
        )
        .where(ProductTemplate.slug == slug, ProductTemplate.is_active.is_(True))
    )


def get_template_admin(db: Session, slug: str) -> ProductTemplate | None:
    return db.scalar(select(ProductTemplate).where(ProductTemplate.slug == slug))


def merge_template_config(old: dict | None, new: dict) -> dict:
    """ادغام config — views هر رنگ حفظ می‌شود."""
    old = dict(old or {})
    merged = {**old, **new}
    old_colors = {
        str(c.get("hex", "")).lower(): c for c in (old.get("colors") or []) if c.get("hex")
    }
    next_colors: list[dict] = []
    for c in new.get("colors") or []:
        if not c.get("hex"):
            continue
        prev = old_colors.get(str(c["hex"]).lower(), {})
        views = {**(prev.get("views") or {}), **(c.get("views") or {})}
        row = dict(c)
        if views:
            row["views"] = views
        next_colors.append(row)
    if next_colors:
        merged["colors"] = next_colors
    if "sizes" in new:
        merged["sizes"] = new.get("sizes") or []
    old_mockup = dict(old.get("mockup") or {})
    new_mockup = dict(new.get("mockup") or {})
    if new_mockup:
        merged["mockup"] = {
            **old_mockup,
            **new_mockup,
            "views": {**(old_mockup.get("views") or {}), **(new_mockup.get("views") or {})},
        }
    return merged


def create_template(
    db: Session,
    *,
    slug: str,
    name_fa: str,
    description: str | None,
    base_price: float,
    category_slug: str | None,
    config_json: dict,
    sort_order: int = 0,
) -> ProductTemplate:
    if db.scalar(select(ProductTemplate).where(ProductTemplate.slug == slug)):
        raise ValueError("slug_exists")
    category_id = None
    if category_slug:
        cat = db.scalar(select(Category).where(Category.slug == category_slug))
        if cat is None:
            raise ValueError("invalid_category")
        category_id = cat.id
    t = ProductTemplate(
        slug=slug,
        name_fa=name_fa,
        description=description,
        base_price=Decimal(str(base_price)),
        config_json=config_json,
        category_id=category_id,
        is_active=True,
        sort_order=sort_order,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def template_to_dict(t: ProductTemplate) -> dict:
    default_variation_id = None
    if t.base_product and t.base_product.variations:
        active = [v for v in t.base_product.variations if v.is_active]
        if active:
            default_variation_id = active[0].id
    return {
        "id": t.id,
        "slug": t.slug,
        "name_fa": t.name_fa,
        "description": t.description,
        "base_price": str(t.base_price),
        "config_json": t.config_json or {},
        "category_slug": t.category.slug if t.category else None,
        "default_variation_id": default_variation_id,
    }


def find_variation_for_customization(
    db: Session,
    product_type: str,
    color_hex: str,
    size_label: str | None,
) -> ProductVariation | None:
    t = get_template(db, product_type)
    if t is None or t.base_product_id is None:
        return None
    product = db.scalar(
        select(Product)
        .options(joinedload(Product.variations))
        .where(Product.id == t.base_product_id)
    )
    if product is None:
        return None
    variations = [v for v in product.variations if v.is_active and v.stock_quantity > 0]
    if not variations:
        variations = [v for v in product.variations if v.is_active]
    if not variations:
        return None

    def norm_hex(h: str | None) -> str:
        return (h or "").lower().strip()

    target_hex = norm_hex(color_hex)
    if size_label:
        for v in variations:
            if norm_hex(v.color_hex) == target_hex and v.size_label == size_label:
                return v
    for v in variations:
        if norm_hex(v.color_hex) == target_hex:
            return v
    if size_label:
        for v in variations:
            if v.size_label == size_label:
                return v
    return variations[0]


def add_custom_cart_line(
    db: Session,
    cart,
    variation_id: int,
    quantity: int,
    customization: dict | None,
) -> CartItem:
    key = customization_key(customization)
    existing = db.scalar(
        select(CartItem).where(
            CartItem.cart_id == cart.id,
            CartItem.variation_id == variation_id,
            CartItem.customization_key == key,
        )
    )
    if existing:
        existing.quantity += quantity
        db.commit()
        db.refresh(existing)
        return existing

    item = CartItem(
        cart_id=cart.id,
        variation_id=variation_id,
        quantity=quantity,
        customization_json=customization,
        customization_key=key,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def cart_line_dict(item: CartItem) -> dict:
    v = item.variation
    p = v.product
    unit = catalog_service.effective_price(p.base_price, v.price_delta)
    custom = item.customization_json or {}
    title = p.title
    if custom.get("title"):
        title = f"{p.title} — {custom['title']}"
    elif custom.get("product_type"):
        title = f"{p.title} ({custom['product_type']})"
    preview = custom.get("artwork_url") or catalog_service.primary_product_image_url(p)
    line = {
        "id": item.id,
        "variation_id": v.id,
        "quantity": item.quantity,
        "sku": v.sku,
        "title": title,
        "unit_price": str(unit),
        "customization": item.customization_json,
        "preview_url": preview,
        "is_custom": bool(item.customization_json),
    }
    return line


def default_commission_percent(db: Session) -> float:
    v = shop_settings.get_setting(db, "creator_commission_percent", DEFAULT_COMMISSION_PERCENT)
    return float(v)


def _add_variations_from_template(
    db: Session,
    product: Product,
    template: ProductTemplate | None,
    *,
    design_code: str,
    product_type: str,
    default_stock: int = 30,
) -> None:
    """تنوع‌های محصول از colors/sizes قالب — بدون سایز = فقط رنگ."""
    cfg = dict(template.config_json or {}) if template else {}
    colors: list[dict] = list(cfg.get("colors") or [])
    sizes: list[str] = list(cfg.get("sizes") or [])
    if not colors:
        colors = [{"name": "مشکی", "hex": "#1a1a20"}]

    if sizes:
        for color in colors:
            cname = str(color.get("name") or "Default").strip()
            chex = color.get("hex")
            for sz in sizes:
                sku = _variation_sku(design_code, product_type, color_hex=chex, size_label=str(sz))
                if db.scalar(select(ProductVariation).where(ProductVariation.sku == sku)):
                    continue
                db.add(
                    ProductVariation(
                        product_id=product.id,
                        sku=sku,
                        color_name=cname or None,
                        color_hex=chex if chex else None,
                        size_label=str(sz),
                        price_delta=1500 if str(sz).upper() == "XL" else 0,
                        stock_quantity=default_stock,
                        is_active=True,
                    )
                )
        return

    for color in colors:
        cname = str(color.get("name") or "Default").strip()
        chex = color.get("hex")
        sku = _variation_sku(design_code, product_type, color_hex=chex, size_label=None)
        if db.scalar(select(ProductVariation).where(ProductVariation.sku == sku)):
            continue
        db.add(
            ProductVariation(
                product_id=product.id,
                sku=sku,
                color_name=cname or None,
                color_hex=chex if chex else None,
                size_label=None,
                price_delta=0,
                stock_quantity=default_stock,
                is_active=True,
            )
        )


def publish_design_from_customization(
    db: Session,
    creator: User,
    *,
    title: str,
    description: str | None,
    thematic_category_id: int | None,
    product_types: list[str] | None,
    customization: dict,
    customizations_by_type: dict[str, dict] | None = None,
    commission_percent: float | None,
    status: str | None,
    is_admin: bool = False,
    create_products: bool | None = None,
) -> tuple[Design, list[Product]]:
    customization = dict(customization)
    customization.pop("views_draft", None)
    per_type = {k: dict(v) for k, v in (customizations_by_type or {}).items()}
    for v in per_type.values():
        v.pop("views_draft", None)

    product_type = customization.get("product_type") or "tshirt"
    if not product_types:
        product_types = [product_type]

    for pt in product_types:
        if get_template(db, pt) is None:
            raise ValueError("invalid_product_type")

    if thematic_category_id is None:
        thematic_category_id = resolve_default_thematic_category_id(db)
    cat = db.get(Category, thematic_category_id)
    if cat is None:
        raise ValueError("invalid_category")

    if is_admin:
        final_status = status if status in ("draft", "published") else "draft"
        should_create_products = create_products if create_products is not None else True
        design_status = final_status
        product_status = final_status
    else:
        # کاربر در Design Lab محصول می‌سازد؛ طرح فقط لینک داخلی برای تولید است
        should_create_products = True
        design_status = "draft"
        product_status = "draft"

    code_prefix = "USR" if not is_admin else "ADM"
    code = f"{code_prefix}-{secrets.token_hex(3).upper()}"
    slug_base = slugify_fa(title)
    slug = slug_base
    n = 0
    while db.scalar(select(Design).where(Design.slug == slug)):
        n += 1
        slug = f"{slug_base}-{n}"

    commission = commission_percent if commission_percent is not None else default_commission_percent(db)
    source = "admin" if is_admin else "user"

    design = Design(
        code=code,
        title=title,
        slug=slug,
        thematic_category_id=thematic_category_id,
        description=description or title,
        status=design_status,
        creator_id=creator.id,
        source_type=source,
        commission_percent=commission,
        customization_config=customization,
    )
    db.add(design)
    db.flush()

    views = customization.get("artwork_views") or {}
    has_view_assets = isinstance(views, dict) and any(views.values())
    if has_view_assets:
        for idx, (variant, sk) in enumerate(views.items()):
            if sk:
                db.add(
                    DesignAsset(
                        design_id=design.id,
                        variant_key=str(variant),
                        storage_key=str(sk),
                        mime_type="image/png",
                        sort_order=idx,
                    )
                )
    else:
        storage_key = customization.get("artwork_storage_key")
        if storage_key:
            db.add(
                DesignAsset(
                    design_id=design.id,
                    variant_key="hero",
                    storage_key=storage_key,
                    mime_type="image/png",
                    sort_order=0,
                ),
            )

    products: list[Product] = []
    if not should_create_products:
        db.commit()
        db.refresh(design)
        return design, products

    for pt in product_types:
        pcat = db.scalar(select(Category).where(Category.slug == pt, Category.parent_id.is_(None)))
        if pcat is None:
            continue
        template = get_template(db, pt)
        base_price = float(template.base_price) if template else 45900.0
        pslug = f"{code.lower()}-{pt}"
        if db.scalar(select(Product).where(Product.slug == pslug)):
            pslug = f"{pslug}-{secrets.token_hex(2)}"
        pt_label = {"tshirt": "تیشرت", "mug": "ماگ", "hoodie": "هودی"}.get(pt, pt)
        product = Product(
            design_id=design.id,
            parent_category_id=pcat.id,
            slug=pslug,
            title=f"{pt_label} {title}",
            base_price=base_price,
            status=product_status,
            description=description or title,
            meta_title=f"{pt_label} {title} | CORALAY",
            meta_description=description or f"خرید {pt_label} طرح {title}",
        )
        db.add(product)
        db.flush()
        pt_customization = dict(per_type.get(pt) or customization)
        pt_customization["product_type"] = pt
        _attach_artwork_as_product_images(product, pt_customization)
        _add_variations_from_template(
            db,
            product,
            template,
            design_code=code,
            product_type=pt,
        )
        products.append(product)

    db.commit()
    db.refresh(design)
    return design, products


def _attach_artwork_as_product_images(product: Product, customization: dict) -> None:
    """پیش‌نمایش mockup محصول — یک تصویر به ازای هر نمایی که طرح دارد (جلو، پشت، …)."""
    keys: list[str] = []
    previews = customization.get("preview_views") or {}
    if isinstance(previews, dict):
        for sk in previews.values():
            if sk:
                keys.append(str(sk))
    if not keys:
        primary = customization.get("artwork_storage_key")
        views = customization.get("artwork_views") or {}
        if primary:
            keys.append(str(primary))
        elif isinstance(views, dict):
            for sk in views.values():
                if sk:
                    keys.append(str(sk))
                    break
    for idx, sk in enumerate(keys):
        product.images.append(
            ProductImage(
                storage_key=sk,
                mime_type="image/png",
                sort_order=idx,
            )
        )


def process_creator_commissions(db: Session, order: Order) -> None:
    """پس از پرداخت، سهم فروشندهٔ طرح‌های کاربری را ثبت کن."""
    if order.status != "paid":
        return
    items = db.scalars(
        select(OrderItem)
        .options(joinedload(OrderItem.variation).joinedload(ProductVariation.product).joinedload(Product.design))
        .where(OrderItem.order_id == order.id)
    ).all()
    for oi in items:
        product = oi.variation.product
        design = product.design
        if design is None or design.creator_id is None or design.source_type != "user":
            continue
        existing = db.scalar(
            select(CreatorEarning).where(CreatorEarning.order_item_id == oi.id)
        )
        if existing:
            continue
        sale = Decimal(str(oi.unit_price)) * oi.quantity
        pct = Decimal(str(design.commission_percent or default_commission_percent(db)))
        commission = (sale * pct / Decimal("100")).quantize(Decimal("0.01"))
        db.add(
            CreatorEarning(
                creator_id=design.creator_id,
                design_id=design.id,
                order_id=order.id,
                order_item_id=oi.id,
                sale_amount=float(sale),
                commission_percent=float(pct),
                commission_amount=float(commission),
                status="pending",
            )
        )
    db.commit()


def list_products_for_creator(db: Session, creator_id: int) -> list[dict]:
    from app.services.storage import public_url

    rows = db.scalars(
        select(Product)
        .join(Design, Design.id == Product.design_id)
        .options(joinedload(Product.images), joinedload(Product.design))
        .where(Design.creator_id == creator_id, Design.source_type == "user")
        .order_by(Product.id.desc())
    ).unique().all()
    out: list[dict] = []
    for p in rows:
        preview = None
        if p.images:
            preview = public_url(sorted(p.images, key=lambda i: (i.sort_order, i.id))[0].storage_key)
        elif p.design and p.design.assets:
            preview = public_url(
                sorted(p.design.assets, key=lambda a: (a.sort_order, a.id))[0].storage_key
            )
        out.append(
            {
                "id": p.id,
                "slug": p.slug,
                "title": p.title,
                "description": p.description,
                "status": p.status,
                "design_id": p.design_id,
                "preview_url": preview,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
        )
    return out


def list_designs_for_creator(db: Session, creator_id: int) -> list[dict]:
    """@deprecated — از list_products_for_creator استفاده کنید."""
    return list_products_for_creator(db, creator_id)


def creator_earnings_summary(db: Session, creator_id: int) -> dict:
    rows = db.scalars(
        select(CreatorEarning).where(CreatorEarning.creator_id == creator_id)
    ).all()
    total = sum(Decimal(str(r.commission_amount)) for r in rows if r.status != "cancelled")
    pending = sum(Decimal(str(r.commission_amount)) for r in rows if r.status == "pending")
    return {
        "total_earned": str(total),
        "pending": str(pending),
        "sales_count": len(rows),
    }
