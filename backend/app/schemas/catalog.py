"""
Schemaهای Pydantic برای پاسخ/درخواست لایهٔ کاتالوگ.

جداسازی از مدل ORM تا قرارداد API پایدار بماند حتی اگر جداول عوض شوند.
"""

from pydantic import BaseModel, Field


class CategoryOut(BaseModel):
    """یک گره دسته بدون فرزند — برای استفادهٔ ترکیبی در آینده."""

    id: int
    parent_id: int | None
    slug: str
    name_fa: str
    sort_order: int

    model_config = {"from_attributes": True}


class CategoryTreeNode(CategoryOut):
    """گره درخت بازگشتی؛ از اندپوینت فعلی مستقیماً dict دستی برمی‌گردد ولی این مدل مرجع است."""

    children: list["CategoryTreeNode"] = Field(default_factory=list)


CategoryTreeNode.model_rebuild()


class DesignAssetOut(BaseModel):
    """دارایی طرح برای پنل ادمین یا گالری عمومی."""

    variant_key: str
    mime_type: str
    storage_key: str

    model_config = {"from_attributes": True}


class ProductSummary(BaseModel):
    """خلاصهٔ کارت محصول در لیست."""

    id: int
    slug: str
    title: str
    base_price: str
    status: str
    design_id: int
    parent_category_slug: str | None = None
    image_url: str | None = None


class VariationPublic(BaseModel):
    id: int
    sku: str
    color_name: str | None
    color_hex: str | None
    size_label: str | None
    price_delta: str
    stock_quantity: int
    unit_price: str


class RelatedProduct(BaseModel):
    """آیتم کراس‌سل هم‌طرح."""

    id: int
    slug: str
    title: str
    base_price: str


class SizeGuidePublic(BaseModel):
    enabled: bool = False
    title: str = "راهنمای سایز"
    intro: str = ""
    image_key: str | None = None
    image_url: str | None = None
    columns: list[str] = Field(default_factory=list)
    rows: list[list[str]] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class CreatorPublic(BaseModel):
    id: int
    display_name: str
    studio_slug: str
    bio: str | None = None
    tagline: str | None = None
    accent_hex: str = "#c45c26"
    product_count: int | None = None
    preview_image_url: str | None = None


class ProductDetail(BaseModel):
    """بدنهٔ صفحهٔ جزئیات محصول + متادیتای سئو و لیست related."""

    id: int
    slug: str
    title: str
    base_price: str
    compare_at_price: str | None
    status: str
    meta_title: str | None
    meta_description: str | None
    description: str | None = None
    size_guide: SizeGuidePublic | None = None
    design_id: int
    design_slug: str
    design_title: str
    default_sku: str | None
    in_stock: bool
    effective_price: str
    images: list[str]
    image_urls: list[str]
    variations: list[VariationPublic]
    related: list[RelatedProduct]
    breadcrumbs: list[dict] = []
    creator: CreatorPublic | None = None
