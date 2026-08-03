"""تنظیمات صفحهٔ اصلی فروشگاه."""

from pydantic import BaseModel, Field


class HomepageCta(BaseModel):
    label: str = ""
    href: str = ""


class HomepageHeroConfig(BaseModel):
    badge: str = "فروشگاه دشتستان"
    title: str = "لوازم خانگی و سبک زندگی"
    subtitle: str = "خرید آنلاین با گارانتی اصلی، قیمت رقابتی و ارسال سریع."
    primary_cta: HomepageCta = Field(default_factory=lambda: HomepageCta(label="مشاهده کاتالوگ", href="/catalog"))
    secondary_cta: HomepageCta = Field(default_factory=lambda: HomepageCta(label="سفارش سازمانی", href="/business"))
    mobile_categories_cta: HomepageCta = Field(default_factory=lambda: HomepageCta(label="مرور دسته‌ها", href="/browse"))
    categories_link_label: str = "همه دسته‌ها"
    categories_link_href: str = "/browse"
    show_categories_bento: bool = True
    category_limit: int = Field(default=6, ge=1, le=12)


class HomepageFeaturedConfig(BaseModel):
    title: str = "منتخب"
    subtitle: str = "پیشنهادهای هفته"
    catalog_label: str = "کاتالوگ ←"
    catalog_href: str = "/catalog"
    product_count: int = Field(default=6, ge=1, le=24)
    # latest = جدیدترین‌ها | manual = انتخاب دستی | category = یک دسته
    mode: str = Field(default="latest", pattern="^(latest|manual|category)$")
    product_ids: list[int] = Field(default_factory=list, max_length=48)
    category_id: int | None = None
    # سازگاری با تنظیمات قدیمی
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
