from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from avan_publisher.channels.base import ChannelAdapter


class ChannelRegistry:
    """Central registry for channel adapters (plugin discovery)."""

    def __init__(self) -> None:
        self._channels: dict[str, type[ChannelAdapter]] = {}

    def register(self, channel_cls: type[ChannelAdapter]) -> type[ChannelAdapter]:
        channel_id = channel_cls.channel_id
        if not channel_id:
            raise ValueError(f"Channel class {channel_cls.__name__} missing channel_id")
        self._channels[channel_id] = channel_cls
        return channel_cls

    def get(self, channel_id: str) -> type[ChannelAdapter] | None:
        return self._channels.get(channel_id)

    def all(self) -> dict[str, type[ChannelAdapter]]:
        return dict(self._channels)

    def ids(self) -> list[str]:
        return sorted(self._channels.keys())


registry = ChannelRegistry()


def register_channel(channel_cls: type[ChannelAdapter]) -> type[ChannelAdapter]:
    return registry.register(channel_cls)
