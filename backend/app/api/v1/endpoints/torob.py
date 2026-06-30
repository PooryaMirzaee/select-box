"""Product API v3 ترب — همگام‌سازی محصولات."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.torob import TorobProductsRequest, TorobProductsResponse
from app.services.torob_auth import verify_torob_request
from app.services.torob_feed import build_response

router = APIRouter(prefix="/torob_api/v3", tags=["torob"])


@router.post(
    "/products",
    response_model=TorobProductsResponse,
    responses={
        400: {"description": "Invalid request body"},
        401: {"description": "Invalid or missing Torob token"},
    },
)
async def torob_products(
    request: Request,
    db: Session = Depends(get_db),
    x_torob_token: str | None = Header(default=None, alias="X-Torob-Token"),
    x_torob_token_version: str | None = Header(default=None, alias="X-Torob-Token-Version"),
):
    verify_torob_request(
        request,
        token=x_torob_token,
        token_version=x_torob_token_version,
    )

    try:
        body_raw = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid JSON body"})

    if not body_raw:
        return JSONResponse(status_code=400, content={"error": "Request body is empty"})

    try:
        body = TorobProductsRequest.model_validate(body_raw)
    except ValidationError as exc:
        msg = exc.errors()[0].get("msg", "Invalid request")
        if isinstance(msg, str) and msg.startswith("Value error, "):
            msg = msg[len("Value error, ") :]
        return JSONResponse(status_code=400, content={"error": str(msg)})

    return build_response(db, body)
