"""بنرهای صفحهٔ اول فروشگاه."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HomeBanner(Base):
    __tablename__ = "home_banners"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title_fa: Mapped[str | None] = mapped_column(String(255))
    subtitle_fa: Mapped[str | None] = mapped_column(Text)
    eyebrow_fa: Mapped[str | None] = mapped_column(String(120))
    cta_label: Mapped[str | None] = mapped_column(String(120))
    cta_href: Mapped[str | None] = mapped_column(String(512))
    image_key: Mapped[str | None] = mapped_column(String(512))
    image_mobile_key: Mapped[str | None] = mapped_column(String(512))
    # hero = اسلایدر بالای صفحه | promo = بنر میان صفحه
    placement: Mapped[str] = mapped_column(String(16), default="hero", nullable=False)
    # image = تصویر | text = کارت متنی بدون تصویر
    variant: Mapped[str] = mapped_column(String(16), default="image", nullable=False)
    text_align: Mapped[str] = mapped_column(String(16), default="start", nullable=False)
    overlay_opacity: Mapped[int] = mapped_column(Integer, default=35, nullable=False)
    # default = دکمه حاشیه‌دار | primary = دکمه پررنگ
    accent_style: Mapped[str] = mapped_column(String(16), default="default", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    open_in_new_tab: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
