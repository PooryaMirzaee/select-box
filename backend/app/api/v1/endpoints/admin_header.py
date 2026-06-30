"""مدیریت لینک‌های هدر فروشگاه."""

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.models.header_nav import HeaderNavLink
from app.schemas.header_nav import HeaderNavLinkIn, HeaderNavLinkOut
from app.services import header_nav as header_nav_service

router = APIRouter(
    prefix="/admin/header-nav",
    tags=["admin-header"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=list[HeaderNavLinkOut])
def list_header_nav(db: Session = Depends(get_db)):
    return header_nav_service.list_links(db)


@router.post("", response_model=HeaderNavLinkOut)
def create_header_nav(body: HeaderNavLinkIn, db: Session = Depends(get_db)):
    data = body.model_dump()
    if data["sort_order"] == 0:
        data["sort_order"] = header_nav_service.next_sort_order(db)
    link = HeaderNavLink(**data)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.patch("/{link_id}", response_model=HeaderNavLinkOut)
def update_header_nav(link_id: int, body: HeaderNavLinkIn, db: Session = Depends(get_db)):
    link = db.get(HeaderNavLink, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    for key, value in body.model_dump().items():
        setattr(link, key, value)
    db.commit()
    db.refresh(link)
    return link


@router.delete("/{link_id}")
def delete_header_nav(link_id: int, db: Session = Depends(get_db)):
    link = db.get(HeaderNavLink, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()
    return {"ok": True}


@router.post("/reorder", response_model=list[HeaderNavLinkOut])
def reorder_header_nav(ids: list[int] = Body(...), db: Session = Depends(get_db)):
    if not ids:
        return header_nav_service.list_links(db)
    rows = db.scalars(select(HeaderNavLink).where(HeaderNavLink.id.in_(ids))).all()
    by_id = {row.id: row for row in rows}
    order = 10
    for link_id in ids:
        link = by_id.get(link_id)
        if not link:
            continue
        link.sort_order = order
        order += 10
    db.commit()
    return header_nav_service.list_links(db)
