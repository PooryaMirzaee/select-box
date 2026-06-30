"""لندینگ و درخواست سفارش سازمانی (B2B)."""

from __future__ import annotations

from sqlalchemy import Boolean, CheckConstraint, DateTime, Index, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BusinessLanding(Base):
    __tablename__ = "business_landings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name_fa: Mapped[str] = mapped_column(String(120), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(Text)
    hero_badge: Mapped[str | None] = mapped_column(String(120))
    meta_title: Mapped[str | None] = mapped_column(String(255))
    meta_description: Mapped[str | None] = mapped_column(Text)
    hero_image_key: Mapped[str | None] = mapped_column(String(512))
    min_order_qty: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    features: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    pricing_tiers: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    use_cases: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    process_steps: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    faqs: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    stats: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    gallery_images: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    gallery_title: Mapped[str | None] = mapped_column(String(255))
    trust_logos: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    trust_badges: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    testimonials: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    trust_section_title: Mapped[str | None] = mapped_column(String(255))
    cta_primary: Mapped[str] = mapped_column(String(120), default="درخواست پیش‌فاکتور", nullable=False)
    cta_secondary: Mapped[str | None] = mapped_column(String(120))
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BusinessQuoteRequest(Base):
    __tablename__ = "business_quote_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    product_type: Mapped[str] = mapped_column(String(32), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    needs_custom_design: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False)
    admin_notes: Mapped[str | None] = mapped_column(Text)
    landing_slug: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_business_quote_quantity"),
        CheckConstraint(
            "status IN ('pending','reviewing','quoted','accepted','closed')",
            name="ck_business_quote_status",
        ),
        Index("idx_business_quote_status", "status"),
        Index("idx_business_quote_created", "created_at"),
    )
