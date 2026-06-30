"""اسکیمای Product API v3 ترب."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class TorobProductsRequest(BaseModel):
    page_urls: list[str] | None = None
    page_uniques: list[str] | None = None
    page: int | None = Field(default=None, ge=1)
    sort: Literal["date_added_desc", "date_updated_desc"] | None = None

    @model_validator(mode="after")
    def exactly_one_mode(self) -> TorobProductsRequest:
        modes = [
            self.page_urls is not None,
            self.page_uniques is not None,
            self.page is not None or self.sort is not None,
        ]
        if sum(modes) != 1:
            raise ValueError("Provide exactly one of page_urls, page_uniques, or page+sort")
        if self.page is not None and not self.sort:
            raise ValueError("sort parameter is not provided")
        if self.sort is not None and self.page is None:
            raise ValueError("page parameter is not provided")
        if self.page_urls is not None and len(self.page_urls) < 1:
            raise ValueError("page_urls must contain at least one item")
        if self.page_uniques is not None and len(self.page_uniques) < 1:
            raise ValueError("page_uniques must contain at least one item")
        return self


class TorobProductOut(BaseModel):
    page_unique: str
    page_url: str
    title: str
    current_price: int
    availability: bool
    image_links: list[str]
    date_added: str
    subtitle: str | None = None
    product_group_id: str | None = None
    old_price: int | None = None
    category_name: str | None = None
    short_desc: str | None = None
    spec: dict[str, str] | None = None
    guarantee: str | None = None
    date_updated: str | None = None


class TorobProductsResponse(BaseModel):
    api_version: str = "torob_api_v3"
    current_page: int
    total: int
    max_pages: int
    products: list[TorobProductOut]


class TorobErrorResponse(BaseModel):
    error: str
