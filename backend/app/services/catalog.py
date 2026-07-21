"""
منطق دامنهٔ کاتالوگ و سبد خرید (خواندن/نوشتن ساده).

تفکیک از لایهٔ HTTP تا بتوان همان توابع را در تست واحد یا job پس‌زمینه صدا زد.
"""

from decimal import Decimal
from urllib.parse import unquote

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import (
    Cart,
    CartItem,
    Category,
    Design,
    DesignAsset,
    Product,
    ProductImage,
    ProductVariation,
)
from app.services.category_helpers import category_browse_dict, category_image_url
from app.services.storage import public_url


def normalize_slug_param(slug: str) -> str:
    """اسلاگ URL را یک‌بار decode می‌کند — Next.js گاهی پارامتر فارسی را encode‌شده می‌فرستد."""
    if not slug:
        return slug
    try:
        decoded = unquote(slug)
        if decoded != slug or "%" in slug:
            return decoded
    except ValueError:
        pass
    return slug


# دسته‌های نوع محصول فیزیکی — در فروشگاه لوازم خانگی استفاده نمی‌شود
PRODUCT_TYPE_SLUGS = frozenset()


def all_categories_ordered(db: Session) -> list[Category]:
    """همهٔ ردیف‌های دسته مرتب شده برای ساخت درخت."""
    return list(db.scalars(select(Category).order_by(Category.sort_order, Category.id)).all())


def category_tree(db: Session) -> list[dict]:
    """درخت تو در تو از ریشه‌های parent_id=None تا فرزندان."""
    rows = all_categories_ordered(db)
    by_parent: dict[int | None, list[Category]] = {}
    for c in rows:
        by_parent.setdefault(c.parent_id, []).append(c)
    roots = by_parent.get(None, [])
    return [attach_children(r, by_parent) for r in roots]


def attach_children(cat: Category, by_parent: dict[int | None, list[Category]]) -> dict:
    """ساخت بازگشتی گره JSON برای هر دسته."""
    node = {
        "id": cat.id,
        "parent_id": cat.parent_id,
        "slug": cat.slug,
        "name_fa": cat.name_fa,
        "sort_order": cat.sort_order,
        "children": [],
    }
    for ch in by_parent.get(cat.id, []):
        node["children"].append(attach_children(ch, by_parent))
    return node


def category_navigation_tree(db: Session) -> list[dict]:
    """درخت دسته برای مگامenu — فقط فعال؛ ریشه‌ها بدون نوع محصول."""
    rows = list(
        db.scalars(
            select(Category)
            .where(Category.is_active.is_(True))
            .order_by(Category.sort_order, Category.id)
        ).all()
    )
    by_parent: dict[int | None, list[Category]] = {}
    for c in rows:
        by_parent.setdefault(c.parent_id, []).append(c)

    def attach(cat: Category, path_parts: list[str]) -> dict:
        path = "/".join(path_parts)
        kids = by_parent.get(cat.id, [])
        return {
            "id": cat.id,
            "slug": cat.slug,
            "name_fa": cat.name_fa,
            "path": path,
            "image_url": category_image_url(cat),
            "child_count": len(kids),
            "children": [attach(ch, [*path_parts, ch.slug]) for ch in kids],
        }

    roots = [c for c in by_parent.get(None, []) if c.slug not in PRODUCT_TYPE_SLUGS]
    return [attach(r, [r.slug]) for r in roots]


def resolve_category_path(db: Session, slugs: list[str]) -> Category | None:
    """مسیر اسلاگ‌ها را به یک دسته تبدیل می‌کند؛ مثلاً kitchen/refrigerator"""
    if not slugs:
        return None
    parent_id: int | None = None
    cat: Category | None = None
    for slug in slugs:
        normalized = normalize_slug_param(slug).strip().lower()
        if not normalized:
            return None
        cat = db.scalar(
            select(Category).where(
                Category.slug == normalized,
                Category.parent_id == parent_id,
                Category.is_active.is_(True),
            )
        )
        if cat is None:
            return None
        parent_id = cat.id
    return cat


def resolve_category_by_unique_slug(db: Session, slug: str) -> Category | None:
    """اگر فقط یک دستهٔ فعال با این اسلاگ وجود داشته باشد، همان را برمی‌گرداند."""
    normalized = normalize_slug_param(slug).strip().lower()
    if not normalized:
        return None
    rows = list(
        db.scalars(
            select(Category).where(Category.slug == normalized, Category.is_active.is_(True))
        ).all()
    )
    if len(rows) == 1:
        return rows[0]
    return None


