from pydantic import BaseModel, Field


class HeaderNavLinkIn(BaseModel):
    label_fa: str = Field(min_length=1, max_length=120)
    href: str = Field(min_length=1, max_length=512)
    sort_order: int = 0
    is_active: bool = True
    open_in_new_tab: bool = False


class HeaderNavLinkOut(BaseModel):
    id: int
    label_fa: str
    href: str
    sort_order: int
    is_active: bool
    open_in_new_tab: bool

    model_config = {"from_attributes": True}
