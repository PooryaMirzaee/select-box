"""ادمین — صفحهٔ‌ساز Puck و ظاهر فروشگاه."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.schemas.page_builder import (
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


@router.get("/pages/{slug}", response_model=PageBuilderPublic, response_model_exclude_none=True)
def get_page(slug: str, db: Session = Depends(get_db)):
    return pb.get_public(db, slug)


@router.put("/pages/{slug}", response_model=PageBuilderPublic, response_model_exclude_none=True)
def put_page(slug: str, body: PageBuilderPut, db: Session = Depends(get_db)):
    return pb.put_page(db, slug, body)
