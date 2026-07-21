"""
افزودن/به‌روزرسانی محصولات نمونهٔ واقع‌گرایانه — بدون پاک کردن دادهٔ موجود.

استفاده:
  python scripts/seed_demo_products.py
"""

from __future__ import annotations

import struct
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

import app.models  # noqa: F401
from app.db.session import SessionLocal
from app.models import Category, Design, Product, ProductImage, ProductVariation
from app.services.product_admin import ensure_default_variation
from app.services.storage import save_upload_secure

# محصولات الهام‌گرفته از بازار لوازم خانگی — نام/قیمت تقریبی، بدون کپی محتوای دیجی‌کالا
DEMO_PRODUCTS = [
    {
        "code": "SB-DEMO-RF-10",
        "slug": "snowa-snf-2040-refrigerator",
        "title": "یخچال فریزر اسنوا SNF-2040",
        "category_slug": "refrigerator",
        "price": 19_800_000,
        "compare": 22_500_000,
        "description": "یخچال ۲۰ فوت کم‌مصرف با فضای مناسب خانواده و قفسه‌های شیشه‌ای مقاوم.",
        "simple": True,
        "stock": 15,
        "color": (45, 55, 70),
    },
    {
        "code": "SB-DEMO-WM-10",
        "slug": "pakshoma-7kg-washing-machine",
        "title": "ماشین لباسشویی پاکشوما 7 کیلو",
        "category_slug": "washing-machine",
        "price": 14_900_000,
        "compare": 16_800_000,
        "description": "ماشین لباسشویی ۷ کیلویی با ۱۲ برنامه و موتور کم‌صدا — مناسب آپارتمان.",
        "simple": True,
        "stock": 22,
        "color": (230, 230, 235),
    },
    {
        "code": "SB-DEMO-VC-10",
        "slug": "eureka-bagless-vacuum",
        "title": "جاروبرقی بدون کیسه یورکا",
        "category_slug": "vacuum",
        "price": 4_750_000,
        "compare": 5_400_000,
        "description": "جاروبرقی خانگی با فیلتر چندلایه و لوله تلسکوپی — قدرت مکش بالا.",
        "simple": False,
        "colors": [("مشکی", "#1a1a1a"), ("قرمز", "#c0392b")],
        "color": (40, 40, 45),
    },
    {
        "code": "SB-DEMO-MW-10",
        "slug": "kenwood-microwave-20l",
        "title": "مایکروویو کنوود 20 لیتری",
        "category_slug": "microwave",
        "price": 3_450_000,
        "compare": 3_900_000,
        "description": "مایکروویو ۲۰ لیتری ۷۰۰ وات با منوی فارسی و قفل کودک.",
        "simple": True,
        "stock": 30,
        "color": (35, 35, 40),
    },
    {
        "code": "SB-DEMO-TV-10",
        "slug": "xvision-43-smart-tv",
        "title": "تلویزیون هوشمند ایکس‌ویژن 43 اینچ",
        "category_slug": "tv",
        "price": 12_900_000,
        "compare": 14_500_000,
        "description": "تلویزیون ۴۳ اینچ Full HD هوشمند با ورودی HDMI و USB.",
        "simple": True,
        "stock": 18,
        "color": (20, 20, 25),
    },
    {
        "code": "SB-DEMO-BL-10",
        "slug": "bosch-msm-hand-blender",
        "title": "گوشت‌کوب برقی بوش MSM",
        "category_slug": "blender",
        "price": 2_850_000,
        "compare": 3_200_000,
        "description": "گوشت‌کوب چندکاره با تیغه استیل و پایه ضدلغزش.",
        "simple": False,
        "colors": [("سفید", "#f5f5f5"), ("مشکی", "#1a1a1a")],
        "color": (245, 245, 248),
    },
    {
        "code": "SB-DEMO-AC-10",
        "slug": "hisense-inverter-12000",
        "title": "کولر گازی اینورتر هایسنس 12000",
        "category_slug": "air-conditioner",
        "price": 16_500_000,
        "compare": 18_200_000,
        "description": "اسپلیت ۱۲ هزار با گاز R32، ریموت و حالت شب.",
        "simple": True,
        "stock": 12,
        "color": (248, 248, 250),
    },
    {
        "code": "SB-DEMO-KT-10",
        "slug": "pars-khazar-electric-kettle",
        "title": "کتری برقی پارس‌خزر 1.8 لیتری",
        "category_slug": "daily-essentials",
        "price": 890_000,
        "compare": 1_050_000,
        "description": "کتری استیل ۱.۸ لیتر با نشانگر آب و خاموشی خودکار.",
        "simple": True,
        "stock": 40,
        "color": (170, 170, 175),
    },
]


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def make_placeholder_png(rgb: tuple[int, int, int], size: int = 48) -> bytes:
    """PNG ساده رنگی برای گالری محصول نمونه."""
    r, g, b = rgb
    raw = b""
    row = b"\x00" + bytes([r, g, b]) * size
    for _ in range(size):
        raw += row
    return (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
        + _png_chunk(b"IDAT", zlib.compress(raw, 9))
        + _png_chunk(b"IEND", b"")
    )


