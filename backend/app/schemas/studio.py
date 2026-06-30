"""اسکیمای استودیوی خالق."""

from pydantic import BaseModel, Field


class StudioPublic(BaseModel):
    id: int
    display_name: str
    studio_slug: str
    bio: str | None = None
    tagline: str | None = None
    accent_hex: str = "#c45c26"
    product_count: int = 0
    preview_image_url: str | None = None
    avatar_url: str | None = None
    header_url: str | None = None


class StudioProfileUpdateIn(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    studio_slug: str | None = Field(default=None, max_length=80)
    studio_bio: str | None = Field(default=None, max_length=2000)
    studio_tagline: str | None = Field(default=None, max_length=255)
    studio_accent_hex: str | None = Field(default=None, max_length=7)


class MyStudioOut(BaseModel):
    profile: StudioPublic
    full_name: str | None
    phone: str
    public_path: str
    published_count: int
    pending_count: int
    total_products: int