def category_full_path(db: Session, cat: Category) -> str:
    """مسیر کامل والد→فرزند برای canonical."""
    parts: list[str] = []
    current: Category | None = cat
    guard = 0
    while current is not None and guard < 32:
        parts.append(current.slug)
        if current.parent_id is None:
            break
        current = db.get(Category, current.parent_id)
        guard += 1
    return "/".join(reversed(parts))


def thematic_root_categories(db: Session) -> list[Category]:
    """ریشه‌های موضوعی فعال (بدون نوع محصول مثل تیشرت)."""
    rows = db.scalars(
        select(Category)
        .where(Category.parent_id.is_(None), Category.is_active.is_(True))
        .order_by(Category.sort_order, Category.id)
    ).all()
    return [c for c in rows if c.slug not in PRODUCT_TYPE_SLUGS]


def children_of(db: Session, parent_id: int) -> list[Category]:
    return list(
        db.scalars(
            select(Category)
            .where(Category.parent_id == parent_id, Category.is_active.is_(True))
            .order_by(Category.sort_order, Category.id)
        ).all()
    )


def category_current_dict(cat: Category) -> dict:
    """خلاصهٔ دستهٔ جاری برای browse و سئو."""
    return {
        "id": cat.id,
        "slug": cat.slug,
        "name_fa": cat.name_fa,
        "meta_title": cat.meta_title,
        "meta_description": cat.meta_description,
        "image_url": category_image_url(cat),
    }


def all_category_browse_paths(db: Session) -> list[str]:
    """همهٔ مسیرهای فعال دسته برای sitemap — اجداد حتی اگر غیرفعال باشند لحاظ می‌شوند."""
    active_rows = list(
        db.scalars(
            select(Category)
            .where(Category.is_active.is_(True))
            .order_by(Category.sort_order, Category.id)
        ).all()
    )
    all_by_id = {c.id: c for c in db.scalars(select(Category)).all()}
    paths: list[str] = []
    for cat in active_rows:
        parts: list[str] = []
        cur: Category | None = cat
        seen: set[int] = set()
        while cur is not None and cur.id not in seen:
            seen.add(cur.id)
            parts.append(cur.slug)
            cur = all_by_id.get(cur.parent_id) if cur.parent_id else None
        paths.append("/".join(reversed(parts)))
    return sorted(set(paths))


def category_breadcrumbs(db: Session, cat: Category) -> list[dict]:
    """از برگ تا ریشه — برای نمایش سینما > فیلم > بریکینگ بد"""
    chain: list[Category] = []
    current: Category | None = cat
    while current is not None:
        chain.append(current)
        if current.parent_id is None:
            break
        current = db.get(Category, current.parent_id)
    chain.reverse()
    path_parts: list[str] = []
    crumbs: list[dict] = []
    for c in chain:
        path_parts.append(c.slug)
        crumbs.append({"name_fa": c.name_fa, "slug": c.slug, "path": "/".join(path_parts)})
    return crumbs


def browse_context(db: Session, path_slugs: list[str], product_type: str | None) -> dict:
    """
    صفحهٔ مرور دسته‌بندی:
      • بدون path: ریشه‌های موضوعی
      • با path ناقص: زیردسته‌ها
      • برگ بدون فرزند: محصولات آن موضوع
    """
    if not path_slugs:
        roots = thematic_root_categories(db)
        return {
            "breadcrumbs": [],
            "current": None,
            "children": [
                category_browse_dict(c, c.slug, child_count=len(children_of(db, c.id)))
                for c in roots
            ],
            "products": [],
        }

    cat = resolve_category_path(db, path_slugs)
    if cat is None and len(path_slugs) == 1:
        cat = resolve_category_by_unique_slug(db, path_slugs[0])
    if cat is None:
        return {"breadcrumbs": [], "current": None, "children": [], "products": [], "error": "not_found"}

    crumbs = category_breadcrumbs(db, cat)
    kids = children_of(db, cat.id)
    canonical_path = category_full_path(db, cat)

    if kids:
        base = canonical_path
        return {
            "breadcrumbs": crumbs,
            "current": category_current_dict(cat),
            "children": [
                category_browse_dict(
                    ch, f"{base}/{ch.slug}", child_count=len(children_of(db, ch.id))
                )
                for ch in kids
            ],
            "products": [],
            "canonical_path": canonical_path,
        }

    products = list_products(
        db,
        parent_slug=product_type,
        thematic_category_id=cat.id,
        limit=48,
        offset=0,
    )
    return {
        "breadcrumbs": crumbs,
        "current": category_current_dict(cat),
        "children": [],
        "products": [_product_summary_dict(p) for p in products],
        "canonical_path": canonical_path,
    }


