from pydantic import BaseModel, Field


class DesignArtOut(BaseModel):
    id: int
    category_fa: str
    title: str
    url: str
    storage_key: str
    mime_type: str
    sort_order: int


class DesignArtAdminOut(DesignArtOut):
    is_active: bool


class DesignArtUpdateIn(BaseModel):
    category_fa: str | None = None
    title: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class DesignArtCreateIn(BaseModel):
    category_fa: str = Field(default="عمومی", max_length=64)
    title: str = Field(..., min_length=1, max_length=128)
    sort_order: int = 0
