from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    phone: str = ""
    password: str = ""


class LoginResponse(BaseModel):
    phone: str
    role: str
    logged_in: bool = True


class AuthStatusResponse(BaseModel):
    logged_in: bool
    phone: str | None = None
    role: str | None = None


class HealthResponse(BaseModel):
    api_ok: bool
    api_url: str
    api_status: str | None = None
    error: str | None = None


class PublishRequest(BaseModel):
    products: list[str] = Field(min_length=1)
    channels: list[str] = Field(min_length=1)
    dry_run: bool = False


class ChannelResultOut(BaseModel):
    channel_id: str
    status: str
    message: str
    external_url: str | None = None


class PublishRunOut(BaseModel):
    run_id: str
    product_id: int
    product_title: str
    product_slug: str
    results: list[ChannelResultOut]


class SettingsOut(BaseModel):
    api_base_url: str
    storefront_url: str
    has_token: bool
