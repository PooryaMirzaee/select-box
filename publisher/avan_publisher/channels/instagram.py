from avan_publisher.api.models import ChannelPublishResult, PublishResultStatus
from avan_publisher.channels.base import ChannelAdapter
from avan_publisher.core.context import PublishContext
from avan_publisher.core.registry import register_channel


@register_channel
class InstagramChannel(ChannelAdapter):
    channel_id = "instagram"
    name = "Instagram"
    description = "انتشار پست یا استوری اینستاگرام"
    requires_config = ["access_token"]

    @classmethod
    def validate_config(cls, config: dict) -> list[str]:
        inner = config.get("config") or {}
        errors = []
        if not inner.get("access_token"):
            errors.append("access_token is required in config/channels.yaml")
        return errors

    def publish(self, ctx: PublishContext) -> ChannelPublishResult:
        if not self.is_configured(ctx.channel_config):
            return self._stub_result(
                ctx,
                "کانال اینستاگرام پیکربندی نشده — access_token را در config/channels.yaml تنظیم کنید",
            )
        if ctx.dry_run:
            return ChannelPublishResult(
                channel_id=self.channel_id,
                status=PublishResultStatus.skipped,
                message=f"[dry-run] Would post to Instagram: {ctx.product.title}",
                metadata={"caption_preview": ctx.caption_base[:200]},
            )

        # TODO: Implement Instagram Graph API / Content Publishing API
        return ChannelPublishResult(
            channel_id=self.channel_id,
            status=PublishResultStatus.pending,
            message="سناریوی اینستاگرام هنوز پیاده‌سازی نشده — آمادهٔ توسعه",
            metadata={
                "planned_steps": [
                    "upload_image",
                    "create_media_container",
                    "publish_media",
                ],
                "image_url": ctx.primary_image,
            },
        )
