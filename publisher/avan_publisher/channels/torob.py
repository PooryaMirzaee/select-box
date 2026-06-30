from avan_publisher.api.models import ChannelPublishResult, PublishResultStatus
from avan_publisher.channels.base import ChannelAdapter
from avan_publisher.core.context import PublishContext
from avan_publisher.core.registry import register_channel


@register_channel
class TorobChannel(ChannelAdapter):
    channel_id = "torob"
    name = "Torob"
    description = "همگام‌سازی با فید محصولات ترب (API بک‌اند)"

    @classmethod
    def validate_config(cls, config: dict) -> list[str]:
        return []

    def publish(self, ctx: PublishContext) -> ChannelPublishResult:
        if ctx.product.status != "published":
            return ChannelPublishResult(
                channel_id=self.channel_id,
                status=PublishResultStatus.skipped,
                message="ترب فقط محصولات published را index می‌کند",
            )
        if ctx.dry_run:
            return ChannelPublishResult(
                channel_id=self.channel_id,
                status=PublishResultStatus.skipped,
                message="[dry-run] Torob feed syncs automatically via backend API",
            )

        # Torob integration lives in backend (torob_feed.py) — pull-based feed
        return ChannelPublishResult(
            channel_id=self.channel_id,
            status=PublishResultStatus.success,
            message="محصول published است و در فید ترب (POST /torob_api/v3/products) قابل دریافت است",
            external_url=ctx.product_url,
            metadata={"note": "No push needed — Torob pulls from backend feed"},
        )
