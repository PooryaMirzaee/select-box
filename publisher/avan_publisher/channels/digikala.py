from avan_publisher.api.models import ChannelPublishResult, PublishResultStatus
from avan_publisher.channels.base import ChannelAdapter
from avan_publisher.core.context import PublishContext
from avan_publisher.core.registry import register_channel


@register_channel
class DigikalaChannel(ChannelAdapter):
    channel_id = "digikala"
    name = "Digikala"
    description = "ثبت و به‌روزرسانی محصول در دیجی‌کالا"
    requires_config = ["seller_api_key"]

    @classmethod
    def validate_config(cls, config: dict) -> list[str]:
        inner = config.get("config") or {}
        if not inner.get("seller_api_key"):
            return ["seller_api_key is required for Digikala integration"]
        return []

    def publish(self, ctx: PublishContext) -> ChannelPublishResult:
        if not self.is_configured(ctx.channel_config):
            return self._stub_result(ctx, "دیجی‌کالا پیکربندی نشده")
        if ctx.dry_run:
            return ChannelPublishResult(
                channel_id=self.channel_id,
                status=PublishResultStatus.skipped,
                message=f"[dry-run] Would create/update Digikala listing: {ctx.product.title}",
            )

        # TODO: Map ProductDetail → Digikala seller API payload
        return ChannelPublishResult(
            channel_id=self.channel_id,
            status=PublishResultStatus.pending,
            message="سناریوی دیجی‌کالا هنوز پیاده‌سازی نشده — آمادهٔ توسعه",
            metadata={
                "planned_steps": [
                    "map_category",
                    "upload_images",
                    "create_variant_skus",
                    "submit_for_review",
                ],
            },
        )
