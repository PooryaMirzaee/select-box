"""مدیریت کاربران و خالقین — پنل ادمین."""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.models import CreatorEarning, Design, Order, Product, User, UserRole
from app.services.auth_user import user_is_creator
from app.services.customizer import creator_display_name
from app.services.studio import studio_public_dict, studio_slug_for_user


def _creator_stats(db: Session, user_id: int) -> dict:
    products = list(
        db.scalars(
            select(Product)
            .join(Design, Product.design_id == Design.id)
            .where(Design.creator_id == user_id, Design.source_type == "user")
        ).all()
    )
    published = sum(1 for p in products if p.status == "published")
    pending = sum(1 for p in products if p.status != "published")
    earned = db.scalar(
        select(func.coalesce(func.sum(CreatorEarning.commission_amount), 0)).where(
            CreatorEarning.creator_id == user_id
        )
    )
    sales = int(
        db.scalar(select(func.count()).select_from(CreatorEarning).where(CreatorEarning.creator_id == user_id))
        or 0
    )
    return {
        "product_count": len(products),
        "published_count": published,
        "pending_count": pending,
        "total_earned": str(earned or 0),
        "sales_count": sales,
    }


def user_admin_row(db: Session, user: User) -> dict:
    creator = user_is_creator(db, user.id)
    row = {
        "id": user.id,
        "phone": user.phone,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value,
        "is_active": user.is_active,
        "is_creator": creator,
        "studio_slug": studio_slug_for_user(user) if creator else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
    if creator:
        row.update(_creator_stats(db, user.id))
    else:
        order_count = int(
            db.scalar(select(func.count()).select_from(Order).where(Order.user_id == user.id)) or 0
        )
        row["order_count"] = order_count
    return row


def list_users_admin(
    db: Session,
    *,
    q: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    creators_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    stmt = select(User).order_by(User.id.desc())
    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(or_(User.phone.ilike(term), User.full_name.ilike(term)))
    if role:
        try:
            stmt = stmt.where(User.role == UserRole(role))
        except ValueError:
            pass
    if is_active is not None:
        stmt = stmt.where(User.is_active.is_(is_active))

    users = list(db.scalars(stmt).all())
    if creators_only:
        users = [u for u in users if user_is_creator(db, u.id)]

    total = len(users)
    page = users[offset : offset + limit]
    return [user_admin_row(db, u) for u in page], total


def get_user_admin(db: Session, user_id: int) -> dict | None:
    user = db.get(User, user_id)
    if user is None:
        return None
    row = user_admin_row(db, user)
    orders = list(
        db.scalars(select(Order).where(Order.user_id == user_id).order_by(Order.id.desc()).limit(20)).all()
    )
    row["recent_orders"] = [
        {
            "id": o.id,
            "tracking_code": o.tracking_code,
            "status": o.status,
            "total": str(o.total),
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in orders
    ]
    if row["is_creator"]:
        products = list(
            db.scalars(
                select(Product)
                .join(Design, Product.design_id == Design.id)
                .options(joinedload(Product.design))
                .where(Design.creator_id == user_id, Design.source_type == "user")
                .order_by(Product.id.desc())
            ).all()
        )
        row["products"] = [
            {
                "id": p.id,
                "title": p.title,
                "slug": p.slug,
                "status": p.status,
                "design_code": p.design.code if p.design else None,
            }
            for p in products
        ]
        row["studio"] = studio_public_dict(user, db)
    return row


def update_user_admin(db: Session, user_id: int, data: dict) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise ValueError("not_found")

    if "full_name" in data:
        fn = data["full_name"]
        user.full_name = fn.strip()[:255] if fn and str(fn).strip() else None

    if "email" in data:
        em = data["email"]
        user.email = em.strip()[:255] if em and str(em).strip() else None

    if "is_active" in data and data["is_active"] is not None:
        user.is_active = bool(data["is_active"])

    if "role" in data and data["role"] is not None:
        new_role = UserRole(data["role"])
        if user.role == UserRole.admin and new_role != UserRole.admin:
            admins = int(
                db.scalar(
                    select(func.count()).select_from(User).where(User.role == UserRole.admin, User.is_active.is_(True))
                )
                or 0
            )
            if admins <= 1:
                raise ValueError("last_admin")
        user.role = new_role

    if "password" in data and data["password"]:
        user.password_hash = hash_password(str(data["password"]))

    db.commit()
    db.refresh(user)
    return user


def create_staff_user(db: Session, *, phone: str, password: str, role: str, full_name: str | None) -> User:
    existing = db.scalar(select(User).where(User.phone == phone))
    if existing is not None:
        raise ValueError("phone_taken")
    r = UserRole(role)
    if r not in (UserRole.admin, UserRole.operator):
        raise ValueError("invalid_role")
    user = User(
        phone=phone,
        password_hash=hash_password(password),
        role=r,
        full_name=full_name or ("مدیر" if r == UserRole.admin else "اپراتور"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_creator_submissions(db: Session, *, status: str | None = "draft", limit: int = 100) -> list[dict]:
    q = (
        select(Product)
        .join(Design, Product.design_id == Design.id)
        .options(joinedload(Product.design).joinedload(Design.creator))
        .where(Design.source_type == "user", Design.creator_id.isnot(None))
        .order_by(Product.id.desc())
    )
    if status:
        q = q.where(Product.status == status)
    products = list(db.scalars(q.limit(limit)).all())
    out = []
    for p in products:
        creator = p.design.creator if p.design else None
        out.append(
            {
                "product_id": p.id,
                "title": p.title,
                "slug": p.slug,
                "status": p.status,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "creator": {
                    "id": creator.id,
                    "display_name": creator_display_name(creator),
                    "phone": creator.phone,
                    "studio_slug": studio_slug_for_user(creator),
                }
                if creator
                else None,
            }
        )
    return out


def list_creators_admin(db: Session, *, q: str | None = None, limit: int = 50, offset: int = 0) -> tuple[list[dict], int]:
    creator_ids = db.scalars(
        select(Design.creator_id)
        .where(Design.source_type == "user", Design.creator_id.isnot(None))
        .distinct()
    ).all()
    users = []
    for uid in creator_ids:
        if uid is None:
            continue
        user = db.get(User, uid)
        if user is None:
            continue
        if q and q.strip():
            term = q.strip().lower()
            name = (user.full_name or "").lower()
            if term not in user.phone and term not in name:
                continue
        users.append(user)
    users.sort(key=lambda u: u.id, reverse=True)
    total = len(users)
    page = users[offset : offset + limit]
    rows = []
    for u in page:
        stats = _creator_stats(db, u.id)
        profile = studio_public_dict(u, db, product_count=stats["published_count"])
        rows.append({**profile, **stats, "phone": u.phone, "is_active": u.is_active})
    return rows, total
