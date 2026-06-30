"""مدیریت کاربران و خالقین — پنل ادمین."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.schemas.admin_users import StaffUserCreateIn, UserAdminDetailOut, UserAdminOut, UserAdminUpdateIn
from app.services import admin_users as admin_users_service

router = APIRouter(prefix="/admin", tags=["admin-users"], dependencies=[Depends(require_admin)])


@router.get("/users")
def list_users(
    q: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    creators_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    rows, total = admin_users_service.list_users_admin(
        db,
        q=q,
        role=role,
        is_active=is_active,
        creators_only=creators_only,
        limit=limit,
        offset=offset,
    )
    return {"items": [UserAdminOut.model_validate(r) for r in rows], "total": total}


@router.get("/users/{user_id}", response_model=UserAdminDetailOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    row = admin_users_service.get_user_admin(db, user_id)
    if row is None:
        raise HTTPException(status_code=404, detail="کاربر پیدا نشد")
    return UserAdminDetailOut.model_validate(row)


@router.patch("/users/{user_id}", response_model=UserAdminDetailOut)
def patch_user(user_id: int, body: UserAdminUpdateIn, db: Session = Depends(get_db)):
    try:
        admin_users_service.update_user_admin(db, user_id, body.model_dump(exclude_unset=True))
    except ValueError as e:
        code = str(e)
        if code == "not_found":
            raise HTTPException(status_code=404, detail="کاربر پیدا نشد") from e
        if code == "last_admin":
            raise HTTPException(status_code=400, detail="حداقل یک مدیر فعال باید بماند") from e
        raise HTTPException(status_code=400, detail="داده نامعتبر") from e
    row = admin_users_service.get_user_admin(db, user_id)
    return UserAdminDetailOut.model_validate(row)


@router.post("/users/staff", response_model=UserAdminOut)
def create_staff(body: StaffUserCreateIn, db: Session = Depends(get_db)):
    from app.services.sms import normalize_phone

    try:
        user = admin_users_service.create_staff_user(
            db,
            phone=normalize_phone(body.phone),
            password=body.password,
            role=body.role,
            full_name=body.full_name,
        )
    except ValueError as e:
        code = str(e)
        if code == "phone_taken":
            raise HTTPException(status_code=409, detail="این شماره قبلاً ثبت شده") from e
        raise HTTPException(status_code=400, detail="نقش نامعتبر") from e
    return UserAdminOut.model_validate(admin_users_service.user_admin_row(db, user))


@router.get("/creators")
def list_creators(
    q: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    rows, total = admin_users_service.list_creators_admin(db, q=q, limit=limit, offset=offset)
    return {"items": rows, "total": total}


@router.get("/creators/submissions")
def creator_submissions(
    status: str = Query("draft"),
    limit: int = Query(100, ge=1, le=300),
    db: Session = Depends(get_db),
):
    return {"items": admin_users_service.list_creator_submissions(db, status=status or None, limit=limit)}


@router.get("/creators/{user_id}", response_model=UserAdminDetailOut)
def get_creator(user_id: int, db: Session = Depends(get_db)):
    row = admin_users_service.get_user_admin(db, user_id)
    if row is None or not row.get("is_creator"):
        raise HTTPException(status_code=404, detail="خالق پیدا نشد")
    return UserAdminDetailOut.model_validate(row)
