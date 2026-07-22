from __future__ import annotations

import enum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

"""
نگاشت ORM فروشگاه CORALAY (SQLAlchemy 2).

قراردادهای مهم:
  • «طرح» (Design) والد است؛ چند Product می‌توانند به یک طرح اشاره کنند (تیشرت، ماگ، ...).
  • هر Product یک دستهٔ مادر فیزیکی (parent_category_id) و قیمت/موجودی مستقل دارد.
  • تنوع فروش واقعی در ProductVariation است (SKU، رنگ، سایز، price_delta، stock).
  • سبد مهمان با session_id یا کاربر با user_id — هر دو هم‌زمان مجاز نیستند (CheckConstraint).

برای توضیح جداول به فارسی، فایل docs/database.md را ببینید.
"""

# -----------------------------------------------------------------------------
# نقش کاربر در سیستم (بدون جدول نقش جدا در این اسکلت)
# -----------------------------------------------------------------------------
class UserRole(str, enum.Enum):
    customer = "customer"
    admin = "admin"
    operator = "operator"


# -----------------------------------------------------------------------------
# کاربر نهایی؛ در آینده پروفایل و آدرس‌ها می‌توانند جدا شوند
# -----------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    full_name: Mapped[str | None] = mapped_column(String(255))
    studio_slug: Mapped[str | None] = mapped_column(String(80), unique=True)
    studio_bio: Mapped[str | None] = mapped_column(Text)
    studio_tagline: Mapped[str | None] = mapped_column(String(255))
    studio_accent_hex: Mapped[str | None] = mapped_column(String(7))
    studio_avatar_key: Mapped[str | None] = mapped_column(String(512))
    studio_header_key: Mapped[str | None] = mapped_column(String(512))
    password_hash: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False, length=32),
        default=UserRole.customer,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    carts: Mapped[list["Cart"]] = relationship(back_populates="user")
    orders: Mapped[list["Order"]] = relationship(back_populates="user")


# -----------------------------------------------------------------------------
# دسته‌ها — درخت با parent_id؛ ریشه یا فرزند بسته به دادهٔ شما (نوع کالا / موضوع)
# -----------------------------------------------------------------------------
class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"))
    slug: Mapped[str] = mapped_column(String(160), nullable=False)
    name_fa: Mapped[str] = mapped_column(String(255), nullable=False)
    meta_title: Mapped[str | None] = mapped_column(String(255))
    meta_description: Mapped[str | None] = mapped_column(Text)
    icon_storage_key: Mapped[str | None] = mapped_column(String(512))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    parent: Mapped["Category | None"] = relationship(
        remote_side=[id],
        back_populates="children",
    )
    children: Mapped[list["Category"]] = relationship(back_populates="parent")

    thematic_designs: Mapped[list["Design"]] = relationship(back_populates="thematic_category")
    products: Mapped[list["Product"]] = relationship(back_populates="parent_category")

    __table_args__ = (
        UniqueConstraint("parent_id", "slug", name="uq_categories_parent_slug"),
        Index("idx_categories_parent", "parent_id"),
    )


# -----------------------------------------------------------------------------
# طرح گرافیکی والد — thematic_category_id به دستهٔ موضوعی طرح اشاره می‌کند
# -----------------------------------------------------------------------------
class Design(Base):
    __tablename__ = "designs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    thematic_category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    creator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    source_type: Mapped[str] = mapped_column(String(16), default="admin", nullable=False)
    commission_percent: Mapped[float | None] = mapped_column(Numeric(5, 2))
    customization_config: Mapped[dict | None] = mapped_column(JSON)

    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    thematic_category: Mapped["Category"] = relationship(back_populates="thematic_designs")
    creator: Mapped["User | None"] = relationship(foreign_keys=[creator_id])
    assets: Mapped[list["DesignAsset"]] = relationship(
        back_populates="design", cascade="all, delete-orphan"
    )
    products: Mapped[list["Product"]] = relationship(back_populates="design", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('draft','published')", name="ck_designs_status"),
        CheckConstraint("source_type IN ('admin','user')", name="ck_designs_source_type"),
    )


