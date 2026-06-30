from datetime import datetime

from pydantic import BaseModel, Field


class HomeBannerIn(BaseModel):
    title_fa: str | None = Field(default=None, max_length=255)
    subtitle_fa: str | None = None
    eyebrow_fa: str | None = Field(default=None, max_length=120)
    cta_label: str | None = Field(default=None, max_length=120)
    cta_href: str | None = Field(default=None, max_length=512)
    placement: str = Field(default="hero", pattern="^(hero|promo)$")
    variant: str = Field(default="image", pattern="^(image|text)$")
    text_align: str = Field(default="start", pattern="^(start|center)$")
    overlay_opacity: int = Field(default=35, ge=0, le=80)
    accent_style: str = Field(default="default", pattern="^(default|primary)$")
    sort_order: int = 0
    is_active: bool = True
    open_in_new_tab: bool = False
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class HomeBannerOut(BaseModel):
    id: int
    title_fa: str | None
    subtitle_fa: str | None
    eyebrow_fa: str | None
    cta_label: str | None
    cta_href: str | None
    image_url: str | None
    image_mobile_url: str | None
    placement: str
    variant: str
    text_align: str
    overlay_opacity: int
    accent_style: str
    sort_order: int
    open_in_new_tab: bool

    model_config = {"from_attributes": True}


class HomeBannerAdmin(HomeBannerOut):
    image_key: str | None
    image_mobile_key: str | None
    is_active: bool
    starts_at: datetime | None
    ends_at: datetime | None
