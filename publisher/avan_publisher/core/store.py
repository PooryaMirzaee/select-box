from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from avan_publisher.config import get_settings


class Base(DeclarativeBase):
    pass


class PublishRecord(Base):
    __tablename__ = "publish_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), index=True)
    product_id: Mapped[int] = mapped_column(Integer, index=True)
    product_slug: Mapped[str] = mapped_column(String(255), index=True)
    channel_id: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32))
    message: Mapped[str] = mapped_column(Text, default="")
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class ProductCache(Base):
    __tablename__ = "product_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(32))
    base_price: Mapped[str] = mapped_column(String(32))
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


def get_engine():
    settings = get_settings()
    settings.resolved_data_dir.mkdir(parents=True, exist_ok=True)
    return create_engine(f"sqlite:///{settings.db_path}", echo=False)


def init_db() -> None:
    Base.metadata.create_all(get_engine())


def get_session() -> Session:
    return Session(get_engine())


def save_publish_record(
    *,
    run_id: str,
    product_id: int,
    product_slug: str,
    channel_id: str,
    status: str,
    message: str = "",
    external_id: str | None = None,
    external_url: str | None = None,
) -> PublishRecord:
    init_db()
    with get_session() as session:
        record = PublishRecord(
            run_id=run_id,
            product_id=product_id,
            product_slug=product_slug,
            channel_id=channel_id,
            status=status,
            message=message,
            external_id=external_id,
            external_url=external_url,
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record


def list_publish_records(limit: int = 50) -> list[PublishRecord]:
    init_db()
    with get_session() as session:
        stmt = select(PublishRecord).order_by(PublishRecord.id.desc()).limit(limit)
        return list(session.scalars(stmt).all())


def latest_for_product_channel(product_id: int, channel_id: str) -> PublishRecord | None:
    init_db()
    with get_session() as session:
        stmt = (
            select(PublishRecord)
            .where(
                PublishRecord.product_id == product_id,
                PublishRecord.channel_id == channel_id,
            )
            .order_by(PublishRecord.id.desc())
            .limit(1)
        )
        return session.scalar(stmt)