# -----------------------------------------------------------------------------
# فایل‌های موکاپ/خروجی در MinIO؛ storage_key کلید آبجکت در باکت است
# -----------------------------------------------------------------------------
class DesignAsset(Base):
    __tablename__ = "design_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    design_id: Mapped[int] = mapped_column(ForeignKey("designs.id", ondelete="CASCADE"), nullable=False)
    variant_key: Mapped[str] = mapped_column(String(32), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(64), default="image/webp", nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    design: Mapped["Design"] = relationship(back_populates="assets")

    __table_args__ = (
        UniqueConstraint("design_id", "variant_key", name="uq_design_assets_variant"),
        Index("idx_design_assets_design", "design_id"),
    )


# -----------------------------------------------------------------------------
# محصول قابل فروش = طرح + نوع جسم (دسته مادر)؛ slug یکتا برای سئو
# -----------------------------------------------------------------------------
class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    design_id: Mapped[int] = mapped_column(ForeignKey("designs.id", ondelete="CASCADE"), nullable=False)
    parent_category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    slug: Mapped[str] = mapped_column(String(220), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    base_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    compare_at_price: Mapped[float | None] = mapped_column(Numeric(12, 2))
    sku_prefix: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    meta_title: Mapped[str | None] = mapped_column(String(255))
    meta_description: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    size_guide_json: Mapped[dict | None] = mapped_column(JSON)
    published_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    design: Mapped["Design"] = relationship(back_populates="products")
    parent_category: Mapped["Category"] = relationship(back_populates="products")
    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order"
    )
    variations: Mapped[list["ProductVariation"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("design_id", "parent_category_id", name="uq_products_design_parent_cat"),
        CheckConstraint("status IN ('draft','published')", name="ck_products_status"),
        CheckConstraint("base_price >= 0", name="ck_products_base_price"),
        Index("idx_products_design", "design_id"),
        Index("idx_products_parent_cat", "parent_category_id"),
        Index("idx_products_status", "status"),
    )


# -----------------------------------------------------------------------------
# تصاویر محصول — گالری مستقل از طرح؛ در نبود تصویر، از طرح fallback می‌شود
# -----------------------------------------------------------------------------
class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(64), default="image/webp", nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    product: Mapped["Product"] = relationship(back_populates="images")

    __table_args__ = (Index("idx_product_images_product", "product_id"),)


# -----------------------------------------------------------------------------
# SKU و موجودی؛ قیمت نهایی = base_price محصول + price_delta تنوع
# -----------------------------------------------------------------------------
class ProductVariation(Base):
    __tablename__ = "product_variations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    sku: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    color_name: Mapped[str | None] = mapped_column(String(64))
    color_hex: Mapped[str | None] = mapped_column(String(7))
    size_label: Mapped[str | None] = mapped_column(String(32))
    price_delta: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    product: Mapped["Product"] = relationship(back_populates="variations")
    cart_items: Mapped[list["CartItem"]] = relationship(back_populates="variation")

    __table_args__ = (
        CheckConstraint("stock_quantity >= 0", name="ck_variations_stock"),
        Index("idx_variations_product", "product_id"),
    )


# -----------------------------------------------------------------------------
# سبد — یا کاربر لاگین یا سشن مهمان (شرط XOR در پایگاه)
# -----------------------------------------------------------------------------
class Cart(Base):
    __tablename__ = "carts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    session_id: Mapped[str | None] = mapped_column(String(128))
    currency: Mapped[str] = mapped_column(String(8), default="IRT", nullable=False)

    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User | None"] = relationship(back_populates="carts")
    items: Mapped[list["CartItem"]] = relationship(back_populates="cart", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL AND session_id IS NULL) OR (user_id IS NULL AND session_id IS NOT NULL)",
            name="ck_carts_user_xor_session",
        ),
    )


