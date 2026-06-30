"""مدل‌های سفارشی‌سازی محصول و بازارچهٔ طرح کاربران."""

from __future__ import annotations

from sqlalchemy import (
    CheckConstraint,
    DateTime,
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


class ProductTemplate(Base):
    """قالب محصول قابل سفارشی‌سازی — تیشرت، ماگ و انواع بعدی."""

    __tablename__ = "product_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name_fa: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    base_product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL")
    )
    base_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    config_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    category: Mapped["Category"] = relationship()  # noqa: F821
    base_product: Mapped["Product | None"] = relationship()  # noqa: F821

    __table_args__ = (
        CheckConstraint("base_price >= 0", name="ck_product_templates_price"),
        Index("idx_product_templates_active", "is_active"),
    )


class DesignArtClip(Base):
    """آرت/کلipart آماده برای Design Lab — مدیریت از ادمین."""

    __tablename__ = "design_art_clips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_fa: Mapped[str] = mapped_column(String(64), nullable=False, default="عمومی")
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(64), default="image/png", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_design_art_clips_active", "is_active", "category_fa"),)


class CreatorEarning(Base):
    """سهم فروشندهٔ طرح — پس از پرداخت سفارش ثبت می‌شود."""

    __tablename__ = "creator_earnings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    design_id: Mapped[int] = mapped_column(ForeignKey("designs.id", ondelete="CASCADE"), nullable=False)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    order_item_id: Mapped[int] = mapped_column(
        ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False
    )
    sale_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    commission_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    commission_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    creator: Mapped["User"] = relationship()  # noqa: F821
    design: Mapped["Design"] = relationship()  # noqa: F821
    order: Mapped["Order"] = relationship()  # noqa: F821

    __table_args__ = (
        CheckConstraint("status IN ('pending','paid','cancelled')", name="ck_creator_earnings_status"),
        UniqueConstraint("order_item_id", name="uq_creator_earnings_order_item"),
        Index("idx_creator_earnings_creator", "creator_id"),
    )
