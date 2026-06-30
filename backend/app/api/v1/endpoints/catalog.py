"""
اندپوینت‌های عمومی کاتالوگ — دسته، لیست محصول، جزئیات + محصولات مرتبط هم‌طرح.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Product
from app.schemas.catalog import CreatorPublic, ProductDetail, ProductSummary, RelatedProduct, VariationPublic
from app.schemas.settings import ShopSettingsPublic
from app.schemas.header_nav import HeaderNavLinkOut
from app.schemas.home_banner import HomeBannerOut
from app.schemas.homepage import HomepagePublic
from app.services import catalog as catalog_service
from app.services import header_nav as header_nav_service
from app.services import home_banner as home_banner_service
from app.services import homepage as homepage_service
from app.services import settings as shop_settings

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/shop", response_model=ShopSettingsPublic)
def get_shop_settings(db: Session = Depends(get_db)):
    return ShopSettingsPublic.model_validate(shop_settings.public_shop_settings(db))


@router.get("/categories/tree")
def categories_tree(db: Session = Depends(get_db)):
    return catalog_service.category_tree(db)


@router.get("/categories/nav")
def categories_nav(db: Session = Depends(get_db)):
    """درخت دسته برای مگامenu هدر — فعال، با تصویر و مسیر browse."""
    return catalog_service.category_navigation_tree(db)


@router.get("/header-nav", response_model=list[HeaderNavLinkOut])
def header_nav(db: Session = Depends(get_db)):
    """لینک‌های فعال ناوبری هدر — مرتب‌شده برای فروشگاه."""
    return header_nav_service.list_links(db, active_only=True)


@router.get("/home-banners", response_model=list[HomeBannerOut])
def home_banners(placement: str | None = None, db: Session = Depends(get_db)):
    """بنرهای فعال صفحهٔ اول — اختیاری فیلتر hero یا promo."""
    return home_banner_service.list_public(db, placement=placement)


@router.get("/homepage", response_model=HomepagePublic)
def homepage_config(db: Session = Depends(get_db)):
    """تنظیمات عمومی صفحهٔ اصلی."""
    return homepage_service.get_public(db)


@router.get("/sitemap-paths")
def sitemap_paths(db: Session = Depends(get_db)):
    """مسیرهای browse فعال برای sitemap.xml"""
    return {"paths": catalog_service.all_category_browse_paths(db)}


@router.get("/browse")
def browse(
    path: str = "",
    product_type: str | None = None,
    db: Session = Depends(get_db),
):
    """مرور سلسله‌مراتبی — path با / جدا شده، مثلاً cinema/film-series/breaking-bad"""
    slugs = [s for s in path.split("/") if s]
    return catalog_service.browse_context(db, slugs, product_type)


@router.get("/products")
def list_products(
    parent_slug: str | None = None,
    thematic_slug: str | None = None,
    limit: int = 24,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    items = catalog_service.list_products(
        db,
        parent_slug=parent_slug,
        thematic_slug=thematic_slug,
        limit=min(limit, 100),
        offset=max(offset, 0),
    )
    return [
        ProductSummary(
            id=p.id,
            slug=p.slug,
            title=p.title,
            base_price=str(p.base_price),
            status=p.status,
            design_id=p.design_id,
            parent_category_slug=p.parent_category.slug if p.parent_category else None,
            image_url=catalog_service.primary_product_image_url(p),
        )
        for p in items
    ]


@router.get("/product-slugs")
def product_slugs(db: Session = Depends(get_db)):
    """همهٔ اسلاگ‌های محصول منتشرشده — برای sitemap و فیدها."""
    rows = db.scalars(
        select(Product.slug)
        .where(Product.status == "published")
        .order_by(Product.id.desc())
    ).all()
    return {"slugs": list(rows)}


@router.get("/products/{slug}", response_model=ProductDetail)
def product_detail(slug: str, db: Session = Depends(get_db)):
    p = catalog_service.get_product_by_slug(db, slug)
    if p is None:
        raise HTTPException(status_code=404, detail="Product not found")

    variations = [v for v in p.variations if v.is_active]
    default_v = variations[0] if variations else None
    default_sku = default_v.sku if default_v else None
    in_stock = any(v.stock_quantity > 0 for v in variations)
    eff = (
        catalog_service.effective_price(p.base_price, default_v.price_delta)
        if default_v
        else p.base_price
    )

    image_urls = catalog_service.product_image_urls(p)
    product_imgs = catalog_service._sorted_product_images(p)
    if product_imgs:
        images = [i.storage_key for i in product_imgs]
    else:
        assets = sorted(p.design.assets, key=lambda a: (a.sort_order, a.id))
        images = [a.storage_key for a in assets]

    var_public = [
        VariationPublic(
            id=v.id,
            sku=v.sku,
            color_name=v.color_name,
            color_hex=v.color_hex,
            size_label=v.size_label,
            price_delta=str(v.price_delta),
            stock_quantity=v.stock_quantity,
            unit_price=str(catalog_service.effective_price(p.base_price, v.price_delta)),
        )
        for v in variations
    ]

    related_rows = catalog_service.related_from_design(db, p.design_id, p.id)
    related = [
        RelatedProduct(id=r.id, slug=r.slug, title=r.title, base_price=str(r.base_price))
        for r in related_rows
    ]

    breadcrumbs = catalog_service.product_breadcrumbs(db, p)

    creator_data = catalog_service.creator_public(p.design.creator if p.design else None, db)
    creator_row = CreatorPublic.model_validate(creator_data) if creator_data else None

    return ProductDetail(
        id=p.id,
        slug=p.slug,
        title=p.title,
        base_price=str(p.base_price),
        compare_at_price=str(p.compare_at_price) if p.compare_at_price is not None else None,
        status=p.status,
        meta_title=p.meta_title,
        meta_description=p.meta_description,
        description=p.description,
        size_guide=catalog_service.size_guide_public(p.size_guide_json),
        design_id=p.design_id,
        design_slug=p.design.slug,
        design_title=p.design.title,
        default_sku=default_sku,
        in_stock=in_stock,
        effective_price=str(eff),
        images=images,
        image_urls=image_urls,
        variations=var_public,
        related=related,
        breadcrumbs=breadcrumbs,
        creator=creator_row,
    )


@router.get("/studios")
def list_studios(db: Session = Depends(get_db)):
    from app.services import studio as studio_service
    from app.schemas.studio import StudioPublic

    rows = studio_service.list_featured_studios(db)
    return {"studios": [StudioPublic.model_validate(r) for r in rows]}


@router.get("/studios/{slug}")
def studio_profile(slug: str, db: Session = Depends(get_db)):
    from app.schemas.studio import StudioPublic
    from app.services import studio as studio_service

    user = studio_service.resolve_studio_user(db, slug)
    if user is None:
        raise HTTPException(status_code=404, detail="استودیو پیدا نشد")
    items = catalog_service.list_published_products_by_creator(db, user.id)
    profile = studio_service.studio_public_dict(user, db)
    return {
        "studio": StudioPublic.model_validate(profile),
        "products": [catalog_service._product_summary_dict(p) for p in items],
    }


@router.get("/creators/{creator_id}")
def creator_profile(creator_id: int, db: Session = Depends(get_db)):
    """سازگاری — همان پاسخ استودیو با شناسهٔ عددی."""
    from app.services import studio as studio_service

    user = studio_service.resolve_studio_user(db, str(creator_id))
    if user is None:
        raise HTTPException(status_code=404, detail="استودیو پیدا نشد")
    items = catalog_service.list_published_products_by_creator(db, user.id)
    profile = studio_service.studio_public_dict(user, db)
    from app.schemas.studio import StudioPublic

    return {
        "studio": StudioPublic.model_validate(profile),
        "creator": profile,
        "products": [catalog_service._product_summary_dict(p) for p in items],
    }
