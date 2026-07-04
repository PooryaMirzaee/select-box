"""
نقطه ورود اپلیکیشن FastAPI.

این ماژول:
  • چرخه عمر (lifespan) را برای ایجاد جداول در محیط توسعه تنظیم می‌کند
  • CORS را برای ارتباط با Next.js (پورت 3000) فعال می‌کند
  • روتر نسخه‌دار API را زیر پیشوند /api/v1 بارگذاری می‌کند

تولید: به‌جای create_all از Alembic migration استفاده کنید.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.deps import SESSION_HEADER
from app.api.v1.router import api_router
from app.api.v1.endpoints import torob
from app.core.config import settings, validate_production_settings
from app.db.base import Base
from app.db.session import engine
from app.middleware.security import SecurityHeadersMiddleware
from app.services.storage import ensure_upload_root


@asynccontextmanager
async def lifespan(app: FastAPI):
    """هنگام استارت: ثبت مدل‌ها و ساخت جداول اگر وجود نداشته باشند."""
    validate_production_settings()
    import app.models  # noqa: F401 — import جانبی برای پر شدن metadata

    ensure_upload_root()
    Base.metadata.create_all(bind=engine)
    _ensure_category_icon_column()
    _ensure_product_media_columns()
    _ensure_product_size_guide_column()
    _ensure_payment_receipt_columns()
    _ensure_customizer_columns()
    _ensure_user_studio_columns()
    _ensure_mockup_configs()
    _ensure_template_sides()
    _ensure_business_landings()
    _ensure_business_trust_columns()
    _ensure_dev_admin_password()
    _ensure_blog_seed()
    _ensure_chat_columns()
    _ensure_chat_canned_seed()
    _ensure_header_nav_seed()
    _ensure_homepage_default()
    _ensure_site_url_from_env()
    _ensure_ai_columns()
    _ensure_ai_suggested_seed()
    _ensure_ai_tools_seed()
    _warmup_bg_remove()
    yield


def _ensure_business_trust_columns() -> None:
    """ستون‌های گالری و اعتمادسازی — migration تدریجی."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "business_landings" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("business_landings")}
    dialect = engine.dialect.name
    additions = [
        ("gallery_images", "JSON"),
        ("gallery_title", "VARCHAR(255)"),
        ("trust_logos", "JSON"),
        ("trust_badges", "JSON"),
        ("testimonials", "JSON"),
        ("trust_section_title", "VARCHAR(255)"),
    ]
    with engine.begin() as conn:
        for name, col_type in additions:
            if name in cols:
                continue
            if dialect == "sqlite":
                default = "'[]'" if col_type == "JSON" else "NULL"
                conn.execute(text(f"ALTER TABLE business_landings ADD COLUMN {name} {col_type} DEFAULT {default}"))
            else:
                conn.execute(text(f"ALTER TABLE business_landings ADD COLUMN {name} {col_type}"))


def _ensure_dev_admin_password() -> None:
    """رمز ادمین توسعه را در SQLite لوکال ترمیم می‌کند (خرابی passlib/bcrypt)."""
    if not settings.database_url.startswith("sqlite"):
        return

    from sqlalchemy import select

    from app.core.security import hash_password, verify_password
    from app.db.session import SessionLocal
    from app.models import User, UserRole

    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.phone == "09120000000"))
        if user is None or user.role not in (UserRole.admin, UserRole.operator):
            return
        if verify_password("admin123", user.password_hash):
            return
        user.password_hash = hash_password("admin123")
        db.commit()
    finally:
        db.close()


def _ensure_business_landings() -> None:
    """لندینگ‌های پیش‌فرض سفارش سازمانی."""
    from app.db.session import SessionLocal
    from app.services import business as business_service

    db = SessionLocal()
    try:
        business_service.ensure_default_landings(db)
    finally:
        db.close()