def _sorted_product_images(product: Product) -> list[ProductImage]:
    return sorted(product.images or [], key=lambda i: (i.sort_order, i.id))


def product_image_urls(product: Product) -> list[str]:
    """تصاویر محصول؛ در صورت خالی بودن از طرح."""
    imgs = _sorted_product_images(product)
    if imgs:
        return [public_url(i.storage_key) for i in imgs]
    if product.design:
        return asset_urls(product.design)
    return []


def primary_product_image_url(product: Product) -> str | None:
    urls = product_image_urls(product)
    return urls[0] if urls else None


def _product_summary_dict(p: Product) -> dict:
    return {
        "id": p.id,
        "slug": p.slug,
        "title": p.title,
        "base_price": str(p.base_price),
        "status": p.status,
        "design_id": p.design_id,
        "parent_category_slug": p.parent_category.slug if p.parent_category else None,
        "image_url": primary_product_image_url(p),
    }


def list_products(
    db: Session,
    *,
    parent_slug: str | None,
    thematic_slug: str | None = None,
    thematic_category_id: int | None = None,
    limit: int,
    offset: int,
    include_draft: bool = False,
) -> list[Product]:
    """
    فهرست محصولات منتشرشده با فیلتر اختیاری:
      • parent_slug: نوع جسم (مثلاً tshirt)
      • thematic_slug: موضوع طرح از طریق join به designs.thematic_category
    """
    q = select(Product).options(
        joinedload(Product.parent_category),
        joinedload(Product.images),
        joinedload(Product.design).joinedload(Design.assets),
    )
    if not include_draft:
        q = q.where(Product.status == "published")

    if parent_slug:
        q = q.join(Category, Category.id == Product.parent_category_id).where(Category.slug == parent_slug)

    if thematic_category_id is not None:
        q = q.join(Design, Design.id == Product.design_id).where(
            Design.thematic_category_id == thematic_category_id
        )
    elif thematic_slug:
        q = q.join(Design, Design.id == Product.design_id).join(
            Category, Category.id == Design.thematic_category_id
        ).where(Category.slug == thematic_slug)

    q = q.order_by(Product.id.desc()).limit(limit).offset(offset)
    return list(db.scalars(q).unique().all())


def get_product_by_slug(db: Session, slug: str) -> Product | None:
    """جزئیات محصول منتشرشده با دارایی‌های طرح و تنوع‌ها."""
    slug = normalize_slug_param(slug)
    return db.scalar(
        select(Product)
        .options(
            joinedload(Product.images),
            joinedload(Product.design).joinedload(Design.assets),
            joinedload(Product.design).joinedload(Design.thematic_category),
            joinedload(Product.variations),
            joinedload(Product.parent_category),
            joinedload(Product.design).joinedload(Design.creator),
        )
        .where(Product.slug == slug, Product.status == "published")
    )


def product_breadcrumbs(db: Session, product: Product) -> list[dict]:
    """مسیر موضوعی + نام محصول"""
    crumbs: list[dict] = []
    if product.design and product.design.thematic_category_id:
        cat = db.get(Category, product.design.thematic_category_id)
        if cat:
            crumbs = category_breadcrumbs(db, cat)
    crumbs.append({"name_fa": product.title, "slug": product.slug, "path": f"product/{product.slug}"})
    return crumbs


def creator_public(user, db: Session | None = None) -> dict | None:
    from app.services.studio import creator_public as studio_creator_public

    return studio_creator_public(user, db)


def list_published_products_by_creator(db: Session, creator_id: int) -> list[Product]:
    """محصولات منتشرشدهٔ یک طراح — یک محصول نماینده به ازای هر طرح."""
    q = (
        select(Product)
        .join(Design, Product.design_id == Design.id)
        .options(
            joinedload(Product.images),
            joinedload(Product.design).joinedload(Design.assets),
            joinedload(Product.parent_category),
        )
        .where(
            Design.creator_id == creator_id,
            Product.status == "published",
        )
        .order_by(Product.design_id.desc(), Product.id.desc())
    )
    rows = list(db.scalars(q).unique().all())
    seen_designs: set[int] = set()
    out: list[Product] = []
    for p in rows:
        if p.design_id in seen_designs:
            continue
        seen_designs.add(p.design_id)
        out.append(p)
    return out


