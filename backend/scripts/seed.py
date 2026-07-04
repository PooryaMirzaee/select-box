"""
پر کردن پایگاه — دسته‌بندی لوازم خانگی + ادمین + تنظیمات.
قیمت‌ها به تومان. برای دیتابیس تازه: rm backend/selectbox_local.db && python scripts/seed.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import Category, Coupon, Design, Product, ProductVariation, User, UserRole
from app.models.site_setting import SiteSetting
from app.services.settings import DEFAULTS
from app.services import settings as shop_settings

import app.models  # noqa: F401

PRODUCTS = [
    {
        "code": "SB-RF-001",
        "slug": "samsung-rt28-refrigerator",
        "title": "یخچال فریزر سامسونگ RT28",
        "category_slug": "refrigerator",
        "price": 28_500_000,
        "compare": 31_000_000,
        "colors": [("نقره‌ای", "#c0c0c0"), ("سفید", "#f5f5f5")],
    },
    {
        "code": "SB-WM-001",
        "slug": "lg-f4v5ryp2w-washing-machine",
        "title": "ماشین لباسشویی ال‌جی 8 کیلو",
        "category_slug": "washing-machine",
        "price": 22_800_000,
        "compare": 24_500_000,
        "colors": [("سفید", "#f5f5f5"), ("نقره‌ای", "#b8b8b8")],
    },
    {
        "code": "SB-DW-001",
        "slug": "bosch-serie4-dishwasher",
        "title": "ماشین ظرفشویی بوش سری 4",
        "category_slug": "dishwasher",
        "price": 18_900_000,
        "compare": 20_500_000,
        "colors": [("استیل", "#a8a8a8")],
    },
    {
        "code": "SB-VC-001",
        "slug": "dyson-v12-vacuum",
        "title": "جاروبرقی بی‌سیم دایسون V12",
        "category_slug": "vacuum",
        "price": 32_500_000,
        "compare": 35_000_000,
        "colors": [("طلایی", "#c9a227"), ("نقره‌ای", "#c0c0c0")],
    },
    {
        "code": "SB-AC-001",
        "slug": "gree-inverter-ac-18000",
        "title": "کولر گازی اینورتر گری 18000",
        "category_slug": "air-conditioner",
        "price": 19_500_000,
        "compare": 21_000_000,
        "colors": [("سفید", "#ffffff")],
    },
    {
        "code": "SB-MW-001",
        "slug": "panasonic-microwave-25l",
        "title": "مایکروویو پاناسونیک 25 لیتری",
        "category_slug": "microwave",
        "price": 5_200_000,
        "compare": 5_800_000,
        "colors": [("سفید", "#f5f5f5"), ("مشکی", "#1a1a1a")],
    },
    {
        "code": "SB-TV-001",
        "slug": "samsung-crystal-uhd-55",
        "title": "تلویزیون سامسونگ Crystal UHD 55 اینچ",
        "category_slug": "tv",
        "price": 24_900_000,
        "compare": 27_500_000,
        "colors": [("مشکی", "#1a1a1a")],
    },
    {
        "code": "SB-LS-001",
        "slug": "philips-hair-dryer-2200w",
        "title": "سشوار فیلیپس 2200 وات",
        "category_slug": "personal-care",
        "price": 1_850_000,
        "compare": 2_100_000,
        "colors": [("مشکی", "#1a1a1a"), ("صورتی", "#e8a0b8")],
    },
    {
        "code": "SB-DL-001",
        "slug": "tefal-electric-kettle",
        "title": "کتری برقی تفال 1.7 لیتری",
        "category_slug": "daily-essentials",
        "price": 980_000,
        "compare": 1_150_000,
        "colors": [("استیل", "#a8a8a8"), ("مشکی", "#1a1a1a")],
    },
    {
        "code": "SB-RV-001",
        "slug": "xiaomi-robot-vacuum-s10",
        "title": "جارو رباتیک شیائومی S10",
        "category_slug": "robot-vacuum",
        "price": 12_500_000,
        "compare": 14_000_000,
        "colors": [("سفید", "#f5f5f5")],
    },
]

CATEGORIES = [
    ("kitchen", "لوازم آشپزخانه", None, 10),
    ("refrigerator", "یخچال و فریزر", "kitchen", 10),
    ("dishwasher", "ماشین ظرفشویی", "kitchen", 20),
    ("microwave", "مایکروویو", "kitchen", 30),
    ("laundry", "لوازم شستشو", None, 20),
    ("washing-machine", "ماشین لباسشویی", "laundry", 10),
    ("cleaning", "نظافت و بهداشت", None, 30),
    ("vacuum", "جاروبرقی", "cleaning", 10),
    ("robot-vacuum", "جارو رباتیک", "cleaning", 20),
    ("climate", "سرمایش و گرمایش", None, 40),
    ("air-conditioner", "کولر گازی", "climate", 10),
    ("entertainment", "صوتی و تصویری", None, 50),
    ("tv", "تلویزیون", "entertainment", 10),
    ("lifestyle", "سبک زندگی", None, 60),
    ("personal-care", "لوازم شخصی", "lifestyle", 10),
    ("daily", "لوازم روزمره", None, 70),
    ("daily-essentials", "وسایل روزانه", "daily", 10),
]


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.scalar(select(Category).limit(1)):
            print("Database already seeded — برای دادهٔ جدید selectbox_local.db را حذف کنید.")
            return

        defaults = dict(DEFAULTS)
        site_url = (
            os.environ.get("PUBLIC_API_URL")
            or os.environ.get("FRONTEND_URL")
            or os.environ.get("SITE_URL")
            or defaults["site_url"]
        )
        if site_url and "localhost" not in site_url and "127.0.0.1" not in site_url:
            from app.services.settings import normalize_site_url

            defaults["site_url"] = normalize_site_url(str(site_url))

        for key, value in defaults.items():
            if db.get(SiteSetting, key) is None:
                shop_settings.set_setting(db, key, value)
            elif key == "site_url":
                shop_settings.set_setting(db, key, value)

        slug_to_cat: dict[str, Category] = {}
        for slug, name_fa, parent_slug, sort_order in CATEGORIES:
            parent_id = slug_to_cat[parent_slug].id if parent_slug else None
            cat = Category(
                parent_id=parent_id,
                slug=slug,
                name_fa=name_fa,
                sort_order=sort_order,
                meta_title=f"{name_fa} | SelectBox",
            )
            db.add(cat)
            db.flush()
            slug_to_cat[slug] = cat

        admin = db.scalar(select(User).where(User.phone == "09120000000"))
        if admin is None:
            db.add(
                User(
                    phone="09120000000",
                    full_name="مدیر SelectBox",
                    role=UserRole.admin,
                    password_hash=hash_password("admin123"),
                )
            )
        else:
            admin.full_name = admin.full_name or "مدیر SelectBox"
            admin.role = UserRole.admin
            admin.password_hash = hash_password("admin123")
            admin.is_active = True

        if db.scalar(select(Coupon).where(Coupon.code == "SELECTBOX10").limit(1)) is None:
            db.add(
                Coupon(
                    code="SELECTBOX10",
                    discount_type="percent",
                    discount_value=10,
                    min_cart_total=500_000,
                    is_active=True,
                )
            )

        id_to_cat = {c.id: c for c in slug_to_cat.values()}

        for item in PRODUCTS:
            cat = slug_to_cat[item["category_slug"]]
            root = cat
            while root.parent_id:
                root = id_to_cat[root.parent_id]

            design_slug = item["slug"]
            d = Design(
                code=item["code"],
                title=item["title"],
                slug=design_slug,
                thematic_category_id=cat.id,
                description=item["title"],
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
                base_price=item["price"],
                compare_at_price=item["compare"],
                status="published",
                meta_title=f"{item['title']} | SelectBox",
                meta_description=f"خرید {item['title']} با گارانتی اصلی و ارسال سریع",
            )
            db.add(p)
            db.flush()

            prefix = item["code"].replace("-", "")
            for color_name, color_hex in item["colors"]:
                db.add(
                    ProductVariation(
                        product_id=p.id,
                        sku=f"{prefix}-{color_name[:2].upper()}",
                        color_name=color_name,
                        color_hex=color_hex,
                        size_label=None,
                        price_delta=0,
                        stock_quantity=15,
                    )
                )

        db.commit()
        print("Seed OK — فروشگاه لوازم خانگی SelectBox")
        print("  ادمین: 09120000000 / admin123")
        print("  کوپن: SELECTBOX10")
        print("  مرور: /browse/kitchen/refrigerator")
        print("  محصول نمونه: /product/samsung-rt28-refrigerator")
    finally:
        db.close()


if __name__ == "__main__":
    import sys as _sys

    if len(_sys.argv) > 1 and _sys.argv[1] == "reset-admin":
        db = SessionLocal()
        try:
            user = db.scalar(select(User).where(User.phone == "09120000000"))
            if user is None:
                user = User(
                    phone="09120000000",
                    full_name="مدیر SelectBox",
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
