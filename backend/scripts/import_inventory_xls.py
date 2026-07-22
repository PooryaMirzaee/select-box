"""
واردات کالا از لیست موجودی (.ods / .xls) به کاتالوگ SelectBox.

ستون‌ها: آخرین فی فروش | آخرین فی خرید | موجودی کالا | نام کالا | کد کالا

لیست اصلی پروژه: all-list.ods

استفاده:
  python scripts/import_inventory_xls.py /path/to/all-list.ods
  python scripts/import_inventory_xls.py all-list.ods --limit 50
  python scripts/import_inventory_xls.py report.xls --only-in-stock

روی سرور (داخل کانتینر api):
  docker compose cp all-list.ods api:/app/all-list.ods
  docker compose exec -T api python scripts/import_inventory_xls.py /app/all-list.ods
"""

from __future__ import annotations

import argparse
import hashlib
import sys
import xml.etree.ElementTree as ET
import zipfile
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

import app.models  # noqa: F401
from app.db.session import SessionLocal
from app.models import Category, Design, Product, ProductVariation
from app.services.customizer import slugify_fa

ROOT_SLUG = "warehouse"
ROOT_NAME = "انبار فروشگاه"
BATCH = 200

_ODS_NS = {
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
}
_CELL_REPEAT = "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-repeated"
_OFFICE_VALUE = "{urn:oasis:names:tc:opendocument:xmlns:office:1.0}value"


def _parse_number(raw) -> float:
    if raw is None or raw == "":
        return 0.0
    if isinstance(raw, (int, float)):
        return float(raw)
    s = str(raw).strip().replace(",", "").replace("٬", "").replace(" ", "")
    if not s or s == "-":
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def _stock_qty(raw) -> int:
    n = _parse_number(raw)
    if n < 0:
        return 0
    return int(n)


def _price(sale: float, buy: float) -> Decimal:
    if sale > 0:
        return Decimal(str(round(sale, 2)))
    if buy > 0:
        return Decimal(str(round(buy, 2)))
    return Decimal("0")


def _group_key(code: str) -> str:
    parts = code.split("-")
    return parts[0] if parts and parts[0] else "misc"


def _unique_slug(db: Session, name: str, code: str) -> str:
    base = slugify_fa(name) or "item"
    short = hashlib.sha1(code.encode("utf-8")).hexdigest()[:8]
    slug = f"{base[:160]}-{short}"
    exists = db.scalar(select(Product.id).where(Product.slug == slug))
    if exists:
        slug = f"item-{hashlib.sha1(code.encode()).hexdigest()[:16]}"
    return slug[:220]


def ensure_categories(db: Session, group_codes: set[str]) -> dict[str, Category]:
    root = db.scalar(select(Category).where(Category.slug == ROOT_SLUG, Category.parent_id.is_(None)))
    if root is None:
        root = Category(
            slug=ROOT_SLUG,
            name_fa=ROOT_NAME,
            parent_id=None,
            sort_order=5,
            is_active=True,
            meta_title=ROOT_NAME,
            meta_description="کاتالوگ کامل موجودی انبار فروشگاه",
        )
        db.add(root)
        db.flush()

    by_group: dict[str, Category] = {}
    for g in sorted(group_codes):
        slug = f"grp-{g}"
        cat = db.scalar(select(Category).where(Category.slug == slug, Category.parent_id == root.id))
        if cat is None:
            cat = Category(
                slug=slug,
                name_fa=f"گروه {g}",
                parent_id=root.id,
                sort_order=int(g) if g.isdigit() else 999,
                is_active=True,
            )
            db.add(cat)
            db.flush()
        by_group[g] = cat
    db.commit()
    return by_group | {"__root__": root}


def _cell_text(cell) -> str:
    texts = ["".join(n.itertext()) for n in cell.findall("text:p", _ODS_NS)]
    val = " ".join(t for t in texts if t).strip()
    if val:
        return val
    return (cell.get(_OFFICE_VALUE) or "").strip()


def _read_ods_raw(path: Path) -> list[list[str]]:
    with zipfile.ZipFile(path) as zf:
        root = ET.parse(zf.open("content.xml")).getroot()
    table = root.find(".//table:table", _ODS_NS)
    if table is None:
        raise SystemExit("در فایل ODS شیت یافت نشد")

    out: list[list[str]] = []
    for row in table.findall("table:table-row", _ODS_NS):
        vals: list[str] = []
        for cell in row.findall("table:table-cell", _ODS_NS):
            repeat = int(cell.get(_CELL_REPEAT) or 1)
            text = _cell_text(cell)
            for _ in range(repeat):
                vals.append(text)
                if len(vals) >= 8:
                    break
            if len(vals) >= 8:
                break
        while vals and vals[-1] == "":
            vals.pop()
        if vals:
            out.append(vals)
    return out


def _read_xls_raw(path: Path) -> list[list]:
    try:
        import xlrd
    except ImportError as e:  # pragma: no cover
        raise SystemExit("برای .xls لازم است: pip install xlrd==2.0.1") from e
    wb = xlrd.open_workbook(str(path))
    sh = wb.sheet_by_index(0)
    return [[sh.cell_value(r, c) for c in range(min(5, sh.ncols))] for r in range(sh.nrows)]


