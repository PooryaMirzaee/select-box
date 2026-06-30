from avan_publisher.api.models import ChannelPublishResult, PublishResultStatus
from avan_publisher.channels.base import ChannelAdapter
from avan_publisher.core.context import PublishContext
from avan_publisher.core.registry import register_channel


@register_channel
class BasalamChannel(ChannelAdapter):
    channel_id = "basalam"
    name = "Basalam"
    description = "فروش محصول در باسلام"
    requires_config = ["api_token"]

    @classmethod
    def validate_config(cls, config: dict) -> list[str]:
        inner = config.get("config") or {}
        if not inner.get("api_token"):
            return ["api_token is required for Basalam"]
        return []

    def publish(self, ctx: PublishContext) -> ChannelPublishResult:
        if not self.is_configured(ctx.channel_config):
            return self._stub_result(ctx, "باسلام پیکربندی نشده")
        if ctx.dry_run:
            return ChannelPublishResult(
                channel_id=self.channel_id,
                status=PublishResultStatus.skipped,
                message=f"[dry-run] Would publish to Basalam: {ctx.product.title}",
            )

        return ChannelPublishResult(
            channel_id=self.channel_id,
            status=PublishResultStatus.pending,
            message="سناریوی باسلام هنوز پیاده‌سازی نشده — آمادهٔ توسعه",
        )
