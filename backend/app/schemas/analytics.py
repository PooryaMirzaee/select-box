"""اسکیمای آنالیتیکس."""

from datetime import datetime

from pydantic import BaseModel, Field


class AnalyticsCollectIn(BaseModel):
    session_id: str = Field(min_length=8, max_length=64)
    visitor_id: str | None = Field(default=None, max_length=64)
    path: str = Field(min_length=1, max_length=512)
    page_title: str | None = Field(default=None, max_length=255)
    referrer: str | None = Field(default=None, max_length=512)
    referrer_path: str | None = Field(default=None, max_length=512)
    screen_width: int | None = Field(default=None, ge=0, le=10000)
    utm_source: str | None = Field(default=None, max_length=120)
    utm_medium: str | None = Field(default=None, max_length=120)
    utm_campaign: str | None = Field(default=None, max_length=120)
    event_name: str | None = Field(default=None, max_length=64)
    event_data: dict | None = None


class AnalyticsCollectOut(BaseModel):
    ok: bool = True
    session_id: str


class AnalyticsOverviewOut(BaseModel):
    page_views: int
    sessions: int
    unique_visitors: int
    bounce_rate: float
    avg_pages_per_session: float
    avg_session_duration_sec: float
    online_now: int
    events_total: int


class AnalyticsTimeseriesPoint(BaseModel):
    date: str
    page_views: int
    sessions: int
    unique_visitors: int


class AnalyticsRankedItem(BaseModel):
    label: str
    count: int
    percentage: float = 0


class AnalyticsPageItem(BaseModel):
    path: str
    page_title: str | None
    views: int
    unique_sessions: int


class AnalyticsRealtimeOut(BaseModel):
    online_now: int
    active_pages: list[AnalyticsRankedItem]
    recent_paths: list[str]
