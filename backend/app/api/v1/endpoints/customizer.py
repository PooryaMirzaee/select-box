"""
API سفارشی‌سازی — قالب‌ها، آپلود طرح، افزودن به سبد، انتشار برای فروش.
"""

from __future__ import annotations

import copy
import re

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import SESSION_HEADER
from app.core.deps_auth import get_current_user, require_admin
from app.db.session import get_db
from app.models import User
from app.schemas.customizer import (
    CartLineCustomIn,
    CustomizationPayload,
    MyProductOut,
    ProductTemplateCreateIn,
    ProductTemplateOut,
    PublishDesignIn,
    PublishDesignOut,
    TemplateConfigPatch,
)
from app.schemas.design_art import DesignArtAdminOut, DesignArtCreateIn, DesignArtUpdateIn
from app.schemas.studio import StudioProfileUpdateIn
from app.services import catalog as catalog_service
from app.services import customizer as customizer_service
from app.services import design_art as design_art_service
from app.services.bg_remove import remove_background as remove_bg_service
from app.services.storage import public_url
from app.services.upload_security import secure_font_upload, secure_image_upload, validate_image_bytes
from app.services.rate_limit import auth_rate_limiter, client_ip, rate_limit_auth

router = APIRouter(prefix="/customizer", tags=["customizer"])

ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp", "image/jpg", "image/svg+xml"}
ALLOWED_FONT_MIME = {
    "font/woff",
    "font/woff2",
    "font/ttf",
    "font/otf",
    "application/font-woff",
    "application/font-woff2",
    "application/x-font-ttf",
    "application/x-font-opentype",
    "application/octet-stream",
}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_FONT_BYTES = 4 * 1024 * 1024


def _mockup_color_slug(color_hex: str | None) -> str:
    """Hex colors include `#`, which breaks URLs if used in filenames."""
    if not color_hex:
        return "default"
    slug = color_hex.lstrip("#").lower()
    return slug or "default"


def _mockup_color_slug(color_hex: str | None) -> str:
    """Hex colors include `#`, which breaks URLs if used in filenames."""
    if not color_hex:
        return "default"
    slug = color_hex.lstrip("#").lower()
    return slug or "default"


def _session_id(x_session_id: str | None = Header(default=None, alias=SESSION_HEADER)) -> str:
    if not x_session_id or not x_session_id.strip():
        raise HTTPException(
            status_code=400,
            detail=f"Header {SESSION_HEADER} is required.",
        )
    return x_session_id.strip()


@router.get("/templates", response_model=list[ProductTemplateOut])
def list_templates(db: Session = Depends(get_db)):
    templates = customizer_service.list_templates(db)
    return [ProductTemplateOut(**customizer_service.template_to_dict(t)) for t in templates]


@router.get("/templates/{slug}", response_model=ProductTemplateOut)
def get_template(slug: str, db: Session = Depends(get_db)):
    t = customizer_service.get_template(db, slug)
    if t is None:
        raise HTTPException(status_code=404, detail="Template not found")
    return ProductTemplateOut(**customizer_service.template_to_dict(t))


@router.get("/art")
def get_art_library(category: str | None = None, db: Session = Depends(get_db)):
    return design_art_service.list_art_library(db, category=category)


@router.get("/admin/art", response_model=list[DesignArtAdminOut])
def admin_list_art(_admin=Depends(require_admin), db: Session = Depends(get_db)):
    return [DesignArtAdminOut.model_validate(x) for x in design_art_service.list_art_admin(db)]