def related_from_design(db: Session, design_id: int, exclude_product_id: int) -> list[Product]:
    """محصولات دیگر با همان طرح — برای کراس‌سل و لینک‌سازی داخلی."""
    q = (
        select(Product)
        .where(
            Product.design_id == design_id,
            Product.id != exclude_product_id,
            Product.status == "published",
        )
        .order_by(Product.id.asc())
        .limit(12)
    )
    return list(db.scalars(q).all())


def primary_image_url(design: Design) -> str | None:
    if not design.assets:
        return None
    asset = sorted(design.assets, key=lambda a: (a.sort_order, a.id))[0]
    return public_url(asset.storage_key)


def asset_urls(design: Design) -> list[str]:
    assets = sorted(design.assets, key=lambda a: (a.sort_order, a.id))
    return [public_url(a.storage_key) for a in assets]


def effective_price(base: Decimal, delta: Decimal) -> Decimal:
    """قیمت خط فروش = قیمت پایه محصول + دلتا تنوع."""
    return base + delta


def get_or_create_session_cart(db: Session, session_id: str) -> Cart:
    """سبد مهمان؛ در اولین بار INSERT می‌کند."""
    cart = db.scalar(select(Cart).where(Cart.session_id == session_id))
    if cart:
        return cart
    cart = Cart(session_id=session_id, user_id=None)
    db.add(cart)
    db.commit()
    db.refresh(cart)
    return cart


def cart_with_items(db: Session, cart_id: int) -> Cart | None:
    """سبد با پیش‌بارگذاری آیتم‌ها، variation و product برای محاسبه قیمت و تصویر."""
    return db.scalar(
        select(Cart)
        .options(
            joinedload(Cart.items)
            .joinedload(CartItem.variation)
            .joinedload(ProductVariation.product)
            .joinedload(Product.images),
            joinedload(Cart.items)
            .joinedload(CartItem.variation)
            .joinedload(ProductVariation.product)
            .joinedload(Product.design)
            .joinedload(Design.assets),
        )
        .where(Cart.id == cart_id)
    )


def update_cart_line(db: Session, cart: Cart, item_id: int, quantity: int) -> None:
    item = db.scalar(select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id))
    if item is None:
        raise ValueError("item_not_found")
    if quantity <= 0:
        db.delete(item)
    else:
        item.quantity = quantity
    db.commit()


def remove_cart_line(db: Session, cart: Cart, item_id: int) -> None:
    item = db.scalar(select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id))
    if item is None:
        raise ValueError("item_not_found")
    db.delete(item)
    db.commit()


def add_cart_line(
    db: Session, cart: Cart, variation_id: int, quantity: int, customization: dict | None = None
) -> CartItem:
    """
    افزودن یا تجمیع تعداد همان variation در سبد.
    خطاهای دامنه به صورت ValueError با رشته ثابت به اندپوینت می‌رسند.
    """
    from app.services.customizer import add_custom_cart_line, customization_key

    if customization:
        return add_custom_cart_line(db, cart, variation_id, quantity, customization)

    key = customization_key(None)
    variation = db.scalar(
        select(ProductVariation).options(joinedload(ProductVariation.product)).where(ProductVariation.id == variation_id)
    )
    if variation is None or not variation.is_active:
        raise ValueError("invalid_variation")
    product = variation.product
    if product.status != "published":
        raise ValueError("product_not_published")

    existing = db.scalar(
        select(CartItem).where(
            CartItem.cart_id == cart.id,
            CartItem.variation_id == variation_id,
            CartItem.customization_key == key,
        )
    )
    if existing:
        existing.quantity = existing.quantity + quantity
        db.commit()
        db.refresh(existing)
        return existing

    item = CartItem(
        cart_id=cart.id,
        variation_id=variation_id,
        quantity=quantity,
        customization_key=key,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def cart_lines_out(cart: Cart) -> list[dict]:
    """تبدیل آیتم‌های بارگذاری‌شدهٔ سبد به dict برای Pydantic/JSON."""
    from app.services.customizer import cart_line_dict

    return [cart_line_dict(item) for item in cart.items]


def size_guide_public(raw: dict | None) -> dict | None:
    """راهنمای سایز فعال را برای API عمومی آماده می‌کند."""
    if not raw or not raw.get("enabled"):
        return None
    image_key = raw.get("image_key")
    return {
        "enabled": True,
        "title": raw.get("title") or "راهنمای سایز",
        "intro": raw.get("intro") or "",
        "image_key": image_key,
        "image_url": public_url(image_key) if image_key else None,
        "columns": raw.get("columns") or [],
        "rows": raw.get("rows") or [],
        "notes": raw.get("notes") or [],
    }