def read_rows(path: Path, *, only_in_stock: bool, limit: int | None):
    suffix = path.suffix.lower()
    if suffix == ".ods":
        raw = _read_ods_raw(path)
    elif suffix in {".xls", ".xlsx"}:
        raw = _read_xls_raw(path)
    else:
        raise SystemExit(f"فرمت پشتیبانی نمی‌شود: {suffix} (ods/xls)")

    rows = []
    for cells in raw[1:]:  # skip header
        if len(cells) < 5:
            continue
        sale = _parse_number(cells[0])
        buy = _parse_number(cells[1])
        stock = _stock_qty(cells[2])
        name = str(cells[3]).strip()
        code = str(cells[4]).strip()
        if not name or not code:
            continue
        if only_in_stock and stock <= 0:
            continue
        rows.append(
            {
                "code": code,
                "name": name[:255],
                "stock": stock,
                "price": _price(sale, buy),
                "group": _group_key(code),
            }
        )
        if limit and len(rows) >= limit:
            break
    return rows


def upsert_row(db: Session, row: dict, cats: dict[str, Category]) -> str:
    """برمی‌گرداند: created | updated | skipped"""
    code = row["code"]
    cat = cats.get(row["group"]) or cats["__root__"]
    root = cats["__root__"]

    design = db.scalar(select(Design).where(Design.code == code))
    if design is None:
        slug = _unique_slug(db, row["name"], code)
        design = Design(
            code=code[:64],
            title=row["name"],
            slug=f"{slug}-d"[:200],
            thematic_category_id=cat.id,
            description=row["name"],
            status="published",
            source_type="admin",
        )
        db.add(design)
        db.flush()
        product = Product(
            design_id=design.id,
            parent_category_id=root.id,
            slug=slug,
            title=row["name"],
            description=row["name"],
            base_price=row["price"],
            compare_at_price=None,
            sku_prefix=code[:60],
            status="published",
            meta_title=f"{row['name']} | SelectBox",
            meta_description=row["name"][:500],
        )
        db.add(product)
        db.flush()
        db.add(
            ProductVariation(
                product_id=product.id,
                sku=code[:128],
                color_name=None,
                color_hex=None,
                size_label=None,
                price_delta=0,
                stock_quantity=row["stock"],
                is_active=True,
            )
        )
        return "created"

    product = db.scalar(
        select(Product)
        .where(Product.design_id == design.id)
        .options(joinedload(Product.variations))
    )
    if product is None:
        return "skipped"

    # اگر توضیح قبلاً غنی شده (≠ نام خام)، overwrite نکن
    if not product.description or product.description.strip() == row["name"]:
        product.description = row["name"]
    product.base_price = row["price"]
    product.status = "published"
    product.parent_category_id = root.id
    product.sku_prefix = code[:60]
    if not product.meta_title:
        product.meta_title = f"{row['name']} | SelectBox"
    if not product.meta_description or product.meta_description.strip() == row["name"]:
        product.meta_description = row["name"][:500]
    design.title = row["name"]
    design.thematic_category_id = cat.id
    design.status = "published"
    product.title = row["name"]

    if product.variations:
        v = product.variations[0]
        v.stock_quantity = row["stock"]
        v.sku = code[:128]
        v.is_active = True
    else:
        db.add(
            ProductVariation(
                product_id=product.id,
                sku=code[:128],
                stock_quantity=row["stock"],
                price_delta=0,
                is_active=True,
            )
        )
    return "updated"


def main() -> None:
    parser = argparse.ArgumentParser(description="واردات موجودی از ODS/XLS")
    parser.add_argument("file_path", type=Path, help="مسیر فایل .ods یا .xls")
    parser.add_argument("--only-in-stock", action="store_true", help="فقط موجودی مثبت")
    parser.add_argument("--limit", type=int, default=None, help="سقف تعداد برای تست")
    args = parser.parse_args()

    path: Path = args.file_path
    if not path.is_file():
        raise SystemExit(f"فایل یافت نشد: {path}")

    print(f"خواندن {path} …")
    rows = read_rows(path, only_in_stock=args.only_in_stock, limit=args.limit)
    print(f"{len(rows)} ردیف برای واردات")
    if not rows:
        return

    groups = {r["group"] for r in rows}
    db = SessionLocal()
    try:
        cats = ensure_categories(db, groups)
        created = updated = skipped = 0
        for i, row in enumerate(rows, 1):
            try:
                action = upsert_row(db, row, cats)
            except Exception as e:  # noqa: BLE001
                db.rollback()
                cats = ensure_categories(db, groups)
                print(f"  ✗ ردیف {i} {row['code']}: {e}")
                skipped += 1
                continue
            if action == "created":
                created += 1
            elif action == "updated":
                updated += 1
            else:
                skipped += 1
            if i % BATCH == 0:
                db.commit()
                print(f"  … {i}/{len(rows)} (new={created} upd={updated})")
        db.commit()
        print(f"✅ تمام — created={created} updated={updated} skipped={skipped}")
        print(f"  دسته ریشه: /browse/{ROOT_SLUG}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