def _ensure_blog_seed() -> None:
    """دسته‌ها و مقالات نمونه وبلاگ."""
    from datetime import datetime, timezone

    from sqlalchemy import select

    from app.db.session import SessionLocal
    from app.models.blog import BlogCategory, BlogPost, BlogPostStatus, BlogTag

    db = SessionLocal()
    try:
        if db.scalar(select(BlogPost).limit(1)):
            return

        categories = [
            BlogCategory(slug="home-tips", name_fa="نکات خانه‌داری", description="راهنمای نگهداری و استفاده از لوازم خانگی", sort_order=1),
            BlogCategory(slug="buying-guide", name_fa="راهنمای خرید", description="چطور بهترین لوازم خانگی را انتخاب کنیم", sort_order=2),
            BlogCategory(slug="lifestyle", name_fa="سبک زندگی", description="لوازم روزمره و بهبود کیفیت زندگی", sort_order=3),
        ]
        for c in categories:
            db.add(c)
        db.flush()

        tags = [
            BlogTag(slug="refrigerator", name_fa="یخچال"),
            BlogTag(slug="energy-saving", name_fa="صرفه‌جویی انرژی"),
            BlogTag(slug="lifestyle", name_fa="سبک زندگی"),
            BlogTag(slug="b2b", name_fa="سفارش عمده"),
        ]
        for t in tags:
            db.add(t)
        db.flush()

        now = datetime.now(timezone.utc)
        posts = [
            BlogPost(
                slug="how-to-choose-refrigerator",
                title="راهنمای خرید یخچال — ۷ نکته قبل از انتخاب",
                excerpt="ظرفیت، رتبه انرژی، نوع برفک و ابعاد از مهم‌ترین معیارهای خرید یخچال هستند. در این مقاله همه را مرور می‌کنیم.",
                content_html="""<h2>ظرفیت مناسب</h2>
<p>برای خانواده ۳–۴ نفره یخچال ۲۸ تا ۳۲ فوت کافی است. برای خانواده بزرگ‌تر به مدل‌های side-by-side یا french door فکر کنید.</p>
<h2>رتبه انرژی</h2>
<p>مدل‌های اینورتر و برچسب انرژی A+ در بلندمدت هزینه برق را کم می‌کنند.</p>
<h2>گارانتی و خدمات</h2>
<p>حتماً گارانتی معتبر و دسترسی به خدمات پس از فروش را بررسی کنید — SelectBox تمام محصولات را با گارانتی اصلی عرضه می‌کند.</p>""",
                category_id=categories[1].id,
                status=BlogPostStatus.published,
                is_featured=True,
                reading_time_minutes=5,
                meta_title="راهنمای خرید یخچال",
                meta_description="نکات مهم انتخاب یخچال — ظرفیت، انرژی، برند و گارانتی.",
                published_at=now,
            ),
            BlogPost(
                slug="home-appliance-trends-2026",
                title="ترندهای لوازم خانگی ۲۰۲۶: هوشمند، کم‌مصرف، مینیمال",
                excerpt="از یخچال‌های متصل تا جاروهای رباتیک — نگاهی به محصولاتی که امسال آشپزخانه و خانه را متحول می‌کنند.",
                content_html="""<h2>لوازم هوشمند</h2>
<p>ماشین لباسشویی و جارو رباتیک با اتصال Wi-Fi و اپلیکیشن موبایل هر روز محبوب‌تر می‌شوند.</p>
<h2>طراحی مینیمال</h2>
<p>رنگ‌های سفید، استیل و خطوط ساده در آشپزخانه‌های مدرن ایرانی جایگاه ویژه دارند.</p>
<blockquote>خانه راحت با انتخاب درست شروع می‌شود.</blockquote>""",
                category_id=categories[2].id,
                status=BlogPostStatus.published,
                is_featured=False,
                reading_time_minutes=4,
                published_at=now,
            ),
            BlogPost(
                slug="daily-essentials-checklist",
                title="چک‌لیست لوازم ضروری خانه تازه‌عروس",
                excerpt="از کتری برقی تا جاروبرقی — فهرستی عملی برای تجهیز خانه جدید بدون خرید اضافی.",
                content_html="""<h2>آشپزخانه</h2>
<ul><li>مایکروویو یا آون توستر</li><li>کتری برقی یا چای‌ساز</li><li>مخلوط‌کن دستی</li></ul>
<h2>نظافت</h2>
<p>یک جاروبرقی قدرتمند یا جارو رباتیک برای کف، و بخارشو برای آشپزخانه انتخاب‌های هوشمندانه‌اند.</p>
<h2>سبک زندگی</h2>
<p>سشوار، اتو و لوازم مراقبت شخصی را در یک دسته جدا بخرید تا بودجه را بهتر مدیریت کنید.</p>""",
                category_id=categories[0].id,
                status=BlogPostStatus.published,
                is_featured=False,
                reading_time_minutes=6,
                published_at=now,
            ),
        ]
        posts[0].tags = [tags[0], tags[1]]
        posts[1].tags = [tags[2]]
        posts[2].tags = [tags[2], tags[3]]

        for p in posts:
            db.add(p)
        db.commit()
    finally:
        db.close()


