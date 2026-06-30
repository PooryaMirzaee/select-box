"""API آنالیتیکس — جمع‌آوری عمومی و گزارش ادمین."""

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps_auth import require_admin
from app.db.session import get_db
from app.schemas.analytics import (
    AnalyticsCollectIn,
    AnalyticsCollectOut,
    AnalyticsOverviewOut,
    AnalyticsPageItem,
    AnalyticsRankedItem,
    AnalyticsRealtimeOut,
    AnalyticsTimeseriesPoint,
)
from app.services import analytics as analytics_service
from app.services.analytics_security import check_collect_rate, validate_session_id

router = APIRouter(prefix="/analytics", tags=["analytics"])
admin_router = APIRouter(
    prefix="/admin/analytics",
    tags=["admin-analytics"],
    dependencies=[Depends(require_admin)],
)


class AnalyticsHeartbeatIn(BaseModel):
    session_id: str = Field(min_length=8, max_length=64)


@router.post("/collect", response_model=AnalyticsCollectOut)
def collect_hit(
    body: AnalyticsCollectIn,
    request: Request,
    db: Session = Depends(get_db),
):
    sid = validate_session_id(body.session_id)
    check_collect_rate(request, sid)
    ua = request.headers.get("user-agent")
    analytics_service.collect(db, body, user_agent=ua)
    return AnalyticsCollectOut(session_id=sid)


@router.post("/heartbeat")
def heartbeat(body: AnalyticsHeartbeatIn, request: Request, db: Session = Depends(get_db)):
    sid = validate_session_id(body.session_id)
    check_collect_rate(request, sid)
    analytics_service.heartbeat(db, sid)
    return {"ok": True}


@admin_router.get("/overview", response_model=AnalyticsOverviewOut)
def admin_overview(
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db),
):
    return analytics_service.overview(db, days=days)


@admin_router.get("/timeseries", response_model=list[AnalyticsTimeseriesPoint])
def admin_timeseries(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    return analytics_service.timeseries(db, days=days)


@admin_router.get("/pages", response_model=list[AnalyticsPageItem])
def admin_pages(
    days: int = Query(7, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return analytics_service.top_pages(db, days=days, limit=limit)


@admin_router.get("/referrers", response_model=list[AnalyticsRankedItem])
def admin_referrers(
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db),
):
    return analytics_service.referrers(db, days=days)


@admin_router.get("/landing-pages", response_model=list[AnalyticsRankedItem])
def admin_landing_pages(
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db),
):
    return analytics_service.landing_pages(db, days=days)


@admin_router.get("/utm", response_model=list[AnalyticsRankedItem])
def admin_utm(
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db),
):
    return analytics_service.utm_sources(db, days=days)


@admin_router.get("/devices", response_model=list[AnalyticsRankedItem])
def admin_devices(
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db),
):
    from app.models.analytics import AnalyticsSession

    return analytics_service.ranked_breakdown(db, AnalyticsSession.device_type, days=days)


@admin_router.get("/browsers", response_model=list[AnalyticsRankedItem])
def admin_browsers(
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db),
):
    from app.models.analytics import AnalyticsSession

    return analytics_service.ranked_breakdown(db, AnalyticsSession.browser, days=days)


@admin_router.get("/os", response_model=list[AnalyticsRankedItem])
def admin_os(
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db),
):
    from app.models.analytics import AnalyticsSession

    return analytics_service.ranked_breakdown(db, AnalyticsSession.os_name, days=days)


@admin_router.get("/events", response_model=list[AnalyticsRankedItem])
def admin_events(
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db),
):
    return analytics_service.events_breakdown(db, days=days)


@admin_router.get("/realtime", response_model=AnalyticsRealtimeOut)
def admin_realtime(db: Session = Depends(get_db)):
    return analytics_service.realtime(db)
