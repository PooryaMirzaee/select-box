"""لینک‌های ناوبری هدر فروشگاه — قابل مدیریت از پنل ادمین."""

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HeaderNavLink(Base):
    __tablename__ = "header_nav_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    label_fa: Mapped[str] = mapped_column(String(120), nullable=False)
    href: Mapped[str] = mapped_column(String(512), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    open_in_new_tab: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
