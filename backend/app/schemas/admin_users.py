"""اسکیمای مدیریت کاربران و خالقین."""

from pydantic import BaseModel, Field


class UserAdminOut(BaseModel):
    id: int
    phone: str
    full_name: str | None
    email: str | None = None
    role: str
    is_active: bool
    is_creator: bool
    studio_slug: str | None = None
    created_at: str | None = None
    order_count: int | None = None
    product_count: int | None = None
    published_count: int | None = None
    pending_count: int | None = None
    total_earned: str | None = None
    sales_count: int | None = None


class UserAdminDetailOut(UserAdminOut):
    recent_orders: list[dict] = Field(default_factory=list)
    products: list[dict] | None = None
    studio: dict | None = None


class UserAdminUpdateIn(BaseModel):
    full_name: str | None = None
    email: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=6)


class StaffUserCreateIn(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern="^(admin|operator)$")
    full_name: str | None = None
