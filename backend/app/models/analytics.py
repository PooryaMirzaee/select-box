"""مدل‌های آنالیتیکس داخلی — نشست، بازدید صفحه، رویداد."""

from __future__ import annotations

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AnalyticsSession(Base):
    __tablename__ = "analytics_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    visitor_id: Mapped[str | None] = mapped_column(String(64), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    referrer_url: Mapped[str | None] = mapped_column(String(512))
    landing_path: Mapped[str | None] = mapped_column(String(512))
    utm_source: Mapped[str | None] = mapped_column(String(120))
    utm_medium: Mapped[str | None] = mapped_column(String(120))
    utm_campaign: Mapped[str | None] = mapped_column(String(120))
    browser: Mapped[str | None] = mapped_column(String(64))
    os_name: Mapped[str | None] = mapped_column(String(64))
    device_type: Mapped[str | None] = mapped_column(String(32))
    screen_width: Mapped[int | None] = mapped_column(Integer)
    page_view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    event_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_analytics_sess_started", "started_at"),)


class AnalyticsPageView(Base):
    __tablename__ = "analytics_page_views"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    path: Mapped[str] = mapped_column(String(512), nullable=False)
    page_title: Mapped[str | None] = mapped_column(String(255))
    referrer_path: Mapped[str | None] = mapped_column(String(512))
    viewed_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_analytics_pv_viewed", "viewed_at"),
        Index("idx_analytics_pv_path_viewed", "path", "viewed_at"),
    )


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    event_name: Mapped[str] = mapped_column(String(64), nullable=False)
    path: Mapped[str | None] = mapped_column(String(512))
    payload: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_analytics_ev_name_created", "event_name", "created_at"),
    )