# -----------------------------------------------------------------------------
# خط سبد — ارجاع به variation تا قیمت از محصول/Tنوع خوانده شود
# -----------------------------------------------------------------------------
class CartItem(Base):
    __tablename__ = "cart_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cart_id: Mapped[int] = mapped_column(ForeignKey("carts.id", ondelete="CASCADE"), nullable=False)
    variation_id: Mapped[int] = mapped_column(
        ForeignKey("product_variations.id", ondelete="CASCADE"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    customization_json: Mapped[dict | None] = mapped_column(JSON)
    customization_key: Mapped[str] = mapped_column(String(64), default="", nullable=False)

    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    cart: Mapped["Cart"] = relationship(back_populates="items")
    variation: Mapped["ProductVariation"] = relationship(back_populates="cart_items")

    __table_args__ = (
        UniqueConstraint("cart_id", "variation_id", "customization_key", name="uq_cart_items_cart_var_custom"),
        CheckConstraint("quantity > 0", name="ck_cart_items_quantity"),
        Index("idx_cart_items_cart", "cart_id"),
    )


# -----------------------------------------------------------------------------
# تخفیف — اعمال واقعی در چک‌اوت هنوز در اسکلت ساده نشده است
# -----------------------------------------------------------------------------
class Coupon(Base):
    __tablename__ = "coupons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    discount_type: Mapped[str] = mapped_column(String(16), nullable=False)
    discount_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    min_cart_total: Mapped[float | None] = mapped_column(Numeric(12, 2))
    max_uses: Mapped[int | None] = mapped_column(Integer)
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    starts_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    orders: Mapped[list["Order"]] = relationship(back_populates="coupon")

    __table_args__ = (
        CheckConstraint("discount_type IN ('percent','fixed')", name="ck_coupons_discount_type"),
        CheckConstraint("discount_value >= 0", name="ck_coupons_discount_value"),
    )


# -----------------------------------------------------------------------------
# سفارش — snapshot سبد در cart_snapshot برای حفظ تاریخچهٔ قیمت
# -----------------------------------------------------------------------------
class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tracking_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    cart_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    discount_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    shipping_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    coupon_id: Mapped[int | None] = mapped_column(ForeignKey("coupons.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(32), default="pending_payment", nullable=False)
    shipping_address: Mapped[dict | None] = mapped_column(JSON)

    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User | None"] = relationship(back_populates="orders")
    coupon: Mapped["Coupon | None"] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending_payment','paid','processing','shipped','delivered','cancelled','failed')",
            name="ck_orders_status",
        ),
        Index("idx_orders_user", "user_id"),
        Index("idx_orders_tracking", "tracking_code"),
    )


# -----------------------------------------------------------------------------
# خط سفارش — snapshot عنوان/SKU؛ variation_id با RESTRICT برای حفظ یکپارچگی
# -----------------------------------------------------------------------------
class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    variation_id: Mapped[int] = mapped_column(
        ForeignKey("product_variations.id", ondelete="RESTRICT"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    title_snapshot: Mapped[str] = mapped_column(String(255), nullable=False)
    sku_snapshot: Mapped[str] = mapped_column(String(128), nullable=False)
    customization_json: Mapped[dict | None] = mapped_column(JSON)

    order: Mapped["Order"] = relationship(back_populates="items")
    variation: Mapped["ProductVariation"] = relationship()

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_items_quantity"),
        Index("idx_order_items_order", "order_id"),
    )


# -----------------------------------------------------------------------------
# تراکنش درگاه — ذخیرهٔ خام درخواست/کالبک برای دیباگ و پشتیبانی
# -----------------------------------------------------------------------------
class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    gateway: Mapped[str] = mapped_column(String(32), nullable=False)
    gateway_ref: Mapped[str | None] = mapped_column(String(255))
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="created", nullable=False)
    receipt_storage_key: Mapped[str | None] = mapped_column(String(512))
    customer_note: Mapped[str | None] = mapped_column(String(500))
    admin_note: Mapped[str | None] = mapped_column(String(500))
    raw_request: Mapped[dict | None] = mapped_column(JSON)
    raw_callback: Mapped[dict | None] = mapped_column(JSON)

    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    reviewed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))

    order: Mapped["Order"] = relationship(back_populates="payments")

    __table_args__ = (
        CheckConstraint(
            "status IN ('created','redirected','verified','failed','refunded')",
            name="ck_payments_status",
        ),
        Index("idx_payments_order", "order_id"),
    )


# -----------------------------------------------------------------------------
# OTP ورود — کد به صورت هش ذخیره شود؛ هرگز plain text در DB نگه ندارید
# -----------------------------------------------------------------------------
class OtpCode(Base):
    __tablename__ = "otp_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    code_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    expires_at: Mapped[object] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_otp_phone", "phone"),)


from app.models.blog import BlogCategory, BlogPost, BlogTag  # noqa: E402, F401
from app.models.business import BusinessLanding, BusinessQuoteRequest  # noqa: E402, F401
from app.models.analytics import AnalyticsEvent, AnalyticsPageView, AnalyticsSession  # noqa: E402, F401
from app.models.chat import ChatCannedResponse, ChatConversation, ChatMessage, ChatPageVisit  # noqa: E402, F401
from app.models.customizer import CreatorEarning, DesignArtClip, ProductTemplate  # noqa: E402, F401
from app.models.header_nav import HeaderNavLink  # noqa: E402, F401
from app.models.home_banner import HomeBanner  # noqa: E402, F401
from app.models.ai import AiGenerationLog, AiSuggestedPrompt, AiTool  # noqa: E402, F401
from app.models.enrichment import ProductEnrichmentCandidate, ProductEnrichmentJob  # noqa: E402, F401
from app.models.site_setting import SiteSetting  # noqa: E402, F401
