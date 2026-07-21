from pydantic import BaseModel, Field


class CategoryIn(BaseModel):
    parent_id: int | None = None
    slug: str
    name_fa: str
    meta_title: str | None = None
    meta_description: str | None = None
    sort_order: int = 0
    is_active: bool = True


class CategoryOut(BaseModel):
    id: int
    parent_id: int | None
    slug: str
    name_fa: str
    meta_title: str | None = None
    meta_description: str | None = None
    icon_url: str | None = None
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class DesignAssetOut(BaseModel):
    id: int
    design_id: int
    variant_key: str
    mime_type: str
    storage_key: str
    url: str
    sort_order: int


class CouponIn(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    min_cart_total: float | None = None
    max_uses: int | None = None
    is_active: bool = True


class CouponOut(BaseModel):
    id: int
    code: str
    discount_type: str
    discount_value: str
    min_cart_total: str | None
    max_uses: int | None
    used_count: int
    is_active: bool


class DesignIn(BaseModel):
    code: str
    title: str
    slug: str
    thematic_category_id: int
    description: str | None = None
    status: str = "draft"


class DesignOut(BaseModel):
    id: int
    code: str
    title: str
    slug: str
    thematic_category_id: int
    description: str | None
    status: str

    model_config = {"from_attributes": True}


class ProductImageOut(BaseModel):
    id: int
    product_id: int
    storage_key: str
    mime_type: str
    alt_text: str | None
    sort_order: int
    url: str


class SizeGuideIn(BaseModel):
    enabled: bool = False
    title: str = "مشخصات فنی"
    intro: str = ""
    image_key: str | None = None
    columns: list[str] = Field(default_factory=lambda: ["ویژگی", "مقدار"])
    rows: list[list[str]] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class ProductIn(BaseModel):
    design_id: int | None = None
    parent_category_id: int
    slug: str
    title: str
    base_price: float
    compare_at_price: float | None = None
    sku_prefix: str | None = None
    status: str = "draft"
    meta_title: str | None = None
    meta_description: str | None = None
    description: str | None = None
    size_guide_json: SizeGuideIn | None = None


class ProductUpdateIn(BaseModel):
    design_id: int | None = None
    parent_category_id: int | None = None
    slug: str | None = None
    title: str | None = None
    base_price: float | None = None
    compare_at_price: float | None = None
    sku_prefix: str | None = None
    status: str | None = None
    meta_title: str | None = None
    meta_description: str | None = None
    description: str | None = None
    size_guide_json: SizeGuideIn | None = None


class VariationBulkIn(BaseModel):
    sku_prefix: str
    colors: list[dict] = Field(default_factory=list)  # [{name, hex?}]
    sizes: list[str] = Field(default_factory=list)
    stock_quantity: int = 10
    price_delta: float = 0


class BulkIdsIn(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=500)


class BulkDeleteFailedItem(BaseModel):
    id: int
    reason: str


class BulkDeleteOut(BaseModel):
    deleted: list[int]
    failed: list[BulkDeleteFailedItem]
    deleted_count: int


class ProductAdminOut(BaseModel):
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
    meta_title: str | None
    meta_description: str | None
    description: str | None = None
    size_guide_json: dict | None = None
    thumbnail_url: str | None = None
    image_count: int = 0
    variation_count: int = 0
    published_at: str | None = None

    model_config = {"from_attributes": True}


class SizeGuideImageOut(BaseModel):
    image_key: str
    url: str


class VariationIn(BaseModel):
    sku: str
    color_name: str | None = None
    color_hex: str | None = None
    size_label: str | None = None
    price_delta: float = 0
    stock_quantity: int = 0
    is_active: bool = True


class VariationOut(BaseModel):
    id: int
    product_id: int
    sku: str
    color_name: str | None
    color_hex: str | None
    size_label: str | None
    price_delta: str
    stock_quantity: int
    is_active: bool

    model_config = {"from_attributes": True}


class StatusPatch(BaseModel):
    status: str
    """موجودی محصول ساده — فقط وقتی تنوع دستی ساخته نشده."""
    stock_quantity: int | None = Field(default=None, ge=0, le=1_000_000)


ORDER_STATUSES = (
    "pending_payment",
    "paid",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "failed",
)


class OrderStatusPatch(BaseModel):
    status: str


class PaymentReviewIn(BaseModel):
    admin_note: str | None = None

    def validate_status(self) -> str:
        if self.status not in ORDER_STATUSES:
            raise ValueError(f"status must be one of {ORDER_STATUSES}")
        return self.status


class OrderItemOut(BaseModel):
    id: int
    variation_id: int
    quantity: int
    unit_price: str
    title_snapshot: str
    sku_snapshot: str
    is_custom: bool = False
    preview_url: str | None = None
    design_id: int | None = None
    product_id: int | None = None


class PaymentAdminOut(BaseModel):
    id: int
    gateway: str
    gateway_ref: str | None
    amount: str
    status: str
    receipt_url: str | None = None
    customer_note: str | None = None
    admin_note: str | None = None
    reviewed_at: str | None = None
    created_at: str | None


class OrderAdminListItem(BaseModel):
    id: int
    tracking_code: str
    status: str
    total: str
    subtotal: str
    item_count: int
    customer_name: str | None = None
    customer_phone: str | None = None
    created_at: str | None


class OrderAdminDetail(BaseModel):
    id: int
    tracking_code: str
    status: str
    subtotal: str
    discount_total: str
    shipping_total: str
    total: str
    shipping_address: dict | None
    cart_snapshot: dict
    items: list[OrderItemOut]
    payments: list[PaymentAdminOut]
    coupon_code: str | None = None
    created_at: str | None
    updated_at: str | None


class DashboardOut(BaseModel):
    products_published: int
    products_draft: int
    designs: int
    orders: int
    revenue_paid: str
