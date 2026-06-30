from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, Field


class ProductStatus(StrEnum):
    draft = "draft"
    published = "published"


class ProductSummary(BaseModel):
    id: int
    slug: str
    title: str
    base_price: str
    status: str
    design_id: int
    parent_category_slug: str | None = None
    image_url: str | None = None


class Variation(BaseModel):
    id: int
    sku: str
    color_name: str | None = None
    color_hex: str | None = None
    size_label: str | None = None
    price_delta: str
    stock_quantity: int
    unit_price: str


class ProductAdmin(BaseModel):
    id: int
    design_id: int
    parent_category_id: int
    thematic_category_id: int | None = None
    design_title: str | None = None
    design_code: str | None = None
    design_source_type: str | None = None
    slug: str
    title: str
    base_price: str
    compare_at_price: str | None = None
    status: str
    meta_title: str | None = None
    meta_description: str | None = None
    description: str | None = None
    thumbnail_url: str | None = None
    image_count: int = 0
    variation_count: int = 0
    published_at: str | None = None


class ProductDetail(BaseModel):
    id: int
    slug: str
    title: str
    base_price: str
    compare_at_price: str | None = None
    status: str
    meta_title: str | None = None
    meta_description: str | None = None
    description: str | None = None
    design_id: int
    design_slug: str
    design_title: str
    default_sku: str | None = None
    in_stock: bool
    effective_price: str
    images: list[str] = Field(default_factory=list)
    image_urls: list[str] = Field(default_factory=list)
    variations: list[Variation] = Field(default_factory=list)

    @property
    def primary_image_url(self) -> str | None:
        return self.image_urls[0] if self.image_urls else None

    @property
    def price_toman(self) -> int:
        return int(Decimal(self.effective_price))


class TokenResponse(BaseModel):
    access_token: str
    role: str
    phone: str
    full_name: str | None = None
    user_id: int


class PublishResultStatus(StrEnum):
    success = "success"
    skipped = "skipped"
    failed = "failed"
    pending = "pending"


class ChannelPublishResult(BaseModel):
    channel_id: str
    status: PublishResultStatus
    message: str = ""
    external_id: str | None = None
    external_url: str | None = None
    published_at: datetime | None = None
    metadata: dict = Field(default_factory=dict)
