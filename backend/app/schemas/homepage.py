"""تنظیمات صفحهٔ اصلی فروشگاه."""

from pydantic import BaseModel, Field


class HomepageCta(BaseModel):
    label: str = ""
    href: str = ""


class HomepageHeroConfig(BaseModel):
    badge: str = "فروشگاه طرح‌محور"
    title: str = "دنیای خودت رو انتخاب کن"
    subtitle: str = "تیشرت و هودی با موضوع دلخواه — یا با Design Lab اثر خودت را بساز و سفارش بده."
    primary_cta: HomepageCta = Field(default_factory=lambda: HomepageCta(label="شروع Design Lab", href="/customize"))
    secondary_cta: HomepageCta = Field(default_factory=lambda: HomepageCta(label="ویترین خالقین", href="/studios"))
    mobile_categories_cta: HomepageCta = Field(default_factory=lambda: HomepageCta(label="مرور دسته‌ها", href="/browse"))
    categories_link_label: str = "همه دسته‌ها"
    categories_link_href: str = "/browse"
    show_categories_bento: bool = True
    category_limit: int = Field(default=6, ge=1, le=12)


class HomepageFeaturedConfig(BaseModel):
    title: str = "منتخب"
    subtitle: str = "طرح‌های تازه"
    catalog_label: str = "کاتالوگ ←"
    catalog_href: str = "/catalog"
    product_count: int = Field(default=6, ge=2, le=24)
    parent_slug: str | None = None


class HomepageSection(BaseModel):
    id: str
    enabled: bool = True


class HomepageConfig(BaseModel):
    sections: list[HomepageSection] = Field(
        default_factory=lambda: [
            HomepageSection(id="carousel"),
            HomepageSection(id="hero"),
            HomepageSection(id="featured"),
            HomepageSection(id="promo"),
        ]
    )
    hero: HomepageHeroConfig = Field(default_factory=HomepageHeroConfig)
    featured: HomepageFeaturedConfig = Field(default_factory=HomepageFeaturedConfig)
    show_promo_fallback: bool = True


class HomepageConfigPatch(BaseModel):
    sections: list[HomepageSection] | None = None
    hero: HomepageHeroConfig | None = None
    featured: HomepageFeaturedConfig | None = None
    show_promo_fallback: bool | None = None


class HomepagePublic(BaseModel):
    sections: list[HomepageSection]
    hero: HomepageHeroConfig
    featured: HomepageFeaturedConfig
    show_promo_fallback: bool
