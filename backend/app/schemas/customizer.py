"""اسکیمای API سفارشی‌سازی."""

from __future__ import annotations

from pydantic import BaseModel, Field


class CustomizationTransform(BaseModel):
    x: float = 0.0
    y: float = 0.0
    scale: float = 1.0
    rotation: float = 0.0


class CustomizationPayload(BaseModel):
    product_type: str
    artwork_url: str
    artwork_storage_key: str
    color_hex: str = "#1a1a20"
    color_name: str = "مشکی"
    size_label: str | None = None
    transform: CustomizationTransform = Field(default_factory=CustomizationTransform)
    title: str | None = None
    artwork_views: dict[str, str] | None = None
    preview_views: dict[str, str] | None = None
    views_draft: dict | None = None


class ProductTemplateOut(BaseModel):
    id: int
    slug: str
    name_fa: str
    description: str | None
    base_price: str
    config_json: dict
    category_slug: str | None = None
    default_variation_id: int | None = None


class TemplateConfigPatch(BaseModel):
    config_json: dict


class ProductTemplateCreateIn(BaseModel):
    slug: str = Field(..., min_length=2, max_length=64, pattern=r"^[a-z0-9-]+$")
    name_fa: str = Field(..., min_length=2, max_length=128)
    description: str | None = None
    base_price: float = Field(..., gt=0)
    category_slug: str | None = None
    config_json: dict = Field(default_factory=dict)
    sort_order: int = 0


class TemplateColorIn(BaseModel):
    name: str
    hex: str
    views: dict[str, str] | None = None


class TemplateFontIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    family: str = Field(..., min_length=1, max_length=128)


class CartLineCustomIn(BaseModel):
    variation_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    customization: CustomizationPayload | None = None


class PublishDesignIn(BaseModel):
    """طراح فقط عنوان و توضیح می‌فرستد؛ بقیه توسط ادمین."""

    title: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    thematic_category_id: int | None = None
    product_types: list[str] | None = None
    customization: CustomizationPayload
    customizations_by_type: dict[str, CustomizationPayload] | None = None
    commission_percent: float | None = Field(default=None, ge=0, le=50)
    status: str | None = None


class PublishDesignOut(BaseModel):
    design_id: int
    design_slug: str
    products: list[dict]
    message: str | None = None


class MyProductOut(BaseModel):
    id: int
    slug: str
    title: str
    description: str | None
    status: str
    design_id: int
    preview_url: str | None
    created_at: str | None


class MyDesignOut(BaseModel):
    """سازگاری قدیمی — همان MyProductOut."""

    id: int
    slug: str
    title: str
    description: str | None
    status: str
    product_type: str | None = None
    preview_url: str | None
    created_at: str | None
