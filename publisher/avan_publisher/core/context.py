from dataclasses import dataclass, field
from datetime import datetime, timezone

from avan_publisher.api.models import ProductDetail


@dataclass
class PublishContext:
    """Runtime context passed to every channel adapter during publish."""

    product: ProductDetail
    product_url: str
    channel_config: dict = field(default_factory=dict)
    run_id: str = ""
    dry_run: bool = False
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict = field(default_factory=dict)

    @property
    def primary_image(self) -> str | None:
        return self.product.primary_image_url

    @property
    def caption_base(self) -> str:
        price = f"{self.product.price_toman:,}"
        lines = [
            self.product.title,
            f"قیمت: {price} تومان",
            self.product_url,
        ]
        if self.product.description:
            lines.insert(1, self.product.description[:500])
        return "\n".join(lines)
