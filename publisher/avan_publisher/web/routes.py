from fastapi import APIRouter, HTTPException

from avan_publisher.api.client import CoralayAPIError, CoralayClient
from avan_publisher.config import get_settings
from avan_publisher.core.pipeline import PublishPipeline
from avan_publisher.core.store import list_publish_records
from avan_publisher.core.sync import sync_products_to_cache
from avan_publisher.web.schemas import (
    AuthStatusResponse,
    ChannelResultOut,
    HealthResponse,
    LoginRequest,
    LoginResponse,
    PublishRequest,
    PublishRunOut,
    SettingsOut,
)

router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()
    try:
        with CoralayClient() as client:
            result = client.health()
        return HealthResponse(
            api_ok=True,
            api_url=settings.api_base_url,
            api_status=result.get("status", "ok"),
        )
    except Exception as exc:
        return HealthResponse(
            api_ok=False,
            api_url=settings.api_base_url,
            error=str(exc),
        )


@router.get("/settings", response_model=SettingsOut)
def settings_out() -> SettingsOut:
    settings = get_settings()
    return SettingsOut(
        api_base_url=settings.api_base_url,
        storefront_url=settings.storefront_url,
        has_token=settings.token_path.is_file(),
    )


@router.get("/auth/status", response_model=AuthStatusResponse)
def auth_status() -> AuthStatusResponse:
    settings = get_settings()
    if not settings.token_path.is_file():
        return AuthStatusResponse(logged_in=False)
    import json

    data = json.loads(settings.token_path.read_text(encoding="utf-8"))
    return AuthStatusResponse(
        logged_in=True,
        phone=data.get("phone"),
        role=data.get("role"),
    )


@router.post("/auth/login", response_model=LoginResponse)
def auth_login(body: LoginRequest) -> LoginResponse:
    settings = get_settings()
    phone = body.phone or settings.admin_phone
    password = body.password or settings.admin_password
    if not phone or not password:
        raise HTTPException(status_code=400, detail="شماره و رمز عبور الزامی است")

    try:
        with CoralayClient() as client:
            token = client.admin_login(phone, password)
            client.save_token(token)
        return LoginResponse(phone=token.phone, role=token.role)
    except CoralayAPIError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.get("/products")
def list_products(status: str | None = None):
    try:
        with CoralayClient() as client:
            items = client.list_products_admin()
    except CoralayAPIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if status:
        items = [p for p in items if p.status == status]
    return [p.model_dump() for p in items]


@router.get("/products/{ref}")
def get_product(ref: str):
    try:
        with CoralayClient() as client:
            product = client.resolve_product(ref)
            url = client.product_store_url(product.slug)
    except CoralayAPIError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    data = product.model_dump()
    data["store_url"] = url
    return data


@router.post("/products/sync")
def sync_products():
    try:
        with CoralayClient() as client:
            count = sync_products_to_cache(client)
    except CoralayAPIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"synced": count}


@router.get("/channels")
def list_channels():
    pipeline = PublishPipeline()
    return pipeline.list_available_channels()


@router.post("/publish", response_model=list[PublishRunOut])
def publish(body: PublishRequest) -> list[PublishRunOut]:
    pipeline = PublishPipeline()
    try:
        runs = pipeline.publish_batch(body.products, body.channels, dry_run=body.dry_run)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except CoralayAPIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return [
        PublishRunOut(
            run_id=run.run_id,
            product_id=run.product.id,
            product_title=run.product.title,
            product_slug=run.product.slug,
            results=[
                ChannelResultOut(
                    channel_id=r.channel_id,
                    status=r.status.value,
                    message=r.message,
                    external_url=r.external_url,
                )
                for r in run.results
            ],
        )
        for run in runs
    ]


@router.get("/history")
def history(limit: int = 50):
    records = list_publish_records(limit=limit)
    return [
        {
            "id": r.id,
            "run_id": r.run_id,
            "product_id": r.product_id,
            "product_slug": r.product_slug,
            "channel_id": r.channel_id,
            "status": r.status,
            "message": r.message,
            "external_url": r.external_url,
            "created_at": r.created_at.isoformat(),
        }
        for r in records
    ]
