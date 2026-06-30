"""سرویس آنالیتیکس — جمع‌آوری و گزارش‌گیری."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models.analytics import AnalyticsEvent, AnalyticsPageView, AnalyticsSession
from app.schemas.analytics import (
    AnalyticsCollectIn,
    AnalyticsOverviewOut,
    AnalyticsPageItem,
    AnalyticsRankedItem,
    AnalyticsRealtimeOut,
    AnalyticsTimeseriesPoint,
)
from app.services.analytics_security import truncate, validate_event_name, validate_path, validate_visitor_id
from app.services.user_agent import parse_user_agent


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _range_start(days: int) -> datetime:
    d = max(1, min(days, 365))
    return _utc_now() - timedelta(days=d)


def _pct(count: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round(count / total * 100, 1)


def collect(
    db: Session,
    body: AnalyticsCollectIn,
    *,
    user_agent: str | None,
    user_id: int | None = None,
) -> str:
    path = validate_path(body.path)
    visitor_id = validate_visitor_id(body.visitor_id)
    event_name = validate_event_name(body.event_name)
    browser, os_name, device = parse_user_agent(user_agent)
    now = _utc_now()

    session = db.scalar(
        select(AnalyticsSession).where(AnalyticsSession.session_id == body.session_id)
    )

    if session is None:
        session = AnalyticsSession(
            session_id=body.session_id,
            visitor_id=visitor_id,
            user_id=user_id,
            referrer_url=truncate(body.referrer, 512),
            landing_path=path,
            utm_source=truncate(body.utm_source, 120),
            utm_medium=truncate(body.utm_medium, 120),
            utm_campaign=truncate(body.utm_campaign, 120),
            browser=browser,
            os_name=os_name,
            device_type=device,
            screen_width=body.screen_width,
            page_view_count=0,
            event_count=0,
            started_at=now,
            last_seen_at=now,
        )
        db.add(session)
    else:
        session.last_seen_at = now
        if visitor_id and not session.visitor_id:
            session.visitor_id = visitor_id
        if user_id and not session.user_id:
            session.user_id = user_id
        if body.screen_width and not session.screen_width:
            session.screen_width = body.screen_width

    if event_name:
        session.event_count = (session.event_count or 0) + 1
        db.add(
            AnalyticsEvent(
                session_id=body.session_id,
                event_name=event_name,
                path=path,
                payload=body.event_data,
            )
        )
    else:
        session.page_view_count = (session.page_view_count or 0) + 1
        db.add(
            AnalyticsPageView(
                session_id=body.session_id,
                path=path,
                page_title=truncate(body.page_title, 255),
                referrer_path=truncate(body.referrer_path, 512),
                viewed_at=now,
            )
        )

    db.commit()
    return body.session_id


def heartbeat(db: Session, session_id: str) -> None:
    session = db.scalar(select(AnalyticsSession).where(AnalyticsSession.session_id == session_id))
    if session is None:
        return
    session.last_seen_at = _utc_now()
    db.commit()


def overview(db: Session, *, days: int = 7) -> AnalyticsOverviewOut:
    start = _range_start(days)
    realtime_cutoff = _utc_now() - timedelta(minutes=5)

    page_views = (
        db.scalar(
            select(func.count())
            .select_from(AnalyticsPageView)
            .where(AnalyticsPageView.viewed_at >= start)
        )
        or 0
    )

    sessions_q = select(AnalyticsSession).where(AnalyticsSession.started_at >= start)
    sessions = db.scalars(sessions_q).all()
    session_count = len(sessions)

    unique_visitors = len({s.visitor_id or s.session_id for s in sessions})

    single_page = sum(1 for s in sessions if (s.page_view_count or 0) <= 1)
    bounce_rate = round(single_page / session_count, 3) if session_count else 0.0

    total_pages = sum(s.page_view_count or 0 for s in sessions)
    avg_pages = round(total_pages / session_count, 2) if session_count else 0.0

    durations = []
    for s in sessions:
        if s.started_at and s.last_seen_at:
            delta = s.last_seen_at - s.started_at
            durations.append(max(0, delta.total_seconds()))
    avg_duration = round(sum(durations) / len(durations), 1) if durations else 0.0

    events_total = (
        db.scalar(
            select(func.count())
            .select_from(AnalyticsEvent)
            .where(AnalyticsEvent.created_at >= start)
        )
        or 0
    )

    online_now = (
        db.scalar(
            select(func.count())
            .select_from(AnalyticsSession)
            .where(AnalyticsSession.last_seen_at >= realtime_cutoff)
        )
        or 0
    )

    return AnalyticsOverviewOut(
        page_views=page_views,
        sessions=session_count,
        unique_visitors=unique_visitors,
        bounce_rate=bounce_rate,
        avg_pages_per_session=avg_pages,
        avg_session_duration_sec=avg_duration,
        online_now=online_now,
        events_total=events_total,
    )


def _day_bucket(column):
    if engine.dialect.name == "postgresql":
        return func.date_trunc("day", column)
    return func.date(column)


def _bucket_date(bucket) -> str | None:
    if bucket is None:
        return None
    if hasattr(bucket, "date"):
        return bucket.date().isoformat()
    return str(bucket)[:10]


def timeseries(db: Session, *, days: int = 30) -> list[AnalyticsTimeseriesPoint]:
    start = _range_start(days)
    day_bucket = _day_bucket(AnalyticsPageView.viewed_at).label("bucket")

    rows = db.execute(
        select(
            day_bucket,
            func.count().label("views"),
            func.count(func.distinct(AnalyticsPageView.session_id)).label("sessions"),
        )
        .where(AnalyticsPageView.viewed_at >= start)
        .group_by(day_bucket)
        .order_by(day_bucket)
    ).all()

    session_bucket = _day_bucket(AnalyticsSession.started_at).label("bucket")
    session_rows = db.execute(
        select(
            session_bucket,
            func.count(func.distinct(AnalyticsSession.visitor_id)).label("visitors"),
        )
        .where(AnalyticsSession.started_at >= start)
        .group_by(session_bucket)
    ).all()
    visitors_by_day = {_bucket_date(r.bucket): r.visitors for r in session_rows if r.bucket}

    points: list[AnalyticsTimeseriesPoint] = []
    for row in rows:
        d = _bucket_date(row.bucket)
        if not d:
            continue
        points.append(
            AnalyticsTimeseriesPoint(
                date=d,
                page_views=row.views,
                sessions=row.sessions,
                unique_visitors=visitors_by_day.get(d, row.sessions),
            )
        )
    return points


def top_pages(db: Session, *, days: int = 7, limit: int = 20) -> list[AnalyticsPageItem]:
    start = _range_start(days)
    title_sub = (
        select(
            AnalyticsPageView.path,
            AnalyticsPageView.page_title,
            func.row_number()
            .over(
                partition_by=AnalyticsPageView.path,
                order_by=AnalyticsPageView.viewed_at.desc(),
            )
            .label("rn"),
        )
        .where(AnalyticsPageView.viewed_at >= start)
        .subquery()
    )
    latest_titles = select(title_sub.c.path, title_sub.c.page_title).where(title_sub.c.rn == 1).subquery()

    rows = db.execute(
        select(
            AnalyticsPageView.path,
            func.count().label("views"),
            func.count(func.distinct(AnalyticsPageView.session_id)).label("sessions"),
        )
        .where(AnalyticsPageView.viewed_at >= start)
        .group_by(AnalyticsPageView.path)
        .order_by(func.count().desc())
        .limit(limit)
    ).all()

    title_map = {
        r.path: r.page_title
        for r in db.execute(select(latest_titles.c.path, latest_titles.c.page_title)).all()
    }

    return [
        AnalyticsPageItem(
            path=r.path,
            page_title=title_map.get(r.path),
            views=r.views,
            unique_sessions=r.sessions,
        )
        for r in rows
    ]


def ranked_breakdown(
    db: Session,
    column,
    *,
    days: int = 7,
    limit: int = 10,
) -> list[AnalyticsRankedItem]:
    start = _range_start(days)
    rows = db.execute(
        select(column, func.count().label("cnt"))
        .where(AnalyticsSession.started_at >= start)
        .group_by(column)
        .order_by(func.count().desc())
        .limit(limit)
    ).all()
    total = sum(r.cnt for r in rows) or 1
    return [
        AnalyticsRankedItem(label=r[0] or "نامشخص", count=r.cnt, percentage=_pct(r.cnt, total))
        for r in rows
    ]


def referrers(db: Session, *, days: int = 7, limit: int = 15) -> list[AnalyticsRankedItem]:
    start = _range_start(days)
    ref = func.coalesce(AnalyticsSession.referrer_url, "(مستقیم)")
    rows = db.execute(
        select(ref.label("label"), func.count().label("cnt"))
        .where(AnalyticsSession.started_at >= start)
        .group_by(ref)
        .order_by(func.count().desc())
        .limit(limit)
    ).all()
    total = sum(r.cnt for r in rows) or 1
    return [AnalyticsRankedItem(label=r.label[:120], count=r.cnt, percentage=_pct(r.cnt, total)) for r in rows]


def landing_pages(db: Session, *, days: int = 7, limit: int = 15) -> list[AnalyticsRankedItem]:
    start = _range_start(days)
    lp = func.coalesce(AnalyticsSession.landing_path, "/")
    rows = db.execute(
        select(lp.label("label"), func.count().label("cnt"))
        .where(AnalyticsSession.started_at >= start)
        .group_by(lp)
        .order_by(func.count().desc())
        .limit(limit)
    ).all()
    total = sum(r.cnt for r in rows) or 1
    return [AnalyticsRankedItem(label=r.label, count=r.cnt, percentage=_pct(r.cnt, total)) for r in rows]


def utm_sources(db: Session, *, days: int = 7, limit: int = 10) -> list[AnalyticsRankedItem]:
    start = _range_start(days)
    src = func.coalesce(AnalyticsSession.utm_source, "(بدون UTM)")
    rows = db.execute(
        select(src.label("label"), func.count().label("cnt"))
        .where(AnalyticsSession.started_at >= start)
        .group_by(src)
        .order_by(func.count().desc())
        .limit(limit)
    ).all()
    total = sum(r.cnt for r in rows) or 1
    return [AnalyticsRankedItem(label=r.label, count=r.cnt, percentage=_pct(r.cnt, total)) for r in rows]


def events_breakdown(db: Session, *, days: int = 7, limit: int = 15) -> list[AnalyticsRankedItem]:
    start = _range_start(days)
    rows = db.execute(
        select(AnalyticsEvent.event_name, func.count().label("cnt"))
        .where(AnalyticsEvent.created_at >= start)
        .group_by(AnalyticsEvent.event_name)
        .order_by(func.count().desc())
        .limit(limit)
    ).all()
    total = sum(r.cnt for r in rows) or 1
    return [AnalyticsRankedItem(label=r.event_name, count=r.cnt, percentage=_pct(r.cnt, total)) for r in rows]


def realtime(db: Session) -> AnalyticsRealtimeOut:
    cutoff = _utc_now() - timedelta(minutes=5)
    online_now = (
        db.scalar(
            select(func.count())
            .select_from(AnalyticsSession)
            .where(AnalyticsSession.last_seen_at >= cutoff)
        )
        or 0
    )

    active = db.execute(
        select(AnalyticsPageView.path, func.count().label("cnt"))
        .join(
            AnalyticsSession,
            AnalyticsSession.session_id == AnalyticsPageView.session_id,
        )
        .where(AnalyticsSession.last_seen_at >= cutoff)
        .group_by(AnalyticsPageView.path)
        .order_by(func.count().desc())
        .limit(8)
    ).all()
    total_active = sum(r.cnt for r in active) or 1

    recent = db.scalars(
        select(AnalyticsPageView.path)
        .join(AnalyticsSession, AnalyticsSession.session_id == AnalyticsPageView.session_id)
        .where(AnalyticsSession.last_seen_at >= cutoff)
        .order_by(AnalyticsPageView.viewed_at.desc())
        .limit(12)
    ).all()

    return AnalyticsRealtimeOut(
        online_now=online_now,
        active_pages=[
            AnalyticsRankedItem(label=r.path, count=r.cnt, percentage=_pct(r.cnt, total_active))
            for r in active
        ],
        recent_paths=list(recent),
    )
