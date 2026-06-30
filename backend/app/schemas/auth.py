from pydantic import BaseModel, Field


class AdminLoginIn(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)
    password: str = Field(..., min_length=4)


class OtpRequestIn(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)


class OtpVerifyIn(BaseModel):
    phone: str
    code: str = Field(..., min_length=4, max_length=8)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    phone: str
    full_name: str | None = None
    user_id: int | None = None


class MeOut(BaseModel):
    id: int
    phone: str
    full_name: str | None
    email: str | None
    role: str
    is_active: bool
    is_creator: bool
    studio_slug: str | None = None
    order_count: int = 0
    created_at: str | None = None


class ProfilePatchIn(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)


class CartMergeIn(BaseModel):
    session_id: str = Field(..., min_length=8, max_length=128)