def _category_map(db: Session) -> dict[str, Category]:
    rows = db.scalars(select(Category)).all()
    return {c.slug: c for c in rows}


def _ensure_product_image(db: Session, product: Product, rgb: tuple[int, int, int]) -> None:
    existing = db.scalar(select(ProductImage).where(ProductImage.product_id == product.id).limit(1))
    if existing is not None:
        return
    png = make_placeholder_png(rgb)
    key = save_upload_secure(png, f"products/{product.id}", f"demo-{product.id}.png")
    db.add(
        ProductImage(
            product_id=product.id,
            storage_key=key,
            mime_type="image/png",
            alt_text=product.title,
            sort_order=1,
        )
    )


def upsert_demo_products(db: Session) -> tuple[int, int]:
    cats = _category_map(db)
    if not cats:
        raise RuntimeError("هیچ دسته‌ای نیست — ابتدا seed اصلی را اجرا کنید")

    created = 0
    updated = 0
    for item in DEMO_PRODUCTS:
        cat = cats.get(item["category_slug"])
        if cat is None:
            print(f"  ⚠ دسته {item['category_slug']} نیست — رد شد: {item['slug']}")
            continue

        root = cat
        id_to_cat = {c.id: c for c in cats.values()}
        while root.parent_id and root.parent_id in id_to_cat:
            root = id_to_cat[root.parent_id]

        p = db.scalar(
            select(Product)
            .where(Product.slug == item["slug"])
            .options(joinedload(Product.variations), joinedload(Product.images))
        )
        if p is None:
            d = Design(
                code=item["code"],
                title=item["title"],
                slug=f"{item['slug']}-d",
                thematic_category_id=cat.id,
                description=item["description"],
                status="published",
                source_type="admin",
            )
            db.add(d)
            db.flush()
            p = Product(
                design_id=d.id,
                parent_category_id=root.id,
                slug=item["slug"],
                title=item["title"],
                description=item["description"],
                base_price=item["price"],
                compare_at_price=item["compare"],
                status="published",
                meta_title=f"{item['title']} | SelectBox",
                meta_description=item["description"],
            )
            db.add(p)
            db.flush()
            created += 1
        else:
            p.title = item["title"]
            p.description = item["description"]
            p.base_price = item["price"]
            p.compare_at_price = item["compare"]
            p.status = "published"
            p.meta_title = f"{item['title']} | SelectBox"
            p.meta_description = item["description"]
            updated += 1

        db.refresh(p, attribute_names=["variations", "images"])

        if item.get("simple"):
            if not p.variations:
                ensure_default_variation(db, p, stock_quantity=int(item.get("stock", 10)))
            elif len(p.variations) == 1:
                ensure_default_variation(db, p, stock_quantity=int(item.get("stock", 10)))
        else:
            if not p.variations:
                prefix = item["code"].replace("-", "")
                for color_name, color_hex in item.get("colors") or [("مشکی", "#1a1a1a")]:
                    db.add(
                        ProductVariation(
                            product_id=p.id,
                            sku=f"{prefix}-{color_name[:2].upper()}-{p.id}",
                            color_name=color_name,
                            color_hex=color_hex,
                            size_label=None,
                            price_delta=0,
                            stock_quantity=20,
                            is_active=True,
                        )
                    )
                db.flush()

        _ensure_product_image(db, p, tuple(item.get("color", (80, 80, 90))))  # type: ignore[arg-type]

    db.commit()
    return created, updated


def main() -> None:
    db = SessionLocal()
    try:
        created, updated = upsert_demo_products(db)
        print(f"✅ Demo products — created={created} updated={updated}")
        print("  نمونه‌ها با تصویر placeholder محلی و بدون پاک کردن دادهٔ قبلی")
    finally:
        db.close()


if __name__ == "__main__":
    main()