def _ensure_header_nav_seed() -> None:
    """لینک‌های پیش‌فرض ناوبری هدر."""
    from app.db.session import SessionLocal
    from app.services import header_nav as header_nav_service

    db = SessionLocal()
    try:
        header_nav_service.ensure_default_links(db)
    finally:
        db.close()


def _ensure_homepage_default() -> None:
    from app.db.session import SessionLocal
    from app.services import homepage as homepage_service

    db = SessionLocal()
    try:
        homepage_service.ensure_default(db)
    finally:
        db.close()


def _ensure_site_url_from_env() -> None:
    """در تولید site_url دیتابیس را با PUBLIC_SITE_URL هم‌تراز می‌کند."""
    from app.services.settings import normalize_site_url

    url = normalize_site_url((settings.public_api_url or settings.frontend_url or "").strip())
    if not url or "localhost" in url or "127.0.0.1" in url:
        return
    from app.db.session import SessionLocal
    from app.services import settings as shop_settings

    db = SessionLocal()
    try:
        current = normalize_site_url(
            str(shop_settings.get_setting(db, "site_url", shop_settings.DEFAULTS["site_url"]))
        )
        if current != url:
            shop_settings.set_setting(db, "site_url", url)
    finally:
        db.close()


def _ensure_chat_columns() -> None:
    """ستون‌ها و جداول جدید چت — migration تدریجی."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    tables = set(insp.get_table_names())

    if "chat_conversations" in tables:
        cols = {c["name"] for c in insp.get_columns("chat_conversations")}
        additions = [
            ("priority", "VARCHAR(16) DEFAULT 'normal'"),
            ("tags", "JSON"),
            ("visitor_email", "VARCHAR(255)"),
            ("referrer_url", "VARCHAR(512)"),
            ("user_agent", "VARCHAR(512)"),
            ("browser", "VARCHAR(64)"),
            ("os_name", "VARCHAR(64)"),
            ("device_type", "VARCHAR(32)"),
            ("admin_notes", "TEXT"),
        ]
        with engine.begin() as conn:
            for name, col_type in additions:
                if name in cols:
                    continue
                conn.execute(text(f"ALTER TABLE chat_conversations ADD COLUMN {name} {col_type}"))

    if "chat_messages" in tables:
        cols = {c["name"] for c in insp.get_columns("chat_messages")}
        with engine.begin() as conn:
            if "attachment_key" not in cols:
                conn.execute(text("ALTER TABLE chat_messages ADD COLUMN attachment_key VARCHAR(512)"))
            if "attachment_name" not in cols:
                conn.execute(text("ALTER TABLE chat_messages ADD COLUMN attachment_name VARCHAR(255)"))


def _ensure_chat_canned_seed() -> None:
    from app.db.session import SessionLocal
    from app.services import chat as chat_service

    db = SessionLocal()
    try:
        chat_service.seed_default_canned(db)
    finally:
        db.close()


def _ensure_ai_columns() -> None:
    """ستون‌های جدید لاگ AI — migration تدریجی."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "ai_generation_logs" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("ai_generation_logs")}
    additions = [
        ("prompt_text", "TEXT DEFAULT ''"),
        ("status", "VARCHAR(16) DEFAULT 'success'"),
        ("error_message", "TEXT"),
        ("storage_key", "VARCHAR(512)"),
        ("aspect_ratio", "VARCHAR(16) DEFAULT '1:1'"),
        ("style_preset", "VARCHAR(64)"),
        ("generation_type", "VARCHAR(16) DEFAULT 'text'"),
        ("tool_id", "INTEGER REFERENCES ai_tools(id)"),
    ]
    with engine.begin() as conn:
        for name, col_type in additions:
            if name in cols:
                continue
            conn.execute(text(f"ALTER TABLE ai_generation_logs ADD COLUMN {name} {col_type}"))


def _ensure_ai_suggested_seed() -> None:
    from app.db.session import SessionLocal
    from app.services import ai_admin

    db = SessionLocal()
    try:
        ai_admin.seed_default_suggested_prompts(db)
    finally:
        db.close()


def _ensure_ai_tools_seed() -> None:
    from app.db.session import SessionLocal
    from app.services import ai_admin

    db = SessionLocal()
    try:
        ai_admin.seed_default_tools(db)
    finally:
        db.close()


