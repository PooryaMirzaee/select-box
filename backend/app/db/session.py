"""
نشست پایگاه داده و تابع وابستگی FastAPI برای تزریق Session به هر درخواست.

برای توسعه بدون Docker می‌توان از SQLite استفاده کرد؛ اتصال با پیشوند sqlite:/// در DATABASE_URL فعال می‌شود.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

if settings.database_url.startswith("sqlite"):
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _sqlite_enable_foreign_keys(dbapi_connection, _connection_record):
        """فعال‌سازی FK در SQLite (به‌صورت پیش‌فرض خاموش است)."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

else:
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
    )


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Yield یک نشست؛ پس از پاسخ درخواست بسته می‌شود تا نشتی اتصال نباشد."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
