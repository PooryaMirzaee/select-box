"""آرت آماده Design Lab."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.customizer import DesignArtClip
from app.services.storage import delete_upload, public_url


def art_clip_dict(row: DesignArtClip) -> dict:
    return {
        "id": row.id,
        "category_fa": row.category_fa,
        "title": row.title,
        "url": public_url(row.storage_key),
        "storage_key": row.storage_key,
        "mime_type": row.mime_type,
        "sort_order": row.sort_order,
    }


def list_art_library(db: Session, *, category: str | None = None) -> dict:
    q = (
        select(DesignArtClip)
        .where(DesignArtClip.is_active.is_(True))
        .order_by(DesignArtClip.category_fa, DesignArtClip.sort_order, DesignArtClip.id)
    )
    if category and category.strip():
        q = q.where(DesignArtClip.category_fa == category.strip())
    rows = list(db.scalars(q).all())
    categories: dict[str, list[dict]] = {}
    for r in rows:
        categories.setdefault(r.category_fa, []).append(art_clip_dict(r))
    return {"categories": categories}


def list_art_admin(db: Session) -> list[dict]:
    rows = list(
        db.scalars(
            select(DesignArtClip).order_by(
                DesignArtClip.category_fa, DesignArtClip.sort_order.desc(), DesignArtClip.id.desc()
            )
        ).all()
    )
    return [art_clip_dict(r) | {"is_active": r.is_active} for r in rows]


def create_art_clip(
    db: Session,
    *,
    category_fa: str,
    title: str,
    storage_key: str,
    mime_type: str,
    sort_order: int = 0,
) -> DesignArtClip:
    row = DesignArtClip(
        category_fa=category_fa.strip()[:64] or "عمومی",
        title=title.strip()[:128] or "آرت",
        storage_key=storage_key,
        mime_type=mime_type,
        sort_order=sort_order,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_art_clip(db: Session, clip_id: int) -> None:
    row = db.get(DesignArtClip, clip_id)
    if row is None:
        raise ValueError("not_found")
    key = row.storage_key
    db.delete(row)
    db.commit()
    delete_upload(key)


def update_art_clip(db: Session, clip_id: int, data: dict) -> DesignArtClip:
    row = db.get(DesignArtClip, clip_id)
    if row is None:
        raise ValueError("not_found")
    if "category_fa" in data and data["category_fa"]:
        row.category_fa = str(data["category_fa"]).strip()[:64]
    if "title" in data and data["title"]:
        row.title = str(data["title"]).strip()[:128]
    if "sort_order" in data and data["sort_order"] is not None:
        row.sort_order = int(data["sort_order"])
    if "is_active" in data and data["is_active"] is not None:
        row.is_active = bool(data["is_active"])
    db.commit()
    db.refresh(row)
    return row