def _warmup_bg_remove() -> None:
    """بارگذاری مدل rembg در پس‌زمینه — استارت سرور block نمی‌شود."""
    import logging
    import threading

    def _run() -> None:
        try:
            from app.services.bg_remove import _get_session

            _get_session()
        except Exception:
            logging.getLogger(__name__).exception("rembg warmup failed")

    threading.Thread(target=_run, daemon=True, name="rembg-warmup").start()


def _ensure_category_icon_column() -> None:
    """ستون آیکون دسته — برای دیتابیس‌های قدیمی بدون migration."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "categories" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("categories")}
    if "icon_storage_key" in cols:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE categories ADD COLUMN icon_storage_key VARCHAR(512)"))
    # در توقف سرور می‌توان اتصال pool را بست؛ با sqlalchemy پیش‌فرض لازم نیست


def _ensure_product_media_columns() -> None:
    """ستون توضیح محصول — برای دیتابیس‌های قدیمی."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "products" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("products")}
    if "description" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE products ADD COLUMN description TEXT"))


def _ensure_product_size_guide_column() -> None:
    """ستون راهنمای سایز — JSON قابل تنظیم برای هر محصول."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "products" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("products")}
    if "size_guide_json" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE products ADD COLUMN size_guide_json JSON"))


def _ensure_payment_receipt_columns() -> None:
    """ستون‌های رسید کارت‌به‌کارت."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "payments" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("payments")}
    dialect = engine.dialect.name
    additions = [
        ("receipt_storage_key", "VARCHAR(512)"),
        ("customer_note", "VARCHAR(500)"),
        ("admin_note", "VARCHAR(500)"),
        ("reviewed_at", "TIMESTAMP WITH TIME ZONE" if dialect != "sqlite" else "DATETIME"),
    ]
    with engine.begin() as conn:
        for name, col_type in additions:
            if name in cols:
                continue
            conn.execute(text(f"ALTER TABLE payments ADD COLUMN {name} {col_type}"))


def _ensure_customizer_columns() -> None:
    """ستون‌های سفارشی‌سازی — migration تدریجی بدون Alembic."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    tables = set(insp.get_table_names())

    if "designs" in tables:
        cols = {c["name"] for c in insp.get_columns("designs")}
        with engine.begin() as conn:
            if "creator_id" not in cols:
                conn.execute(text("ALTER TABLE designs ADD COLUMN creator_id INTEGER REFERENCES users(id)"))
            if "source_type" not in cols:
                conn.execute(text("ALTER TABLE designs ADD COLUMN source_type VARCHAR(16) DEFAULT 'admin'"))
            if "commission_percent" not in cols:
                conn.execute(text("ALTER TABLE designs ADD COLUMN commission_percent NUMERIC(5,2)"))
            if "customization_config" not in cols:
                conn.execute(text("ALTER TABLE designs ADD COLUMN customization_config JSON"))

    if "order_items" in tables:
        cols = {c["name"] for c in insp.get_columns("order_items")}
        if "customization_json" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE order_items ADD COLUMN customization_json JSON"))

    if "cart_items" not in tables:
        return
    cols = {c["name"] for c in insp.get_columns("cart_items")}
    if "customization_key" in cols:
        return

    dialect = engine.dialect.name
    with engine.begin() as conn:
        if dialect == "sqlite":
            conn.execute(
                text(
                    """
                    CREATE TABLE cart_items_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
                        variation_id INTEGER NOT NULL REFERENCES product_variations(id) ON DELETE CASCADE,
                        quantity INTEGER NOT NULL CHECK (quantity > 0),
                        customization_json JSON,
                        customization_key VARCHAR(64) NOT NULL DEFAULT '',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE (cart_id, variation_id, customization_key)
                    )
                    """
                )
            )
            conn.execute(
                text(
                    """
                    INSERT INTO cart_items_new (id, cart_id, variation_id, quantity, customization_key, created_at)
                    SELECT id, cart_id, variation_id, quantity, '', created_at FROM cart_items
                    """
                )
            )
            conn.execute(text("DROP TABLE cart_items"))
            conn.execute(text("ALTER TABLE cart_items_new RENAME TO cart_items"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id)"))
        else:
            conn.execute(text("ALTER TABLE cart_items ADD COLUMN customization_json JSON"))
            conn.execute(
                text("ALTER TABLE cart_items ADD COLUMN customization_key VARCHAR(64) NOT NULL DEFAULT ''")
            )
            conn.execute(text("ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS uq_cart_items_cart_variation"))
            conn.execute(
                text(
                    "ALTER TABLE cart_items ADD CONSTRAINT uq_cart_items_cart_var_custom "
                    "UNIQUE (cart_id, variation_id, customization_key)"
                )
            )


def _ensure_user_studio_columns() -> None:
    """پروفایل عمومی خالق (استودیو) — برای دیتابیس‌های قدیمی."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("users")}
    with engine.begin() as conn:
        if "studio_slug" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN studio_slug VARCHAR(80)"))
        if "studio_bio" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN studio_bio TEXT"))
        if "studio_tagline" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN studio_tagline VARCHAR(255)"))
        if "studio_accent_hex" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN studio_accent_hex VARCHAR(7)"))
        if "studio_avatar_key" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN studio_avatar_key VARCHAR(512)"))
        if "studio_header_key" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN studio_header_key VARCHAR(512)"))


