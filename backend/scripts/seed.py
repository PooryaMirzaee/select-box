"""
پر کردن پایگاه — دسته‌بندی سلسله‌مراتبی + ادمین + تنظیمات.
قیمت‌ها به تومان. تصاویر طرح فقط دستی از پنل آپلود می‌شوند.
برای دیتابیس تازه: rm backend/coralay_local.db && python scripts/seed.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import Category, Coupon, Design, Product, ProductVariation, User, UserRole
from app.models.customizer import ProductTemplate
from app.models.site_setting import SiteSetting
from app.services.settings import DEFAULTS

import app.models  # noqa: F401

TSHIRT_SIDES = [
    {
        "id": "front",
        "label_fa": "جلو",
        "sort_order": 0,
        "print_area": {"x": 0.18, "y": 0.14, "width": 0.64, "height": 0.52},
    },
    {
        "id": "back",
        "label_fa": "پشت",
        "sort_order": 1,
        "print_area": {"x": 0.18, "y": 0.14, "width": 0.64, "height": 0.52},
    },
]

TSHIRT_CONFIG = {
    "preview": "mockup",
    "engine": "fabric-kuaitu",
    "sides": TSHIRT_SIDES,
    "colors": [
        {"name": "مشکی", "hex": "#1a1a20"},
        {"name": "سفید", "hex": "#f5f5f5", "views": {
            "front": "/mockups/tshirt/front.jpg",
            "back": "/mockups/tshirt/back.jpg",
        }},
        {"name": "سرمه‌ای", "hex": "#1e3a5f"},
    ],
    "sizes": ["S", "M", "L", "XL"],
    "fonts": [
        {"name": "Helvetica", "family": "Helvetica Neue, Helvetica, Arial, sans-serif"},
        {"name": "Georgia", "family": "Georgia, serif"},
    ],
    "print_area": {"width": 280, "height": 350},
    "mockup": {
        "views": {
            "front": "/mockups/tshirt/front.jpg",
            "back": "/mockups/tshirt/back.jpg",
        },
        "layers": {
            "base": "/mockups/tshirt/front.jpg",
            "mask": "/mockups/tshirt/mask.svg",
        },
        "designArea": {
            "tl": [430, 420],
            "tr": [770, 410],
            "br": [790, 780],
            "bl": [410, 790],
        },
    },
}

MUG_SIDES = [
    {
        "id": "front",
        "label_fa": "روی ماگ",
        "sort_order": 0,
        "print_area": {"x": 0.22, "y": 0.28, "width": 0.56, "height": 0.44},
    },
]

MUG_CONFIG = {
    "preview": "fabric",
    "engine": "fabric-kuaitu",
    "sides": MUG_SIDES,
    "capacity_oz": 11,
    "capacity_ml": 325,
    "dimensions_mm": {"height": 95, "top_diameter": 82, "bottom_diameter": 57},
    "colors": [
        {"name": "سفید", "hex": "#f5f5f5"},
        {"name": "مشکی", "hex": "#1a1a20"},
    ],
    "sizes": [],
    "print_area": {"width": 200, "height": 100},
    "mockup": {
        "layers": {
            "base": "/mockups/mug/base.jpg",
            "mask": "/mockups/mug/mask.svg",
        },
        "designArea": {
            "tl": [420, 380],
            "tr": [780, 360],
            "br": [790, 720],
            "bl": [430, 740],
        },
    },
}


def seed_customizer(db) -> None:
    """قالب‌ها و محصولات پایهٔ سفارشی — idempotent."""
    if db.scalar(select(ProductTemplate).limit(1)):
        return

    cat_tshirt = db.scalar(select(Category).where(Category.slug == "tshirt", Category.parent_id.is_(None)))
    cat_mug = db.scalar(select(Category).where(Category.slug == "mug", Category.parent_id.is_(None)))
    if cat_tshirt is None or cat_mug is None:
        return

    cat_custom = db.scalar(select(Category).where(Category.slug == "custom-designs"))
    if cat_custom is None:
        cat_custom = Category(
            parent_id=None,
            slug="custom-designs",
            name_fa="طرح‌های سفارشی",
            sort_order=5,
        )
        db.add(cat_custom)
        db.flush()

    design = db.scalar(select(Design).where(Design.code == "CUSTOM-BASE"))
    if design is None:
        design = Design(
            code="CUSTOM-BASE",
            title="سفارشی",
            slug="custom-base",
            thematic_category_id=cat_custom.id,
            description="پایهٔ سفارش محصولات شخصی‌سازی‌شده",
            status="published",
            source_type="admin",
        )
        db.add(design)
        db.flush()

    products: dict[str, Product] = {}
    for pcat, slug_suffix, title, price in [
        (cat_tshirt, "custom-tshirt", "تیشرت سفارشی", 45900),
        (cat_mug, "custom-mug", "ماگ سفارشی", 32900),
    ]:
        existing = db.scalar(select(Product).where(Product.slug == slug_suffix))
        if existing:
            products[pcat.slug] = existing
            continue
        p = Product(
            design_id=design.id,
            parent_category_id=pcat.id,
            slug=slug_suffix,
            title=title,
            base_price=price,
            status="published",
            meta_title=f"{title} | CORALAY",
            meta_description=f"سفارش {title} با طرح دلخواه",
        )
        db.add(p)
        db.flush()
        products[pcat.slug] = p
        if pcat.slug == "mug":
            db.add(
                ProductVariation(
                    product_id=p.id,
                    sku="CUST-MUG-WHT",
                    color_name="سفید",
                    color_hex="#f5f5f5",
                    size_label=None,
                    price_delta=0,
                    stock_quantity=100,
                )
            )
            db.add(
                ProductVariation(
                    product_id=p.id,
                    sku="CUST-MUG-BLK",
                    color_name="مشکی",
                    color_hex="#1a1a20",
                    size_label=None,
                    price_delta=2000,
                    stock_quantity=100,
                )
            )
        else:
            for color_name, color_hex in [("مشکی", "#1a1a20"), ("سفید", "#f5f5f5")]:
                for sz in ["S", "M", "L", "XL"]:
                    db.add(
                        ProductVariation(
                            product_id=p.id,
                            sku=f"CUST-T-{color_name[:1]}-{sz}",
                            color_name=color_name,
                            color_hex=color_hex,
                            size_label=sz,
                            price_delta=1500 if sz == "XL" else (1000 if color_name == "سفید" else 0),
                            stock_quantity=100,
                        )
                    )

    db.add(
        ProductTemplate(
            slug="tshirt",
            name_fa="تیشرت",
            description="تیشرت با طرح دلخواه شما",
            category_id=cat_tshirt.id,
            base_product_id=products["tshirt"].id,
            base_price=45900,
            config_json=TSHIRT_CONFIG,
            sort_order=10,
        )
    )
    db.add(
        ProductTemplate(
            slug="mug",
            name_fa="ماگ",
            description="ماگ سرامیکی 11oz (325ml) — ابعاد استاندارد چاپ",
            category_id=cat_mug.id,
            base_product_id=products["mug"].id,
            base_price=32900,
            config_json=MUG_CONFIG,
            sort_order=20,
        )
    )
    db.commit()
    print("  Customizer templates seeded")


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.scalar(select(Category).limit(1)):
            print("Database already seeded — برای دادهٔ جدید coralay_local.db را حذف کنید.")
            return

        for key, value in DEFAULTS.items():
            db.add(SiteSetting(key=key, value=value))

        cat_tshirt = Category(parent_id=None, slug="tshirt", name_fa="تیشرت", sort_order=10)
        cat_hoodie = Category(parent_id=None, slug="hoodie", name_fa="هودی", sort_order=15)
        cat_mug = Category(parent_id=None, slug="mug", name_fa="ماگ", sort_order=12)
        db.add_all([cat_tshirt, cat_hoodie, cat_mug])
        db.flush()

        cat_cinema = Category(
            parent_id=None,
            slug="cinema",
            name_fa="سینما",
            meta_title="تیشرت و هودی سینمایی | CORALAY",
            sort_order=20,
        )
        db.add(cat_cinema)
        db.flush()
        cat_film = Category(
            parent_id=cat_cinema.id,
            slug="film-series",
            name_fa="فیلم و سریال",
            sort_order=10,
        )
        cat_gaming_root = Category(parent_id=None, slug="gaming", name_fa="گیمینگ", sort_order=30)
        db.add_all([cat_film, cat_gaming_root])
        db.flush()
        cat_bb = Category(
            parent_id=cat_film.id,
            slug="breaking-bad",
            name_fa="بریکینگ بد",
            meta_description="تیشرت و هودی طرح بریکینگ بد",
            sort_order=10,
        )
        cat_pixel = Category(parent_id=cat_gaming_root.id, slug="pixel", name_fa="پیکسل", sort_order=10)
        db.add_all([cat_bb, cat_pixel])
        db.flush()

        db.add(
            User(
                phone="09120000000",
                full_name="مدیر CORALAY",
                role=UserRole.admin,
                password_hash=hash_password("admin123"),
            )
        )
        db.add(
            Coupon(
                code="AVAN10",
                discount_type="percent",
                discount_value=10,
                min_cart_total=20000,
                is_active=True,
            )
        )

        designs_cfg = [
            ("BB-001", "بریکینگ بد — لوگو", "breaking-bad-logo", cat_bb.id),
            ("GM-001", "Pixel Quest", "pixel-quest", cat_pixel.id),
        ]

        for code, title, slug, thematic_id in designs_cfg:
            d = Design(
                code=code,
                title=title,
                slug=slug,
                thematic_category_id=thematic_id,
                description=title,
                status="published",
            )
            db.add(d)
            db.flush()
            for pcat, pslug_suffix, ptitle_prefix, price in [
                (cat_tshirt, "tshirt", "تیشرت", 38900),
                (cat_hoodie, "hoodie", "هودی", 62900),
            ]:
                p = Product(
                    design_id=d.id,
                    parent_category_id=pcat.id,
                    slug=f"{slug}-{pslug_suffix}",
                    title=f"{ptitle_prefix} {title}",
                    base_price=price,
                    compare_at_price=price + 6000,
                    status="published",
                    meta_title=f"{ptitle_prefix} {title} | CORALAY",
                    meta_description=f"خرید {ptitle_prefix} طرح {title}",
                )
                db.add(p)
                db.flush()
                prefix = code.split("-")[0]
                for sz in ["S", "M", "L", "XL"]:
                    db.add(
                        ProductVariation(
                            product_id=p.id,
                            sku=f"{prefix}-{pcat.slug[:1].upper()}-BLK-{sz}",
                            color_name="مشکی",
                            color_hex="#1a1a20",
                            size_label=sz,
                            price_delta=1500 if sz == "XL" else 0,
                            stock_quantity=20,
                        )
                    )

        db.commit()
        seed_customizer(db)
        print("Seed OK (قیمت‌ها تومان — تصویر طرح از پنل آپلود شود)")
        print("  ادمین: 09120000000 / admin123")
        print("  مرور: /browse/cinema/film-series/breaking-bad")
        print("  سفارشی‌سازی: /customize")
    finally:
        db.close()


def run_customizer_only() -> None:
    """فقط دادهٔ سفارشی‌سازی — برای دیتابیس موجود."""
    from app.main import _ensure_customizer_columns

    Base.metadata.create_all(bind=engine)
    _ensure_customizer_columns()
    db = SessionLocal()
    try:
        if db.scalar(select(Category).where(Category.slug == "mug").limit(1)) is None:
            cat_mug = Category(parent_id=None, slug="mug", name_fa="ماگ", sort_order=12)
            db.add(cat_mug)
            db.commit()
        seed_customizer(db)
        print("Customizer seed OK")
    finally:
        db.close()


if __name__ == "__main__":
    import sys as _sys

    if len(_sys.argv) > 1 and _sys.argv[1] == "customizer":
        run_customizer_only()
    elif len(_sys.argv) > 1 and _sys.argv[1] == "reset-admin":
        from sqlalchemy import select

        from app.core.security import hash_password
        from app.models import User, UserRole

        db = SessionLocal()
        try:
            user = db.scalar(select(User).where(User.phone == "09120000000"))
            if user is None:
                user = User(
                    phone="09120000000",
                    full_name="ادمین",
                    role=UserRole.admin,
                    password_hash=hash_password("admin123"),
                )
                db.add(user)
            else:
                user.password_hash = hash_password("admin123")
                user.role = UserRole.admin
                user.is_active = True
            db.commit()
            print("رمز ادمین بازنشانی شد: 09120000000 / admin123")
        finally:
            db.close()
    else:
        run()
