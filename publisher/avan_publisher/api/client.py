import json
from typing import Any

import httpx

from avan_publisher.api.models import ProductAdmin, ProductDetail, ProductSummary, TokenResponse
from avan_publisher.config import Settings, get_settings


class CoralayAPIError(Exception):
    def __init__(self, message: str, status_code: int | None = None, detail: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.detail = detail


class CoralayClient:
    """HTTP client for CORALAY backend API."""

    def __init__(self, settings: Settings | None = None, token: str | None = None):
        self.settings = settings or get_settings()
        self._token = token
        self._client = httpx.Client(
            base_url=self.settings.api_v1,
            timeout=30.0,
            headers={"Accept": "application/json"},
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "CoralayClient":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    @property
    def token(self) -> str | None:
        if self._token:
            return self._token
        path = self.settings.token_path
        if not path.is_file():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("access_token")

    def set_token(self, token: str) -> None:
        self._token = token

    def _headers(self) -> dict[str, str]:
        headers: dict[str, str] = {}
        token = self.token
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    def _request(
        self,
        method: str,
        path: str,
        *,
        auth: bool = False,
        **kwargs: Any,
    ) -> Any:
        headers = kwargs.pop("headers", {})
        if auth:
            headers.update(self._headers())
            if not self.token:
                raise CoralayAPIError("Not authenticated. Run: avan-publisher login")
        try:
            response = self._client.request(method, path, headers=headers, **kwargs)
        except httpx.RequestError as exc:
            raise CoralayAPIError(f"Connection failed: {exc}") from exc

        if response.status_code >= 400:
            detail: Any = None
            try:
                detail = response.json()
            except Exception:
                detail = response.text
            raise CoralayAPIError(
                f"API error {response.status_code}: {path}",
                status_code=response.status_code,
                detail=detail,
            )
        if response.status_code == 204:
            return None
        return response.json()

    def health(self) -> dict:
        response = httpx.get(f"{self.settings.api_base_url.rstrip('/')}/health", timeout=10.0)
        response.raise_for_status()
        return response.json()

    def admin_login(self, phone: str, password: str) -> TokenResponse:
        data = self._request("POST", "/auth/admin/login", json={"phone": phone, "password": password})
        return TokenResponse.model_validate(data)

    def save_token(self, token_response: TokenResponse) -> None:
        path = self.settings.token_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(token_response.model_dump_json(indent=2), encoding="utf-8")
        self._token = token_response.access_token

    def list_products_public(
        self,
        *,
        limit: int = 100,
        offset: int = 0,
        parent_slug: str | None = None,
    ) -> list[ProductSummary]:
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if parent_slug:
            params["parent_slug"] = parent_slug
        data = self._request("GET", "/catalog/products", params=params)
        return [ProductSummary.model_validate(item) for item in data]

    def list_products_admin(self) -> list[ProductAdmin]:
        data = self._request("GET", "/admin/products", auth=True)
        return [ProductAdmin.model_validate(item) for item in data]

    def get_product_by_slug(self, slug: str) -> ProductDetail:
        data = self._request("GET", f"/catalog/products/{slug}")
        return ProductDetail.model_validate(data)

    def get_product_admin(self, product_id: int) -> ProductAdmin:
        data = self._request("GET", f"/admin/products/{product_id}", auth=True)
        return ProductAdmin.model_validate(data)

    def _product_detail_from_admin(self, admin: ProductAdmin) -> ProductDetail:
        """Build ProductDetail from admin summary when catalog detail is unavailable (draft)."""
        image_urls = [admin.thumbnail_url] if admin.thumbnail_url else []
        return ProductDetail(
            id=admin.id,
            slug=admin.slug,
            title=admin.title,
            base_price=admin.base_price,
            compare_at_price=admin.compare_at_price,
            status=admin.status,
            meta_title=admin.meta_title,
            meta_description=admin.meta_description,
            description=admin.description,
            design_id=admin.design_id,
            design_slug=admin.design_code or str(admin.design_id),
            design_title=admin.design_title or admin.title,
            default_sku=None,
            in_stock=admin.variation_count > 0,
            effective_price=admin.base_price,
            images=[],
            image_urls=image_urls,
            variations=[],
        )

    def resolve_product(self, ref: str) -> ProductDetail:
        """Resolve product by numeric id or slug (includes draft via admin API)."""
        if ref.isdigit():
            admin = self.get_product_admin(int(ref))
            try:
                return self.get_product_by_slug(admin.slug)
            except CoralayAPIError as exc:
                if exc.status_code == 404:
                    return self._product_detail_from_admin(admin)
                raise

        try:
            return self.get_product_by_slug(ref)
        except CoralayAPIError as exc:
            if exc.status_code != 404 or not self.token:
                raise
            for admin in self.list_products_admin():
                if admin.slug == ref:
                    return self._product_detail_from_admin(admin)
            raise

    def product_store_url(self, slug: str) -> str:
        return f"{self.settings.storefront_url.rstrip('/')}/product/{slug}"
