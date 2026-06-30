from avan_publisher.api.models import ChannelPublishResult, PublishResultStatus
from avan_publisher.channels.base import ChannelAdapter
from avan_publisher.core.context import PublishContext
from avan_publisher.core.registry import register_channel


@register_channel
class TelegramChannel(ChannelAdapter):
    channel_id = "telegram"
    name = "Telegram"
    description = "ارسال محصول به کانال یا گروه تلگرام"
    requires_config = ["bot_token", "channel_id"]

    @classmethod
    def validate_config(cls, config: dict) -> list[str]:
        inner = config.get("config") or {}
        errors = []
        if not inner.get("bot_token"):
            errors.append("bot_token is required")
        if not inner.get("channel_id"):
            errors.append("channel_id is required (e.g. @your_channel)")
        return errors

    def publish(self, ctx: PublishContext) -> ChannelPublishResult:
        if not self.is_configured(ctx.channel_config):
            return self._stub_result(
                ctx,
                "کانال تلگرام پیکربندی نشده — bot_token و channel_id را تنظیم کنید",
            )
        if ctx.dry_run:
            return ChannelPublishResult(
                channel_id=self.channel_id,
                status=PublishResultStatus.skipped,
                message=f"[dry-run] Would send to Telegram: {ctx.product.title}",
            )

        # TODO: Implement Telegram Bot API sendPhoto + caption
        return ChannelPublishResult(
            channel_id=self.channel_id,
            status=PublishResultStatus.pending,
            message="سناریوی تلگرام هنوز پیاده‌سازی نشده — آمادهٔ توسعه",
            metadata={
                "planned_steps": ["send_photo", "send_caption_with_link"],
                "caption": ctx.caption_base,
            },
        )
