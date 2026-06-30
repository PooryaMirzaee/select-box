import uuid
from dataclasses import dataclass, field

from avan_publisher.api.client import CoralayClient
from avan_publisher.api.models import ChannelPublishResult, ProductDetail, PublishResultStatus
from avan_publisher.channels.base import ChannelAdapter
from avan_publisher.config import load_channels_config
from avan_publisher.core.context import PublishContext
from avan_publisher.core.registry import registry
from avan_publisher.core.store import save_publish_record

# Import channels to register adapters
import avan_publisher.channels  # noqa: F401


@dataclass
class PublishRunResult:
    run_id: str
    product: ProductDetail
    results: list[ChannelPublishResult] = field(default_factory=list)

    @property
    def success_count(self) -> int:
        return sum(1 for r in self.results if r.status == PublishResultStatus.success)

    @property
    def failed_count(self) -> int:
        return sum(1 for r in self.results if r.status == PublishResultStatus.failed)


class PublishPipeline:
    def __init__(self, client: CoralayClient | None = None):
        self.client = client or CoralayClient()
        self.channels_config = load_channels_config()

    def list_available_channels(self) -> list[dict]:
        items = []
        for channel_id, channel_cls in registry.all().items():
            cfg = self.channels_config.get("channels", {}).get(channel_id, {})
            items.append(
                {
                    "id": channel_id,
                    "name": channel_cls.name,
                    "description": channel_cls.description,
                    "enabled": cfg.get("enabled", False),
                    "configured": channel_cls.is_configured(cfg),
                    "errors": channel_cls.validate_config(cfg),
                }
            )
        return items

    def resolve_channels(self, channel_ids: list[str]) -> list[tuple[str, type[ChannelAdapter], dict]]:
        resolved = []
        all_channels = self.channels_config.get("channels", {})
        for cid in channel_ids:
            channel_cls = registry.get(cid)
            if channel_cls is None:
                raise ValueError(f"Unknown channel: {cid}")
            cfg = all_channels.get(cid, {})
            if not cfg.get("enabled", False):
                raise ValueError(f"Channel '{cid}' is disabled in config/channels.yaml")
            resolved.append((cid, channel_cls, cfg))
        return resolved

    def publish_product(
        self,
        product_ref: str,
        channel_ids: list[str],
        *,
        dry_run: bool = False,
    ) -> PublishRunResult:
        run_id = uuid.uuid4().hex[:12]
        product = self.client.resolve_product(product_ref)
        product_url = self.client.product_store_url(product.slug)
        resolved = self.resolve_channels(channel_ids)

        results: list[ChannelPublishResult] = []
        for cid, channel_cls, cfg in resolved:
            adapter = channel_cls()
            ctx = PublishContext(
                product=product,
                product_url=product_url,
                channel_config=cfg,
                run_id=run_id,
                dry_run=dry_run,
            )
            try:
                result = adapter.publish(ctx)
            except Exception as exc:
                result = ChannelPublishResult(
                    channel_id=cid,
                    status=PublishResultStatus.failed,
                    message=str(exc),
                )

            if not dry_run:
                save_publish_record(
                    run_id=run_id,
                    product_id=product.id,
                    product_slug=product.slug,
                    channel_id=cid,
                    status=result.status.value,
                    message=result.message,
                    external_id=result.external_id,
                    external_url=result.external_url,
                )
            results.append(result)

        return PublishRunResult(run_id=run_id, product=product, results=results)

    def publish_batch(
        self,
        product_refs: list[str],
        channel_ids: list[str],
        *,
        dry_run: bool = False,
    ) -> list[PublishRunResult]:
        return [self.publish_product(ref, channel_ids, dry_run=dry_run) for ref in product_refs]
