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
            BlogCategory(slug="design-tips", name_fa="نکات طراحی", description="راهنمای طراحی برای چاپ و فروش", sort_order=1),
            BlogCategory(slug="trends", name_fa="ترندها", description="آخرین ترندهای مد و چاپ", sort_order=2),
            BlogCategory(slug="creator-guide", name_fa="راهنمای خالقین", description="کسب درآمد از Design Lab", sort_order=3),
        ]
        for c in categories:
            db.add(c)
        db.flush()

        tags = [
            BlogTag(slug="tshirt", name_fa="تیشرت"),
            BlogTag(slug="print-quality", name_fa="کیفیت چاپ"),
            BlogTag(slug="design-lab", name_fa="Design Lab"),
            BlogTag(slug="b2b", name_fa="سفارش سازمانی"),
        ]
        for t in tags:
            db.add(t)
        db.flush()

        now = datetime.now(timezone.utc)
        posts = [
            BlogPost(
                slug="choose-tshirt-fabric-guide",
                title="راهنمای انتخاب پارچه تیشرت برای چاپ با کیفیت",
                excerpt="پارچه مناسب تفاوت بین یک چاپ معمولی و یک محصول لوکس را مشخص می‌کند. در این مقاله انواع پارچه و نکات انتخاب را مرور می‌کنیم.",
                content_html="""<h2>چرا انتخاب پارچه مهم است؟</h2>
<p>کیفیت چاپ مستقیماً به بافت و ترکیب پارچه وابسته است. پنبه ۱۰۰٪ برای DTG و سابلیمیشن انتخاب‌های محبوب هستند.</p>
<h2>انواع پارچه</h2>
<ul><li><strong>پنبه ringspun:</strong> نرم‌تر و مناسب‌تر برای چاپ جزئیات</li>
<li><strong>پلی‌استر:</strong> مناسب سابلیمیشن و رنگ‌های زنده</li>
<li><strong>ترکیبی:</strong> تعادل بین دوام و راحتی</li></ul>
<h2>نکته برای خالقین</h2>
<p>در Design Lab می‌توانید طرح خود را روی mockup واقعی ببینید و قبل از انتشار، جزئیات را بررسی کنید.</p>""",
                category_id=categories[0].id,
                status=BlogPostStatus.published,
                is_featured=True,
                reading_time_minutes=4,
                meta_title="راهنمای انتخاب پارچه تیشرت",
                meta_description="انتخاب پارچه مناسب برای چاپ با کیفیت — پنبه، پلی‌استر و نکات حرفه‌ای.",
                published_at=now,
            ),
            BlogPost(
                slug="2026-print-trends",
                title="ترندهای چاپ و مد ۲۰۲۶: مینیمالیسم گرم و تایپوگرافی فارسی",
                excerpt="از رنگ‌های خاکی گرفته تا تایپوگرافی فارسی جسور — نگاهی به ترندهایی که امسال فروشگاه‌های print-on-demand را متحول می‌کنند.",
                content_html="""<h2>پالت رنگی گرم</h2>
<p>رنگ‌های terracotta، کرم و زیتونی جایگزین مینیمالیسم سرد شده‌اند. این پالت با هویت بصری CORALAY هم‌خوان است.</p>
<h2>تایپوگرافی فارسی</h2>
<p>طرح‌هایی که از فونت‌های فارسی معاصر استفاده می‌کنند، در شبکه‌های اجتماعی بیشتر share می‌شوند.</p>
<blockquote>طراحی خوب، داستان برند شما را بدون کلام می‌گوید.</blockquote>""",
                category_id=categories[1].id,
                status=BlogPostStatus.published,
                is_featured=False,
                reading_time_minutes=3,
                published_at=now,
            ),
            BlogPost(
                slug="creator-earnings-guide",
                title="چطور از Design Lab درآمد کسب کنید؟",
                excerpt="راهنمای گام‌به‌گام برای خالقین: از ساخت طرح تا انتشار در استودیو و دریافت کمیسیون.",
                content_html="""<h2>شروع سریع</h2>
<ol><li>وارد Design Lab شوید</li><li>طرح خود را بسازید</li><li>محصول را منتشر کنید</li><li>لینک استودیو را به اشتراک بگذارید</li></ol>
<h2>نکات فروش</h2>
<p>عکس mockup با کیفیت، توضیحات SEO-friendly و اشتراک‌گذاری در اینستاگرام سه عامل کلیدی فروش هستند.</p>""",
                category_id=categories[2].id,
                status=BlogPostStatus.published,
                is_featured=False,
                reading_time_minutes=5,
                published_at=now,
            ),
        ]
        posts[0].tags = [tags[0], tags[1]]
        posts[1].tags = [tags[0]]
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
