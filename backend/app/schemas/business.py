"""اسکیمای API سفارش سازمانی."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class BusinessFeature(BaseModel):
    icon: str = "package"
    title: str
    description: str


class BusinessPricingTier(BaseModel):
    min_qty: int = Field(ge=1)
    unit_price_toman: int = Field(ge=0)
    label_fa: str


class BusinessUseCase(BaseModel):
    title: str
    description: str


class BusinessProcessStep(BaseModel):
    title: str
    description: str


class BusinessFaq(BaseModel):
    question: str
    answer: str


class BusinessStat(BaseModel):
    value: str
    label: str


class BusinessGalleryItem(BaseModel):
    id: str
    caption_fa: str | None = None
    sort_order: int = 0
    storage_key: str | None = None
    external_url: str | None = None
    image_url: str | None = None


class BusinessTrustLogo(BaseModel):
    name_fa: str
    storage_key: str | None = None
    logo_url: str | None = None


class BusinessTrustBadge(BaseModel):
    icon: str = "check"
    title: str
    description: str


class BusinessTestimonial(BaseModel):
    quote: str
    author_name: str
    author_role: str | None = None
    company: str | None = None
    rating: int = Field(default=5, ge=1, le=5)


class BusinessLandingPublic(BaseModel):
    slug: str
    name_fa: str
    title: str
    subtitle: str | None = None
    hero_badge: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    hero_image_url: str | None = None
    min_order_qty: int
    features: list[BusinessFeature]
    pricing_tiers: list[BusinessPricingTier]
    use_cases: list[BusinessUseCase]
    process_steps: list[BusinessProcessStep]
    faqs: list[BusinessFaq]
    stats: list[BusinessStat]
    gallery_images: list[BusinessGalleryItem]
    gallery_title: str | None = None
    trust_logos: list[BusinessTrustLogo]
    trust_badges: list[BusinessTrustBadge]
    testimonials: list[BusinessTestimonial]
    trust_section_title: str | None = None
    cta_primary: str
    cta_secondary: str | None = None

    model_config = {"from_attributes": True}


class BusinessHubPublic(BaseModel):
    hub: BusinessLandingPublic
    product_landings: list[BusinessLandingPublic]


class BusinessLandingAdmin(BusinessLandingPublic):
    id: int
    hero_image_key: str | None = None
    is_published: bool
    sort_order: int


class BusinessLandingPatch(BaseModel):
    name_fa: str | None = None
    title: str | None = None
    subtitle: str | None = None
    hero_badge: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    min_order_qty: int | None = Field(default=None, ge=1)
    features: list[BusinessFeature] | None = None
    pricing_tiers: list[BusinessPricingTier] | None = None
    use_cases: list[BusinessUseCase] | None = None
    process_steps: list[BusinessProcessStep] | None = None
    faqs: list[BusinessFaq] | None = None
    stats: list[BusinessStat] | None = None
    gallery_images: list[BusinessGalleryItem] | None = None
    gallery_title: str | None = None
    trust_logos: list[BusinessTrustLogo] | None = None
    trust_badges: list[BusinessTrustBadge] | None = None
    testimonials: list[BusinessTestimonial] | None = None
    trust_section_title: str | None = None
    cta_primary: str | None = None
    cta_secondary: str | None = None
    is_published: bool | None = None
    sort_order: int | None = None


class BusinessQuoteIn(BaseModel):
    company_name: str = Field(min_length=2, max_length=255)
    contact_name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=10, max_length=20)
    email: str | None = Field(default=None, max_length=255)
    product_type: str = Field(min_length=2, max_length=32)
    quantity: int = Field(ge=1)
    needs_custom_design: bool = False
    message: str | None = Field(default=None, max_length=2000)
    landing_slug: str | None = Field(default=None, max_length=32)


class BusinessQuoteOut(BaseModel):
    id: int
    tracking_ref: str
    message: str


class BusinessQuoteAdmin(BaseModel):
    id: int
    company_name: str
    contact_name: str
    phone: str
    email: str | None = None
    product_type: str
    quantity: int
    needs_custom_design: bool
    message: str | None = None
    status: str
    admin_notes: str | None = None
    landing_slug: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BusinessQuoteStatusPatch(BaseModel):
    status: str | None = None
    admin_notes: str | None = None
