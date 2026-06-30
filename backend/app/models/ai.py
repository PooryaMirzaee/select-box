"""لاگ تولید تصویر AI، پرامپت‌های پیشنهادی و ابزارهای آماده."""

from __future__ import annotations

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AiGenerationLog(Base):
    __tablename__ = "ai_generation_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    prompt_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    prompt_preview: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    model: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="success")
    error_message: Mapped[str | None] = mapped_column(Text)
    storage_key: Mapped[str | None] = mapped_column(String(512))
    aspect_ratio: Mapped[str] = mapped_column(String(16), nullable=False, default="1:1")
    style_preset: Mapped[str | None] = mapped_column(String(64))  # legacy
    generation_type: Mapped[str] = mapped_column(String(16), nullable=False, default="text")
    tool_id: Mapped[int | None] = mapped_column(ForeignKey("ai_tools.id", ondelete="SET NULL"))
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_ai_gen_user_created", "user_id", "created_at"),
        Index("idx_ai_gen_ip_created", "ip_address", "created_at"),
        Index("idx_ai_gen_created", "created_at"),
        Index("idx_ai_gen_user_hash_created", "user_id", "prompt_hash", "created_at"),
        Index("idx_ai_gen_status_created", "status", "created_at"),
    )


class AiSuggestedPrompt(Base):
    __tablename__ = "ai_suggested_prompts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    text: Mapped[str] = mapped_column(String(400), nullable=False)
    label: Mapped[str | None] = mapped_column(String(80))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_ai_suggested_enabled_order", "enabled", "sort_order"),)


class AiTool(Base):
    """ابزار آماده — تبدیل عکس آپلودشده کاربر با پرامپت از پیش‌تعریف‌شده."""

    __tablename__ = "ai_tools"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(String(240))
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("idx_ai_tools_enabled_order", "enabled", "sort_order"),)
