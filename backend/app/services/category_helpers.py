"""خروجی دسته برای API فروشگاه و ادمین."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Category, Design, Product
from app.models.customizer import ProductTemplate
from app.schemas.admin import CategoryOut
from app.services.storage import delete_upload, public_url


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


def delete_category_subtree(db: Session, category_id: int) -> None:
    """حذف دسته به‌همراه زیردسته‌ها.

    طرح‌های یتیم (بدون محصول) و قالب‌های بلااستفاده پاک می‌شوند.
    اگر هنوز محصولی به دسته وصل باشد، حذف متوقف می‌شود.
    """
    c = db.get(Category, category_id)
    if c is None:
        raise ValueError("not_found")

    subtree_ids = collect_category_subtree_ids(db, category_id)

    product_count = db.scalar(
        select(func.count()).select_from(Product).where(Product.parent_category_id.in_(subtree_ids))
    ) or 0
    if product_count:
        raise ValueError("has_products")

    # طرح‌های یتیم (محصول قبلاً حذف شده ولی Design مانده) — حذف شوند
    orphan_designs = list(
        db.scalars(
            select(Design)
            .where(Design.thematic_category_id.in_(subtree_ids))
            .options(joinedload(Design.products), joinedload(Design.assets))
        ).unique().all()
    )
    for d in orphan_designs:
        if d.products:
            raise ValueError("has_designs")
        for asset in list(d.assets or []):
            if asset.storage_key:
                delete_upload(asset.storage_key)
            db.delete(asset)
        db.delete(d)
    db.flush()

    # قالب‌های Design Lab بدون وابستگی واقعی — حذف شوند
    templates = list(
        db.scalars(
            select(ProductTemplate).where(ProductTemplate.category_id.in_(subtree_ids))
        ).all()
    )
    for t in templates:
        db.delete(t)
    db.flush()

    # حذف از برگ‌ها به ریشه تا parent_id محدودیت FK را نقض نکند
    delete_order = list(reversed(subtree_ids))
    for cid in delete_order:
        node = db.get(Category, cid)
        if node is None:
            continue
        if node.icon_storage_key:
            delete_upload(node.icon_storage_key)
        db.delete(node)
    db.commit()


def delete_categories_bulk(db: Session, ids: list[int]) -> dict:
    """حذف گروهی دسته‌ها — زیردسته‌ها همراه والد حذف می‌شوند."""
    unique_ids = list(dict.fromkeys(ids))
    deleted: list[int] = []
    failed: list[dict] = []
    already_gone: set[int] = set()

    reasons = {
        "not_found": "دسته یافت نشد",
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
            failed.append({"id": cid, "reason": reasons.get(str(e), str(e))})
        except Exception as e:  # noqa: BLE001
            db.rollback()
            failed.append({"id": cid, "reason": str(e) or "خطای ناشناخته"})

    return {"deleted": deleted, "failed": failed, "deleted_count": len(deleted)}
