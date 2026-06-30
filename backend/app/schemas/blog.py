"""اسکیمای Pydantic وبلاگ."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class BlogTagOut(BaseModel):
    id: int
    slug: str
    name_fa: str

    model_config = {"from_attributes": True}


class BlogTagIn(BaseModel):
    slug: str = Field(..., min_length=1, max_length=80)
    name_fa: str = Field(..., min_length=1, max_length=80)


class BlogCategoryOut(BaseModel):
    id: int
    slug: str
    name_fa: str
    description: str | None = None
    post_count: int = 0

    model_config = {"from_attributes": True}


class BlogCategoryAdmin(BaseModel):
    id: int
    slug: str
    name_fa: str
    description: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    sort_order: int = 0
    post_count: int = 0

    model_config = {"from_attributes": True}


class BlogCategoryIn(BaseModel):
    slug: str = Field(..., min_length=1, max_length=80)
    name_fa: str = Field(..., min_length=1, max_length=120)
    description: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    sort_order: int = 0


class BlogAuthorOut(BaseModel):
    id: int
    display_name: str

    model_config = {"from_attributes": True}


class BlogPostSummary(BaseModel):
    id: int
    slug: str
    title: str
    excerpt: str | None = None
    cover_image_url: str | None = None
    category: BlogCategoryOut | None = None
    tags: list[BlogTagOut] = []
    author: BlogAuthorOut | None = None
    is_featured: bool = False
    reading_time_minutes: int = 1
    published_at: datetime | None = None


class BlogPostDetail(BlogPostSummary):
    content_html: str
    meta_title: str | None = None
    meta_description: str | None = None
    view_count: int = 0
    related: list[BlogPostSummary] = []


class BlogPostListResponse(BaseModel):
    items: list[BlogPostSummary]
    total: int
    page: int
    page_size: int


class BlogPostAdmin(BaseModel):
    id: int
    slug: str
    title: str
    excerpt: str | None = None
    content_html: str
    cover_image_key: str | None = None
    cover_image_url: str | None = None
    category_id: int | None = None
    category: BlogCategoryOut | None = None
    tag_ids: list[int] = []
    tags: list[BlogTagOut] = []
    author_id: int | None = None
    author: BlogAuthorOut | None = None
    status: str
    is_featured: bool = False
    reading_time_minutes: int = 1
    meta_title: str | None = None
    meta_description: str | None = None
    published_at: datetime | None = None
    view_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None


class BlogPostIn(BaseModel):
    slug: str = Field(..., min_length=1, max_length=160)
    title: str = Field(..., min_length=1, max_length=255)
    excerpt: str | None = None
    content_html: str = ""
    category_id: int | None = None
    tag_ids: list[int] = []
    status: str = "draft"
    is_featured: bool = False
    meta_title: str | None = None
    meta_description: str | None = None
    published_at: datetime | None = None


class BlogPostPatch(BaseModel):
    slug: str | None = None
    title: str | None = None
    excerpt: str | None = None
    content_html: str | None = None
    category_id: int | None = None
    tag_ids: list[int] | None = None
    status: str | None = None
    is_featured: bool | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    published_at: datetime | None = None
