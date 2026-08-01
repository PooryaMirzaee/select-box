"""
سبد خرید — مهمان با X-Session-Id؛ کاربر واردشده با سبد user_id.
"""

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import SESSION_HEADER
from app.core.deps_auth import get_current_user_optional
from app.db.session import get_db
from app.models import User
from app.schemas.cart import CartLineIn, CartLineOut, CartOut
from app.services import auth_user as auth_user_service
from app.services import catalog as catalog_service

router = APIRouter(prefix="/cart", tags=["cart"])


def _session_id(x_session_id: str | None = Header(default=None, alias=SESSION_HEADER)) -> str:
    if not x_session_id or not x_session_id.strip():
        raise HTTPException(
            status_code=400,
            detail=f"Header {SESSION_HEADER} is required (create one via POST /cart/session).",
        )
    return x_session_id.strip()


def _active_cart(db: Session, session_id: str, user: User | None):
    """اگر کاربر لاگین باشد سبد کاربر؛ وگرنه سبد مهمان."""
    if user is not None:
        return auth_user_service.get_or_create_user_cart(db, user.id)
    return catalog_service.get_or_create_session_cart(db, session_id)


def _cart_out(db: Session, cart) -> CartOut:
    cart = catalog_service.cart_with_items(db, cart.id)
    if cart is None:
        raise HTTPException(status_code=404, detail="Cart not found")
    lines = catalog_service.cart_lines_out(cart)
    return CartOut(id=cart.id, currency=cart.currency, items=[CartLineOut(**x) for x in lines])


class CartQtyPatch(BaseModel):
    quantity: int = Field(..., gt=0)


@router.post("/session")
def create_session(db: Session = Depends(get_db)):
    sid = str(uuid.uuid4())
    catalog_service.get_or_create_session_cart(db, sid)
    return {"session_id": sid}


@router.get("", response_model=CartOut)
def get_cart(
    session_id: str = Depends(_session_id),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    cart = _active_cart(db, session_id, user)
    return _cart_out(db, cart)


@router.post("/items")
def add_item(
    body: CartLineIn,
    session_id: str = Depends(_session_id),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    cart = _active_cart(db, session_id, user)
    try:
        catalog_service.add_cart_line(db, cart, body.variation_id, body.quantity, body.customization)
    except ValueError as e:
        code = str(e)
        if code == "invalid_variation":
            raise HTTPException(status_code=400, detail="Invalid variation") from e
        if code == "product_not_published":
            raise HTTPException(status_code=400, detail="Product not available") from e
        raise
    return _cart_out(db, cart)


@router.patch("/items/{item_id}")
def patch_item(
    item_id: int,
    body: CartQtyPatch,
    session_id: str = Depends(_session_id),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    cart = _active_cart(db, session_id, user)
    try:
        catalog_service.update_cart_line(db, cart, item_id, body.quantity)
    except ValueError as e:
        if str(e) == "item_not_found":
            raise HTTPException(status_code=404, detail="Item not found") from e
        raise
    return _cart_out(db, cart)


@router.delete("/items/{item_id}")
def delete_item(
    item_id: int,
    session_id: str = Depends(_session_id),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    cart = _active_cart(db, session_id, user)
    try:
        catalog_service.remove_cart_line(db, cart, item_id)
    except ValueError as e:
        if str(e) == "item_not_found":
            raise HTTPException(status_code=404, detail="Item not found") from e
        raise
    return _cart_out(db, cart)
