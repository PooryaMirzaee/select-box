from abc import ABC, abstractmethod

from avan_publisher.api.models import ChannelPublishResult, PublishResultStatus
from avan_publisher.core.context import PublishContext


class ChannelAdapter(ABC):
    """
    Base class for all sales/social channel adapters.

    To add a new channel:
    1. Subclass ChannelAdapter
    2. Set channel_id, name, description
    3. Implement validate_config() and publish()
    4. Register with @register_channel decorator
    5. Enable in config/channels.yaml
    """

    channel_id: str = ""
    name: str = ""
    description: str = ""
    requires_config: list[str] = []

    @classmethod
    def is_configured(cls, config: dict) -> bool:
        inner = config.get("config") or {}
        return all(inner.get(key) for key in cls.requires_config)

    @classmethod
    @abstractmethod
    def validate_config(cls, config: dict) -> list[str]:
        """Return list of validation errors (empty = valid)."""
        ...

    @abstractmethod
    def publish(self, ctx: PublishContext) -> ChannelPublishResult:
        """Execute publish workflow for this channel."""
        ...

    def _stub_result(self, ctx: PublishContext, note: str) -> ChannelPublishResult:
        return ChannelPublishResult(
            channel_id=self.channel_id,
            status=PublishResultStatus.skipped,
            message=note,
            metadata={"dry_run": ctx.dry_run},
        )
