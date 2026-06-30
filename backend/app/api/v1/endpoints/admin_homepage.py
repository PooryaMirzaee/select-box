"""مدیریت یکپارچهٔ صفحهٔ اصلی."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.schemas.home_banner import HomeBannerAdmin
from app.schemas.homepage import HomepageConfig, HomepageConfigPatch
from app.services import home_banner as banner_service
from app.services import homepage as homepage_service

router = APIRouter(
    prefix="/admin/homepage",
    tags=["admin-homepage"],
    dependencies=[Depends(require_admin)],
)


class HomepageAdminBundle(HomepageConfig):
    banners_hero: list[HomeBannerAdmin]
    banners_promo: list[HomeBannerAdmin]


@router.get("", response_model=HomepageAdminBundle)
def get_homepage_admin(db: Session = Depends(get_db)):
    cfg = homepage_service.get_config(db)
    return HomepageAdminBundle(
        **cfg.model_dump(),
        banners_hero=banner_service.list_admin(db, placement="hero"),
        banners_promo=banner_service.list_admin(db, placement="promo"),
    )


@router.patch("", response_model=HomepageConfig)
def patch_homepage(body: HomepageConfigPatch, db: Session = Depends(get_db)):
    return homepage_service.patch_config(db, body)
