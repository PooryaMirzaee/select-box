"""سرو فایل‌های آپلودشده از دیسک محلی — با محافظت path traversal."""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.services.storage import resolve_local_path

router = APIRouter(prefix="/media", tags=["media"])

# MIME امن برای پسوند — جلوگیری از اجرای محتوا توسط مرورگر
_EXT_MIME: dict[str, str] = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".svg": "image/svg+xml",
}


def _safe_media_type(path: Path) -> str:
    ext = path.suffix.lower()
    return _EXT_MIME.get(ext, "application/octet-stream")


@router.get("/{storage_key:path}")
def get_media(storage_key: str):
    path = resolve_local_path(storage_key)
    if path is None:
        raise HTTPException(status_code=404, detail="File not found")

    blocked_ext = {
        ".php", ".phtml", ".html", ".htm", ".js", ".mjs", ".xml",
        ".exe", ".sh", ".bat", ".cmd", ".ps1",
    }
    if path.suffix.lower() in blocked_ext:
        raise HTTPException(status_code=404, detail="File not found")

    media_type = _safe_media_type(path)
    headers = {
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Frame-Options": "DENY",
    }
    # PDF و فایل غیرتصویر — دانلود اجباری (کاهش XSS)
    if media_type == "application/pdf":
        headers["Content-Disposition"] = f'attachment; filename="{path.name}"'

    return FileResponse(path, media_type=media_type, headers=headers)
