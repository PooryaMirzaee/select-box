"""مدل‌های وبلاگ — مقالات، دسته‌ها و برچسب‌ها."""

from __future__ import annotations

import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

blog_post_tags = Table(
    "blog_post_tags",
    Base.metadata,
    Column("post_id", ForeignKey("blog_posts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("blog_tags.id", ondelete="CASCADE"), primary_key=True),
)


class BlogPostStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    scheduled = "scheduled"


class BlogCategory(Base):
    __tablename__ = "blog_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name_fa: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    meta_title: Mapped[str | None] = mapped_column(String(255))
    meta_description: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    posts: Mapped[list["BlogPost"]] = relationship(back_populates="category")


class BlogTag(Base):
    __tablename__ = "blog_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name_fa: Mapped[str] = mapped_column(String(80), nullable=False)

    posts: Mapped[list["BlogPost"]] = relationship(
        secondary=blog_post_tags, back_populates="tags"
    )


class BlogPost(Base):
    __tablename__ = "blog_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    excerpt: Mapped[str | None] = mapped_column(Text)
    content_html: Mapped[str] = mapped_column(Text, default="", nullable=False)
    cover_image_key: Mapped[str | None] = mapped_column(String(512))
    category_id: Mapped[int | None] = mapped_column(ForeignKey("blog_categories.id", ondelete="SET NULL"))
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    status: Mapped[BlogPostStatus] = mapped_column(
        Enum(BlogPostStatus, name="blog_post_status", native_enum=False, length=16),
        default=BlogPostStatus.draft,
        nullable=False,
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reading_time_minutes: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    meta_title: Mapped[str | None] = mapped_column(String(255))
    meta_description: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[object | None] = mapped_column(DateTime(timezone=True))
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    category: Mapped[BlogCategory | None] = relationship(back_populates="posts")
    author: Mapped["User | None"] = relationship("User", foreign_keys=[author_id])
    tags: Mapped[list[BlogTag]] = relationship(
        secondary=blog_post_tags, back_populates="posts"
    )

    __table_args__ = (
        Index("idx_blog_post_status_published", "status", "published_at"),
        Index("idx_blog_post_featured", "is_featured"),
    )
