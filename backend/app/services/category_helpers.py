"""خروجی دسته برای API فروشگاه و ادمین."""

from __future__ import annotations

import re

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Category, Design, Product
from app.models.customizer import ProductTemplate
from app.schemas.admin import CategoryOut
from app.services.storage import delete_upload, public_url

UNCATEGORIZED_SLUG = "uncategorized"
UNCATEGORIZED_NAME_FA = "دسته‌بندی نشده"


def normalize_category_slug(raw: str) -> str:
    """اسلاگ امن برای URL — بدون / ٪ # و کاراکترهای شکننده."""
    slug = re.sub(r"[^\w\-]+", "-", (raw or "").strip().lower(), flags=re.UNICODE)
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    if not slug:
        raise ValueError("invalid_slug")
    if any(ch in slug for ch in ("/", "%", "#", "?", "&")):
        raise ValueError("invalid_slug")
    return slug[:120]


def category_image_url(cat: Category) -> str | None:
    if not cat.icon_storage_key:
        return None
    return public_url(cat.icon_storage_key)


def category_browse_dict(cat: Category, path: str, *, child_count: int = 0) -> dict:
    return {
        "id": cat.id,
        "slug": cat.slug,
        "name_fa": cat.name_fa,
        "path": path,
        "image_url": category_image_url(cat),
        "child_count": child_count,
    }


def category_admin_out(cat: Category) -> CategoryOut:
    base = CategoryOut.model_validate(cat)
    return base.model_copy(update={"icon_url": category_image_url(cat)})


def category_admin_node(cat: Category, children: list[dict] | None = None) -> dict:
    out = category_admin_out(cat)
    return {**out.model_dump(), "children": children or []}


def build_admin_category_tree(categories: list[Category]) -> list[dict]:
    """درخت تو در تو برای پنل ادمین."""
    by_parent: dict[int | None, list[Category]] = {}
    for c in categories:
        by_parent.setdefault(c.parent_id, []).append(c)
    for kids in by_parent.values():
        kids.sort(key=lambda x: (x.sort_order, x.id))

    def attach(cat: Category) -> dict:
        kids = by_parent.get(cat.id, [])
        return category_admin_node(cat, [attach(ch) for ch in kids])

    roots = by_parent.get(None, [])
    return [attach(r) for r in roots]


def collect_category_subtree_ids(db: Session, root_id: int) -> list[int]:
    """شناسهٔ ریشه + همهٔ زیردسته‌ها (عمق‌اول)."""
    ids = [root_id]
    queue = [root_id]
    while queue:
        parent_id = queue.pop(0)
        child_ids = list(
            db.scalars(select(Category.id).where(Category.parent_id == parent_id)).all()
        )
        ids.extend(child_ids)
        queue.extend(child_ids)
    return ids


def get_or_create_uncategorized(db: Session) -> Category:
    """دستهٔ سیستم برای محصولات بدون دستهٔ موضوعی."""
    existing = db.scalar(
        select(Category).where(
            Category.slug == UNCATEGORIZED_SLUG,
            Category.parent_id.is_(None),
        )
    )
    if existing is not None:
        return existing

    cat = Category(
        parent_id=None,
        slug=UNCATEGORIZED_SLUG,
        name_fa=UNCATEGORIZED_NAME_FA,
        sort_order=9999,
        is_active=True,
    )
    db.add(cat)
    db.flush()
    return cat


def _reassign_away_from_categories(db: Session, subtree_ids: list[int], target_id: int) -> None:
    """محصولات، طرح‌ها و قالب‌های وابسته را به دستهٔ هدف منتقل کن."""
    db.execute(
        update(Design)
        .where(Design.thematic_category_id.in_(subtree_ids))
        .values(thematic_category_id=target_id)
    )
    db.execute(
        update(ProductTemplate)
        .where(ProductTemplate.category_id.in_(subtree_ids))
        .values(category_id=target_id)
    )
    db.execute(
        update(Product)
        .where(Product.parent_category_id.in_(subtree_ids))
        .values(parent_category_id=target_id)
    )
    db.flush()


def delete_category_subtree(db: Session, category_id: int) -> None:
    """حذف دسته به‌همراه زیردسته‌ها.

    محصولات و طرح‌های وابسته به «دسته‌بندی نشده» منتقل می‌شوند.
    """
    c = db.get(Category, category_id)
    if c is None:
        raise ValueError("not_found")
    if c.slug == UNCATEGORIZED_SLUG and c.parent_id is None:
        raise ValueError("protected")

    subtree_ids = collect_category_subtree_ids(db, category_id)
    uncategorized = get_or_create_uncategorized(db)
    if uncategorized.id in subtree_ids:
        raise ValueError("protected")

    try:
        _reassign_away_from_categories(db, subtree_ids, uncategorized.id)
    except IntegrityError as e:
        db.rollback()
        raise ValueError("product_conflict") from e

    # حذف از برگ‌ها به ریشه تا parent_id محدودیت FK را نقض نکند
    delete_order = list(reversed(subtree_ids))
    for cid in delete_order:
        node = db.get(Category, cid)
        if node is None:
            continue
        if node.icon_storage_key:
            delete_upload(node.icon_storage_key)
        db.delete(node)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise ValueError("product_conflict") from e


def delete_categories_bulk(db: Session, ids: list[int]) -> dict:
    """حذف گروهی دسته‌ها — زیردسته‌ها همراه والد حذف می‌شوند."""
    unique_ids = list(dict.fromkeys(ids))
    deleted: list[int] = []
    failed: list[dict] = []
    already_gone: set[int] = set()

    reasons = {
        "not_found": "دسته یافت نشد",
        "protected": "دستهٔ «دسته‌بندی نشده» قابل حذف نیست",
        "product_conflict": "جابه‌جایی بعضی محصولات به «دسته‌بندی نشده» ممکن نبود (تداخل طرح)",
        "has_products": "این دسته یا زیردسته‌اش محصول دارد",
        "has_designs": "این دسته هنوز به محصولی از طریق رکورد داخلی وصل است",
        "has_templates": "این دسته در قالب استفاده شده",
    }

    for cid in unique_ids:
        if cid in already_gone:
            deleted.append(cid)
            continue
        if db.get(Category, cid) is None:
            failed.append({"id": cid, "reason": reasons["not_found"]})
            continue
        try:
            subtree = collect_category_subtree_ids(db, cid)
            delete_category_subtree(db, cid)
            deleted.append(cid)
            already_gone.update(subtree)
        except ValueError as e:
            try:
                db.rollback()
            except Exception:
                pass
            failed.append({"id": cid, "reason": reasons.get(str(e), str(e))})
        except Exception as e:  # noqa: BLE001
            db.rollback()
            failed.append({"id": cid, "reason": str(e) or "خطای ناشناخته"})

    return {"deleted": deleted, "failed": failed, "deleted_count": len(deleted)}
