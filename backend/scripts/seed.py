"""
پر کردن پایگاه — فروشگاه لوازم خانگی و سبک زندگی SelectBox.
قیمت‌ها به تومان.

استفاده:
  python scripts/seed.py          # فقط اگر DB خالی باشد
  python scripts/seed.py --force  # پاک کردن دادهٔ فروشگاه و seed مجدد
  python scripts/seed.py reset-admin
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import delete, select

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import Category, Coupon, Design, Product, ProductVariation, User, UserRole
from app.models.blog import BlogCategory, BlogPost, BlogPostStatus, BlogTag, blog_post_tags
from app.models.home_banner import HomeBanner
from app.models.site_setting import SiteSetting
from app.services.settings import DEFAULTS
from app.services import settings as shop_settings

import app.models  # noqa: F401

CATEGORIES = [
    ("kitchen", "لوازم آشپزخانه", None, 10),
    ("refrigerator", "یخچال و فریزر", "kitchen", 10),
    ("dishwasher", "ماشین ظرفشویی", "kitchen", 20),
    ("microwave", "مایکروویو", "kitchen", 30),
    ("blender", "مخلوط‌کن و آبمیوه‌گیر", "kitchen", 40),
    ("coffee-maker", "قهوه‌ساز و چای‌ساز", "kitchen", 50),
    ("laundry", "لوازم شستشو", None, 20),
    ("washing-machine", "ماشین لباسشویی", "laundry", 10),
    ("dryer", "خشک‌کن لباس", "laundry", 20),
    ("iron", "اتو و بخار", "laundry", 30),
    ("cleaning", "نظافت و بهداشت", None, 30),
    ("vacuum", "جاروبرقی", "cleaning", 10),
    ("robot-vacuum", "جارو رباتیک", "cleaning", 20),
    ("air-purifier", "تصفیه هوا", "cleaning", 30),
    ("climate", "سرمایش و گرمایش", None, 40),
    ("air-conditioner", "کولر گازی", "climate", 10),
    ("heater", "بخاری و شوفاژ برقی", "climate", 20),
    ("entertainment", "صوتی و تصویری", None, 50),
    ("tv", "تلویزیون", "entertainment", 10),
    ("speaker", "اسپیکر و ساندبار", "entertainment", 20),
    ("lifestyle", "سبک زندگی", None, 60),
    ("personal-care", "لوازم شخصی", "lifestyle", 10),
    ("beauty", "زیبایی و مراقبت", "lifestyle", 20),
    ("daily", "لوازم روزمره", None, 70),
    ("daily-essentials", "وسایل روزانه", "daily", 10),
    ("cookware", "ظروف آشپزخانه", "daily", 20),
]

PRODUCTS = [
    {
        "code": "SB-RF-001",
        "slug": "samsung-rt28-refrigerator",
        "title": "یخچال فریزر سامسونگ RT28",
        "category_slug": "refrigerator",
        "price": 28_500_000,
        "compare": 31_000_000,
        "description": "یخچال ۲۸ فوت با کمپرسور دیجیتال اینورتر، مصرف انرژی A+ و طراحی مینیمال.",
        "colors": [("نقره‌ای", "#c0c0c0"), ("سفید", "#f5f5f5")],
    },
    {
        "code": "SB-RF-002",
        "slug": "lg-gr-x257csav-refrigerator",
        "title": "یخچال ساید بای ساید ال‌جی GR-X257",
        "category_slug": "refrigerator",
        "price": 52_900_000,
        "compare": 58_000_000,
        "description": "یخچال ساید ۳۶ فوت با آبسردکن داخلی و قفسه‌های قابل تنظیم.",
        "colors": [("استیل", "#a8a8a8")],
    },
    {
        "code": "SB-WM-001",
        "slug": "lg-f4v5ryp2w-washing-machine",
        "title": "ماشین لباسشویی ال‌جی 8 کیلو",
        "category_slug": "washing-machine",
        "price": 22_800_000,
        "compare": 24_500_000,
        "description": "ماشین لباسشویی ۸ کیلویی با موتور اینورتر و ۱۴ برنامه شستشو.",
        "colors": [("سفید", "#f5f5f5"), ("نقره‌ای", "#b8b8b8")],
    },
    {
        "code": "SB-WM-002",
        "slug": "samsung-ww90t4040-washing-machine",
        "title": "ماشین لباسشویی سامسونگ 9 کیلو",
        "category_slug": "washing-machine",
        "price": 26_400_000,
        "compare": 28_900_000,
        "description": "مدل ۹ کیلویی با EcoBubble و شستشوی سریع ۱۵ دقیقه‌ای.",
        "colors": [("سفید", "#ffffff")],
    },
    {
        "code": "SB-DW-001",
        "slug": "bosch-serie4-dishwasher",
        "title": "ماشین ظرفشویی بوش سری 4",
        "category_slug": "dishwasher",
        "price": 18_900_000,
        "compare": 20_500_000,
        "description": "ظرفشویی ۱۳ نفره با برنامه اکو و صدای کمتر از ۴۸ دسی‌بل.",
        "colors": [("استیل", "#a8a8a8")],
    },
    {
        "code": "SB-VC-001",
        "slug": "dyson-v12-vacuum",
        "title": "جاروبرقی بی‌سیم دایسون V12",
        "category_slug": "vacuum",
        "price": 32_500_000,
        "compare": 35_000_000,
        "description": "جارو شارژی با مکش قدرتمند و فیلتر HEPA — مناسب آلرژی.",
        "colors": [("طلایی", "#c9a227"), ("نقره‌ای", "#c0c0c0")],
    },
    {
        "code": "SB-RV-001",
        "slug": "xiaomi-robot-vacuum-s10",
        "title": "جارو رباتیک شیائومی S10",
        "category_slug": "robot-vacuum",
        "price": 12_500_000,
        "compare": 14_000_000,
        "description": "جارو رباتیک با نقشه‌برداری لیزری و کنترل از اپ موبایل.",
        "colors": [("سفید", "#f5f5f5")],
    },
    {
        "code": "SB-AC-001",
        "slug": "gree-inverter-ac-18000",
        "title": "کولر گازی اینورتر گری 18000",
        "category_slug": "air-conditioner",
        "price": 19_500_000,
        "compare": 21_000_000,
        "description": "کولر گازی ۱۸ هزار با گاز R32 و ریموت هوشمند.",
        "colors": [("سفید", "#ffffff")],
    },
    {
        "code": "SB-HT-001",
        "slug": "deerma-electric-heater",
        "title": "بخاری برقی 2000 وات درما",
        "category_slug": "heater",
        "price": 2_450_000,
        "compare": 2_800_000,
        "description": "بخاری فن‌دار با ترموستات و محافظ حرارتی.",
        "colors": [("سفید", "#f5f5f5")],
    },
    {
        "code": "SB-MW-001",
        "slug": "panasonic-microwave-25l",
        "title": "مایکروویو پاناسونیک 25 لیتری",
        "category_slug": "microwave",
        "price": 5_200_000,
        "compare": 5_800_000,
        "description": "مایکروویو ۹۰۰ وات با گریل و منوی فارسی.",
        "colors": [("سفید", "#f5f5f5"), ("مشکی", "#1a1a1a")],
    },
    {
        "code": "SB-BL-001",
        "slug": "philips-hr2224-blender",
        "title": "مخلوط‌کن فیلیپس HR2224",
        "category_slug": "blender",
        "price": 3_850_000,
        "compare": 4_300_000,
        "description": "مخلوط‌کن ۸۰۰ وات با پارچ شیشه‌ای ۱.۵ لیتری.",
        "colors": [("سفید", "#ffffff"), ("مشکی", "#1a1a1a")],
    },
    {
        "code": "SB-CF-001",
        "slug": "delonghi-magnifica-coffee",
        "title": "قهوه‌ساز تمام‌خودکار دلونگی",
        "category_slug": "coffee-maker",
        "price": 24_500_000,
        "compare": 27_000_000,
        "description": "اسپرسوساز اتوماتیک با آسیاب داخلی و کف‌ساز.",
        "colors": [("مشکی", "#1a1a1a"), ("استیل", "#a8a8a8")],
    },
    {
        "code": "SB-TV-001",
        "slug": "samsung-crystal-uhd-55",
        "title": "تلویزیون سامسونگ Crystal UHD 55 اینچ",
        "category_slug": "tv",
        "price": 24_900_000,
        "compare": 27_500_000,
        "description": "تلویزیون ۴K با HDR و سیستم‌عامل Tizen.",
        "colors": [("مشکی", "#1a1a1a")],
    },
    {
        "code": "SB-TV-002",
        "slug": "lg-oled-c3-48",
        "title": "تلویزیون OLED ال‌جی C3 — 48 اینچ",
        "category_slug": "tv",
        "price": 42_000_000,
        "compare": 46_500_000,
        "description": "پنل OLED با کنتراست بی‌نهایت — ایده‌آل برای فیلم و گیم.",
        "colors": [("مشکی", "#1a1a1a")],
    },
    {
        "code": "SB-SP-001",
        "slug": "sony-srs-xb23-speaker",
        "title": "اسپیکر بلوتوث سونی SRS-XB23",
        "category_slug": "speaker",
        "price": 4_200_000,
        "compare": 4_800_000,
        "description": "اسپیکر قابل حمل ضدآب IP67 با باس قوی.",
        "colors": [("مشکی", "#1a1a1a"), ("آبی", "#2563eb")],
    },
    {
        "code": "SB-LS-001",
        "slug": "philips-hair-dryer-2200w",
        "title": "سشوار فیلیپس 2200 وات",
        "category_slug": "personal-care",
        "price": 1_850_000,
        "compare": 2_100_000,
        "description": "سشوار حرفه‌ای با نازل متمرکز‌کننده و یون منفی.",
        "colors": [("مشکی", "#1a1a1a"), ("صورتی", "#e8a0b8")],
    },
    {
        "code": "SB-BT-001",
        "slug": "braun-series3-shaver",
        "title": "ریش‌تراش براون سری 3",
        "category_slug": "beauty",
        "price": 3_200_000,
        "compare": 3_600_000,
        "description": "ریش‌تراش برقی ضدآب با سه تیغه فلوت.",
        "colors": [("مشکی", "#1a1a1a")],
    },
    {
        "code": "SB-DL-001",
        "slug": "tefal-electric-kettle",
        "title": "کتری برقی تفال 1.7 لیتری",
        "category_slug": "daily-essentials",
        "price": 980_000,
        "compare": 1_150_000,
        "description": "کتری استیل ضدزنگ با خاموش‌شدن خودکار.",
        "colors": [("استیل", "#a8a8a8"), ("مشکی", "#1a1a1a")],
    },
    {
        "code": "SB-DR-001",
        "slug": "bosch-dryer-8kg",
        "title": "خشک‌کن لباس بوش 8 کیلو",
        "category_slug": "dryer",
        "price": 19_800_000,
        "compare": 21_500_000,
        "description": "خشک‌کن با سنسور رطوبت و برنامه لباس حساس.",
        "colors": [("سفید", "#f5f5f5")],
    },
    {
        "code": "SB-IR-001",
        "slug": "tefal-steam-iron-fv9845",
        "title": "اتو بخار تفال FV9845",
        "category_slug": "iron",
        "price": 2_650_000,
        "compare": 2_950_000,
        "description": "اتو ۲۸۰۰ وات با کفی سرامیک و ضدچکه.",
        "colors": [("آبی", "#1d6fd8")],
    },
    {
        "code": "SB-AP-001",
        "slug": "xiaomi-air-purifier-4",
        "title": "تصفیه هوا شیائومی 4",
        "category_slug": "air-purifier",
        "price": 8_900_000,
        "compare": 9_800_000,
        "description": "فیلتر HEPA برای اتاق تا ۴۰ متر — کنترل با اپ.",
        "colors": [("سفید", "#f5f5f5")],
    },
    {
        "code": "SB-CW-001",
        "slug": "tefal-cookware-set-12",
        "title": "سرویس قابلمه تفال ۱۲ پارچه",
        "category_slug": "cookware",
        "price": 4_500_000,
        "compare": 5_200_000,
        "description": "سرویس نچرال آنتی‌چسب با درب شیشه‌ای.",
        "colors": [("مشکی", "#1a1a1a")],
    },
    {
        "code": "SB-TE-001",
        "slug": "bosch-tea-maker",
        "title": "چای‌ساز برقی بوش",
        "category_slug": "coffee-maker",
        "price": 2_100_000,
        "compare": 2_400_000,
        "description": "چای‌ساز ۱.۷ لیتری با فیلتر و نگه‌دارنده دما.",
        "colors": [("سفید", "#ffffff"), ("مشکی", "#1a1a1a")],
    },
]

BANNERS = [
    {
        "placement": "hero",
        "eyebrow_fa": "فروش ویژه",
        "title_fa": "جشنواره لوازم خانگی",
        "subtitle_fa": "تا ۱۵٪ تخفیف روی یخچال، ماشین لباسشویی و جاروبرقی — گارانتی اصلی",
        "cta_label": "مشاهده محصولات",
        "cta_href": "/catalog",
        "overlay_opacity": 55,
        "sort_order": 10,
    },
    {
        "placement": "hero",
        "eyebrow_fa": "سبک زندگی",
        "title_fa": "لوازم روزمره با قیمت مناسب",
        "subtitle_fa": "از کتری برقی تا سشوار — ارسال سریع به سراسر کشور",
        "cta_label": "خرید کنید",
        "cta_href": "/browse/lifestyle",
        "overlay_opacity": 50,
        "sort_order": 20,
    },
    {
        "placement": "promo",
        "variant": "text",
        "eyebrow_fa": "سفارش عمده",
        "title_fa": "تأمین لوازم برای پروژه و سازمان",
        "subtitle_fa": "قیمت پلکانی، پیش‌فاکتور رسمی و مشاوره رایگان",
        "cta_label": "درخواست پیش‌فاکتور",
        "cta_href": "/business",
        "sort_order": 10,
    },
]

COUPONS = [
    ("SELECTBOX10", "percent", 10, 500_000),
    ("HOME5", "percent", 5, 200_000),
    ("WELCOME50", "fixed", 50_000, 1_000_000),
]


def clear_catalog_data(db) -> None:
    """پاک کردن دادهٔ فروشگاه برای seed مجدد."""
    from app.models import CartItem, Cart, ProductImage, OrderItem, Order

    db.execute(delete(CartItem))
    db.execute(delete(Cart))
    db.execute(delete(OrderItem))
    db.execute(delete(Order))
    db.execute(delete(ProductVariation))
    db.execute(delete(ProductImage))
    db.execute(delete(Product))
    db.execute(delete(Design))
    db.execute(delete(Category))
    db.execute(delete(Coupon))
    db.execute(delete(HomeBanner))
    db.execute(delete(blog_post_tags))
    db.execute(delete(BlogPost))
    db.execute(delete(BlogTag))
    db.execute(delete(BlogCategory))
    db.commit()


def seed_banners(db) -> None:
    if db.scalar(select(HomeBanner).limit(1)):
        return
    for b in BANNERS:
        db.add(
            HomeBanner(
                placement=b.get("placement", "hero"),
                variant=b.get("variant", "text"),
                eyebrow_fa=b.get("eyebrow_fa"),
                title_fa=b.get("title_fa"),
                subtitle_fa=b.get("subtitle_fa"),
                cta_label=b.get("cta_label"),
                cta_href=b.get("cta_href"),
                overlay_opacity=b.get("overlay_opacity", 40),
                text_align="start",
                accent_style="primary",
                sort_order=b.get("sort_order", 0),
                is_active=True,
            )
        )
    db.commit()


def seed_blog(db) -> None:
    if db.scalar(select(BlogPost).limit(1)):
        return
    now = datetime.now(timezone.utc)
    categories = [
        BlogCategory(slug="home-tips", name_fa="نکات خانه‌داری", description="نگهداری لوازم خانگی", sort_order=1),
        BlogCategory(slug="buying-guide", name_fa="راهنمای خرید", description="انتخاب هوشمندانه", sort_order=2),
        BlogCategory(slug="lifestyle", name_fa="سبک زندگی", description="کیفیت زندگی بهتر", sort_order=3),
    ]
    for c in categories:
        db.add(c)
    db.flush()
    tags = [
        BlogTag(slug="refrigerator", name_fa="یخچال"),
        BlogTag(slug="energy", name_fa="صرفه‌جویی انرژی"),
        BlogTag(slug="lifestyle", name_fa="سبک زندگی"),
    ]
    for t in tags:
        db.add(t)
    db.flush()
    posts = [
        BlogPost(
            slug="refrigerator-buying-guide",
            title="چطور یخچال مناسب بخریم؟",
            excerpt="۷ معیار مهم قبل از خرید یخچال",
            content_html="<p>ظرفیت، انرژی، برند و گارانتی مهم‌ترین فاکتورها هستند.</p>",
            category_id=categories[1].id,
            status=BlogPostStatus.published,
            is_featured=True,
            reading_time_minutes=5,
            published_at=now,
        ),
        BlogPost(
            slug="robot-vacuum-tips",
            title="۵ نکته برای نگهداری جارو رباتیک",
            excerpt="طول عمر بیشتر با تمیزکاری ساده",
            content_html="<p>فیلتر و برس‌ها را ماهانه تمیز کنید.</p>",
            category_id=categories[0].id,
            status=BlogPostStatus.published,
            reading_time_minutes=3,
            published_at=now,
        ),
        BlogPost(
            slug="minimal-kitchen-essentials",
            title="حداقل لوازم ضروری آشپزخانه مدرن",
            excerpt="لیستی کوتاه برای شروع",
            content_html="<p>مایکروویو، کتری، مخلوط‌کن و ظرفشویی پایه‌های یک آشپزخانه کاربردی‌اند.</p>",
            category_id=categories[2].id,
            status=BlogPostStatus.published,
            reading_time_minutes=4,
            published_at=now,
        ),
    ]
    posts[0].tags = [tags[0], tags[1]]
    posts[1].tags = [tags[2]]
    posts[2].tags = [tags[2]]
    for p in posts:
        db.add(p)
    db.commit()


def run(*, force: bool = False) -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        has_data = db.scalar(select(Category).limit(1)) is not None
        if has_data and not force:
            print("Database already seeded — برای seed مجدد: python scripts/seed.py --force")
            seed_banners(db)
            seed_blog(db)
            return

        if force and has_data:
            print("⚠️  پاک کردن دادهٔ فروشگاه...")
            clear_catalog_data(db)

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
            if db.get(SiteSetting, key) is None or key == "site_url":
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
                meta_description=f"خرید {name_fa} با گارانتی اصلی — SelectBox",
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
            admin.full_name = "مدیر SelectBox"
            admin.role = UserRole.admin
            admin.password_hash = hash_password("admin123")
            admin.is_active = True

        for code, dtype, value, min_total in COUPONS:
            if db.scalar(select(Coupon).where(Coupon.code == code).limit(1)) is None:
                db.add(
                    Coupon(
                        code=code,
                        discount_type=dtype,
                        discount_value=value,
                        min_cart_total=min_total,
                        is_active=True,
                    )
                )

        id_to_cat = {c.id: c for c in slug_to_cat.values()}

        for item in PRODUCTS:
            cat = slug_to_cat[item["category_slug"]]
            root = cat
            while root.parent_id:
                root = id_to_cat[root.parent_id]

            d = Design(
                code=item["code"],
                title=item["title"],
                slug=item["slug"],
                thematic_category_id=cat.id,
                description=item.get("description", item["title"]),
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
                description=item.get("description"),
                base_price=item["price"],
                compare_at_price=item["compare"],
                status="published",
                meta_title=f"{item['title']} | SelectBox",
                meta_description=item.get("description", f"خرید {item['title']}"),
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
                        stock_quantity=20,
                    )
                )

        db.commit()
        seed_banners(db)
        seed_blog(db)

        print("✅ Seed OK — SelectBox")
        print(f"  {len(PRODUCTS)} محصول · {len(CATEGORIES)} دسته")
        print("  ادمین: 09120000000 / admin123")
        print("  کوپن‌ها: SELECTBOX10, HOME5, WELCOME50")
        print("  نمونه: /product/samsung-rt28-refrigerator")
    finally:
        db.close()


if __name__ == "__main__":
    args = sys.argv[1:]
    if "reset-admin" in args:
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
            print("رمز ادمین: 09120000000 / admin123")
        finally:
            db.close()
    else:
        run(force="--force" in args)
