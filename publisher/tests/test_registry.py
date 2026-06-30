"""Tests for channel registry."""

import avan_publisher.channels  # noqa: F401
from avan_publisher.core.registry import registry


def test_channels_registered():
    ids = registry.ids()
    assert "website" in ids
    assert "instagram" in ids
    assert "telegram" in ids
    assert len(ids) >= 6
