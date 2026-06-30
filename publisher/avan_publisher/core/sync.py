from datetime import datetime, timezone

from sqlalchemy.dialects.sqlite import insert

from avan_publisher.api.client import CoralayClient
from avan_publisher.core.store import ProductCache, get_session, init_db


def sync_products_to_cache(client: CoralayClient | None = None) -> int:
    """Fetch admin product list and cache locally."""
    init_db()
    api = client or CoralayClient()
    products = api.list_products_admin()
    now = datetime.now(timezone.utc)

    with get_session() as session:
        for p in products:
            stmt = insert(ProductCache).values(
                id=p.id,
                slug=p.slug,
                title=p.title,
                status=p.status,
                base_price=p.base_price,
                synced_at=now,
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "slug": p.slug,
                    "title": p.title,
                    "status": p.status,
                    "base_price": p.base_price,
                    "synced_at": now,
                },
            )
            session.execute(stmt)
        session.commit()

    return len(products)