@router.post("/admin/art", response_model=DesignArtAdminOut)
async def admin_create_art(
    category_fa: str = Form(default="عمومی"),
    title: str = Form(...),
    sort_order: int = Form(0),
    file: UploadFile = File(...),
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    ct = file.content_type or ""
    if ct not in ALLOWED_MIME and not (file.filename or "").lower().endswith(".svg"):
        raise HTTPException(status_code=400, detail="فرمت تصویر مجاز نیست (PNG, JPG, WebP, SVG)")
    key, mime = await secure_image_upload(
        file,
        "customizer/art",
        max_bytes=MAX_UPLOAD_BYTES,
        allow_svg=True,
    )
    row = design_art_service.create_art_clip(
        db,
        category_fa=category_fa,
        title=title,
        storage_key=key,
        mime_type=mime,
        sort_order=sort_order,
    )
    return DesignArtAdminOut.model_validate(design_art_service.art_clip_dict(row) | {"is_active": row.is_active})


@router.patch("/admin/art/{clip_id}", response_model=DesignArtAdminOut)
def admin_update_art(
    clip_id: int,
    body: DesignArtUpdateIn,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        row = design_art_service.update_art_clip(db, clip_id, body.model_dump(exclude_unset=True))
    except ValueError as e:
        if str(e) == "not_found":
            raise HTTPException(status_code=404, detail="Art clip not found") from e
        raise
    return DesignArtAdminOut.model_validate(design_art_service.art_clip_dict(row) | {"is_active": row.is_active})


@router.delete("/admin/art/{clip_id}")
def admin_delete_art(clip_id: int, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    try:
        design_art_service.delete_art_clip(db, clip_id)
    except ValueError as e:
        if str(e) == "not_found":
            raise HTTPException(status_code=404, detail="Art clip not found") from e
        raise
    return {"ok": True}


@router.post("/upload")
async def upload_artwork(
    request: Request,
    file: UploadFile = File(...),
    session_id: str = Depends(_session_id),
):
    rate_limit_auth(request, "customizer_upload", max_calls=30, window_sec=60)
    key, mime = await secure_image_upload(
        file,
        "customizations/artwork",
        max_bytes=MAX_UPLOAD_BYTES,
    )
    return {
        "storage_key": key,
        "url": public_url(key),
        "mime_type": mime,
    }


@router.post("/remove-background")
async def remove_background(
    request: Request,
    file: UploadFile = File(...),
):
    """حذف پس‌زمینه — rembg محلی، بدون هزینه API خارجی."""
    ip = client_ip(request)
    auth_rate_limiter.check_or_raise(
        f"remove_bg:{ip}",
        max_calls=40,
        window_sec=3600,
        detail="تعداد درخواست حذف پس‌زمینه بیش از حد — یک ساعت بعد تلاش کنید",
    )
    raw = await file.read()
    validate_image_bytes(
        raw,
        file.filename or "upload.jpg",
        file.content_type,
        max_bytes=MAX_UPLOAD_BYTES,
    )
    png = remove_bg_service(raw)
    return Response(content=png, media_type="image/png", headers={"Cache-Control": "no-store"})


@router.post("/cart/items")
def add_custom_item(
    body: CartLineCustomIn,
    session_id: str = Depends(_session_id),
    db: Session = Depends(get_db),
):
    cart = catalog_service.get_or_create_session_cart(db, session_id)
    variation_id = body.variation_id

    if body.customization:
        v = customizer_service.find_variation_for_customization(
            db,
            body.customization.product_type,
            body.customization.color_hex,
            body.customization.size_label,
        )
        if v:
            variation_id = v.id

    from app.models import ProductVariation

    variation = db.get(ProductVariation, variation_id)
    if variation is None or not variation.is_active:
        raise HTTPException(status_code=400, detail="Invalid variation")

    product = variation.product
    if product.status != "published":
        raise HTTPException(status_code=400, detail="Product not available")

    custom_dict = body.customization.model_dump() if body.customization else None
    customizer_service.add_custom_cart_line(db, cart, variation_id, body.quantity, custom_dict)

    cart = catalog_service.cart_with_items(db, cart.id)
    lines = [customizer_service.cart_line_dict(i) for i in cart.items]
    from app.schemas.cart import CartLineOut, CartOut

    return CartOut(id=cart.id, currency=cart.currency, items=[CartLineOut(**x) for x in lines])


@router.post("/publish", response_model=PublishDesignOut)
def publish_design(
    body: PublishDesignIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_admin = user.role.value in ("admin", "operator")
    try:
        design, products = customizer_service.publish_design_from_customization(
            db,
            user,
            title=body.title,
            description=body.description,
            thematic_category_id=body.thematic_category_id,
            product_types=body.product_types,
            customization=body.customization.model_dump(),
            customizations_by_type=(
                {k: v.model_dump() for k, v in body.customizations_by_type.items()}
                if body.customizations_by_type
                else None
            ),
            commission_percent=body.commission_percent,
            status=body.status,
            is_admin=is_admin,
        )
    except ValueError as e:
        code = str(e)
        if code == "invalid_category":
            raise HTTPException(status_code=400, detail="دستهٔ موضوعی نامعتبر") from e
        if code == "invalid_product_type":
            raise HTTPException(status_code=400, detail="نوع محصول نامعتبر") from e
        raise
    msg = None
    if not is_admin:
        msg = "محصول شما ثبت شد. پس از تأیید مدیر در فروشگاه نمایش داده می‌شود."
    return PublishDesignOut(
        design_id=design.id,
        design_slug=design.slug,
        products=[{"id": p.id, "slug": p.slug, "title": p.title, "status": p.status} for p in products],
        message=msg,
    )


@router.get("/my-products", response_model=list[MyProductOut])
def my_products(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return customizer_service.list_products_for_creator(db, user.id)


@router.get("/my-designs", response_model=list[MyProductOut])
def my_designs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """سازگاری — محصولات ساخته‌شده توسط کاربر."""
    return customizer_service.list_products_for_creator(db, user.id)


@router.post("/admin/publish", response_model=PublishDesignOut)
def admin_publish_design(
    body: PublishDesignIn,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body.status = body.status or "published"
    return publish_design(body=body, user=user, db=db)


@router.get("/earnings")
def my_earnings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return customizer_service.creator_earnings_summary(db, user.id)


@router.get("/my-studio")
def my_studio(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.schemas.studio import MyStudioOut
    from app.services import studio as studio_service

    data = studio_service.my_studio_dashboard(db, user)
    return MyStudioOut.model_validate(data)


@router.patch("/my-studio")
def patch_my_studio(
    body: StudioProfileUpdateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.schemas.studio import MyStudioOut
    from app.services import studio as studio_service

    try:
        studio_service.update_my_studio(db, user, body.model_dump(exclude_unset=True))
    except ValueError as e:
        code = str(e)
        if code == "slug_taken":
            raise HTTPException(status_code=409, detail="این آدرس استودیو قبلاً ثبت شده است")
        if code == "invalid_slug":
            raise HTTPException(status_code=400, detail="آدرس استودیو فقط حروف انگلیسی، عدد و خط تیره است")
        if code == "invalid_accent":
            raise HTTPException(status_code=400, detail="رنگ باید به شکل #RRGGBB باشد")
        raise HTTPException(status_code=400, detail="داده نامعتبر")
    dash = studio_service.my_studio_dashboard(db, user)
    return MyStudioOut.model_validate(dash)


STUDIO_IMAGE_MAX_BYTES = 4 * 1024 * 1024


@router.post("/my-studio/avatar")
async def upload_studio_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.schemas.studio import MyStudioOut
    from app.services import studio as studio_service

    key, _ = await secure_image_upload(
        file,
        f"studios/{user.id}",
        max_bytes=STUDIO_IMAGE_MAX_BYTES,
    )
    studio_service.set_studio_image(db, user, "avatar", key)
    return MyStudioOut.model_validate(studio_service.my_studio_dashboard(db, user))


@router.post("/my-studio/header")
async def upload_studio_header(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.schemas.studio import MyStudioOut
    from app.services import studio as studio_service

    key, _ = await secure_image_upload(
        file,
        f"studios/{user.id}",
        max_bytes=STUDIO_IMAGE_MAX_BYTES,
    )
    studio_service.set_studio_image(db, user, "header", key)
    return MyStudioOut.model_validate(studio_service.my_studio_dashboard(db, user))


@router.delete("/my-studio/avatar")
def delete_studio_avatar(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.schemas.studio import MyStudioOut
    from app.services import studio as studio_service

    studio_service.clear_studio_image(db, user, "avatar")
    return MyStudioOut.model_validate(studio_service.my_studio_dashboard(db, user))


@router.delete("/my-studio/header")
def delete_studio_header(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.schemas.studio import MyStudioOut
    from app.services import studio as studio_service

    studio_service.clear_studio_image(db, user, "header")
    return MyStudioOut.model_validate(studio_service.my_studio_dashboard(db, user))


@router.post("/admin/templates", response_model=ProductTemplateOut)
def admin_create_template(
    body: ProductTemplateCreateIn,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        t = customizer_service.create_template(
            db,
            slug=body.slug,
            name_fa=body.name_fa,
            description=body.description,
            base_price=body.base_price,
            category_slug=body.category_slug,
            config_json=body.config_json,
            sort_order=body.sort_order,
        )
    except ValueError as e:
        if str(e) == "slug_exists":
            raise HTTPException(status_code=400, detail="این slug قبلاً ثبت شده") from e
        if str(e) == "invalid_category":
            raise HTTPException(status_code=400, detail="دسته نامعتبر") from e
        raise
    return ProductTemplateOut(**customizer_service.template_to_dict(t))


@router.patch("/admin/templates/{slug}", response_model=ProductTemplateOut)
def admin_update_template(
    slug: str,
    body: TemplateConfigPatch,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = customizer_service.get_template_admin(db, slug)
    if t is None:
        raise HTTPException(status_code=404, detail="Template not found")
    t.config_json = customizer_service.merge_template_config(t.config_json or {}, body.config_json)
    db.commit()
    db.refresh(t)
    return ProductTemplateOut(**customizer_service.template_to_dict(t))


@router.post("/admin/templates/{slug}/mockup", response_model=ProductTemplateOut)
async def admin_upload_template_mockup(
    slug: str,
    view: str = Form(...),
    color_hex: str | None = Form(default=None),
    file: UploadFile = File(...),
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not re.fullmatch(r"[a-z][a-z0-9_-]{0,31}", view):
        raise HTTPException(status_code=400, detail="شناسه نما نامعتبر است")
    t = customizer_service.get_template_admin(db, slug)
    if t is None:
        raise HTTPException(status_code=404, detail="Template not found")
    key, _ = await secure_image_upload(
        file,
        f"customizer/mockups/{slug}",
        max_bytes=MAX_UPLOAD_BYTES,
    )
    url = public_url(key)
    # deepcopy: SQLAlchemy JSON ستون با shallow copy تغییرات nested را persist نمی‌کند
    cfg = copy.deepcopy(t.config_json or {})
    if color_hex:
        colors = list(cfg.get("colors") or [])
        found = False
        for c in colors:
            if str(c.get("hex", "")).lower() == color_hex.lower():
                views = dict(c.get("views") or {})
                views[view] = url
                c["views"] = views
                found = True
                break
        if not found:
            colors.append({"name": color_hex, "hex": color_hex, "views": {view: url}})
        cfg["colors"] = colors
    else:
        mockup = dict(cfg.get("mockup") or {})
        views = dict(mockup.get("views") or {})
        views[view] = url
        mockup["views"] = views
        cfg["mockup"] = mockup
    t.config_json = cfg
    db.commit()
    db.refresh(t)
    return ProductTemplateOut(**customizer_service.template_to_dict(t))


@router.post("/admin/templates/{slug}/font", response_model=ProductTemplateOut)
async def admin_upload_template_font(
    slug: str,
    name: str = Form(...),
    family: str = Form(...),
    file: UploadFile = File(...),
    _admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not re.fullmatch(r"[\w-]{1,64}", family):
        raise HTTPException(status_code=400, detail="نام خانوادگی فونت نامعتبر است")
    t = customizer_service.get_template_admin(db, slug)
    if t is None:
        raise HTTPException(status_code=404, detail="Template not found")
    key, _ = await secure_font_upload(
        file,
        f"customizer/fonts/{slug}",
        max_bytes=MAX_FONT_BYTES,
        basename=family,
    )
    url = public_url(key)
    cfg = copy.deepcopy(t.config_json or {})
    fonts = list(cfg.get("fonts") or [])
    fonts = [f for f in fonts if f.get("family") != family]
    fonts.append({"name": name, "family": family, "url": url})
    cfg["fonts"] = fonts
    t.config_json = cfg
    db.commit()
    db.refresh(t)
    return ProductTemplateOut(**customizer_service.template_to_dict(t))
