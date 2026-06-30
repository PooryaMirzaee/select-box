from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from avan_publisher.core.store import init_db
from avan_publisher.web.routes import router

STATIC_DIR = Path(__file__).resolve().parent / "static"


def create_app() -> FastAPI:
    init_db()
    app = FastAPI(title="Avan Publisher", docs_url="/api/docs", redoc_url=None)
    app.include_router(router)

    if STATIC_DIR.is_dir():
        assets = STATIC_DIR / "assets"
        if assets.is_dir():
            app.mount("/assets", StaticFiles(directory=assets), name="assets")

        @app.get("/{full_path:path}")
        def spa(full_path: str):
            if full_path.startswith("api"):
                return {"detail": "Not Found"}
            index = STATIC_DIR / "index.html"
            if index.is_file():
                return FileResponse(index)
            return {"detail": "UI not built. Run: cd web && npm install && npm run build"}

    return app
