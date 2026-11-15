"""ادمین — صفحهٔ‌ساز Puck و ظاهر فروشگاه."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.schemas.page_builder import (
    PageBuilderCreate,
    PageBuilderData,
    PageBuilderListItem,
    PageBuilderPublic,
    PageBuilderPut,
    ThemeAppearance,
    ThemeAppearancePatch,
)
from app.services import page_builder as pb

router = APIRouter(
    prefix="/admin/page-builder",
    tags=["admin-page-builder"],
    dependencies=[Depends(require_admin)],
)


@router.get("/appearance", response_model=ThemeAppearance)
def get_appearance(db: Session = Depends(get_db)):
    return pb.get_appearance(db)


@router.patch("/appearance", response_model=ThemeAppearance)
def patch_appearance(body: ThemeAppearancePatch, db: Session = Depends(get_db)):
    return pb.patch_appearance(db, body)


@router.get("/pages", response_model=list[PageBuilderListItem])
def list_pages(db: Session = Depends(get_db)):
    return pb.list_pages(db)


@router.post("/pages", response_model=PageBuilderPublic, response_model_exclude_none=True)
def create_page(body: PageBuilderCreate, db: Session = Depends(get_db)):
    return pb.create_page(db, body)


@router.get("/pages/{slug}", response_model=PageBuilderPublic, response_model_exclude_none=True)
def get_page(slug: str, db: Session = Depends(get_db)):
    page = pb.get_page_raw(db, slug, missing_ok=False)
    data = page["data"]
    if isinstance(data, dict) and data.get("zones") is None:
        data = {k: v for k, v in data.items() if k != "zones"}
    return PageBuilderPublic(
        slug=page["slug"],
        title=page.get("title"),
        data=PageBuilderData.model_validate(data),
        published=bool(page["published"]),
        appearance=pb.get_appearance(db),
    )


@router.put("/pages/{slug}", response_model=PageBuilderPublic, response_model_exclude_none=True)
def put_page(slug: str, body: PageBuilderPut, db: Session = Depends(get_db)):
    return pb.put_page(db, slug, body)


@router.delete("/pages/{slug}")
def delete_page(slug: str, db: Session = Depends(get_db)):
    return pb.delete_page(db, slug)