_MOCKUP_DEFAULTS: dict[str, dict] = {
    "tshirt": {
        "preview": "mockup",
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
    },
    "mug": {
        "preview": "mockup",
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
    },
}


_SIDE_DEFAULTS: dict[str, list] = {
    "tshirt": [
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
    ],
    "mug": [
        {
            "id": "front",
            "label_fa": "روی ماگ",
            "sort_order": 0,
            "print_area": {"x": 0.22, "y": 0.28, "width": 0.56, "height": 0.44},
        },
    ],
}


def _ensure_template_sides() -> None:
    """افزودن آرایه sides به قالب‌های قدیمی که فقط mockup.views داشتند."""
    from sqlalchemy import inspect, select

    from app.db.session import SessionLocal
    from app.models.customizer import ProductTemplate

    insp = inspect(engine)
    if "product_templates" not in insp.get_table_names():
        return

    db = SessionLocal()
    try:
        changed = False
        for tpl in db.scalars(select(ProductTemplate)):
            cfg = dict(tpl.config_json or {})
            if cfg.get("sides"):
                continue
            preset = _SIDE_DEFAULTS.get(tpl.slug)
            if not preset:
                views = (cfg.get("mockup") or {}).get("views") or {}
                if not views:
                    continue
                labels = {"front": "جلو", "back": "پشت", "left": "چپ", "right": "راست"}
                preset = [
                    {
                        "id": vid,
                        "label_fa": labels.get(vid, vid),
                        "sort_order": i,
                        "print_area": {"x": 0.18, "y": 0.14, "width": 0.64, "height": 0.52},
                    }
                    for i, vid in enumerate(views.keys())
                ]
            cfg["sides"] = preset
            tpl.config_json = cfg
            changed = True
        if changed:
            db.commit()
    finally:
        db.close()


def _ensure_mockup_configs() -> None:
    """به‌روزرسانی config_json قالب‌های موجود برای پیش‌نمایش mockup 2D."""
    from sqlalchemy import inspect, select

    from app.db.session import SessionLocal
    from app.models.customizer import ProductTemplate

    insp = inspect(engine)
    if "product_templates" not in insp.get_table_names():
        return

    db = SessionLocal()
    try:
        changed = False
        for tpl in db.scalars(select(ProductTemplate)):
            patch = _MOCKUP_DEFAULTS.get(tpl.slug)
            if not patch:
                continue
            cfg = dict(tpl.config_json or {})
            if cfg.get("preview") == "mockup" and cfg.get("mockup", {}).get("views"):
                continue
            cfg.pop("mesh", None)
            cfg.pop("camera", None)
            cfg.update(patch)
            tpl.config_json = cfg
            changed = True
        if changed:
            db.commit()
    finally:
        db.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan, debug=settings.debug)

# هدرهای امنیتی
app.add_middleware(SecurityHeadersMiddleware)

# هاست‌های مجاز — در تولید دامنه واقعی را در TRUSTED_HOSTS تنظیم کنید
trusted = [h.strip() for h in settings.trusted_hosts.split(",") if h.strip()]
if settings.debug:
    trusted = ["*"]
elif trusted:
    for internal in ("localhost", "127.0.0.1", "api", "nginx"):
        if internal not in trusted:
            trusted.append(internal)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted)

# مبداهای مجاز CORS از تنظیمات خوانده می‌شوند (ویرگول‌جداکننده)
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if not origins:
    origins = ["http://localhost:3000"] if settings.debug else [settings.frontend_url.rstrip("/")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "X-Session-Id",
        "X-Mock-Payment-Secret",
        "X-Torob-Token",
        "X-Torob-Token-Version",
    ],
)

app.include_router(api_router)
app.include_router(torob.router)


@app.get("/health")
def health():
    """بررسی سریع زنده بودن سرویس (بدون وابستگی به DB)."""
    return {"status": "ok"}
