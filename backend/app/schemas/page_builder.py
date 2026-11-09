"""اسکیماهای صفحهٔ‌ساز (Puck) و ظاهر سایت."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ThemeAppearance(BaseModel):
    """توکن‌های ظاهری فروشگاه — روی CSS variables تزریق می‌شود."""

    accent: str = "#ff6a00"
    accent_hot: str = "#ef4056"
    accent_fg: str = "#ffffff"
    amazing_from: str = "#ff6a00"
    amazing_to: str = "#ff3d00"
    bg: str = "#f5f5f5"
    fg: str = "#212121"
    fg_muted: str = "#81858b"
    border: str = "#e0e0e2"
    card: str = "#ffffff"
    shop_max: str = "1336px"
    radius: str = "1rem"
    header_bg: str = "rgba(255, 255, 255, 0.96)"


class ThemeAppearancePatch(BaseModel):
    accent: str | None = None
    accent_hot: str | None = None
    accent_fg: str | None = None
    amazing_from: str | None = None
    amazing_to: str | None = None
    bg: str | None = None
    fg: str | None = None
    fg_muted: str | None = None
    border: str | None = None
    card: str | None = None
    shop_max: str | None = None
    radius: str | None = None
    header_bg: str | None = None


class PageBuilderData(BaseModel):
    """دادهٔ خام Puck — content/root/zones."""

    content: list[dict[str, Any]] = Field(default_factory=list)
    root: dict[str, Any] = Field(default_factory=dict)
    zones: dict[str, Any] | None = None


class PageBuilderBundle(BaseModel):
    slug: str
    data: PageBuilderData
    published: bool = True
    appearance: ThemeAppearance


class PageBuilderPut(BaseModel):
    data: PageBuilderData
    published: bool = True


class PageBuilderPublic(BaseModel):
    slug: str
    data: PageBuilderData
    published: bool
    appearance: ThemeAppearance
