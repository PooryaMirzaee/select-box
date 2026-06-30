"""مدل‌های سبد خرید برای خطوط و بدنهٔ پاسخ."""

from pydantic import BaseModel, Field


class CartLineIn(BaseModel):
    """ورودی افزودن به سبد."""

    variation_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    customization: dict | None = None


class CartLineOut(BaseModel):
    """یک خط سبد با قیمت واحد محاسبه‌شده."""

    id: int
    variation_id: int
    quantity: int
    sku: str
    title: str
    unit_price: str
    customization: dict | None = None
    preview_url: str | None = None
    is_custom: bool = False


class CartOut(BaseModel):
    """کل سبد با ارز."""

    id: int
    currency: str
    items: list[CartLineOut]
