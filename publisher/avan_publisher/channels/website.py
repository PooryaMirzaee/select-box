from datetime import datetime, timezone

from avan_publisher.api.models import ChannelPublishResult, PublishResultStatus
from avan_publisher.channels.base import ChannelAdapter
from avan_publisher.core.context import PublishContext
from avan_publisher.core.registry import register_channel


@register_channel
class WebsiteChannel(ChannelAdapter):
    channel_id = "website"
    name = "CORALAY Store"
    description = "فروشگاه اصلی — محصول از قبل در سایت منتشر شده"

    @classmethod
    def validate_config(cls, config: dict) -> list[str]:
        return []

    def publish(self, ctx: PublishContext) -> ChannelPublishResult:
        if ctx.product.status != "published":
            return ChannelPublishResult(
                channel_id=self.channel_id,
                status=PublishResultStatus.skipped,
                message="محصول هنوز در فروشگاه منتشر نشده (status != published)",
            )
        if ctx.dry_run:
            return ChannelPublishResult(
                channel_id=self.channel_id,
                status=PublishResultStatus.skipped,
                message=f"[dry-run] Would verify listing at {ctx.product_url}",
            )
        return ChannelPublishResult(
            channel_id=self.channel_id,
            status=PublishResultStatus.success,
            message="محصول در فروشگاه فعال است",
            external_url=ctx.product_url,
            published_at=datetime.now(timezone.utc),
        )
