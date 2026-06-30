"""تنظیمات فروشگاه — key/value در پایگاه برای پنل ادمین."""

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SiteSetting(Base):
    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[dict | str | int | float | bool | None] = mapped_column(JSON, nullable=False)
